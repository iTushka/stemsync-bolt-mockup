# GlasBox architecture — what's reusable for the generalized Flowertot platform

Same content as the promemoria saved in Google Drive (GlocalUnit —
Dokumentation folder), kept here so it's available locally without needing
Drive access. Not a build instruction — a reference for when the Fas A–F
backend migration is actually underway.

## Purpose

GlasBox already has a working production setup: Supabase (Stockholm,
eu-north-1), RLS policies, authentication, DPA/PuB agreements, and an
established discipline for handling sensitive data (GDPR-Maskering,
database-level identity gating). The generalized Flowertot platform will
eventually need the same kind of foundational infrastructure — but in a
different context: self-serve instead of B2B sales, micro-entrepreneurs
instead of staffing agencies, global reach instead of Swedish healthcare
staffing.

## Genuinely reusable — pattern, not code

- **RLS + GRANT + NOTIFY workflow.** RLS policies alone aren't enough in
  Supabase — they need explicit GRANTs plus `NOTIFY pgrst, 'reload
  schema'` to actually take effect. This is a Supabase truth, not
  GlasBox-specific. Worth writing in as a checklist rule from day one of
  any Flowertot migration.
- **Verification discipline.** "Verify against real production behavior,
  not just code review" and "Lovable's deployment confirmations are
  unreliable — verify via actual HTTP responses." Directly transferable.
- **DPA/GDPR structure as a template, not content.** The PuB agreement's
  structure (GDPR Article 28.3 components, sub-processor appendices,
  technical security description) is reusable as a template. The content
  is completely different — third-country transfer, legal basis, and the
  sub-processor list all need rewriting from scratch for a multi-country
  micro-entrepreneur product vs. Swedish staffing candidate data.
- **PII-masking pattern (GDPR-Maskering).** Mask personal data
  client-side before it reaches an external AI service — directly
  applicable the day this app sends customer text data to a real AI
  service (see the deferred real-AI-parsing decision).
- **"Validate cheaply, one thing at a time" discipline.** Not technical
  reuse, but worth noting: the same GO/NO-GO-on-clear-signal (not
  calendar-date) discipline already governs both projects independently.

## GlasBox-specific — must be rebuilt, not reused directly

- **Auth and identity model.** GlasBox is built for formal, invite-based
  registration of a handful of users per staffing company — a B2B
  customer-is-a-company model. Flowertot is meant to be pure self-serve
  for individual micro-entrepreneurs. The GAP analysis already found
  email is a weak first choice for Bangladesh (phone/WhatsApp is
  natural there), while BankID is likely right for a Nordic market —
  meaning identity likely needs to be market-specific rather than one
  global solution. GlasBox's auth flow isn't a good copy target.
- **Tenant model and data model.** GlasBox's tenant structure is built
  around staffing companies with multiple recruiters. The mockup's
  current, simpler tenant model (one tenant per pilot customer, driven
  by a single config variable) is already deliberately simpler and fits
  the target audience better. The already-planned Phase A–F migration
  is still the right path — and it was written with Flowertot in mind,
  not as an adaptation of GlasBox.
- **Payment model.** GlasBox has fixed, negotiated B2B pricing.
  Flowertot is meant to be freemium with a feature limit. No overlap.

## Right build order, when it becomes relevant

1. Phase A–F migration (tenants, RLS, real Supabase backend) — the
   prerequisite for everything below.
2. Real authentication and subscription status — the foundation, since
   every premium feature (not just a future AI-parsing one) needs to
   know who's logged in and what they're paying for.
3. Payment (e.g. Stripe), tied to the auth status from step 2.
4. Any AI-interpretation backend proxy — last, since it can then check
   an already-real premium status instead of inventing its own gate
   (which today's `simulateFreePlan` toggle does NOT do — it's a pure
   local UI simulation with no real auth behind it).

## When to act on this

Not at a calendar date — when the pilots (or at least one, if the signal
is unambiguous) give a clear enough answer that free-text AI parsing,
channel insights, and forecasting signals are valuable and requested
enough to justify the investment above, compared to the cheaper
alternatives already in the mockup (photo-first entry, batch calculator,
client-side-only ticker insights).
