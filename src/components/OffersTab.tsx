import { Plus, Tag, Package2 } from 'lucide-react';
import type { Bundle, StockItem } from '../types';

interface OffersTabProps {
  bundles: Bundle[];
  items: StockItem[];
  currencySymbol: string;
  onCreate: () => void;
}

export function OffersTab({ bundles, items, currencySymbol, onCreate }: OffersTabProps) {
  return (
    <div className="relative min-h-screen pb-24">
      <div className="sticky top-0 z-20 bg-cream-50/95 backdrop-blur-md px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Offers</h1>
          <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-accent-100 text-accent-700 text-xs font-semibold">
            {bundles.length}
          </span>
        </div>
      </div>

      <div className="px-4 pt-1">
        {bundles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Tag size={40} className="text-stone-300 mb-3" />
            <p className="text-stone-500 text-sm max-w-[220px]">
              No bundles or sales yet — group a few items together for a deal.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bundles.map((bundle) => {
              const included = items.filter((i) => bundle.itemIds.includes(i.id));
              const individualTotal = included.reduce((sum, i) => sum + i.salePrice, 0);
              const savings = individualTotal - bundle.bundlePrice;
              return (
                <div
                  key={bundle.id}
                  className="bg-white rounded-2xl shadow-card p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-sm text-stone-900">{bundle.name}</h3>
                        {bundle.onSale && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wide">
                            <Tag size={10} /> Sale
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-stone-400 flex items-center gap-1">
                        <Package2 size={12} /> {included.map((i) => i.name).join(', ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-base font-bold text-stone-900">
                        {bundle.bundlePrice} {currencySymbol}
                      </div>
                      {savings > 0 && (
                        <div className="text-[11px] text-emerald-600 font-medium">
                          Save {savings} {currencySymbol}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={onCreate}
        className="fixed bottom-24 right-4 z-20 w-14 h-14 rounded-full bg-accent-500 text-white shadow-fab flex items-center justify-center hover:bg-accent-600 active:scale-90 transition"
        aria-label="Create offer"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}
