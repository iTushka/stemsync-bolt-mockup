import type { Sale, StockItem } from '../types';
import { computeEarnings } from '../earnings';

interface EarningsStripProps {
  sales: Sale[];
  items: StockItem[];
  currencySymbol: string;
}

/**
 * Plain-language earnings summary at the very top of the Stock tab — "Earned
 * this week" / "Money sitting in stock right now" rather than "Net profit" /
 * "Inventory value". Nothing to show until at least one sale has been
 * logged, so a brand-new user never sees a hollow "0" figure.
 */
export function EarningsStrip({ sales, items, currencySymbol }: EarningsStripProps) {
  if (sales.length === 0) return null;

  const { saleCount, revenue, profit, stockValue, windowDays } = computeEarnings(sales, items);

  return (
    <div className="px-4 pb-2.5 animate-fadeIn">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-emerald-50 px-3.5 py-3">
          <div className="text-[11px] font-medium text-emerald-700/80">
            Earned last {windowDays} days
          </div>
          <div className="mt-0.5 text-lg font-bold text-emerald-900">
            {currencySymbol}
            {profit.toFixed(2)}
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-700/70">
            {saleCount} sale{saleCount === 1 ? '' : 's'}, {currencySymbol}
            {revenue.toFixed(2)} in
          </div>
        </div>
        <div className="rounded-2xl bg-cream-100 px-3.5 py-3">
          <div className="text-[11px] font-medium text-stone-500">Money sitting in stock</div>
          <div className="mt-0.5 text-lg font-bold text-stone-900">
            {currencySymbol}
            {stockValue.toFixed(2)}
          </div>
          <div className="mt-0.5 text-[10px] text-stone-400">right now</div>
        </div>
      </div>
    </div>
  );
}
