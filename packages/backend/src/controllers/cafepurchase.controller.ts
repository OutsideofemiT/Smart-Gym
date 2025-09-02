// src/controllers/cafepurchase.controller.ts
import { Response } from "express";
import { Types, MongooseError } from "mongoose";
import { IAuthenticatedRequest, CafeCartItem } from "../types/interface";
import { CafePurchase } from "../models/cafepurchase.model";

const bad = (msg: string) => Object.assign(new Error(msg), { status: 400 });
const toCents = (n: number) => Math.max(0, Math.round(Number(n) * 100));

type SavedItem = {
  name: string;
  qty: number;
  price_cents: number; // unit price in cents
};

/**
 * Create a purchase for the authenticated user.
 * - Uses user_id & gym_id from JWT (ObjectIds)
 * - Converts prices to cents
 * - Totals are computed by the schema hook
 * - No email stored on the purchase (auth linkage is via user_id)
 */
export const finalizeCafePurchase = async (
  req: IAuthenticatedRequest,
  res: Response
) => {
  try {
    const cart = Array.isArray(req.body?.cart) ? (req.body.cart as CafeCartItem[]) : [];
    const tax_cents = Number.isFinite(req.body?.tax_cents) ? Number(req.body.tax_cents) : 0;
    const tip_cents = Number.isFinite(req.body?.tip_cents) ? Number(req.body.tip_cents) : 0;
    const discount_cents = Number.isFinite(req.body?.discount_cents) ? Number(req.body.discount_cents) : 0;

    const userIdStr = req.user?.user_id;
    const gymIdStr = req.user?.gym_id;

    if (!userIdStr || !Types.ObjectId.isValid(userIdStr)) throw bad("Invalid or missing user_id");
    if (!gymIdStr || !Types.ObjectId.isValid(gymIdStr)) throw bad("Invalid or missing gym_id");
    if (!cart.length) throw bad("Cart is empty");

    // Normalize items → schema shape
    const items: SavedItem[] = cart.map((it, idx) => {
      const name = String(it.item_name || "").trim();
      const qty = Number(it.quantityOrdered);
      const price_cents = toCents(it.price);
      if (!name) throw bad(`Missing item_name at index ${idx}`);
      if (!Number.isFinite(qty) || qty <= 0) throw bad(`Invalid quantity at index ${idx}`);
      if (!Number.isFinite(price_cents) || price_cents <= 0) throw bad(`Invalid price at index ${idx}`);
      return { name, qty, price_cents };
    });

    const doc = await CafePurchase.create({
      gym_id: new Types.ObjectId(gymIdStr),
      user_id: new Types.ObjectId(userIdStr),
      items,
      tax_cents,
      tip_cents,
      discount_cents,
      // order_id is set by the model (uuid)
      // subtotal_cents / total_cents are computed in the model hook
    });

    return res.status(201).json({
      message: "Purchase recorded",
      purchaseId: doc._id.toString(),
      order_id: (doc as any).order_id,
      totals: {
        subtotal_cents: (doc as any).subtotal_cents,
        tax_cents: (doc as any).tax_cents,
        tip_cents: (doc as any).tip_cents,
        discount_cents: (doc as any).discount_cents,
        total_cents: (doc as any).total_cents,
      },
      createdAt: doc.createdAt,
    });
  } catch (err: any) {
    const status = err?.status ?? (err instanceof MongooseError ? 400 : 500);
    return res.status(status).json({ error: err?.message ?? "Failed to record purchase" });
  }
};

/**
 * Return details of the most recent purchase for the authenticated user.
 * Converts cents → dollars for UI convenience.
 */
export const getCheckoutDetails = async (
  req: IAuthenticatedRequest,
  res: Response
) => {
  try {
    const userIdStr = req.user?.user_id;
    const gymIdStr = req.user?.gym_id;
    if (!userIdStr || !Types.ObjectId.isValid(userIdStr)) return res.status(401).json({ error: "Unauthorized" });
    if (!gymIdStr || !Types.ObjectId.isValid(gymIdStr)) return res.status(401).json({ error: "Unauthorized" });

    const last = await CafePurchase.findOne({
      user_id: new Types.ObjectId(userIdStr),
      gym_id: new Types.ObjectId(gymIdStr),
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!last) return res.status(404).json({ error: "No recent purchase found." });

    const items = (last.items || []).map((it: any) => ({
      name: it.name,
      qty: it.qty,
      price: (it.price_cents ?? 0) / 100,
      line_total: (it.line_total_cents ?? 0) / 100,
    }));

    return res.status(200).json({
      order_id: (last as any).order_id,
      items,
      subtotal: ((last as any).subtotal_cents ?? 0) / 100,
      tax: ((last as any).tax_cents ?? 0) / 100,
      tip: ((last as any).tip_cents ?? 0) / 100,
      discount: ((last as any).discount_cents ?? 0) / 100,
      total: ((last as any).total_cents ?? 0) / 100,
      createdAt: last.createdAt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to retrieve receipt" });
  }
};
