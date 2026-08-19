/**
 * Short, in-app versions of the Terms of Use and Confidentiality (NDA)
 * agreements — condensed for on-screen reading, not a replacement for the
 * fuller reference drafts in docs/legal/ (which are the ones to actually
 * hand to a solicitor). Kept as plain data here, separate from
 * LegalAgreementSheet.tsx, so the text can be reviewed/edited without
 * touching component code.
 *
 * Neither of these has been reviewed by a lawyer. Both are DRAFTS.
 *
 * VERSION discipline: bump the *_VERSION string whenever the wording
 * changes meaningfully. LegalAgreementSheet compares a stored acceptance's
 * recorded version against the current one so a past signature doesn't
 * silently count as agreement to different wording later — same "don't
 * silently assume" principle as the rest of the app.
 */

export const TERMS_VERSION = '2026-08-19';

export const TERMS_TITLE = 'Terms of Use';

export const TERMS_PARAGRAPHS: string[] = [
  'Tuvara is a tool to help you catalogue stock, get pricing suggestions, and generate listing text for your own business. Every suggestion the app makes is a suggestion — you always decide what to charge, what to post, and what to do with your stock and customer information.',
  'Your business data (stock, sales, customers) is stored only on this device, in your browser. We do not operate a central database of it and cannot see it unless you choose to share it with us directly.',
  'You may not copy, reproduce, decompile, reverse engineer, or otherwise recreate Tuvara\'s code, pricing logic, or listing-text generation, or use it to build a competing product, without prior written permission.',
  'Tuvara is provided as-is, in active early development. Pricing suggestions are estimates based on what you enter — check they make sense for your business before you rely on them.',
  'Tuvara does not process payments or hold your money. Any totals or "amount owed" figures are for your own record-keeping only.',
];

export const NDA_VERSION = '2026-08-19';

export const NDA_TITLE = 'Confidentiality agreement';

export const NDA_INTRO =
  'This section is for anyone with deeper access to Tuvara\'s code, internal strategy documents, or other pilots\' business data — for example a developer, intern, or agent — not something every seller needs to sign. If that\'s not you, the Terms of Use above is all that applies.';

export const NDA_PARAGRAPHS: string[] = [
  'You agree to use anything confidential you\'re given access to (source code, product strategy documents, pilot business data) only for the specific task you\'ve been asked to help with.',
  'You agree not to copy, share, publish, or disclose it to anyone else without prior written consent, and not to use it to build, assist, or advise a competing product or service.',
  'This does not cover information that was already public, already known to you, or that you develop independently without reference to it.',
  'This agreement stays in effect for as long as the information remains confidential, or until GlocalUnit releases it publicly.',
];

export const LEGAL_SIGNATURE_DISCLAIMER =
  'Typing your name and tapping Agree records your name and the date/time on this device as a lightweight acknowledgement — it is not a verified digital signature. For anything that needs a formal, binding signature, use the full documents in docs/legal/.';
