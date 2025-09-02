// models/cafePurchase.model.ts
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const { Schema } = mongoose;

/** Line items are snapshotted at purchase time */
const purchaseItemSchema = new Schema(
  {
    inventory_id: { type: Schema.Types.ObjectId, ref: "CafeInventory" },
    sku: { type: String, trim: true },                 // snapshot
    name: { type: String, trim: true, required: true },// snapshot
    qty: { type: Number, min: 1, required: true },
    price_cents: { type: Number, min: 0, required: true }, // unit price at purchase
    line_total_cents: { type: Number, min: 0, required: true }, // computed = qty * price_cents
  },
  { _id: false }
);

const cafePurchaseSchema = new Schema(
  {
    /** Public, tenant-scoped order identifier for receipts/QR/Stripe metadata */
    order_id: { type: String, default: uuidv4, index: true },

    /** Multi-tenant scoping + relations */
    gym_id: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    // If your User._id is a string UUID, change type to String.
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    /** Location reference */
    location_id: { type: Schema.Types.ObjectId, ref: "Location", required: true, index: true },

    /** Denormalized for convenience; we still join via user_id when needed */
    email: { type: String, trim: true, required: true },

    /** Purchase contents */
    items: {
      type: [purchaseItemSchema],
      validate: {
        validator(v: any[]) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one item is required.",
      },
    },

    /** Money in integer cents */
    subtotal_cents: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
      validate: {
        validator(this: any, val: number) {
          const computed = (this.items || []).reduce(
            (sum: number, it: any) => sum + (it.line_total_cents || 0),
            0
          );
          return val === computed;
        },
        message: "subtotal_cents does not match item totals.",
      },
    },
    tax_cents: { type: Number, min: 0, default: 0 },
    discount_cents: { type: Number, min: 0, default: 0 },
    tip_cents: { type: Number, min: 0, default: 0 },
    total_cents: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
      validate: {
        validator(this: any, val: number) {
          const s = this.subtotal_cents || 0;
          const t = this.tax_cents || 0;
          const d = this.discount_cents || 0;
          const tip = this.tip_cents || 0;
          const computed = Math.max(0, s + t + tip - d);
          return val === computed;
        },
        message: "total_cents is inconsistent with subtotal/tax/discount/tip.",
      },
    },

    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "canceled"],
      default: "pending",
      index: true,
    },

    /** Third-party payment metadata (Stripe, etc.) */
    stripe: {
      checkout_session_id: { type: String, index: { sparse: true } },
      payment_intent_id: { type: String, index: { sparse: true } },
      charge_id: { type: String, index: { sparse: true } },
      invoice_id: { type: String, index: { sparse: true } },
      subscription_id: { type: String, index: { sparse: true } },
      customer_id: { type: String, index: { sparse: true } },
      currency: { type: String, trim: true, default: "usd" },
      amount_total_cents: { type: Number, min: 0 }, // Stripe's view; keep total_cents as your source of truth
      receipt_url: { type: String, trim: true },
    },

    /** Optional audit helpers */
    paid_at: { type: Date },
    refunded_cents: { type: Number, min: 0, default: 0 },
    refund_ids: [{ type: String }],
    payment_method: { type: String, enum: ["card", "apple_pay", "google_pay", "cash"], default: "card" },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

/** Immutables after creation */
cafePurchaseSchema.path("gym_id").immutable(true);
cafePurchaseSchema.path("location_id").immutable(true);
cafePurchaseSchema.path("user_id").immutable(true);
cafePurchaseSchema.path("order_id").immutable(true);

/** Indexes */
cafePurchaseSchema.index({ gym_id: 1, order_id: 1 }, { unique: true }); // public ID unique per brand
cafePurchaseSchema.index({ gym_id: 1, location_id: 1, createdAt: -1 });
cafePurchaseSchema.index({ gym_id: 1, location_id: 1, status: 1, createdAt: -1 });
cafePurchaseSchema.index({ user_id: 1, createdAt: -1 });

/** Helpers */
function computeLineTotals(items: any[] = []) {
  return items.map((it: any) => ({
    ...it,
    line_total_cents: (it.qty ?? 0) * (it.price_cents ?? 0),
  }));
}
function recomputeMoney(doc: any) {
  doc.items = computeLineTotals(doc.items);
  const subtotal = (doc.items || []).reduce(
    (sum: number, it: any) => sum + (it.line_total_cents || 0),
    0
  );
  const tax = doc.tax_cents || 0;
  const disc = doc.discount_cents || 0;
  const tip = doc.tip_cents || 0;
  doc.subtotal_cents = subtotal;
  doc.total_cents = Math.max(0, subtotal + tax + tip - disc);
}

/** Normalize + compute on create/save */
cafePurchaseSchema.pre("validate", function (next) {
  if (this.email) this.email = this.email.toLowerCase();
  if (Array.isArray(this.items)) {
    recomputeMoney(this);
  }
  next();
});

/**
 * Keep totals consistent on findOneAndUpdate as well.
 * NOTE: It's safest to funnel changes through doc.save().
 * If you must use findOneAndUpdate, pass { new: true, runValidators: true }.
 */
cafePurchaseSchema.pre("findOneAndUpdate", async function (next) {
  const update: any = this.getUpdate() || {};
  // Normalize email if present
  if (update.email?.toLowerCase) update.email = update.email.toLowerCase();
  const $set = update.$set ?? (typeof update === "object" ? update : {});
  // Fetch current doc to compute accurate totals with partial updates
  const current = await (this as any).model.findOne(this.getQuery());
  if (!current) return next();

  // Build a prospective doc snapshot to recompute totals safely
  const draft: any = {
    items: $set.items ?? current.items,
    tax_cents: $set.tax_cents ?? current.tax_cents,
    discount_cents: $set.discount_cents ?? current.discount_cents,
    tip_cents: $set.tip_cents ?? current.tip_cents,
    subtotal_cents: current.subtotal_cents,
    total_cents: current.total_cents,
  };
  recomputeMoney(draft);

  // Write back computed fields into the update payload
  $set.subtotal_cents = draft.subtotal_cents;
  $set.total_cents = draft.total_cents;

  // Also recompute line totals if items provided
  if ($set.items) {
    $set.items = computeLineTotals($set.items);
  }

  // Persist via $set
  update.$set = $set;
  this.setUpdate(update);
  next();
});

/** Lock financial fields after payment succeeded */
const LOCKED_FIELDS = new Set([
  "items",
  "subtotal_cents",
  "tax_cents",
  "discount_cents",
  "tip_cents",
  "total_cents",
]);
cafePurchaseSchema.pre("save", function (next) {
  if (!this.isNew && this.get("status") === "succeeded") {
    const touched = this.modifiedPaths().filter((p) => LOCKED_FIELDS.has(p));
    if (touched.length) {
      return next(
        new Error(
          `Cannot modify settled purchase fields: ${touched.join(", ")}`
        )
      );
    }
  }
  next();
});

export const CafePurchase = mongoose.model("CafePurchase", cafePurchaseSchema);
