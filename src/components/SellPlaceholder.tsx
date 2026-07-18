import { ShoppingBag, Users } from 'lucide-react';
import type { Customer } from '../types';

interface SellPlaceholderProps {
  cartCount: number;
  onAddMock: () => void;
  onClear: () => void;
  customers: Customer[];
}

function daysAgo(timestamp: number): string {
  const days = Math.floor((Date.now() - timestamp) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function SellPlaceholder({ cartCount, onAddMock, onClear, customers }: SellPlaceholderProps) {
  return (
    <div className="flex flex-col items-center px-6 pt-24 text-center">
      <ShoppingBag size={40} className="text-stone-300 mb-3" />
      <h2 className="text-lg font-bold text-stone-900 mb-1">Sell (layout test only)</h2>
      <p className="text-sm text-stone-500 max-w-xs mb-6">
        This screen is a stand-in just to test whether the checkout bar and bottom nav feel
        cramped together on a small screen — not a real sell flow.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onAddMock}
          className="h-11 px-4 rounded-full bg-accent-500 text-white text-sm font-semibold active:scale-95 transition"
        >
          + Add mock item to cart
        </button>
        {cartCount > 0 && (
          <button
            onClick={onClear}
            className="h-11 px-4 rounded-full bg-white border border-stone-200 text-sm font-medium text-stone-600 active:scale-95 transition"
          >
            Clear cart
          </button>
        )}
      </div>

      {customers.length > 0 && (
        <div className="mt-10 w-full max-w-sm text-left">
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
            <Users size={14} /> Recognised customers
          </div>
          <div className="space-y-1.5">
            {customers.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2.5"
              >
                <span className="text-sm font-semibold text-stone-800">{c.name}</span>
                <span className="text-xs text-stone-400">Added {daysAgo(c.addedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
