// controllers/stripe.controller.ts
import { Request, Response } from "express";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { cart, success_url, cancel_url } = req.body;

  const clientBase = process.env.CLIENT_URL || "http://localhost:5173";
  const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: cart.map((item: any) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.item_name,
          },
          unit_amount: item.price * 100,
        },
        quantity: item.quantityOrdered,
      })),
      mode: "payment",
      // Use hash routes so the static host always serves index.html and the SPA router handles the path
      success_url:
        success_url || `${clientBase}/#/member/cafe-ordering?checkout=success`,
      cancel_url: cancel_url || `${clientBase}/#/member/cafe-ordering?checkout=cancel`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("❌ Stripe session error:", error);
    res.status(500).json({ error: "Stripe session failed" });
  }
};
