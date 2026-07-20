import type { Sale, StockItem } from './types';

/**
 * "What you actually earned" — the concrete, plain-language answer to the
 * most consistently reported fear in the local research: sellers keeping
 * the books entirely in their head and losing track of whether they're
 * actually profitable. Everything here is a direct calculation over sales
 * and stock the seller already logged — no forecasting, no external data.
 */
export interface EarningsSummary {
  windowDays: number;
  saleCount: number;
  revenue: number;
  /** Cost of goods sold for matched lines; unmatched lines (item no longer
   *  in stock) count as 0 cost rather than being treated as an error. */
  knownCost: number;
  profit: number;
  /** purchasePrice × quantity, summed over all current stock regardless of
   *  when it was bought — money currently tied up, not a period figure. */
  stockValue: number;
}

const DEFAULT_WINDOW_DAYS = 7;

export function computeEarnings(
  sales: Sale[],
  items: StockItem[],
  windowDays: number = DEFAULT_WINDOW_DAYS
): EarningsSummary {
  const cutoff = Date.now() - windowDays * 86400000;
  const itemsById = new Map(items.map((i) => [i.id, i]));

  let saleCount = 0;
  let revenue = 0;
  let knownCost = 0;

  for (const sale of sales) {
    if (sale.date < cutoff) continue;
    saleCount += 1;
    revenue += sale.total;
    for (const line of sale.lines) {
      const item = itemsById.get(line.itemId);
      knownCost += (item?.purchasePrice ?? 0) * line.quantity;
    }
  }

  const stockValue = items.reduce((sum, i) => sum + i.purchasePrice * i.quantity, 0);

  return {
    windowDays,
    saleCount,
    revenue,
    knownCost,
    profit: revenue - knownCost,
    stockValue,
  };
}
