import { Leaf, ShoppingBag, Tag } from 'lucide-react';

interface BottomNavProps {
  active: 'stock' | 'sell' | 'offers';
  onChange: (tab: 'stock' | 'sell' | 'offers') => void;
  cartCount: number;
}

const TABS: { id: 'stock' | 'sell' | 'offers'; label: string; icon: typeof Leaf }[] = [
  { id: 'stock', label: 'Stock', icon: Leaf },
  { id: 'sell', label: 'Sell', icon: ShoppingBag },
  { id: 'offers', label: 'Offers', icon: Tag },
];

export function BottomNav({ active, onChange, cartCount }: BottomNavProps) {
  return (
    <nav
      className="flex items-center justify-around border-t border-stone-200 bg-cream-50/95 backdrop-blur-md px-2 py-2 safe-bottom"
      aria-label="Main navigation"
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex w-20 flex-col items-center rounded-xl py-1.5 transition-colors ${
              isActive ? 'text-accent-600' : 'text-stone-400'
            }`}
          >
            <Icon className={`mb-0.5 h-6 w-6 transition-transform ${isActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
            {id === 'sell' && cartCount > 0 ? (
              <span className="absolute right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-white">
                {cartCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
