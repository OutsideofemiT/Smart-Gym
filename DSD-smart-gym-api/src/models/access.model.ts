// src/models/access.model.ts
import mongoose, { Schema, Types, Document } from "mongoose";

/** ---------- QR codes for entry ---------- */
export interface IQRCode extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;   // ref: User
  gym_id: Types.ObjectId;    // ref: Gym (brand/tenant)
  qr_code: string;           // random token presented at door
  expires_at: Date;          // TTL autoclean
  createdAt: Date;
  updatedAt: Date;
}

const qrCodeSchema = new Schema<IQRCode>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    gym_id:  { type: Schema.Types.ObjectId, ref: "Gym",  required: true, index: true },
    qr_code: { type: String, required: true, trim: true, index: true },
    expires_at: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// Helpful constraints & lookups
qrCodeSchema.index({ user_id: 1, gym_id: 1, expires_at: -1 });   // find active/recent per member
qrCodeSchema.index({ qr_code: 1 }, { unique: true });             // avoid token collisions
qrCodeSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL: auto-delete after expiry

export const QRCode = mongoose.model<IQRCode>("QRCode", qrCodeSchema);

/** ---------- Check-in / check-out events ---------- */
export interface ICheckInOut extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;   // ref: User
  gym_id: Types.ObjectId;    // ref: Gym
  checked_in: Date;
  checked_out: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const checkInOutSchema = new Schema<ICheckInOut>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    gym_id:  { type: Schema.Types.ObjectId, ref: "Gym",  required: true, index: true },
    checked_in:  { type: Date, required: true },
    checked_out: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

// Common queries
checkInOutSchema.index({ user_id: 1, gym_id: 1, checked_in: -1 });

// Enforce one active session per user per gym (checked_out == null)
checkInOutSchema.index(
  { user_id: 1, gym_id: 1, checked_out: 1 },
  { unique: true, partialFilterExpression: { checked_out: null } }
);

export const CheckInOut = mongoose.model<ICheckInOut>("CheckInOut", checkInOutSchema);
