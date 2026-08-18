import type { StockItem, Filters, SortMode } from './types';
import { isBelowMargin } from './insights';

export function applyFilters(items: StockItem[], filters: Filters): StockItem[] {
  const result = items.filter((i) => {
    if (filters.categories.length > 0 && !filters.categories.includes(i.category)) return false;
    // onlySoldOut is the "focus" counterpart to showSoldOut: it overrides
    // the normal hide/show-alongside-everything-else toggle entirely,
    // since the whole point is to show ONLY the sold-out items.
    if (filters.onlySoldOut) return i.soldOut;
    if (!filters.showSoldOut && i.soldOut) return false;
    if (filters.onlyAging && !i.aging) return false;
    if (filters.onlyBelowMargin && !isBelowMargin(i)) return false;
    return true;
  });

  return [...result].sort((a, b) => {
    switch (filters.sort) {
      case 'alpha':
        return a.name.localeCompare(b.name, 'en');
      case 'margin': {
        const ma = a.salePrice > 0 ? (a.salePrice - a.purchasePrice) / a.salePrice : 0;
        const mb = b.salePrice > 0 ? (b.salePrice - b.purchasePrice) / b.salePrice : 0;
        return mb - ma;
      }
      case 'newest':
      default:
        return b.createdAt - a.createdAt;
    }
  });
}

export function countActiveFilters(filters: Filters): number {
  return (
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.showSoldOut ? 1 : 0) +
    (filters.onlyAging ? 1 : 0) +
    (filters.onlyBelowMargin ? 1 : 0) +
    (filters.onlySoldOut ? 1 : 0)
  );
}

export const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: 'alpha', label: 'A–Z' },
  { mode: 'newest', label: 'Newest added' },
  { mode: 'margin', label: 'Highest margin' },
];
