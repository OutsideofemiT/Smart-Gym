// src/models/user.model.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export type UserRole = "admin" | "member" | "trainer";
export type MembershipStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "canceled"
  | "expired";

type Address = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string; // ISO-2 (e.g., "US")
};

export interface IUserDoc extends Document {
  _id: Types.ObjectId;
  email: string;
  name: string;
  password: string; // select:false
  salt?: string;     // select:false
  role: UserRole;
  gym_id: Types.ObjectId;

  member_number?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;

  /**
   * NOTE: This is a convenience mirror ONLY.
   * The source of truth for membership state will live on MemberProfile.
   * After MemberProfile is in place, consider removing this field from User.
   */
  membership_status?: MembershipStatus;

  profile?: {
    /** E.164 format (e.g., +12125551234). Normalize in services; validated here. */
    phone_e164?: string;
    address?: Address;
  };

  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<Address>(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postal_code: { type: String, trim: true },
    country: { type: String, trim: true, default: "US" },
  },
  { _id: false }
);

const userSchema = new Schema<IUserDoc>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    name: { type: String, required: true, trim: true },

    password: { type: String, required: true, select: false },
    salt: { type: String, select: false },

    role: {
      type: String,
      enum: ["admin", "member", "trainer"],
      required: true,
    },

    gym_id: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },

    member_number: { type: String, trim: true },

    stripe_customer_id: { type: String, trim: true },
    stripe_subscription_id: { type: String, trim: true },

    // NOTE: Mirror only—prefer MemberProfile as source of truth.
    membership_status: {
      type: String,
      enum: ["active", "trialing", "past_due", "paused", "canceled", "expired"],
    },

    profile: {
      phone_e164: {
        type: String,
        trim: true,
        // E.164: + followed by up to 15 digits (first digit 1–9)
        match: [/^\+?[1-9]\d{1,14}$/, "Phone must be in E.164 format (e.g. +12125551234)"],
      },
      address: { type: AddressSchema, default: undefined },
    },
  },
  { timestamps: true }
);

/** Indexes */
userSchema.index({ email: 1 }, { unique: true });
userSchema.index(
  { gym_id: 1, member_number: 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: "member",
      member_number: { $exists: true, $type: "string" },
    },
  }
);

/**
 * Stripe IDs are globally unique within a single Stripe account.
 * ✅ Current: one Stripe account + one active gym → keep global unique index below.
 * 🔮 Future: if each gym gets its *own* Stripe account, switch to compound uniqueness:
 *    userSchema.index({ gym_id: 1, stripe_customer_id: 1 }, { unique: true, sparse: true });
 */
userSchema.index({ stripe_customer_id: 1 }, { unique: true, sparse: true });

// Optional: enable if you plan to search by phone (NOT unique unless enforcing one account per phone)
// userSchema.index({ "profile.phone_e164": 1 }, { sparse: true });

/** Strip secrets from outputs */
function stripSecrets(_doc: any, ret: any) {
  delete ret.password;
  delete ret.salt;
  return ret;
}
userSchema.set("toJSON", { transform: stripSecrets });
userSchema.set("toObject", { transform: stripSecrets });

/** Normalizations */
userSchema.pre("validate", function (next) {
  if (this.email) this.email = this.email.toLowerCase().trim();
  if (this.profile?.phone_e164) {
    // Only remove spaces; full parsing/normalization should be done in services (e.g., libphonenumber-js)
    this.profile.phone_e164 = this.profile.phone_e164.replace(/\s+/g, "");
  }
  next();
});

export const User = mongoose.model<IUserDoc>("User", userSchema);
