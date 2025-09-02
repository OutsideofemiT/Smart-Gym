// src/pages/member/MemberProfile.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// Adjust paths if your project structure differs
import ApiHandler from "../utils/ApiHandler";
import { normalizePhoneE164 } from "../utils/profileValidators";
import type { Address, ProfileForm } from "../types/MemberProfile";

import "../styles/memberProfile.css";

const emptyAddress: Address = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
};

function hasAnyAddress(a?: Partial<Address> | null): boolean {
  if (!a) return false;
  return Boolean(a.line1 || a.line2 || a.city || a.state || a.postal_code || a.country);
}

const MemberProfile: React.FC = () => {
  const navigate = useNavigate();

  // form state
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    phone_e164: "",
    address: emptyAddress,
  });

  // ui state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // view/edit mode
  const [isEditing, setIsEditing] = useState<boolean>(true); // default; will set correctly after load

  // load current profile once
  useEffect(() => {
    (async () => {
      try {
        const me = await ApiHandler.getMyProfile();

        const loadedForm: ProfileForm = {
          name: me?.name ?? "",
          phone_e164: me?.profile?.phone_e164 ?? "",
          address: {
            ...emptyAddress,
            ...(me?.profile?.address ?? {}),
          },
        };

        setForm(loadedForm);

        // decide initial mode:
        // If the user already has *any* profile data (name OR phone OR any address),
        // start in View mode; otherwise show Create form.
        const hasExisting =
          Boolean(loadedForm.name?.trim()) ||
          Boolean(loadedForm.phone_e164?.trim()) ||
          hasAnyAddress(loadedForm.address);

        setIsEditing(!hasExisting); // view if existing; edit if not
      } catch (e: any) {
        setMsg(e?.message || "Failed to load profile.");
        // Fall back to edit mode so they can create a profile
        setIsEditing(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // helpers
  const setField = (k: keyof ProfileForm, v: any) =>
    setForm((p) => ({ ...p, [k]: v }));

  const setAddr = (k: keyof Address, v: string) =>
    setForm((p) => ({ ...p, address: { ...p.address, [k]: v } }));

  // computed for button text
  const hasExistingProfile = useMemo(() => {
    return (
      Boolean(form.name?.trim()) ||
      Boolean(form.phone_e164?.trim()) ||
      hasAnyAddress(form.address)
    );
  }, [form]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setSaving(true);

    try {
      // build minimal payload (only send what you changed / want to store)
      const payload: any = {};
      if (form.name?.trim()) payload.name = form.name.trim();

      const profile: any = {};
      if (form.phone_e164?.trim()) {
        profile.phone_e164 = normalizePhoneE164(form.phone_e164);
      }

      const a = form.address;
      const hasAddr =
        a.line1 || a.line2 || a.city || a.state || a.postal_code || a.country;
      if (hasAddr) profile.address = a;

      if (Object.keys(profile).length) payload.profile = profile;

      await ApiHandler.updateMyProfile(payload);

      setMsg("Saved!");
      // After a successful save, switch to read-only View mode.
      setIsEditing(false);
      // Optional: navigate to the dashboard after a short delay
      // setTimeout(() => navigate("/member", { replace: true }), 600);
    } catch (e: any) {
      setMsg(e?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="mp-loading">Loading…</p>;

  /* --------------------- VIEW MODE --------------------- */
  if (!isEditing) {
    return (
      <section className="mp-wrapper" aria-labelledby="member-profile-heading">
        <h1 id="member-profile-heading" className="mp-title">
          Member Profile
        </h1>

        <div className="mp-form" role="group" aria-label="Saved profile details">
          <div className="mp-field">
            <div className="mp-label">Name</div>
            <div>{form.name || "—"}</div>
          </div>

          <div className="mp-field">
            <div className="mp-label">Phone</div>
            <div>{form.phone_e164 || "—"}</div>
          </div>

          <fieldset className="mp-fieldset">
            <legend className="mp-legend">Address</legend>

            <div className="mp-field">
              <div className="mp-label">Line 1</div>
              <div>{form.address.line1 || "—"}</div>
            </div>

            <div className="mp-field">
              <div className="mp-label">Line 2</div>
              <div>{form.address.line2 || "—"}</div>
            </div>

            <div className="mp-row">
              <div className="mp-field">
                <div className="mp-label">City</div>
                <div>{form.address.city || "—"}</div>
              </div>

              <div className="mp-field">
                <div className="mp-label">State</div>
                <div>{form.address.state || "—"}</div>
              </div>

              <div className="mp-field">
                <div className="mp-label">Postal Code</div>
                <div>{form.address.postal_code || "—"}</div>
              </div>
            </div>

            <div className="mp-field">
              <div className="mp-label">Country</div>
              <div>{form.address.country || "—"}</div>
            </div>
          </fieldset>

          <div className="mp-actions">
            <button
              type="button"
              className="mp-btn mp-btn-ghost"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
            <button
              type="button"
              className="mp-btn mp-btn-primary"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          </div>

          {msg && (
            <p className="mp-status" role="status" aria-live="polite">
              {msg}
            </p>
          )}
        </div>
      </section>
    );
  }

  /* --------------------- EDIT MODE (CREATE or UPDATE) --------------------- */
  return (
    <section className="mp-wrapper" aria-labelledby="member-profile-heading">
      <h1 id="member-profile-heading" className="mp-title">
        Member Profile
      </h1>

      <form className="mp-form" onSubmit={onSubmit} noValidate>
        {/* NAME */}
        <div className="mp-field">
          <label className="mp-label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className="mp-input"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Full name"
            autoComplete="name"
          />
        </div>

        {/* PHONE */}
        <div className="mp-field">
          <label className="mp-label" htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            className="mp-input"
            value={form.phone_e164}
            onChange={(e) => setField("phone_e164", e.target.value)}
            placeholder="+15555551234"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>

        {/* ADDRESS */}
        <fieldset className="mp-fieldset">
          <legend className="mp-legend">Address</legend>

          <div className="mp-field">
            <label className="mp-label" htmlFor="line1">
              Line 1
            </label>
            <input
              id="line1"
              className="mp-input"
              value={form.address.line1}
              onChange={(e) => setAddr("line1", e.target.value)}
              autoComplete="address-line1"
            />
          </div>

          <div className="mp-field">
            <label className="mp-label" htmlFor="line2">
              Line 2
            </label>
            <input
              id="line2"
              className="mp-input"
              value={form.address.line2 || ""}
              onChange={(e) => setAddr("line2", e.target.value)}
              autoComplete="address-line2"
            />
          </div>

          <div className="mp-row">
            <div className="mp-field">
              <label className="mp-label" htmlFor="city">
                City
              </label>
              <input
                id="city"
                className="mp-input"
                value={form.address.city}
                onChange={(e) => setAddr("city", e.target.value)}
                autoComplete="address-level2"
              />
            </div>

            <div className="mp-field">
              <label className="mp-label" htmlFor="state">
                State
              </label>
              <input
                id="state"
                className="mp-input"
                value={form.address.state}
                onChange={(e) => setAddr("state", e.target.value.toUpperCase())}
                placeholder="TX"
                autoComplete="address-level1"
                maxLength={2}
              />
            </div>

            <div className="mp-field">
              <label className="mp-label" htmlFor="postal">
                Postal Code
              </label>
              <input
                id="postal"
                className="mp-input"
                value={form.address.postal_code}
                onChange={(e) => setAddr("postal_code", e.target.value)}
                inputMode="numeric"
                autoComplete="postal-code"
              />
            </div>
          </div>

          <div className="mp-field">
            <label className="mp-label" htmlFor="country">
              Country
            </label>
            <input
              id="country"
              className="mp-input"
              value={form.address.country}
              onChange={(e) => setAddr("country", e.target.value.toUpperCase())}
              placeholder="US"
              autoComplete="country"
              maxLength={2}
            />
          </div>
        </fieldset>

        {/* ACTIONS */}
        <div className="mp-actions">
          <button
            type="button"
            className="mp-btn mp-btn-ghost"
            onClick={() => setIsEditing(false)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="mp-btn mp-btn-primary"
            disabled={saving}
            aria-busy={saving}
          >
            {hasExistingProfile ? "Save Changes" : "Create Profile"}
          </button>
        </div>

        {msg && (
          <p className="mp-status" role="status" aria-live="polite">
            {msg}
          </p>
        )}
      </form>
    </section>
  );
};

export default MemberProfile;
