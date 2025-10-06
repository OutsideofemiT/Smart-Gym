// src/utils/validators.ts

/**
 * Validates a cafe cart. Throws an error if invalid.
 */
export function validateCheckoutCartOrThrow(cart: unknown) {
  if (!Array.isArray(cart) || cart.length === 0) {
    const e: any = new Error("Invalid cart format. Cart must be a non-empty array of valid items.");
    e.status = 400;
    throw e;
  }
  cart.forEach((item: any, idx: number) => {
    if (
      !item ||
      typeof item.item_name !== "string" ||
      typeof item.price !== "number" ||
      typeof item.quantityOrdered !== "number" ||
      item.price <= 0 ||
      item.quantityOrdered <= 0 ||
      (item.image !== undefined && typeof item.image !== "string")
    ) {
      const e: any = new Error(`Invalid cart item at index ${idx}`);
      e.status = 400;
      throw e;
    }
  });
  return cart;
}

/**
 * Validates a membership signup object. Throws an error if invalid.
 */
export function validateMembershipSignupOrThrow(signup: any) {
  if (!signup || typeof signup !== "object") {
    throw new Error("Signup data is required and must be an object.");
  }
  const requiredFields = [
    "user_id",
    "gym_id",
    "first_name",
    "last_name",
    "email"
  ];
  for (const field of requiredFields) {
    if (!signup[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  if (typeof signup.email !== "string" || !signup.email.includes("@")) {
    throw new Error("A valid email is required.");
  }
  if (typeof signup.first_name !== "string" || typeof signup.last_name !== "string") {
    throw new Error("First and last name must be strings.");
  }
  // Optionally add more validation as needed
  return signup;
}
