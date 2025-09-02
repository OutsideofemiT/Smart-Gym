import mongoose, { Schema, Document, Types } from "mongoose";

export type MembershipStatus =
|"active"
|"trailing"
|"past due"
|"paused"
|"canceled"
|"expired";

export type MembershipTier = "standard" | "plus" | "premium";

type Address = {
	line1: string;
	line2?: string;
	city: string;
	state: string;
	postal_code: string;
	country: string;
};

export interface IMemberProfile extends Document {
	_id: Types.ObjectId;

	/**Tenancy and identity */
	user_id: Types.ObjectId;
	gym_id: Types.ObjectId;
	home_location_id: Types.ObjectId;

	/** Contact */
	first_name: string;
	last_name: string;
	email: string;
	phone_e164?: string;
	address?: Address;

	/**Membership */
	membership_status: MembershipStatus;
	membership_tier?: MembershipTier;
	join_date: Date;
	renewal_date?: Date;
	cancel_at_period_end: boolean;

	/**Preferences & consents */
	communication_prefs?: { email?: boolean; sms?: boolean; push?: boolean };
	marketing_op_in: boolean;
	class_preferences?: string[];
	injury_notes?: string;

	/**Usage */
	check_in_count: number;
	last_check_in_at?: Date;
	badges?: string[];

	/**soft delete*/
	is_deleted: boolean;

	/**Virtuals */
	full_name?: string;

	createdAt: Date;
	updatedAt: Date;
}

// Address subdocument schema
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

// Main member profile schema
const memberProfileSchema = new Schema<IMemberProfile>(
	{
		/**Tenancy and identity */
		user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
		gym_id: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
		home_location_id: { type: Schema.Types.ObjectId, ref: "Location" },
		/** Contact */
		first_name: { type: String, required: true, trim: true },
		last_name: { type: String, required: true, trim: true },
		email: { type: String, required: true, trim: true, lowercase: true },
		phone_e164: { type: String, trim: true },
		address: { type: AddressSchema },

		/**Membership */
		membership_status: { type: String, enum: ["active", "trailing", "past due", "paused", "canceled", "expired"], required: true },
		membership_tier: { type: String, enum: ["standard", "plus", "premium"] },
		join_date: { type: Date, required: true },
		renewal_date: { type: Date },
		cancel_at_period_end: { type: Boolean, default: false },
		

		/**Preferences & consents */
		communication_prefs: {
			email: { type: Boolean, default: true },
			sms: { type: Boolean, default: false },
			push: { type: Boolean, default: false }
		},
		marketing_op_in: { type: Boolean, default: false },
		class_preferences: [{ type: String }],
		injury_notes: { type: String, trim: true },

		/**Usage */
		check_in_count: { type: Number, default: 0 },
		last_check_in_at: { type: Date },
		badges: [{ type: String }],

		/**soft delete*/
		is_deleted: { type: Boolean, default: false },

		/**Virtuals */
		full_name: { type: String },

		createdAt: { type: Date, default: Date.now },
		updatedAt: { type: Date, default: Date.now }
	},
	{ timestamps: true }
);

/** Immutables: one profile per user per gym; these should not change after creation */
memberProfileSchema.path("user_id").immutable(true);
memberProfileSchema.path("gym_id").immutable(true);

/** Virtuals */
memberProfileSchema.virtual("full_name").get(function (this: IMemberProfile) {
  return `${this.first_name} ${this.last_name}`.trim();
});

/** Indexes */
// Enforce ONE profile per {user,gym}
memberProfileSchema.index({ user_id: 1, gym_id: 1 }, { unique: true });
// Useful admin filters (tenancy + status)
memberProfileSchema.index({ gym_id: 1, membership_status: 1 });
// Optional: quick search on name (prefix search should be done at query layer)
memberProfileSchema.index({ last_name: 1, first_name: 1 });

/** Normalizations */
memberProfileSchema.pre("validate", function (next) {
  if (this.email) this.email = this.email.toLowerCase().trim();
  if (this.phone_e164) this.phone_e164 = this.phone_e164.replace(/\s+/g, "");
  next();
});

export const MemberProfile = mongoose.model<IMemberProfile>("MemberProfile", memberProfileSchema);