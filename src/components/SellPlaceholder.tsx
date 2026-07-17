import { ShoppingBag } from 'lucide-react';

interface SellPlaceholderProps {
  cartCount: number;
  onAddMock: () => void;
  onClear: () => void;
}

export function SellPlaceholder({ cartCount, onAddMock, onClear }: SellPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 pt-24 text-center">
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
    </div>
  );
}
