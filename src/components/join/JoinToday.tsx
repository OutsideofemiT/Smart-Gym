// src/pages/nonmember/joinToday.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiHandler from "../../utils/ApiHandler";
import "../../styles/JoinToday.css";

/** Types */
type Plan = "standard" | "plus" | "premium";
type JoinPayload = { name: string; email: string; phone: string; plan: Plan };
type FormState = JoinPayload;

/** Amenity data */
const PLAN_INFO: Record<
  Plan,
  { label: string; price: string; blurb: string; perks: string[] }
> = {
  standard: {
    label: "Standard",
    price: "$29/mo",
    blurb: "All the essentials to get moving—great for solo workouts.",
    perks: [
      "24/7 gym floor access",
      "Locker rooms & showers",
      "Unlimited QR check-in",
      "Access to Smart Gym app",
      "1 free guest pass / month",
    ],
  },
  plus: {
    label: "Plus",
    price: "$59/mo",
    blurb: "Step up your routine with classes and recovery—our most popular plan.",
    perks: [
      "Everything in Standard",
      "Unlimited group classes",
      "Sauna & cold plunge access",
      "Priority class booking",
      "5% café discount",
    ],
  },
  premium: {
    label: "Premium",
    price: "$99/mo",
    blurb: "Coaching, recovery, and perks—built for results and accountability.",
    perks: [
      "Everything in Plus",
      "2 PT sessions / month",
      "Recovery lounge + compression boots",
      "Nutrition starter plan",
      "10% café discount",
      "Priority support",
    ],
  },
};

/** Small plan card */
function PlanCard({
  plan,
  active,
  onSelect,
}: {
  plan: Plan;
  active: boolean;
  onSelect: (p: Plan) => void;
}) {
  const info = PLAN_INFO[plan];
  return (
    <button
      type="button"
      className={`join-plan${active ? " is-active" : ""}`}
      aria-pressed={active}
      onClick={() => onSelect(plan)}
    >
      <div className="join-plan__row">
        <h3 className="join-plan__title">{info.label}</h3>
        <span className="join-plan__price">{info.price}</span>
      </div>

      <p className="join-plan__blurb">{info.blurb}</p>

      <ul className="join-plan__list">
        {info.perks.map((perk) => (
          <li key={perk}>{perk}</li>
        ))}
      </ul>

      {active && <p className="join-plan__selected">Selected</p>}
    </button>
  );
}

export default function JoinToday() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    plan: "standard",
  });
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const planLabel = useMemo(() => PLAN_INFO[form.plan].label, [form.plan]);

  const isValidEmail = (v: string) => /\S+@\S+\.\S+/.test(v);
  const isValidPhone = (v: string) => v.replace(/[^\d]/g, "").length >= 10;

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "plan" ? (value as Plan) : value,
    }));
  };

  const onSelectPlan = (p: Plan) => setForm((prev) => ({ ...prev, plan: p }));

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    // Basic client validation
    if (!form.name || !form.email || !form.phone || !password || !confirmPassword) {
      setMessage("Please fill out all fields.");
      setLoading(false);
      return;
    }
    if (!isValidEmail(form.email)) {
      setMessage("Please enter a valid email.");
      setLoading(false);
      return;
    }
    if (!isValidPhone(form.phone)) {
      setMessage("Please enter a valid phone number.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // Optional: pass a gym_id if you have one in localStorage.
      // If not provided, the backend will use DEFAULT_GYM_ID.
      const gym_id = localStorage.getItem("gym_id") || undefined;

      // Create the member account and auto-login (JWT saved by ApiHandler.signup)
      await ApiHandler.signup(form.name, form.email, password, gym_id);

      // Future: send phone/plan to a profile endpoint if desired
      // await ApiHandler.put("/users/me/profile", { phone: form.phone, plan: form.plan });

      setMessage("Welcome to Smart Gym! Redirecting…");
      navigate("/member", { replace: true });
    } catch (err: any) {
      console.error("Signup error:", err);
      setMessage(err?.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="join">
      <div className="join__wrap">
        <header className="join__header">
          <h1 className="join__title">Join Today</h1>
          <p className="join__lead">
            Become part of Smart Gym—fast check-in, real-time class booking, and
            a community that moves with you.
          </p>
        </header>

        <div className="join__cols">
          {/* Left: Plans */}
          <div className="join__plans">
            <div className="join__intro">
              <h2>Choose your membership</h2>
              <p>
                Pick the plan that fits your goals. You can upgrade or downgrade
                any time.
              </p>
            </div>

            <div className="join__grid">
              <PlanCard
                plan="standard"
                active={form.plan === "standard"}
                onSelect={onSelectPlan}
              />
              <PlanCard
                plan="plus"
                active={form.plan === "plus"}
                onSelect={onSelectPlan}
              />
              <PlanCard
                plan="premium"
                active={form.plan === "premium"}
                onSelect={onSelectPlan}
              />
            </div>
          </div>

          {/* Right: Sticky form */}
          <div className="join__formCol">
            <div className="join__panel">
              <div className="join__panelHead">
                <h2>Get Started</h2>
                <span className="join__selected">
                  Selected: <strong>{planLabel}</strong>
                </span>
              </div>

              <form onSubmit={onSubmit} className="join__form">
                <div className="join__field">
                  <label htmlFor="name" className="join__label">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={onChange}
                    placeholder="Jane Doe"
                    required
                    className="join__input"
                  />
                </div>

                <div className="join__field">
                  <label htmlFor="email" className="join__label">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onChange}
                    placeholder="your@example.com"
                    required
                    className="join__input"
                  />
                </div>

                <div className="join__field">
                  <label htmlFor="phone" className="join__label">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={onChange}
                    placeholder="(555) 555-1234"
                    required
                    className="join__input"
                  />
                </div>

                {/* New: password + confirm */}
                <div className="join__field">
                  <label htmlFor="password" className="join__label">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                    className="join__input"
                  />
                </div>

                <div className="join__field">
                  <label htmlFor="confirm" className="join__label">
                    Confirm Password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="join__input"
                  />
                </div>

                <div className="join__field">
                  <label htmlFor="plan" className="join__label">
                    Membership
                  </label>
                  <select
                    id="plan"
                    name="plan"
                    value={form.plan}
                    onChange={onChange}
                    className="join__select"
                  >
                    <option value="standard">
                      Standard — {PLAN_INFO.standard.price}
                    </option>
                    <option value="plus">
                      Plus — {PLAN_INFO.plus.price}
                    </option>
                    <option value="premium">
                      Premium — {PLAN_INFO.premium.price}
                    </option>
                  </select>
                  <p className="join__help">{PLAN_INFO[form.plan].blurb}</p>
                </div>

                <div className="join__actions">
                  <button type="submit" disabled={loading} className="join__submit">
                    {loading ? "Submitting..." : "Create Account"}
                  </button>
                </div>

                {message && (
                  <p className="join__status" role="status">
                    {message}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
