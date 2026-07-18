import type { StockItem } from './types';

/**
 * Suggests up to `limit` items to have ready for a booked visit, besides the
 * item the customer already reserved. Priority: aging stock first (it needs
 * to move), then items in the same category (natural pairing), then
 * whatever's left — always excluding sold-out items and the booked item
 * itself.
 */
export function suggestUpsells(
  bookedItem: StockItem,
  allItems: StockItem[],
  limit = 3
): StockItem[] {
  const candidates = allItems.filter(
    (i) => i.id !== bookedItem.id && !i.soldOut && i.quantity > 0
  );

  const aging = candidates.filter((i) => i.aging);
  const sameCategory = candidates.filter(
    (i) => !i.aging && i.category === bookedItem.category
  );
  const rest = candidates.filter(
    (i) => !i.aging && i.category !== bookedItem.category
  );

  return [...aging, ...sameCategory, ...rest].slice(0, limit);
}
