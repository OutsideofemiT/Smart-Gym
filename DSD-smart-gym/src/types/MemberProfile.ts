export type Address = {
	line1: string;
	line2?: string;
	city: string;
	state: string;
	postal_code: string;
	country: string;


}
export type ProfileForm = {
	name: string;
	phone_e164: string;
	address: Address;

}

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