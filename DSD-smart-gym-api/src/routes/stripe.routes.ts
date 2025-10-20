// src/routes/stripe.routes.ts
import express, { Response } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import { requireAuth } from "../middleware/requireAuth";
import { getCheckoutDetails } from "../controllers/cafepurchase.controller";
import { IAuthenticatedRequest } from "../types/interface";
import { CafePurchase } from "../models/cafepurchase.model";
import mongoose from "mongoose";

dotenv.config();
const router = express.Router();

type CafeCartItem = {
  item_name: string;
  image?: string;
  price: number;
  quantityOrdered: number;
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil" as const, 
});

function validateCheckoutCartOrThrow(cart: unknown): CafeCartItem[] {
  if (!Array.isArray(cart) || cart.length === 0) {
    const e: any = new Error("Invalid cart format. Cart must be a non-empty array of valid items.");
    e.status = 400;
    throw e;
  }
  cart.forEach((item: any, idx: number) => {
    if (
      !item ||
      typeof item.item_name !== "string" ||
      typeof item.price !== "number" ||
      typeof item.quantityOrdered !== "number" ||
      item.price <= 0 ||
      item.quantityOrdered <= 0 ||
      (item.image !== undefined && typeof item.image !== "string")
    ) {
      const e: any = new Error(`Invalid cart item at index ${idx}`);
      e.status = 400;
      throw e;
    }
  });
  return cart as CafeCartItem[];
}

router.post(
  "/create-checkout-session",
  requireAuth,
  async (req: IAuthenticatedRequest, res: Response) => {
    try {
      const { cart, success_url, cancel_url } = req.body ?? {};
      const validCart = validateCheckoutCartOrThrow(cart);

      // ✔ avoid `!req.user?.id`; support user_id or id from JWT
      const claims = (req.user ?? {}) as any;
      const userId: string = String(claims.user_id ?? claims.id ?? "");
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const email = claims.email || req.body?.email;
      if (!email) {
        return res.status(400).json({ error: "Email is required for a café purchase." });
      }

      const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
        validCart.map((item) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: item.item_name,
              ...(item.image ? { images: [item.image] } : {}),
            },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantityOrdered,
        }));

      // Build DB-friendly items (price in cents) and attach tenant/user ids expected by the model
      const itemsForDb = validCart.map((i) => ({
        name: i.item_name,
        qty: i.quantityOrdered,
        price_cents: Math.round(Number(i.price) * 100),
      }));

      // Create a payload that matches the CafePurchase schema
      const purchasePayload: any = {
        gym_id: new mongoose.Types.ObjectId(String(claims.gym_id || "")),
        user_id: new mongoose.Types.ObjectId(String(userId)),
        email: String(email).toLowerCase(),
        items: itemsForDb,
        status: "pending",
      };

      const purchase = await CafePurchase.create(purchasePayload);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items,
        success_url:
          success_url ??
          `${process.env.CLIENT_URL}/member/cafe-ordering?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url ?? `${process.env.CLIENT_URL}/member/cafe-ordering?checkout=cancel`,
        metadata: {
          kind: "cafe",
          purchaseId: String(purchase._id),
          userId,
          gymId: String(claims.gym_id ?? ""),
          items: JSON.stringify(
            validCart.map((i) => ({
              item_name: i.item_name,
              price_cents: Math.round(i.price * 100),
              quantity: i.quantityOrdered,
              image: i.image,
            }))
          ),
        },
        // ensure PaymentIntent/Charge metadata includes purchaseId so charge events can find the purchase
        payment_intent_data: {
          metadata: {
            purchaseId: String(purchase._id),
            userId,
            gymId: String(claims.gym_id ?? ""),
          },
        },
      });

      return res.status(200).json({ id: session.id, url: session.url });
    } catch (err: any) {
      const status = Number.isInteger(err?.status) ? err.status : 500;
      console.error("❌ Stripe error:", err?.message || err);
      return res
        .status(status)
        .json({ error: err?.message || "Failed to create Checkout Session" });
    }
  }
);

router.get("/get-checkout-details", requireAuth, getCheckoutDetails);

export default router;
