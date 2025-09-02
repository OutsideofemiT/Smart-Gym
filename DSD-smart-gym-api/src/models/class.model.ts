// models/class.model.ts
import mongoose, { Schema, Document, Types } from "mongoose";

/** ----- Class (template) ----- */
export interface IClass extends Document {
  _id: Types.ObjectId;
  gym_id: Types.ObjectId;                 // brand/tenant
  title: string;
  description?: string;
  default_duration_min: number;           // e.g., 60
  default_capacity: number;               // e.g., 20
  tags?: string[];                        // e.g., ["cycling","cardio"]
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const classSchema = new Schema<IClass>(
  {
    gym_id: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    default_duration_min: { type: Number, min: 1, required: true },
    default_capacity: { type: Number, min: 1, required: true },
    tags: [{ type: String, trim: true }],
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

classSchema.index({ gym_id: 1, title: 1, is_active: 1 });

/** ----- ClassSession (scheduled instance) ----- */
export type SessionStatus = "scheduled" | "canceled" | "completed";

export interface IClassSession extends Document {
  _id: Types.ObjectId;
  gym_id: Types.ObjectId;                 // brand/tenant
  location_id: Types.ObjectId;            // physical site
  class_id: Types.ObjectId;               // ref Class
  trainer_id: Types.ObjectId;             // ref TrainerProfile (primary)
  assistant_trainer_ids?: Types.ObjectId[]; // optional

  start_time: Date;                       // store UTC; render in location timezone
  end_time: Date;                         // required (explicit or computed in services)
  timezone?: string;                      // optional display override (IANA)

  capacity: number;                       // session capacity (can differ from template)
  waitlist_enabled: boolean;

  status: SessionStatus;
  notes?: string;

  // Fast counters (updated by services atomically)
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
    location_id: { type: Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    class_id: { type: Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    trainer_id: { type: Schema.Types.ObjectId, ref: "TrainerProfile", required: true, index: true },
    assistant_trainer_ids: [{ type: Schema.Types.ObjectId, ref: "TrainerProfile" }],

    start_time: { type: Date, required: true, index: true },
    end_time: { type: Date, required: true },
    timezone: { type: String, trim: true }, // e.g., "America/Chicago"

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

// Useful queries
classSessionSchema.index({ gym_id: 1, location_id: 1, start_time: 1 });
classSessionSchema.index({ gym_id: 1, trainer_id: 1, start_time: 1 });
classSessionSchema.index({ class_id: 1, start_time: 1 });

classSessionSchema.pre("validate", function (next) {
  if (this.start_time && this.end_time && this.start_time >= this.end_time) {
    return next(new Error("end_time must be after start_time"));
  }
  next();
});

/** ----- Booking (one per user per session) ----- */
export type BookingStatus = "booked" | "checked_in" | "canceled" | "no_show";

export interface IClassBooking extends Document {
  _id: Types.ObjectId;
  gym_id: Types.ObjectId;                 // brand/tenant (helps partition queries)
  session_id: Types.ObjectId;             // ref ClassSession
  user_id: Types.ObjectId;                // ref User
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

// Prevent double-booking the same user on the same session
classBookingSchema.index({ session_id: 1, user_id: 1 }, { unique: true });
// Common queries
classBookingSchema.index({ gym_id: 1, user_id: 1, createdAt: -1 });

/** ----- Waitlist (FIFO per session) ----- */
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

// One waitlist entry per user per session
waitlistSchema.index({ session_id: 1, user_id: 1 }, { unique: true });

/** ----- Models ----- */
export const Class = mongoose.model<IClass>("Class", classSchema);
export const ClassSession = mongoose.model<IClassSession>("ClassSession", classSessionSchema);
export const ClassBooking = mongoose.model<IClassBooking>("ClassBooking", classBookingSchema);
export const Waitlist = mongoose.model<IWaitlist>("Waitlist", waitlistSchema);
