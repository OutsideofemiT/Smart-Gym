import mongoose, { Schema, Document, Types } from "mongoose";

export type MembershipStatus =
  | "active"
  | "trailing"
  | "past due"
  | "paused"
  | "canceled"
  | "expired";

export type MembershipTier = "standard" | "plus" | "premium";

export type Address = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export interface IMemberProfile extends Document {
  _id: Types.ObjectId;

  user_id: Types.ObjectId;
  gym_id: Types.ObjectId;
  home_location_id?: Types.ObjectId;

  first_name: string;
  last_name: string;
  email: string;
  phone_e164?: string;
  address?: Address;
  avatar_url?: string;

  membership_status: MembershipStatus;
  membership_tier?: MembershipTier;
  join_date: Date;
  renewal_date?: Date;
  cancel_at_period_end: boolean;

  communication_prefs?: { email?: boolean; sms?: boolean; push?: boolean };
  marketing_op_in: boolean;
  class_preferences?: string[];
  injury_notes?: string;

  check_in_count: number;
  last_check_in_at?: Date;
  badges?: string[];

  is_deleted: boolean;

  full_name?: string;

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

const CommunicationPrefsSchema = new Schema(
  {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
  },
  { _id: false }
);

const memberProfileSchema = new Schema<IMemberProfile>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    gym_id: { type: Schema.Types.ObjectId, ref: "Gym", required: true },
    home_location_id: { type: Schema.Types.ObjectId, ref: "Location" },

    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone_e164: { type: String, trim: true },
    address: AddressSchema,
    avatar_url: { type: String, trim: true },

    membership_status: {
      type: String,
      enum: ["active", "trailing", "past due", "paused", "canceled", "expired"],
      required: true,
    },
    membership_tier: { type: String, enum: ["standard", "plus", "premium"] },
    join_date: { type: Date, required: true },
    renewal_date: { type: Date },
    cancel_at_period_end: { type: Boolean, default: false },

    communication_prefs: { type: CommunicationPrefsSchema, default: {} },
    marketing_op_in: { type: Boolean, default: false },
    class_preferences: [{ type: String }],
    injury_notes: { type: String, trim: true },

    check_in_count: { type: Number, default: 0 },
    last_check_in_at: { type: Date },
    badges: [{ type: String }],

    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

memberProfileSchema.path("user_id").immutable(true);
memberProfileSchema.path("gym_id").immutable(true);

memberProfileSchema.virtual("full_name").get(function (this: IMemberProfile) {
  return `${this.first_name ?? ""} ${this.last_name ?? ""}`.trim();
});

memberProfileSchema.index(
  { user_id: 1, gym_id: 1 },
  { unique: true, partialFilterExpression: { is_deleted: false } }
);
memberProfileSchema.index({ gym_id: 1, membership_status: 1 });
memberProfileSchema.index({ last_name: 1, first_name: 1 });

memberProfileSchema.pre("validate", function (next) {
  if (this.email) this.email = this.email.toLowerCase().trim();
  if (this.phone_e164) this.phone_e164 = this.phone_e164.replace(/\s+/g, "");
  next();
});

export const MemberProfile = mongoose.model<IMemberProfile>(
  "MemberProfile",
  memberProfileSchema
);
