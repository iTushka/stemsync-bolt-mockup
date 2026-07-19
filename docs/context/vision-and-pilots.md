# Vision & pilots

Read this when a task involves a product/UX judgment call, not just a
mechanical fix. Skip it for pure bugfixes with a fully-specified expected
behavior — the instruction itself is enough for those.

## The one-sentence vision

> "Empowerment for Micro/Solo Entrepreneurs" — transparent, spårbar,
> människocentrerad AI som först och främst tjänar människor, gemenskap
> och ekologi. AI ska inte ersätta mänskligt omdöme, utan ge ett bättre
> underlag för det avgörande beslutet.

In practice this means:

- **Every AI/heuristic suggestion is labelled and editable, never silent
  or authoritative.** This is why `AiBadge` exists and is used everywhere
  something is auto-filled or auto-suggested (parsed text, ad copy,
  markup-suggested price, category set from a photo). If you add a new
  auto-generated value, it needs a badge. This is a product requirement,
  not a style choice.
- **The app never picks a side on a fuzzy decision it can't fully see.**
  Example: when a batch purchase can't be fully parsed (tray count found
  but pieces-per-tray isn't), the correct behaviour is to leave the field
  empty with a hint — never guess and silently show a wrong number.
- **"Never underprice" is a stated product principle, not just a colour
  on a threshold.** Don't touch the margin-warning behaviour (50%/30%
  thresholds) without a reason tied back to this.

Interestingly, GlocalUnit's own site (glocalunit.com) states almost the
identical sentence about GlasBox, independently. That's not a coincidence
worth exploiting for marketing (see
`docs/context/product-decisions.md` for the GlasBox-synergy conclusion) —
it's a sign the underlying design principle above is the real one to
protect, not a one-off feature request.

## The two pilots — what actually matters about each

### Flowertot Botanicals (UK)
Real houseplant reseller (not cut flowers — the category taxonomy was
corrected in v13 specifically because of this). Buys stock in trays/
batches from wholesalers, with a real, reported pain point: individual
plants in the same batch vary in size/quality and need different sale
prices, and she was doing that division by hand. This is why
`batchPricing.ts` and the tray-aware parsing in `parse.ts` exist — they
solve a real, named problem, not a hypothetical one.

### Jhum Fashion (Bangladesh)
Clothing/fabric reseller. Two showrooms. WhatsApp and Facebook are the
dominant channels; family/household trust is a documented, real barrier
to digital tool adoption in this market (see research cited in
`docs/context/product-decisions.md`) — this is why the family-trust /
"AI suggestion, you decide" framing matters more here than it might
elsewhere, and why payment integration is deliberately out of scope (see
below).

## What's deliberately NOT built yet, and why

If a task seems to call for one of these, stop and flag it rather than
building it — it's not an oversight, it's a sequencing decision:

- **No real AI/LLM-based text interpretation.** `parse.ts` is
  deliberately regex/heuristic-based. A real model would understand
  context far better, but requires a backend (to protect an API key —
  a static client-side app can't hold one safely), costs money per
  request, and breaks the offline-capable story. Wait for pilot signal
  on whether this is worth it before building it.
- **No payment handling.** Bangladesh research specifically documented
  fraud anxiety as a real adoption barrier; UK has its own separate
  integration question (Open Banking). Neither has a clear trust story
  yet.
- **No real backend/auth/subscription system.** The `simulateFreePlan`
  toggle in Settings is a pure local UI simulation, not real auth. Don't
  build logic that assumes it's real.
