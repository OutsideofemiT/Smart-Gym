import mongoose, { Schema, Document, Types } from "mongoose";

/* =========================
   ClassSession (scheduled instance) — NO template
   ========================= */
export type SessionStatus = "scheduled" | "canceled" | "completed";

export interface IClassSession extends Document {
  _id: Types.ObjectId;
  gym_id: Types.ObjectId;                 // tenant
  trainer_id: Types.ObjectId;             // ref User (trainer)
  title: string;                          // session title (self-contained)
  description?: string;

  start_time: Date;                       // UTC
  end_time: Date;                         // UTC

  capacity: number;
  waitlist_enabled: boolean;

  status: SessionStatus;
  notes?: string;

  booked_count: number;
  checked_in_count: number;

  canceled_at?: Date;
  cancel_reason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const classSessionSchema = new Schema<IClassSession>(
  {
    gym_id: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    trainer_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    start_time: { type: Date, required: true, index: true },
    end_time: { type: Date, required: true },

    capacity: { type: Number, min: 1, required: true },
    waitlist_enabled: { type: Boolean, default: true },

    status: { type: String, enum: ["scheduled", "canceled", "completed"], default: "scheduled", index: true },
    notes: { type: String, trim: true },

    booked_count: { type: Number, default: 0, min: 0 },
    checked_in_count: { type: Number, default: 0, min: 0 },

    canceled_at: { type: Date },
    cancel_reason: { type: String, trim: true },
  },
  { timestamps: true }
);

classSessionSchema.index({ gym_id: 1, trainer_id: 1, start_time: 1 });

/* =========================
   Booking (one per user per session)
   ========================= */
export type BookingStatus = "booked" | "checked_in" | "canceled" | "no_show";

export interface IClassBooking extends Document {
  _id: Types.ObjectId;
  gym_id: Types.ObjectId;
  session_id: Types.ObjectId;
  user_id: Types.ObjectId;
  status: BookingStatus;
  booked_at: Date;
  check_in_at?: Date;
  canceled_at?: Date;
  source?: "web" | "app" | "staff" | "import";
  createdAt: Date;
  updatedAt: Date;
}

const classBookingSchema = new Schema<IClassBooking>(
  {
    gym_id: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    session_id: { type: Schema.Types.ObjectId, ref: "ClassSession", required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["booked", "checked_in", "canceled", "no_show"], default: "booked", index: true },
    booked_at: { type: Date, required: true, default: () => new Date() },
    check_in_at: { type: Date },
    canceled_at: { type: Date },
    source: { type: String, enum: ["web", "app", "staff", "import"], default: "web" },
  },
  { timestamps: true }
);

classBookingSchema.index({ session_id: 1, user_id: 1 }, { unique: true });
classBookingSchema.index({ gym_id: 1, user_id: 1, createdAt: -1 });

/* =========================
   Waitlist (FIFO per session)
   ========================= */
export interface IWaitlist extends Document {
  _id: Types.ObjectId;
  gym_id: Types.ObjectId;
  session_id: Types.ObjectId;
  user_id: Types.ObjectId;
  joined_at: Date;
  createdAt: Date;
  updatedAt: Date;
}

const waitlistSchema = new Schema<IWaitlist>(
  {
    gym_id: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    session_id: { type: Schema.Types.ObjectId, ref: "ClassSession", required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    joined_at: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true }
);

waitlistSchema.index({ session_id: 1, user_id: 1 }, { unique: true });

/* =========================
   Models
   ========================= */
export const ClassSession = mongoose.model<IClassSession>("ClassSession", classSessionSchema);
export const ClassBooking = mongoose.model<IClassBooking>("ClassBooking", classBookingSchema);
export const Waitlist = mongoose.model<IWaitlist>("Waitlist", waitlistSchema);
