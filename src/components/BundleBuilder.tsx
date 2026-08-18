import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Copy, Plus, Tag } from 'lucide-react';
import { Sheet } from './Sheet';
import { AiBadge } from './AiBadge';
import { buildBundleAdCopy, copyToClipboard } from '../adCopy';
import { suggestBundlePairings } from '../bundleSuggestions';
import { swatchFor } from '../colorPalette';
import type { StockItem, Bundle } from '../types';
import { margin } from '../types';

interface BundleBuilderProps {
  open: boolean;
  onClose: () => void;
  items: StockItem[];
  currencySymbol: string;
  onSave: (bundle: Omit<Bundle, 'id' | 'createdAt'>) => void;
  /** Pre-check this item when the sheet opens — used when arriving here
   *  from the aging-stock "Bundle it" action rather than the offers tab. */
  preselectedItemId?: string;
  /** P1 — see tuvara-offers-analys.md: editing/deleting a bundle after
   *  creation didn't exist at all before this. Same edit-mode pattern as
   *  AddSheet's editItem. */
  editBundle?: Bundle | null;
  onUpdate?: (bundle: Bundle) => void;
  onDelete?: (id: string) => void;
}

export function BundleBuilder({
  open,
  onClose,
  items,
  currencySymbol,
  onSave,
  preselectedItemId,
  editBundle,
  onUpdate,
  onDelete,
}: BundleBuilderProps) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>(preselectedItemId ? [preselectedItemId] : []);
  const [bundlePrice, setBundlePrice] = useState('');
  const [onSale, setOnSale] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // Only ever set true for a brand-new bundle (see handleSave) — editing an
  // existing one saves and closes immediately, same as AddSheet's editItem.
  const [savedStep, setSavedStep] = useState(false);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setName('');
    setSelected(preselectedItemId ? [preselectedItemId] : []);
    setBundlePrice('');
    setOnSale(true);
    setDeleteConfirmOpen(false);
    setSavedStep(false);
    setCopied(false);
  };

  useEffect(() => {
    if (!open) return;
    if (editBundle) {
      setName(editBundle.name);
      setSelected(editBundle.itemIds);
      setBundlePrice(String(editBundle.bundlePrice));
      setOnSale(editBundle.onSale);
    } else if (preselectedItemId) {
      setSelected([preselectedItemId]);
    }
  }, [open, editBundle, preselectedItemId]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleItem = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const selectedItems = items.filter((i) => selected.includes(i.id));
  const individualTotal = selectedItems.reduce((sum, i) => sum + i.salePrice, 0);

  // B8 (tuvara-bifogade-filer-analys.md) — "what else might fit this
  // bundle", scored transparently in bundleSuggestions.ts. Still just a
  // suggestion: adding one requires the same explicit tap as any other
  // item in the picker above, never auto-added.
  const suggestions = useMemo(
    () => suggestBundlePairings(selectedItems, items),
    [selectedItems, items]
  );
  const costTotal = selectedItems.reduce((sum, i) => sum + i.purchasePrice, 0);
  const priceNum = parseFloat(bundlePrice) || 0;
  // Same margin()/threshold logic already used in AddSheet and Quote card —
  // see tuvara-offers-analys.md P1 item 5. A bundle price was previously
  // never checked against what its contents actually cost.
  const bundleMargin = priceNum > 0 && selectedItems.length > 0 ? margin(costTotal, priceNum) : null;

  const handleSave = () => {
    const price = parseFloat(bundlePrice);
    if (!name.trim() || selected.length === 0 || isNaN(price) || price <= 0) return;
    if (editBundle) {
      onUpdate?.({ ...editBundle, name: name.trim(), itemIds: selected, bundlePrice: Math.round(price), onSale });
      handleClose();
      return;
    }
    onSave({ name: name.trim(), itemIds: selected, bundlePrice: Math.round(price), onSale });
    // Don't close yet — same reasoning as AddSheet: getting ready-to-post
    // copy for a brand-new offer happens in one continuous flow, not a
    // separate trip back in.
    setSavedStep(true);
  };

  const handleDone = () => {
    reset();
    onClose();
  };

  const handleDelete = () => {
    if (editBundle) onDelete?.(editBundle.id);
    handleClose();
  };

  const adCopyText = buildBundleAdCopy(
    {
      name: name.trim(),
      includedNames: selectedItems.map((i) => i.name),
      bundlePrice: Math.round(parseFloat(bundlePrice) || 0),
      savings: Math.max(0, individualTotal - (parseFloat(bundlePrice) || 0)),
    },
    undefined,
    currencySymbol
  );

  const handleCopy = async () => {
    const ok = await copyToClipboard(adCopyText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canSave = name.trim() && selected.length > 0 && parseFloat(bundlePrice) > 0;

  return (
    <Sheet open={open} onClose={handleClose} maxHeight="94vh">
      <div className="flex items-center justify-between px-5 py-2 shrink-0">
        <h2 className="text-lg font-bold text-stone-900">
          {editBundle ? 'Edit offer' : 'New offer / bundle'}
        </h2>
      </div>

      {savedStep ? (
        <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
          <div className="pt-2 animate-fadeIn">
            <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium">
              <CheckCircle2 size={18} />
              Offer saved — here's copy ready to post.
            </div>

            <div className="mb-2">
              <AiBadge text="AI-drafted caption — edit anything before you post it." />
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm text-stone-800 leading-relaxed">
                {adCopyText}
              </pre>
            </div>

            <button
              onClick={handleCopy}
              className={`mt-3 w-full h-11 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                copied
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-white border border-stone-200 text-stone-700 hover:border-accent-300'
              }`}
            >
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy text'}
            </button>
          </div>
        </div>
      ) : (
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
                    <span className="flex items-center gap-1.5 text-sm font-medium text-stone-800">
                      {item.color && (
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full border border-stone-300"
                          style={{ background: swatchFor(item.color) }}
                          title={item.color}
                        />
                      )}
                      {item.name}
                    </span>
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

          {suggestions.length > 0 && (
            <div>
              <AiBadge text="Might fit this bundle — same category, matching colour, or a similar price." />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {suggestions.map(({ item, reasons }) => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    title={reasons.join(', ')}
                    className="flex items-center gap-1 rounded-full border border-accent-200 bg-accent-50 px-2.5 py-1.5 text-xs font-medium text-accent-700 active:scale-95 transition"
                  >
                    <Plus size={12} /> {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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
            {bundleMargin !== null && (
              <p
                className={`mt-1.5 text-xs font-medium flex items-center gap-1 ${
                  bundleMargin >= 50
                    ? 'text-emerald-600'
                    : bundleMargin >= 30
                      ? 'text-amber-600'
                      : 'text-red-600'
                }`}
              >
                {bundleMargin < 30 && <AlertTriangle size={12} />}
                {bundleMargin}% margin
                {bundleMargin >= 50 ? ' — looks good' : bundleMargin >= 30 ? ' — a bit thin' : ' — below your usual margin'}
              </p>
            )}
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
          {!onSale && (
            <p className="-mt-2.5 text-[11px] text-stone-400 leading-snug">
              Won't show up on the Sell tab until this is checked again.
            </p>
          )}
        </div>
      )}

      <div className="shrink-0 px-5 pt-3 pb-5 safe-bottom border-t border-stone-100 bg-cream-50">
        {savedStep ? (
          <button
            onClick={handleDone}
            className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition"
          >
            Done
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
            >
              {editBundle ? 'Save changes' : 'Save bundle'}
            </button>
            {editBundle && (
              deleteConfirmOpen ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2 animate-fadeIn">
                  <p className="text-xs text-red-700 leading-snug">
                    Delete "{editBundle.name}"? This can't be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      className="flex-1 h-9 rounded-full bg-red-500 text-white text-xs font-semibold active:scale-95 transition"
                    >
                      Yes, delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirmOpen(false)}
                      className="flex-1 h-9 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-600 active:scale-95 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="w-full h-9 text-xs font-medium text-red-600 hover:text-red-700 transition"
                >
                  Delete offer
                </button>
              )
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
