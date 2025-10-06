// src/models/gym.model.ts
import mongoose, { Schema, Types, Document } from "mongoose";

export interface IGymDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  address: string;
  city: string;
  zipcode: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

const gymSchema = new Schema<IGymDoc>(
  {
    // omit _id → Mongoose uses ObjectId by default
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    zipcode: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// Handy search index (optional)
gymSchema.index({ name: 1 });

export const Gym = mongoose.model<IGymDoc>("Gym", gymSchema);
