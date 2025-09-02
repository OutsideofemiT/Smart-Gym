// Super-light E.164 normalizer (good enough for now).
// For production-quality parsing, swap to libphonenumber-js later.
export function normalizePhoneE164(input: string, defaultCountryCode = "1"): string {
  if (!input) return "";
  const trimmed = String(input).trim();

  // Already looks like +<digits> — keep digits only after +
  if (/^\+[\d\s()-]+$/.test(trimmed)) {
    return "+" + trimmed.replace(/[^\d]/g, "");
  }

  // Otherwise strip to digits
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return "";

  // If it already starts with a likely country code (not 0), keep as-is
  if (/^[1-9]\d{7,14}$/.test(digits)) {
    return `+${digits}`;
  }

  // Fallback: prepend default country code (US=1)
  return `+${defaultCountryCode}${digits}`;
}
