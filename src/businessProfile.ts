import type { BusinessProfile } from './types';

/**
 * Structured presets for the "About your business" profile — option B from
 * docs/tuvara-ai-berattelse-onboarding-analys.md, combined with option A
 * (the free-text `note` on BusinessProfile itself) per Tushar's answer to
 * that analysis's open questions: "En kombination av alternativ A och B
 * men det måste vara enkel att använda och intuitativt."
 *
 * Deliberately one small, shared list rather than a per-tenant config like
 * CATEGORIES_BY_TENANT: unlike product categories (which must match real,
 * tenant-specific taxonomies), "who do you mostly sell to" and "what's the
 * hardest part right now" are the same shape of question for every
 * micro-entrepreneur pilot Tuvara has today (Flowertot's batch-pricing
 * strain, Jhum Fashion's family-trust adoption barrier — see
 * vision-and-pilots.md) and for general pilots. A per-tenant list here
 * would be over-engineering a feature that's explicitly meant to stay
 * "enkel ... och intuitativt". Both fields are fully optional and always
 * editable; "Something else" is deliberately not a preset — the free-text
 * `note` already covers whatever doesn't fit.
 */
export const CUSTOMER_TYPE_OPTIONS = [
  'Friends & family',
  'Local walk-ins',
  'Social media followers',
  'Repeat/regular customers',
  'Wholesale / bulk buyers',
] as const;

export const CHALLENGE_OPTIONS = [
  'Getting seen (marketing, visibility)',
  'Pricing with confidence',
  'Keeping track of stock',
  'Cash flow / getting paid on time',
  'Finding time to do it all',
] as const;

export type ChallengeOption = (typeof CHALLENGE_OPTIONS)[number];

/**
 * The "very limited AI interpretation" from Tushar's answer 3. Built the
 * same way parse.ts already handles free text: keyword/pattern matching
 * against whatever the seller already typed in `note`, entirely on-device,
 * no network call, no language model. This is NOT the "real AI/LLM text
 * interpretation" that docs/context/product-decisions.md defers to
 * Fas 3 — that would need a backend to protect an API key, cost money per
 * request, and break the offline promise (see CLAUDE.md's "Riktig
 * AI-tolkning ... medvetet inte byggt"). It's a small, honest, bounded
 * nudge: "it sounds like ... might be the challenge" — always shown behind
 * <AiBadge/>, always just a suggestion the seller applies, edits, or
 * ignores via the ordinary preset picker. If nothing matches, it suggests
 * nothing rather than guessing — same "don't guess silently" discipline
 * documented in CLAUDE.md and already used throughout parse.ts.
 */
const CHALLENGE_KEYWORDS: { pattern: RegExp; challenge: ChallengeOption }[] = [
  {
    pattern: /(no ?one (sees|finds|knows)|visibilit|followers?|reach|market(ing)?|advertis|promot)/i,
    challenge: CHALLENGE_OPTIONS[0],
  },
  {
    pattern: /(pric(e|ing)|underpric|margin|charge|how much to (charge|sell))/i,
    challenge: CHALLENGE_OPTIONS[1],
  },
  {
    pattern: /(stock|inventory|track(ing)?( what| items)?|run(ning)? out|overstock|what.?s left)/i,
    challenge: CHALLENGE_OPTIONS[2],
  },
  {
    pattern: /(cash ?flow|get(ting)? paid|late payment|owed|debt|unpaid|money coming in)/i,
    challenge: CHALLENGE_OPTIONS[3],
  },
  {
    pattern: /(no time|too busy|by myself|on my own|alone|overwhelm|juggl|everything myself)/i,
    challenge: CHALLENGE_OPTIONS[4],
  },
];

/** Returns a suggested challenge preset if `note` clearly matches one of
 *  the keyword groups above, or `undefined` if nothing matches — never a
 *  best-effort guess. See CHALLENGE_KEYWORDS's doc comment. */
export function interpretChallengeFromNote(note: string): ChallengeOption | undefined {
  const trimmed = note.trim();
  if (!trimmed) return undefined;
  for (const { pattern, challenge } of CHALLENGE_KEYWORDS) {
    if (pattern.test(trimmed)) return challenge;
  }
  return undefined;
}

/**
 * One tasteful, contained personalization payoff — per Tushar's stated
 * purpose ("framtida personalisering i appen ... 'empowerment', 'förstå
 * människan bakom verksamheten'"), kept to a single surfaced tip rather
 * than scattered logic across the app, so this stays a small profile
 * feature and not a project of its own. Looked up off the *confirmed*
 * preset the seller picked (never off raw `note` text directly) — see
 * BusinessProfileSheet.tsx — so it only ever reflects a choice the seller
 * actually made, not a silent inference.
 */
export const CHALLENGE_TIPS: Record<ChallengeOption, string> = {
  [CHALLENGE_OPTIONS[0]]:
    'Try "Get WhatsApp card" on one of your items — a ready-made, photo-first post is often the fastest way to get seen.',
  [CHALLENGE_OPTIONS[1]]:
    'Keep an eye on the margin colour on your items — it flags anything priced below your own threshold before you list it.',
  [CHALLENGE_OPTIONS[2]]:
    'The Stock tab\'s "aging" and "sold out" chips are built for exactly this — tap one to jump straight to the items that need attention.',
  [CHALLENGE_OPTIONS[3]]:
    'The Customers tab tracks who owes what — worth a look if unpaid amounts are hard to keep straight in your head.',
  [CHALLENGE_OPTIONS[4]]:
    'You can add a teammate in Settings if someone else — family, staff — could share the load on this account.',
};

export const emptyBusinessProfile: BusinessProfile = {
  note: '',
  customerType: undefined,
  mainChallenge: undefined,
  updatedAt: undefined,
};

/** True once anything meaningful has been filled in — used to decide
 *  whether to show the "complete" state vs. the entry hint. */
export function hasBusinessProfileContent(profile: BusinessProfile | null): boolean {
  if (!profile) return false;
  return Boolean(profile.note.trim() || profile.customerType || profile.mainChallenge);
}
