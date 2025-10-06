
import { Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import Stripe from "stripe";
import { IAuthenticatedRequest } from "../types/interface";

import { MemberProfile } from "../models/memberProfile.model";
import { validateMembershipSignupOrThrow } from "../utils/validators";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil" as const,
});

export const membershipSignupHandler = async (
  req: IAuthenticatedRequest,
  res: Response
) => {
  try {
    console.log("membershipSignupHandler hit");
    console.log("body:", req.body);
    const { signup, success_url, cancel_url } = req.body ?? {};
    // Validate the signup data (replace with your actual validator)
    const ValidSignup = validateMembershipSignupOrThrow(signup);

    const email = signup?.email || req.body?.email;
    if (!email) {
      return res.status(400).json({ error: "Email is required for membership signup." });
    }

    // Duplicate email check
    const existingProfile = await MemberProfile.findOne({ email });
    if (existingProfile) {
      return res.status(409).json({ error: "A member with this email already exists." });
    }

    // Dynamic pricing based on plan
    let unit_amount = 5000; // default $50
    if (signup?.plan) {
      if (signup.plan.toLowerCase().includes("plus")) unit_amount = 5900;
      if (signup.plan.toLowerCase().includes("premium")) unit_amount = 9900;
      if (signup.plan.toLowerCase().includes("standard")) unit_amount = 2900;
    }

    // Save the member profile to the database (MongoDB will assign user_id)
    const memberProfile = await MemberProfile.create({
      ...ValidSignup,
      email,
    });

    // Create a Stripe Checkout session for membership
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Smart Gym Membership - ${signup?.plan || "Standard"}`,
            },
            unit_amount,
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url:
        success_url ??
        `${process.env.CLIENT_URL}/membership?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        cancel_url ??
        `${process.env.CLIENT_URL}/membership?checkout=cancel`,
      metadata: {
        kind: "membership",
        profileId: String(memberProfile._id),
        signup: JSON.stringify(ValidSignup),
      },
    });

    res.status(200).json({ id: session.id, url: session.url, profileId: memberProfile._id });
  } catch (err: any) {
    console.error("Membership signup error:", err);
    res.status(400).json({ error: err.message || "Failed to create membership session" });
  }
};
