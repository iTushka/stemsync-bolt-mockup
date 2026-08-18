import type { Sale, StockItem } from './types';

/**
 * B7 (tuvara-bifogade-filer-analys.md) — a forward-looking sell-through
 * estimate at the moment a new batch is added, instead of only reacting
 * once stock has already gone stale (the existing `aging` flag). Matches
 * only on an *exact* (trimmed, case-insensitive) name match against past
 * or current stock — no fuzzy/keyword matching, so it never guesses at a
 * connection that isn't really there (same "don't guess" discipline as
 * parse.ts). A brand-new item name simply returns null and nothing shows,
 * which is also the correct behaviour for "not enough history yet" — no
 * special-casing needed.
 *
 * `quantity` mutates downward as an item sells (see handleCompleteSale in
 * App.tsx), so the *original* stocked amount isn't stored directly —
 * it's recovered here as current quantity + everything already sold
 * against that item's id, which holds as long as quantity only ever
 * decreases via sales (true today).
 */
export interface SellThroughForecast {
  matchedBatches: number;
  sellThroughRate: number;
  expectedToSell: number;
  expectedLeftover: number;
}

export function forecastForName(
  name: string,
  plannedQuantity: number,
  items: StockItem[],
  sales: Sale[]
): SellThroughForecast | null {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed || !Number.isFinite(plannedQuantity) || plannedQuantity <= 0) return null;

  const matches = items.filter((i) => i.name.trim().toLowerCase() === trimmed);
  if (matches.length === 0) return null;

  const soldByItemId = new Map<string, number>();
  for (const sale of sales) {
    for (const line of sale.lines) {
      soldByItemId.set(line.itemId, (soldByItemId.get(line.itemId) ?? 0) + line.quantity);
    }
  }

  let stocked = 0;
  let sold = 0;
  for (const item of matches) {
    const soldForItem = soldByItemId.get(item.id) ?? 0;
    stocked += item.quantity + soldForItem;
    sold += soldForItem;
  }
  if (stocked <= 0 || sold <= 0) return null;

  const rate = sold / stocked;
  const expectedToSell = Math.min(plannedQuantity, Math.round(plannedQuantity * rate));
  return {
    matchedBatches: matches.length,
    sellThroughRate: rate,
    expectedToSell,
    expectedLeftover: plannedQuantity - expectedToSell,
  };
}
