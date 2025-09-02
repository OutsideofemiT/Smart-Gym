// src/models/location.model.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILocation extends Document {
  _id: Types.ObjectId;
  gym_id: Types.ObjectId;         // brand/tenant
  name: string;                   // e.g., "Smart Gym - Downtown"
  slug: string;                   // e.g., "downtown"
  timezone: string;               // IANA, e.g., "America/Chicago"
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  phone_e164?: string;            // optional site phone
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema(
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

const locationSchema = new Schema<ILocation>(
  {
    gym_id: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    timezone: { type: String, required: true, default: "America/Chicago" },
    address: { type: AddressSchema, default: undefined },
    phone_e164: {
      type: String,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, "Phone must be in E.164 format"],
    },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique per brand
locationSchema.index({ gym_id: 1, slug: 1 }, { unique: true });

export const Location = mongoose.model<ILocation>("Location", locationSchema);
