import { useState, useMemo, useEffect } from 'react';
import { X, Check, Info, RotateCcw } from 'lucide-react';
import type { Filters, SortMode, Category, StockItem } from '../types';
import { emptyFilters } from '../types';
import { CATEGORIES_BY_TENANT } from '../categoryFieldMap';
import { TENANT } from '../config';
import { applyFilters, SORT_OPTIONS } from '../filterLogic';
import { Sheet } from './Sheet';

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  items: StockItem[];
  onApply: (f: Filters) => void;
}

const AGING_DAYS = 7;

export function FilterSheet({ open, onClose, filters, items, onApply }: FilterSheetProps) {
  const [draft, setDraft] = useState<Filters>(filters);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const soldOutCount = useMemo(
    () => items.filter((i) => i.soldOut).length,
    [items],
  );
  const agingCount = useMemo(
    () => items.filter((i) => i.aging).length,
    [items],
  );

  const liveCount = useMemo(() => applyFilters(items, draft).length, [items, draft]);

  const toggleCategory = (c: Category) => {
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(c)
        ? d.categories.filter((x) => x !== c)
        : [...d.categories, c],
    }));
  };

  const allSelected = draft.categories.length === 0;

  const handleReset = () => setDraft(emptyFilters);

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} maxHeight="92vh">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2 shrink-0">
        <h2 className="text-lg font-bold text-stone-900">Filter & sort</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 active:scale-95 transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
        {/* Category */}
        <section className="mt-2">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2.5">
            Category
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDraft((d) => ({ ...d, categories: [] }))}
              className={`px-3.5 py-2 rounded-full text-sm font-medium transition active:scale-95 ${
                allSelected
                  ? 'bg-accent-500 text-white border border-accent-500'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
              }`}
            >
              All
            </button>
            {CATEGORIES_BY_TENANT[TENANT].map((c) => {
              const selected = draft.categories.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleCategory(c)}
                  className={`px-3.5 py-2 rounded-full text-sm font-medium transition active:scale-95 ${
                    selected
                      ? 'bg-accent-500 text-white border border-accent-500'
                      : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </section>

        {/* Stock status */}
        <section className="mt-6">
          <ToggleRow
            label="Show sold-out items"
            count={soldOutCount}
            countLabel="hidden"
            checked={draft.showSoldOut}
            onChange={(v) => setDraft((d) => ({ ...d, showSoldOut: v }))}
          />
        </section>

        {/* Age */}
        <section className="mt-6">
          <ToggleRow
            label="Aging stock only"
            count={agingCount}
            countLabel="items"
            checked={draft.onlyAging}
            onChange={(v) => setDraft((d) => ({ ...d, onlyAging: v }))}
            info={
              <InfoTrigger
                open={tooltipOpen}
                onToggle={() => setTooltipOpen((v) => !v)}
                text={`Items that have sat unsold for more than ${AGING_DAYS} days.`}
              />
            }
          />
        </section>

        {/* Sort */}
        <section className="mt-6">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2.5">
            Sort by
          </h3>
          <div className="space-y-1">
            {SORT_OPTIONS.map((opt) => {
              const active = draft.sort === opt.mode;
              return (
                <button
                  key={opt.mode}
                  onClick={() => setDraft((d) => ({ ...d, sort: opt.mode as SortMode }))}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-cream-100 transition active:scale-[0.99]"
                >
                  <span className={`text-sm ${active ? 'font-semibold text-stone-900' : 'font-medium text-stone-600'}`}>
                    {opt.label}
                  </span>
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                      active
                        ? 'bg-accent-500 border-accent-500'
                        : 'border-stone-300'
                    }`}
                  >
                    {active && <Check size={13} className="text-white" />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Sticky bottom */}
      <div className="shrink-0 px-5 pt-3 pb-5 safe-bottom border-t border-stone-100 bg-cream-50">
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-3 text-sm font-medium text-stone-500 hover:text-stone-700 transition"
          >
            <RotateCcw size={15} />
            Clear all
          </button>
          <div className="flex-1" />
          <button
            onClick={handleApply}
            className="flex-[2] h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition"
          >
            Show {liveCount} {liveCount === 1 ? 'item' : 'items'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function ToggleRow({
  label,
  count,
  countLabel,
  checked,
  onChange,
  info,
}: {
  label: string;
  count?: number;
  countLabel?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  info?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5">
        <button onClick={() => onChange(!checked)} className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-stone-700">{label}</span>
          {count !== undefined && countLabel && (
            <span className="text-xs text-stone-400">
              · {count} {countLabel}
            </span>
          )}
        </button>
        {info}
      </div>
      <button
        onClick={() => onChange(!checked)}
        aria-label={label}
        className={`relative w-11 h-6 rounded-full transition ${
          checked ? 'bg-accent-500' : 'bg-stone-200'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function InfoTrigger({
  open,
  onToggle,
  text,
}: {
  open: boolean;
  onToggle: () => void;
  text: string;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="w-5 h-5 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-600 active:scale-95 transition"
        aria-label="More info"
      >
        <Info size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} />
          <div className="absolute left-0 top-7 z-20 w-52 px-3 py-2 rounded-xl bg-stone-800 text-white text-xs leading-snug shadow-cardHover animate-scaleIn origin-top-left">
            {text}
          </div>
        </>
      )}
    </div>
  );
}
