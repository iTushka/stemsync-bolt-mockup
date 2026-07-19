# Product decisions — condensed log

Read this when deciding whether something is in scope, what to prioritize,
or whether a "smarter" version of an existing feature is actually a good
idea right now. These are conclusions, not the full research — ask if you
need the reasoning behind any of them in more depth.

## Roadmap phases (from the July 2026 strategy sessions)

**Fas 1 — build now, low cost:** UI/communication only, no new data model.
Family-trust explainer view, offline-mode messaging, visible "never
underprice" principle. Mostly done.

**Fas 2 — investigate before building:** grant/subsidy matching (needs
real regional research per market before it's more than an empty
placeholder), aggregator/cooperative mode (the one item that actually
touches the tenant architecture — deliberately held back until there are
more than 2 pilot tenants to test against).

**Fas 3 — deliberately waiting, don't build without an explicit new
request:** payment integration, name/brand validation, the full Phase
A–F Supabase migration, freemium payment infrastructure, real AI/LLM
text interpretation.

## Competitive research conclusions (Blocket deep-dive)

- Blocket (dominant Swedish marketplace) already has an AI ad-assistant
  and built-in stats — this is why Sweden is NOT a target pilot market
  for this app's core value prop (see Nordic conclusion below).
- Their flow is **photo-first, then category, then guided fields** —
  ad copy last, always optional/editable. This ordering (not the AI
  behind it) is the actual insight — it's why the "Start from a photo"
  entry path exists in `AddSheet.tsx`, offered alongside free text, not
  replacing it.
- Their "(if you want!)" framing next to every AI suggestion is the same
  principle as `AiBadge` — validated externally, not just internally
  invented.

## Nordic/Sweden market conclusion

**Not a target pilot market right now.** Blocket already solves the core
multi-channel-listing pain point natively and for free, which is the
opposite competitive situation from UK/Bangladesh. Two things worth
remembering for later, not acting on now:
- **Vipps MobilePay** (Norway/Denmark/Finland, growing in Sweden) has a
  ready-made no-fee payment-link product (Vipps Go) built for solo
  sellers — the natural answer *if* payment integration is ever built
  for a Nordic market, rather than building custom payment logic.
- Supabase already sits in `eu-north-1` (Stockholm) with GDPR/DPA work
  already done — a genuine administrative (not product) advantage if
  Nordic expansion is ever revisited.

## GlasBox synergy conclusion

Full memo: `docs/context/glasbox-synergy-memo.md` (or ask — it's also
saved in the project's Google Drive).

**Short version:** GlasBox's *patterns* (RLS+GRANT+NOTIFY discipline,
verify-against-production habit, DPA/GDPR structure as a template, PII-
masking-before-AI-call pattern) are worth carrying over. GlasBox's actual
*code* — auth flow, tenant model, payment model — is NOT a good template
to copy, because it was built for a completely different context (B2B
staffing agencies, formal invite-based registration) vs. this app's
self-serve micro-entrepreneur model. If/when a real backend gets built,
the right build order is: Phase A–F migration → real auth/subscription
status → payment → any AI-proxy backend (in that order — auth has to
exist before anything can meaningfully gate on "premium").

## Known parsing limitation (be honest about it, don't oversell)

`parse.ts` is regex/heuristic-based, not a real language model. It keeps
needing new patterns as real pilot phrasing surfaces (tray/batch language,
reversed word order, "total" vs. per-unit price disambiguation are all
patches added after real reported bugs, not anticipated in advance). This
is a structural limitation of the approach, not a bug to be fully "solved"
— if a task asks you to make the parser "understand" something fundamentally
new, consider whether a small, testable pattern addition is the right fix,
or whether it's a sign this class of problem needs flagging back rather
than another regex patch.
