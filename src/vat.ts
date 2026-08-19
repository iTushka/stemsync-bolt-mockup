/**
 * Moms/VAT — tuvara-app-personal-moms-butiker-kostnader-insights-analys.md
 * punkt 2. A pure display calculation on top of the price the seller
 * already set (`batchPricing.ts`/`AddSheet.tsx` pricing logic is never
 * touched by this) — never a new variable in the markup formula. Prices
 * are always treated as VAT-inclusive when the toggle is on, matching how
 * Bangladesh and EU shoppers expect to see a price; "varav moms" is the
 * portion of that same price already sitting inside it, not something
 * added on top.
 */

/** The VAT portion already contained within a VAT-inclusive price, at the
 *  seller's own rate. E.g. a 115 kr price at a 15% rate contains 15 kr of
 *  VAT (115 / 1.15 × 0.15), not 115 × 0.15. Returns 0 for a non-positive
 *  price or rate rather than throwing — callers should also gate display
 *  on `settings.vatEnabled` being true. */
export function vatPortionOfPrice(priceInclVat: number, ratePct: number): number {
  if (!(priceInclVat > 0) || !(ratePct > 0)) return 0;
  return priceInclVat * (ratePct / (100 + ratePct));
}
