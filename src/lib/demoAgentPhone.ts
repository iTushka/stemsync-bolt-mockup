/**
 * Phone normalization for demo-agent login — mirrors the phone-based
 * identity pattern already built and confirmed working live in
 * tuvara-faltagent (tuvara-sales Krav 2), not copied verbatim: that app
 * defaults a bare 0-leading number to Bangladesh's +880 because every field
 * agent there is Bangladeshi. This app's demo agents (Tushar plus a
 * handful of others) aren't all in one country, so there's no safe default
 * country code to guess — agents must type their number with a leading +
 * and country code (e.g. +46701234567); see isValidDemoAgentPhone.
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return '';
  return hasPlus ? `+${digits}` : digits;
}

/** True once normalizePhone's output actually carries a country code
 *  (leading +), not just bare local digits that would collide across
 *  countries in phoneToSyntheticEmail below. */
export function isValidDemoAgentPhone(normalized: string): boolean {
  return /^\+\d{7,15}$/.test(normalized);
}

/**
 * Synthetic, non-deliverable email so Supabase Auth (which requires an
 * email-shaped identifier) can be used for phone+password login. The
 * domain needs a real (placeholder) MX record for Supabase's GoTrue to
 * accept it as a valid address — see docs/adding-a-demo-agent.md for the
 * one-time DNS step this depends on. Same underlying trick as
 * tuvara-faltagent's phoneToSyntheticEmail, different placeholder domain
 * (this is a separate Supabase project with its own auth.users).
 */
export function phoneToSyntheticEmail(normalizedPhone: string): string {
  const digits = normalizedPhone.replace(/[^\d]/g, '');
  return `${digits}@agents.demo.glocalunit.com`;
}
