// src/pages/member/MemberProfile.tsx
import { useEffect, useMemo, useState, type FC } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

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

const splitName = (name?: string) => {
  const n = (name || "").trim();
  if (!n) return { first_name: "", last_name: "" };
  const [first, ...rest] = n.split(/\s+/);
  return { first_name: first, last_name: rest.join(" ") };
};

const MemberProfile: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditRoute = location.pathname.endsWith("/edit");

  const [form, setForm] = useState<ProfileForm>({
    first_name: "",
    last_name: "",
    email: "",
    phone_e164: "",
    address: emptyAddress,
    avatar_url: undefined,
    communication_prefs: { email: true, sms: false, push: false },
    marketing_op_in: false,
    class_preferences: [],
    injury_notes: "",
  });

  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const me = await ApiHandler.getMyProfile();
        const nameFromUser = me?.name ?? `${me?.first_name ?? ""} ${me?.last_name ?? ""}`;
        const { first_name, last_name } = {
          first_name: me?.profile?.first_name ?? me?.first_name ?? splitName(nameFromUser).first_name,
          last_name: me?.profile?.last_name ?? me?.last_name ?? splitName(nameFromUser).last_name,
        };

        const loaded: ProfileForm = {
          first_name,
          last_name,
          email: me?.email ?? me?.profile?.email ?? "",
          phone_e164: me?.profile?.phone_e164 ?? "",
          address: { ...emptyAddress, ...(me?.profile?.address ?? {}) },
          avatar_url: me?.profile?.avatar_url,
          communication_prefs: {
            email: !!me?.profile?.communication_prefs?.email,
            sms: !!me?.profile?.communication_prefs?.sms,
            push: !!me?.profile?.communication_prefs?.push,
          },
          marketing_op_in: !!me?.profile?.marketing_op_in,
          class_preferences: Array.isArray(me?.profile?.class_preferences)
            ? me.profile.class_preferences
            : [],
          injury_notes: me?.profile?.injury_notes ?? "",
        };

        setForm(loaded);
        setAvatarPreview(loaded.avatar_url);
      } catch (e: any) {
        setMsg(e?.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setField = (k: keyof ProfileForm, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const setAddr = (k: keyof Address, v: string) =>
    setForm((p) => ({ ...p, address: { ...p.address, [k]: v } }));
  const setPref = (k: "email" | "sms" | "push", v: boolean) =>
    setForm((p) => ({ ...p, communication_prefs: { ...p.communication_prefs, [k]: v } }));

  const hasExistingProfile = useMemo(
    () =>
      Boolean(form.first_name?.trim() || form.last_name?.trim() || form.email?.trim()) ||
      Boolean(form.phone_e164?.trim()) ||
      hasAnyAddress(form.address),
    [form]
  );

  const onPickAvatar = async (file: File) => {
    try {
      setSaving(true);
      const { avatar_url } = await ApiHandler.uploadMyAvatar(file);
      setAvatarPreview(avatar_url);
      setForm((p) => ({ ...p, avatar_url }));
      setMsg("Avatar updated.");
    } catch (e: any) {
      setMsg(e?.message || "Avatar upload failed.");
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setSaving(true);

    try {
      const payload: any = {};
      if (form.first_name?.trim()) payload.first_name = form.first_name.trim();
      if (form.last_name?.trim()) payload.last_name = form.last_name.trim();
      if (form.email?.trim()) payload.email = form.email.trim();

      const profile: any = {};
      if (form.phone_e164?.trim()) profile.phone_e164 = normalizePhoneE164(form.phone_e164);

      const a = form.address;
      if (a.line1 || a.line2 || a.city || a.state || a.postal_code || a.country)
        profile.address = a;

      if (form.avatar_url) profile.avatar_url = form.avatar_url;

      profile.communication_prefs = form.communication_prefs;
      profile.marketing_op_in = !!form.marketing_op_in;
      profile.class_preferences = form.class_preferences;
      if (form.injury_notes?.trim()) profile.injury_notes = form.injury_notes.trim();

      if (Object.keys(profile).length) payload.profile = profile;

      await ApiHandler.updateMyProfile(payload);

      setMsg("Saved!");
      navigate("/member/profile", { replace: true });
    } catch (e: any) {
      setMsg(e?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="mp-loading">Loading…</p>;

  /* -------- VIEW (modal) -------- */
  if (!isEditRoute) {
    return (
      <div
        className="profile-modal-overlay"
        role="dialog"
        aria-modal="true"
        onClick={() => navigate(-1)}
      >
        <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
          <header className="profile-modal__header">
            <h2>Member Profile</h2>
            <div className="profile-modal__actions">
              <Link to="/member/profile/edit" className="mp-btn mp-btn-primary">
                Edit
              </Link>
              <button className="profile-modal__close" onClick={() => navigate(-1)}>
                Close
              </button>
            </div>
          </header>

          <div className="mp-field">
            <div className="mp-label">Avatar</div>
            <img
              src={avatarPreview || "/placeholder-avatar.png"}
              alt="Avatar"
              className="profile-modal__avatar"
            />
          </div>

          <div className="mp-field">
            <div className="mp-label">Name</div>
            <div>{(form.first_name + " " + form.last_name).trim() || "—"}</div>
          </div>

          <div className="mp-field">
            <div className="mp-label">Email</div>
            <div>{form.email || "—"}</div>
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

          <fieldset className="mp-fieldset">
            <legend className="mp-legend">Preferences</legend>
            <div className="mp-row">
              <div>Email: {form.communication_prefs.email ? "On" : "Off"}</div>
              <div>SMS: {form.communication_prefs.sms ? "On" : "Off"}</div>
              <div>Push: {form.communication_prefs.push ? "On" : "Off"}</div>
            </div>
            <div className="mp-field">
              <div className="mp-label">Marketing</div>
              <div>{form.marketing_op_in ? "Opted in" : "Opted out"}</div>
            </div>
          </fieldset>

          <div className="mp-field">
            <div className="mp-label">Class Preferences</div>
            <div>{form.class_preferences.length ? form.class_preferences.join(", ") : "—"}</div>
          </div>

          <div className="mp-field">
            <div className="mp-label">Injury Notes</div>
            <div>{form.injury_notes?.trim() || "—"}</div>
          </div>

          {msg && (
            <p className="mp-status" role="status" aria-live="polite">
              {msg}
            </p>
          )}
        </div>
      </div>
    );
  }

  /* -------- EDIT (page) -------- */
  return (
    <section className="mp-wrapper" aria-labelledby="member-profile-heading">
      <h1 id="member-profile-heading" className="mp-title">
        Edit Profile
      </h1>

      <form className="mp-form" onSubmit={onSubmit} noValidate>
        <div className="mp-field">
          <label className="mp-label">Avatar</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={avatarPreview || "/placeholder-avatar.png"}
              alt="Avatar preview"
              className="profile-modal__avatar"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && onPickAvatar(e.target.files[0])}
              disabled={saving}
            />
          </div>
        </div>

        <div className="mp-field">
          <label className="mp-label" htmlFor="first">
            First name
          </label>
          <input
            id="first"
            className="mp-input"
            value={form.first_name}
            onChange={(e) => setField("first_name", e.target.value)}
            autoComplete="given-name"
          />
        </div>

        <div className="mp-field">
          <label className="mp-label" htmlFor="last">
            Last name
          </label>
          <input
            id="last"
            className="mp-input"
            value={form.last_name}
            onChange={(e) => setField("last_name", e.target.value)}
            autoComplete="family-name"
          />
        </div>

        <div className="mp-field">
          <label className="mp-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="mp-input"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            type="email"
            autoComplete="email"
          />
        </div>

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
                onChange={(e) =>
                  setAddr("state", e.target.value.toUpperCase())
                }
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
              onChange={(e) =>
                setAddr("country", e.target.value.toUpperCase())
              }
              placeholder="US"
              autoComplete="country"
              maxLength={2}
            />
          </div>
        </fieldset>

        <fieldset className="mp-fieldset">
          <legend className="mp-legend">Preferences</legend>

          <div className="mp-row">
            <label className="mp-checkbox">
              <input
                type="checkbox"
                checked={form.communication_prefs.email}
                onChange={(e) => setPref("email", e.target.checked)}
              />
              {" "}Email
            </label>

            <label className="mp-checkbox">
              <input
                type="checkbox"
                checked={form.communication_prefs.sms}
                onChange={(e) => setPref("sms", e.target.checked)}
              />
              {" "}SMS
            </label>

            <label className="mp-checkbox">
              <input
                type="checkbox"
                checked={form.communication_prefs.push}
                onChange={(e) => setPref("push", e.target.checked)}
              />
              {" "}Push
            </label>
          </div>

          <label className="mp-checkbox" style={{ marginTop: 8 }}>
            <input
              type="checkbox"
              checked={form.marketing_op_in}
              onChange={(e) => setField("marketing_op_in", e.target.checked)}
            />
            {" "}Receive marketing updates
          </label>
        </fieldset>

        <div className="mp-field">
          <label className="mp-label" htmlFor="class_prefs">
            Class Preferences
          </label>
          <input
            id="class_prefs"
            className="mp-input"
            value={form.class_preferences.join(", ")}
            onChange={(e) =>
              setField(
                "class_preferences",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder="e.g. HIIT, Yoga, Strength"
          />
        </div>

        <div className="mp-field">
          <label className="mp-label" htmlFor="injury">
            Injury Notes
          </label>
          <textarea
            id="injury"
            className="mp-input"
            rows={3}
            value={form.injury_notes || ""}
            onChange={(e) => setField("injury_notes", e.target.value)}
          />
        </div>

        <div className="mp-actions">
          <Link
            to="/member/profile"
            className="mp-btn mp-btn-ghost"
            aria-disabled={saving}
          >
            Cancel
          </Link>
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
