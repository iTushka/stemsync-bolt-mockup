import { useEffect, useState } from 'react';
import { Check, Tag } from 'lucide-react';
import { Sheet } from './Sheet';
import type { StockItem, Bundle } from '../types';

interface BundleBuilderProps {
  open: boolean;
  onClose: () => void;
  items: StockItem[];
  currencySymbol: string;
  onSave: (bundle: Omit<Bundle, 'id' | 'createdAt'>) => void;
  /** Pre-check this item when the sheet opens — used when arriving here
   *  from the aging-stock "Bundle it" action rather than the offers tab. */
  preselectedItemId?: string;
}

export function BundleBuilder({
  open,
  onClose,
  items,
  currencySymbol,
  onSave,
  preselectedItemId,
}: BundleBuilderProps) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>(preselectedItemId ? [preselectedItemId] : []);
  const [bundlePrice, setBundlePrice] = useState('');
  const [onSale, setOnSale] = useState(true);

  const reset = () => {
    setName('');
    setSelected(preselectedItemId ? [preselectedItemId] : []);
    setBundlePrice('');
    setOnSale(true);
  };

  useEffect(() => {
    if (open && preselectedItemId) {
      setSelected([preselectedItemId]);
    }
  }, [open, preselectedItemId]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleItem = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const individualTotal = items
    .filter((i) => selected.includes(i.id))
    .reduce((sum, i) => sum + i.salePrice, 0);

  const handleSave = () => {
    const price = parseFloat(bundlePrice);
    if (!name.trim() || selected.length === 0 || isNaN(price) || price <= 0) return;
    onSave({ name: name.trim(), itemIds: selected, bundlePrice: Math.round(price), onSale });
    reset();
    onClose();
  };

  const canSave = name.trim() && selected.length > 0 && parseFloat(bundlePrice) > 0;

  return (
    <Sheet open={open} onClose={handleClose} maxHeight="94vh">
      <div className="flex items-center justify-between px-5 py-2 shrink-0">
        <h2 className="text-lg font-bold text-stone-900">New offer / bundle</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar space-y-4">
        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">Bundle name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekend Bouquet Deal"
            className="input"
          />
        </label>

        <div>
          <span className="block text-xs font-medium text-stone-500 mb-1.5">
            Pick items to include
          </span>
          <div className="space-y-1.5 max-h-64 overflow-y-auto no-scrollbar pr-0.5">
            {items.map((item) => {
              const active = selected.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 transition ${
                    active ? 'border-accent-400 bg-accent-50' : 'border-stone-200 bg-white'
                  }`}
                >
                  <span className="text-sm font-medium text-stone-800">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">
                      {item.salePrice} {currencySymbol}
                    </span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        active
                          ? 'border-accent-500 bg-accent-500 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {active ? <Check size={13} /> : null}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selected.length > 0 && (
          <div className="rounded-xl bg-cream-100 px-3 py-2 text-xs text-stone-500">
            Individual price total: <span className="font-semibold text-stone-700">{individualTotal} {currencySymbol}</span>
          </div>
        )}

        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">
            Bundle price ({currencySymbol})
          </span>
          <input
            type="number"
            value={bundlePrice}
            onChange={(e) => setBundlePrice(e.target.value)}
            placeholder="e.g. 199"
            className="input"
          />
        </label>

        <button
          onClick={() => setOnSale((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5"
        >
          <span className="flex items-center gap-1.5 text-sm font-medium text-stone-700">
            <Tag size={14} /> Mark as active sale
          </span>
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md border ${
              onSale ? 'border-accent-500 bg-accent-500 text-white' : 'border-stone-300 bg-white'
            }`}
          >
            {onSale ? <Check size={13} /> : null}
          </span>
        </button>
      </div>

      <div className="shrink-0 px-5 pt-3 pb-5 safe-bottom border-t border-stone-100 bg-cream-50">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
        >
          Save bundle
        </button>
      </div>
    </Sheet>
  );
}
