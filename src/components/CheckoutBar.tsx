import { ChevronUp } from 'lucide-react';

interface CheckoutBarProps {
  count: number;
  total: number;
  currencySymbol: string;
  onCheckout: () => void;
}

export function CheckoutBar({ count, total, currencySymbol, onCheckout }: CheckoutBarProps) {
  return (
    <button
      onClick={onCheckout}
      className="flex w-full items-center justify-between border-t border-stone-200 bg-accent-500 px-4 py-3 text-white active:scale-[0.99] transition"
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <ChevronUp size={16} />
        {count} {count === 1 ? 'item' : 'items'} · {total} {currencySymbol}
      </span>
      <span className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold">Checkout</span>
    </button>
  );
}
