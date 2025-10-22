
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
    const { signup: rawSignup, success_url, cancel_url } = req.body ?? {};

    // Build a complete signup payload using authenticated user info when available
    const signup = {
      ...rawSignup,
    } as any;

    // Attach user and gym ids from req.user (requireAuth should set these)
    const user_id = req.user?.user_id || req.user?.sub || req.user?._id;
    const gym_id = req.user?.gym_id || req.user?._id;
    if (user_id) signup.user_id = signup.user_id || user_id;
    if (gym_id) signup.gym_id = signup.gym_id || gym_id;

    // If caller provided a single `name` string, try to split into first/last
    if (!signup.first_name && !signup.last_name && typeof signup.name === "string") {
      const parts = signup.name.trim().split(/\s+/);
      signup.first_name = parts.shift() || "";
      signup.last_name = parts.join(" ") || "";
    }

  // Validate the signup data (this will throw if required fields missing)
  const ValidSignup = validateMembershipSignupOrThrow(signup);

  // Debug: log constructed and validated signup so we can confirm req.user fields
  console.log("constructed signup:", signup);
  console.log("ValidSignup:", ValidSignup);

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

    // Create a Stripe Checkout session for membership
    // We do NOT create the MemberProfile here to avoid creating unpaid profiles.
    // The MemberProfile will be created in the Stripe webhook after successful payment.
    const buildClientUrl = (path: string) => {
      const client = process.env.CLIENT_URL || "https://smart-gym-jxxx.onrender.com";
      let url = `${client}${path}`;
      if (process.env.CLIENT_IS_NOT_SPA === "1") {
        if (!url.endsWith("/index.html")) {
          url = url.replace(/\/+$/, "") + "/index.html";
        }
      }
      return url;
    };

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
      success_url: success_url ?? buildClientUrl(
        `/nonmember/membership?checkout=success&session_id={CHECKOUT_SESSION_ID}`
      ),
      cancel_url: cancel_url ?? buildClientUrl(`/nonmember/membership?checkout=cancel`),
      metadata: {
        kind: "membership",
        signup: JSON.stringify(ValidSignup),
      },
    });

    res.status(200).json({ id: session.id, url: session.url });
  } catch (err: any) {
    console.error("Membership signup error:", err);
    res.status(400).json({ error: err.message || "Failed to create membership session" });
  }
};
