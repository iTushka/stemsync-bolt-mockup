import type { StockItem } from './types';

/**
 * B8 (tuvara-bifogade-filer-analys.md) — a small, transparent scoring
 * function for "what else might fit this bundle", not a black-box AI call.
 * Same discipline as parse.ts/batchPricing.ts: a number the seller can see
 * the reasoning behind, always just a suggestion — BundleBuilder.tsx still
 * requires an explicit tap to actually add a suggested item.
 *
 * The original reference (flowertotcalculator.html) scored same-season +2,
 * complementary colour +1, similar price band +1. Tuvara doesn't have a
 * season tag yet (see tuvara-sasongspaslag-analys.md — still just an
 * analysis, not built), so this substitutes "same category" for "same
 * season" until/unless that lands; re-weight then rather than block B8 on
 * it now.
 */
export interface BundleSuggestion {
  item: StockItem;
  score: number;
  reasons: string[];
}

const CATEGORY_MATCH_SCORE = 2;
const COLOR_MATCH_SCORE = 1;
const PRICE_BAND_SCORE = 1;
/** "Similar price band" = within this fraction of the selected items'
 *  average sale price — matches the ±30%-ish feel of the reference file's
 *  price-tier grouping without hardcoding specific currency thresholds. */
const PRICE_BAND_TOLERANCE = 0.3;

export function suggestBundlePairings(
  selectedItems: StockItem[],
  candidates: StockItem[],
  limit = 3
): BundleSuggestion[] {
  if (selectedItems.length === 0) return [];

  const categories = new Set(selectedItems.map((i) => i.category));
  const colors = new Set(selectedItems.map((i) => i.color).filter((c): c is string => Boolean(c)));
  const avgPrice = selectedItems.reduce((sum, i) => sum + i.salePrice, 0) / selectedItems.length;
  const selectedIds = new Set(selectedItems.map((i) => i.id));

  const scored: BundleSuggestion[] = [];
  for (const item of candidates) {
    if (selectedIds.has(item.id) || item.soldOut || item.quantity <= 0) continue;

    let score = 0;
    const reasons: string[] = [];

    if (categories.has(item.category)) {
      score += CATEGORY_MATCH_SCORE;
      reasons.push('same category');
    }
    if (item.color && colors.has(item.color)) {
      score += COLOR_MATCH_SCORE;
      reasons.push('matching colour');
    }
    if (avgPrice > 0 && Math.abs(item.salePrice - avgPrice) <= avgPrice * PRICE_BAND_TOLERANCE) {
      score += PRICE_BAND_SCORE;
      reasons.push('similar price');
    }

    if (score > 0) scored.push({ item, score, reasons });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
