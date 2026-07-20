import { useState } from 'react';
import { Tag, Layers, Gift, MessageSquare } from 'lucide-react';
import { Sheet } from './Sheet';
import type { StockItem, AgingAction } from '../types';

interface AgingActionSheetProps {
  open: boolean;
  item: StockItem | null;
  currencySymbol: string;
  onClose: () => void;
  onMarkdown: (item: StockItem, newPrice: number) => void;
  onBundle: (item: StockItem) => void;
  onDonate: (item: StockItem, note: string) => void;
  onOther: (item: StockItem, note: string) => void;
}

type Step = 'choose' | 'markdown' | 'donate' | 'other';

/**
 * What to do with stock that's aging, beyond "just discount it". Local
 * research (Coco Green's 600 unsold coconuts becoming a pudding line, not a
 * markdown) shows sellers already spontaneously rescue unsold stock as new
 * value rather than only cutting price — this gives that instinct a place
 * in the app instead of only offering a discount.
 */
export function AgingActionSheet({
  open,
  item,
  currencySymbol,
  onClose,
  onMarkdown,
  onBundle,
  onDonate,
  onOther,
}: AgingActionSheetProps) {
  const [step, setStep] = useState<Step>('choose');
  const [priceInput, setPriceInput] = useState('');
  const [note, setNote] = useState('');

  const reset = () => {
    setStep('choose');
    setPriceInput('');
    setNote('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!item) return null;

  const options: { action: AgingAction; icon: typeof Tag; label: string; onClick: () => void }[] = [
    { action: 'markdown', icon: Tag, label: 'Lower the price', onClick: () => setStep('markdown') },
    { action: 'bundle', icon: Layers, label: 'Bundle it', onClick: () => { onBundle(item); reset(); onClose(); } },
    { action: 'donate', icon: Gift, label: 'Give it away', onClick: () => setStep('donate') },
    { action: 'other', icon: MessageSquare, label: 'Something else', onClick: () => setStep('other') },
  ];

  return (
    <Sheet open={open} onClose={handleClose} maxHeight="80vh">
      <div className="flex items-center justify-between px-5 py-2 shrink-0">
        <h2 className="text-lg font-bold text-stone-900">{item.name}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 no-scrollbar">
        {step === 'choose' && (
          <div className="space-y-2">
            <p className="text-xs text-stone-500 mb-3">This item's been sitting a while. What do you want to do?</p>
            {options.map((opt) => (
              <button
                key={opt.action}
                onClick={opt.onClick}
                className="w-full flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 hover:border-accent-400 hover:text-accent-600 transition"
              >
                <opt.icon size={17} />
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {step === 'markdown' && (
          <div className="space-y-3">
            <label className="block">
              <span className="block text-xs font-medium text-stone-500 mb-1">
                New price ({currencySymbol})
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder={String(item.salePrice)}
                className="input"
                autoFocus
              />
            </label>
            <button
              onClick={() => {
                const price = parseFloat(priceInput);
                if (isNaN(price) || price <= 0) return;
                onMarkdown(item, price);
                reset();
                onClose();
              }}
              disabled={!priceInput || isNaN(parseFloat(priceInput)) || parseFloat(priceInput) <= 0}
              className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm disabled:opacity-40 transition"
            >
              Save new price
            </button>
          </div>
        )}

        {step === 'donate' && (
          <div className="space-y-3">
            <p className="text-xs text-stone-500">
              This marks the item as gone from stock — quantity goes to 0.
            </p>
            <label className="block">
              <span className="block text-xs font-medium text-stone-500 mb-1">Note (optional)</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="E.g. Given to neighbour"
                className="input"
                autoFocus
              />
            </label>
            <button
              onClick={() => {
                onDonate(item, note.trim());
                reset();
                onClose();
              }}
              className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm transition"
            >
              Mark as given away
            </button>
          </div>
        )}

        {step === 'other' && (
          <div className="space-y-3">
            <label className="block">
              <span className="block text-xs font-medium text-stone-500 mb-1">What did you do with it?</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="E.g. Used it in a new product"
                className="input"
                autoFocus
              />
            </label>
            <button
              onClick={() => {
                if (!note.trim()) return;
                onOther(item, note.trim());
                reset();
                onClose();
              }}
              disabled={!note.trim()}
              className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm disabled:opacity-40 transition"
            >
              Save note
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
