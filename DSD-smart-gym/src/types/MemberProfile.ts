// src/types/MemberProfile.ts
export type Address = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export type ProfileForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone_e164: string;
  address: Address;
  avatar_url?: string;

  communication_prefs: { email: boolean; sms: boolean; push: boolean };
  marketing_op_in: boolean;
  class_preferences: string[];
  injury_notes?: string;
};



// Shape returned by GET /users/profile (only fields you read)
export type  UserDTO  = {
	_id?: string;
	id?: string;
	email?: string;
	name?: string;
	role?: "admin" | "member" | "trainer";
	gym_id?: string;
	profile?: {
		phone_e164?: string;
		address?: Partial<Address>;
	};
};