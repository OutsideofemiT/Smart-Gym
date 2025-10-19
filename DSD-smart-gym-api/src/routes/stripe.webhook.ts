// src/routes/stripe.webhook.ts
import { Router } from "express";
import Stripe from "stripe";
import bodyParser from "body-parser";
import { CafePurchase } from "../models/cafepurchase.model";

const router = Router();

// Use your account's default API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// Small tagged logger to keep console readable
const log = (msg: string, ...args: any[]) => console.log(`[STRIPE] ${msg}`, ...args);

// Central processor: accepts a Stripe.Event-like object and performs the same actions
async function processStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      log("✅ checkout.session.completed %s", session.id);
      try {
          // If this session is for membership signup, create the MemberProfile
          const kind = (session.metadata as any)?.kind;
          if (kind === "membership") {
            try {
              const signupRaw = (session.metadata as any)?.signup;
              const signup = typeof signupRaw === "string" ? JSON.parse(signupRaw) : signupRaw;
              const email = signup?.email || session.customer_email;
              if (!email) {
                log("Membership session completed but no email present in metadata");
              } else {
                const { MemberProfile } = await import("../models/memberProfile.model");
                // Avoid duplicate profiles
                const existing = await MemberProfile.findOne({ email: String(email).toLowerCase() });
                if (!existing) {
                  const profilePayload: any = {
                    first_name: signup?.first_name || signup?.name || signup?.firstName || "",
                    last_name: signup?.last_name || signup?.lastName || "",
                    email: String(email).toLowerCase(),
                    membership_status: "active",
                    membership_tier: (signup?.plan || "standard").toLowerCase(),
                    join_date: new Date(),
                    gym_id: session.metadata?.gymId ? session.metadata.gymId : undefined,
                  };
                  // If membership requires a linked user account, this could be extended to set user_id
                  await MemberProfile.create(profilePayload);
                  log("Created MemberProfile for %s", email);
                } else {
                  log("MemberProfile for %s already exists", email);
                }
              }
            } catch (err: any) {
              log("Failed to create MemberProfile from membership session: %s", err?.message || err);
            }
          }

        const purchaseId = (session.metadata as any)?.purchaseId;
        if (purchaseId) {
          try {
            await CafePurchase.findByIdAndUpdate(
              purchaseId,
              {
                $set: {
                  status: "succeeded",
                  paid_at: new Date(),
                  "stripe.checkout_session_id": session.id,
                  "stripe.amount_total_cents": session.amount_total ? Number(session.amount_total) : undefined,
                },
              },
              { new: true, runValidators: true }
            );
            log("Marked purchase %s as succeeded", purchaseId);
          } catch (err: any) {
            // If validation fails because historical documents are inconsistent
            // retry without validators so the webhook can still finalize payment.
            if (err && err.name === "ValidationError") {
              log(
                "Validation when finalizing purchase %s: %s — retrying update without validators",
                purchaseId,
                err.message
              );
              await CafePurchase.findByIdAndUpdate(
                purchaseId,
                {
                  $set: {
                    status: "succeeded",
                    paid_at: new Date(),
                    "stripe.checkout_session_id": session.id,
                    "stripe.amount_total_cents": session.amount_total ? Number(session.amount_total) : undefined,
                  },
                },
                { new: true, runValidators: false }
              );
              log("Marked purchase %s as succeeded (forced, validators skipped)", purchaseId);
            } else {
              throw err;
            }
          }
        } else {
          log("No purchaseId found in session metadata");
        }
      } catch (err: any) {
        log("Failed to finalize purchase in webhook: %s", err?.message || err);
      }
      break;
    }
    case "charge.succeeded": {
      const charge = event.data.object as Stripe.Charge;
      log("💸 charge.succeeded %s", charge.id);
      try {
        const purchaseId = (charge.metadata as any)?.purchaseId;
        let resolvedId = purchaseId;
        if (!resolvedId && charge.payment_intent) {
          const pi = await stripe.paymentIntents.retrieve(String(charge.payment_intent));
          resolvedId = (pi.metadata as any)?.purchaseId;
        }
        if (resolvedId) {
          const existing = await CafePurchase.findById(String(resolvedId));
          if (existing && existing.status !== "succeeded") {
            try {
              await CafePurchase.findByIdAndUpdate(
                String(resolvedId),
                {
                  $set: {
                    status: "succeeded",
                    paid_at: new Date(),
                    "stripe.charge_id": charge.id,
                    "stripe.amount_total_cents": charge.amount,
                  },
                },
                { new: true, runValidators: true }
              );
              log("Marked purchase %s as succeeded via charge %s", resolvedId, charge.id);
            } catch (err: any) {
              if (err && err.name === "ValidationError") {
                log(
                  "Validation when finalizing purchase %s via charge %s: %s — retrying without validators",
                  resolvedId,
                  charge.id,
                  err.message
                );
                await CafePurchase.findByIdAndUpdate(
                  String(resolvedId),
                  {
                    $set: {
                      status: "succeeded",
                      paid_at: new Date(),
                      "stripe.charge_id": charge.id,
                      "stripe.amount_total_cents": charge.amount,
                    },
                  },
                  { new: true, runValidators: false }
                );
                log("Marked purchase %s as succeeded via charge %s (forced)", resolvedId, charge.id);
              } else {
                throw err;
              }
            }
          } else {
            log("Purchase %s already succeeded or not found", resolvedId);
          }
        } else {
          log("No purchaseId found on charge or its payment intent");
        }
      } catch (err: any) {
        log("Failed to finalize purchase from charge event: %s", err?.message || err);
      }
      break;
    }
    case "charge.updated": {
      const charge = event.data.object as Stripe.Charge;
      if (charge.status === "succeeded" || charge.paid) {
        try {
          const purchaseId = (charge.metadata as any)?.purchaseId;
          let resolvedId = purchaseId;
          if (!resolvedId && charge.payment_intent) {
            const pi = await stripe.paymentIntents.retrieve(String(charge.payment_intent));
            resolvedId = (pi.metadata as any)?.purchaseId;
          }
          if (resolvedId) {
            const existing = await CafePurchase.findById(String(resolvedId));
            if (existing && existing.status !== "succeeded") {
              try {
                await CafePurchase.findByIdAndUpdate(
                  String(resolvedId),
                  {
                    $set: {
                      status: "succeeded",
                      paid_at: new Date(),
                      "stripe.charge_id": charge.id,
                      "stripe.amount_total_cents": charge.amount,
                    },
                  },
                  { new: true, runValidators: true }
                );
                log("Marked purchase %s as succeeded via charge.updated %s", resolvedId, charge.id);
              } catch (err: any) {
                if (err && err.name === "ValidationError") {
                  log(
                    "Validation when finalizing purchase %s via charge.updated %s: %s — retrying without validators",
                    resolvedId,
                    charge.id,
                    err.message
                  );
                  await CafePurchase.findByIdAndUpdate(
                    String(resolvedId),
                    {
                      $set: {
                        status: "succeeded",
                        paid_at: new Date(),
                        "stripe.charge_id": charge.id,
                        "stripe.amount_total_cents": charge.amount,
                      },
                    },
                    { new: true, runValidators: false }
                  );
                  log("Marked purchase %s as succeeded via charge.updated %s (forced)", resolvedId, charge.id);
                } else {
                  throw err;
                }
              }
            } else {
              log("Purchase %s already succeeded or not found (charge.updated)", resolvedId);
            }
          } else {
            log("No purchaseId found on charge.updated or its payment intent");
          }
        } catch (err: any) {
          log("Failed to finalize purchase from charge.updated event: %s", err?.message || err);
        }
      }
      break;
    }
    default: {
      log("ℹ️ Unhandled event: %s", event.type);
    }
  }
}

// Signed webhook entrypoint (Stripe will call this in production)
// This router is mounted at /api/stripe/webhook in app.ts, so use root (/) here.
router.post(
  "/",
  // IMPORTANT: raw body required for signature verification
  bodyParser.raw({ type: "application/json" }),
  async (req: any, res: any) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    if (!sig) return res.status(400).send("Missing Stripe-Signature header");

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body, // raw Buffer (do NOT JSON.parse)
        sig,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
    } catch (err: any) {
      log("❌ Webhook verification failed: %s", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ✅ Respond fast to stop Stripe retries; do work after this
    res.status(200).json({ received: true });

    // Process the event asynchronously
    processStripeEvent(event).catch((err) => log("Processing error: %s", err?.message || err));
  }
);



export default router;
