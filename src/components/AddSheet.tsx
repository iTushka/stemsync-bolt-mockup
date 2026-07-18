import { useRef, useState } from 'react';
import { X, Mic, Sparkles, Plus, Trash2, Check, Camera, AlertTriangle, Copy, CheckCircle2, ImagePlus, Calculator, Layers } from 'lucide-react';
import type { StockItem, Category, SalesChannel } from '../types';
import { margin } from '../types';
import { parseEntry, createDraftFromParsed, type ParsedEntry } from '../parse';
import { buildAdCopy, copyToClipboard } from '../adCopy';
import { Sheet } from './Sheet';
import { UpgradePrompt } from './UpgradePrompt';
import { AiBadge } from './AiBadge';
import { CATEGORIES_BY_TENANT, categoryFieldConfig } from '../categoryFieldMap';
import { TENANT } from '../config';
import {
  totalUnitsFromBatch,
  unitCostFromBatch,
  suggestSalePrice,
  createDefaultTiers,
  tierQuantityTotal,
  DEFAULT_MARKUP,
  MIN_MARKUP,
  MAX_MARKUP,
  type QualityTier,
} from '../batchPricing';

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: Omit<StockItem, 'id' | 'createdAt'>) => void;
  simulateFreePlan?: boolean;
  currencySymbol?: string;
}

const FREE_CHANNEL_LIMIT = 1;

type Draft = Omit<StockItem, 'id' | 'createdAt'>;

const emptyDraft: Draft = {
  name: '',
  category: 'Other',
  quantity: 0,
  purchasePrice: 0,
  salePrice: 0,
  supplier: '',
  tags: [],
  environment: '',
  channels: [],
  aging: false,
  soldOut: false,
};

const CHANNEL_SUGGESTIONS = ['Facebook Marketplace', 'Gumtree', 'WhatsApp', 'Physical market', 'Instagram', 'TikTok'];

export function AddSheet({ open, onClose, onSave, simulateFreePlan = false, currencySymbol = 'kr' }: AddSheetProps) {
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedEntry | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [moreOpen, setMoreOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);
  const [showChannelUpgrade, setShowChannelUpgrade] = useState(false);
  const [channelInput, setChannelInput] = useState('');
  const [channelPrice, setChannelPrice] = useState('');
  const [hintDismissed, setHintDismissed] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  const [savedStep, setSavedStep] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('general');
  const [copied, setCopied] = useState(false);
  const [photoStep, setPhotoStep] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);
  const tenantCategories = CATEGORIES_BY_TENANT[TENANT];

  // Batch/tray purchase calculator — see batchPricing.ts. Off by default;
  // most single-item entries never need it.
  const [batchMode, setBatchMode] = useState(false);
  const [batchTotalCost, setBatchTotalCost] = useState('');
  const [batchTrays, setBatchTrays] = useState('');
  const [batchPiecesPerTray, setBatchPiecesPerTray] = useState('');

  // Markup-based sale price suggestion. salePriceTouched tracks whether the
  // seller has typed directly into the sale price field since it was last
  // auto-filled — once true, changing purchase price or markup stops
  // silently overwriting what she typed.
  const [markup, setMarkup] = useState(DEFAULT_MARKUP);
  const [salePriceTouched, setSalePriceTouched] = useState(false);

  // Quality tiers — for when a batch isn't uniform (small/standard/premium
  // plants from the same tray, sold at different prices). Only relevant
  // alongside batchMode; saving with tiers enabled creates one stock item
  // per tier instead of a single item.
  const [tiersEnabled, setTiersEnabled] = useState(false);
  const [tiers, setTiers] = useState<QualityTier[]>([]);
  const [tierSaveSummary, setTierSaveSummary] = useState<
    { name: string; quantity: number; salePrice: number }[] | null
  >(null);

  const reset = () => {
    setRawText('');
    setParsed(null);
    setShowCard(false);
    setDraft(emptyDraft);
    setMoreOpen(false);
    setTagInput('');
    setAddingChannel(false);
    setShowChannelUpgrade(false);
    setChannelInput('');
    setChannelPrice('');
    setHintDismissed(false);
    setSavedStep(false);
    setSelectedChannelId('general');
    setCopied(false);
    setPhotoStep(false);
    setPendingImageUrl(undefined);
    setBatchMode(false);
    setBatchTotalCost('');
    setBatchTrays('');
    setBatchPiecesPerTray('');
    setMarkup(DEFAULT_MARKUP);
    setSalePriceTouched(false);
    setTiersEnabled(false);
    setTiers([]);
    setTierSaveSummary(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleInterpret = () => {
    if (!rawText.trim()) return;
    setInterpreting(true);
    setTimeout(() => {
      const result = parseEntry(rawText);
      setParsed(result);
      setDraft(createDraftFromParsed(result));
      setShowCard(true);
      setInterpreting(false);
    }, 500);
  };

  const handleSkipManual = () => {
    setParsed(null);
    setDraft({ ...emptyDraft });
    setShowCard(true);
  };

  /**
   * Photo-first entry, modelled on the flow Blocket's AI assistant uses:
   * photo first, then a category, then category-appropriate fields — rather
   * than asking the seller to compose a written description before they've
   * entered anything at all. Picking a category here doesn't require a
   * vision model; it's a manual chip picker for now, which keeps the win
   * (no writing required before you see the form) without taking on image
   * recognition as a dependency. See the Blocket deep-dive notes for why
   * this ordering matters more than the automation behind it.
   */
  const handlePhotoSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImageUrl(typeof reader.result === 'string' ? reader.result : undefined);
      setPhotoStep(true);
    };
    reader.readAsDataURL(file);
  };

  const handlePickCategoryFromPhoto = (category: Category) => {
    setParsed(null);
    setDraft({ ...emptyDraft, category, imageUrl: pendingImageUrl });
    setPhotoStep(false);
    setShowCard(true);
  };

  const handleCancelPhotoStep = () => {
    setPhotoStep(false);
    setPendingImageUrl(undefined);
  };

  /**
   * Recomputes quantity + cost/unit whenever any batch input changes, and
   * re-derives the suggested sale price from the current markup — unless
   * the seller has already typed her own number into that field. This is
   * the direct answer to "I count trays, then work out cost per plant by
   * hand every time": the arithmetic happens automatically, the seller
   * only enters what she actually knows (total paid, trays, per tray).
   */
  const applyBatchCalculation = (totalCost: string, trays: string, piecesPerTray: string) => {
    const input = {
      totalCost: parseFloat(totalCost) || 0,
      trays: parseInt(trays, 10) || 0,
      piecesPerTray: parseInt(piecesPerTray, 10) || 0,
    };
    const units = totalUnitsFromBatch(input);
    const unitCost = unitCostFromBatch(input);
    setDraft((d) => ({
      ...d,
      quantity: units,
      purchasePrice: unitCost,
      salePrice: salePriceTouched ? d.salePrice : suggestSalePrice(unitCost, markup),
    }));
    if (tiersEnabled) {
      setTiers(createDefaultTiers(units));
    }
  };

  const handleMarkupChange = (value: number) => {
    setMarkup(value);
    if (!salePriceTouched) {
      setDraft((d) => ({ ...d, salePrice: suggestSalePrice(d.purchasePrice, value) }));
    }
  };

  const handleToggleTiers = () => {
    const next = !tiersEnabled;
    setTiersEnabled(next);
    if (next) {
      setTiers(createDefaultTiers(draft.quantity));
    }
  };

  const updateTier = (id: string, patch: Partial<QualityTier>) => {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeTier = (id: string) => {
    setTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2, 9), label: '', quantity: 0, markup: DEFAULT_MARKUP },
    ]);
  };

  const handleSave = () => {
    if (tiersEnabled && batchMode) {
      const validTiers = tiers.filter((t) => t.label.trim() && t.quantity > 0);
      validTiers.forEach((tier) => {
        onSave({
          ...draft,
          name: `${draft.name} — ${tier.label.trim()}`,
          quantity: tier.quantity,
          salePrice: suggestSalePrice(draft.purchasePrice, tier.markup),
        });
      });
      setTierSaveSummary(
        validTiers.map((tier) => ({
          name: `${draft.name} — ${tier.label.trim()}`,
          quantity: tier.quantity,
          salePrice: suggestSalePrice(draft.purchasePrice, tier.markup),
        }))
      );
      setSavedStep(true);
      return;
    }
    onSave(draft);
    // Don't close yet — this is the whole point of the feature: logging the
    // item and getting ready-to-post copy happen in one continuous flow.
    setSavedStep(true);
  };

  const handleDone = () => {
    reset();
    onClose();
  };

  const selectedChannel: SalesChannel | undefined =
    selectedChannelId === 'general' ? undefined : draft.channels.find((c) => c.id === selectedChannelId);
  const adCopyText = buildAdCopy(draft, selectedChannel);

  const handleCopy = async () => {
    const ok = await copyToClipboard(adCopyText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const m = margin(draft.purchasePrice, draft.salePrice);

  const addChannel = () => {
    if (!channelInput.trim()) return;
    const newCh: SalesChannel = {
      id: Math.random().toString(36).slice(2, 9),
      name: channelInput.trim(),
      price: channelPrice.trim() ? parseInt(channelPrice) || undefined : undefined,
    };
    setDraft({ ...draft, channels: [...draft.channels, newCh] });
    setChannelInput('');
    setChannelPrice('');
    setAddingChannel(false);
  };

  const cancelAddChannel = () => {
    setChannelInput('');
    setChannelPrice('');
    setAddingChannel(false);
  };

  const removeChannel = (id: string) => {
    setDraft({ ...draft, channels: draft.channels.filter((c) => c.id !== id) });
  };

  return (
    <Sheet open={open} onClose={handleClose} maxHeight="94vh">
      <div className="flex items-center justify-between px-5 py-2 shrink-0">
        <h2 className="text-lg font-bold text-stone-900">Add item</h2>
        <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
        {/* Step 1: free text */}
        {!showCard && !savedStep && !photoStep && (
          <div className="pt-2 animate-fadeIn">
            <div className="relative">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Type or speak what you bought — e.g. '40 white roses at 80p each', or just a name"
                rows={3}
                className="w-full p-4 pr-12 rounded-2xl bg-white border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 transition resize-none"
              />
              <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 active:scale-95 transition" aria-label="Dictate">
                <Mic size={18} />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInterpret}
                disabled={!rawText.trim() || interpreting}
                className="flex-1 h-12 rounded-full bg-accent-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-fab hover:bg-accent-600 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
              >
                <Sparkles size={17} />
                {interpreting ? 'Interpreting…' : 'Interpret'}
              </button>
              <button
                onClick={handleSkipManual}
                className="h-12 px-4 rounded-full bg-white border border-stone-200 text-sm font-medium text-stone-600 hover:border-stone-300 transition"
              >
                Skip, fill in manually
              </button>
            </div>
            {parsed && !parsed.name && !parsed.quantity && (
              <p className="mt-3 text-xs text-stone-500 text-center">
                Couldn't parse that automatically — fill in the fields manually below.
              </p>
            )}

            <div className="mt-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-[11px] text-stone-400">or</span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoSelected(file);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 w-full h-12 rounded-full bg-white border border-stone-200 text-sm font-medium text-stone-600 flex items-center justify-center gap-2 hover:border-accent-300 hover:text-accent-600 transition"
            >
              <ImagePlus size={17} />
              Start from a photo
            </button>
          </div>
        )}

        {/* Step 1b: photo captured — pick a category, no typing required */}
        {photoStep && !showCard && !savedStep && (
          <div className="pt-2 animate-fadeIn">
            {pendingImageUrl && (
              <div className="w-full aspect-square max-h-48 rounded-2xl overflow-hidden border border-stone-200 mb-4">
                <img src={pendingImageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-sm font-medium text-stone-700 mb-3">What kind of item is this?</p>
            <div className="grid grid-cols-2 gap-2">
              {tenantCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => handlePickCategoryFromPhoto(c)}
                  className="h-14 rounded-2xl bg-white border border-stone-200 text-sm font-semibold text-stone-700 hover:border-accent-400 hover:text-accent-600 active:scale-[0.98] transition"
                >
                  {c}
                </button>
              ))}
            </div>
            <button
              onClick={handleCancelPhotoStep}
              className="mt-4 w-full h-11 rounded-full text-sm font-medium text-stone-500 hover:text-stone-700 transition"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Step 2: unified editable card */}
        {showCard && !savedStep && (
          <div className="pt-2 animate-fadeIn">
            {parsed?.name && (
              <div className="mb-3">
                <AiBadge text="Parsed from your text — adjust if it's not quite right." />
              </div>
            )}
            {!parsed && draft.imageUrl && (
              <div className="mb-3">
                <AiBadge text="Category set from your photo — the fields below adjust to match it." />
              </div>
            )}

            {/* The essentials — always visible */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3.5">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide">The essentials</h3>

              <Field label="Name">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="E.g. Parlour palm"
                  className="input"
                />
              </Field>

              {/* Batch/tray purchase toggle */}
              <button
                onClick={() => setBatchMode((v) => !v)}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700 transition"
              >
                <Calculator size={15} />
                <span>{batchMode ? '− Bought as a single item instead' : 'Bought as a batch or tray?'}</span>
              </button>

              {batchMode && (
                <div className="rounded-xl bg-cream-100 border border-stone-200 p-3 space-y-2.5 animate-fadeIn">
                  <p className="text-xs text-stone-500 leading-snug">
                    Enter what you paid in total — the cost per plant is worked out for you.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label={`Total cost (${currencySymbol})`}>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={batchTotalCost}
                        onChange={(e) => {
                          setBatchTotalCost(e.target.value);
                          applyBatchCalculation(e.target.value, batchTrays, batchPiecesPerTray);
                        }}
                        placeholder="20"
                        className="input"
                      />
                    </Field>
                    <Field label="Trays">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={batchTrays}
                        onChange={(e) => {
                          setBatchTrays(e.target.value);
                          applyBatchCalculation(batchTotalCost, e.target.value, batchPiecesPerTray);
                        }}
                        placeholder="2"
                        className="input"
                      />
                    </Field>
                    <Field label="Per tray">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={batchPiecesPerTray}
                        onChange={(e) => {
                          setBatchPiecesPerTray(e.target.value);
                          applyBatchCalculation(batchTotalCost, batchTrays, e.target.value);
                        }}
                        placeholder="6"
                        className="input"
                      />
                    </Field>
                  </div>
                  {draft.quantity > 0 && draft.purchasePrice > 0 && (
                    <AiBadge
                      text={`${draft.quantity} plants at ${currencySymbol}${draft.purchasePrice.toFixed(2)} each — cost calculated automatically.`}
                    />
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={draft.quantity || ''}
                    onChange={(e) => setDraft({ ...draft, quantity: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="input"
                    disabled={batchMode}
                  />
                  {parsed && draft.quantity === 0 && (
                    <p className="mt-1 text-[11px] text-amber-600 leading-snug">
                      Couldn't find this — try "bought 20" or "20 units"
                    </p>
                  )}
                </Field>
                <Field label={`Purchase price (${currencySymbol}/unit)`}>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={draft.purchasePrice || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setDraft((d) => ({
                        ...d,
                        purchasePrice: value,
                        salePrice: salePriceTouched ? d.salePrice : suggestSalePrice(value, markup),
                      }));
                    }}
                    placeholder="0"
                    className="input"
                    disabled={batchMode}
                  />
                  {parsed && draft.purchasePrice === 0 && (
                    <p className="mt-1 text-[11px] text-amber-600 leading-snug">
                      Couldn't find this — try "bought at 1.50 £/pp"
                    </p>
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Markup (× cost)">
                  <input
                    type="number"
                    inputMode="decimal"
                    step={0.5}
                    min={MIN_MARKUP}
                    max={MAX_MARKUP}
                    value={markup || ''}
                    onChange={(e) => handleMarkupChange(parseFloat(e.target.value) || 0)}
                    placeholder="3"
                    className="input"
                  />
                  <p className="mt-1 text-[11px] text-stone-400 leading-snug">
                    Typical range {MIN_MARKUP}×–{MAX_MARKUP}×
                  </p>
                </Field>
                <Field label={`Suggested sale price (${currencySymbol}/unit)`}>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={draft.salePrice || ''}
                    onChange={(e) => {
                      setSalePriceTouched(true);
                      setDraft({ ...draft, salePrice: parseFloat(e.target.value) || 0 });
                    }}
                    placeholder="0"
                    className="input"
                  />
                  {draft.salePrice > 0 && draft.purchasePrice >= 0 && (
                    <p
                      className={`mt-1.5 text-xs font-medium flex items-center gap-1 ${
                        m >= 50
                          ? 'text-emerald-600'
                          : m >= 30
                            ? 'text-amber-600'
                            : 'text-red-600'
                      }`}
                    >
                      {m < 30 && <AlertTriangle size={12} />}
                      {m}% margin
                      {m >= 50 ? ' — looks good' : m >= 30 ? ' — a bit thin' : ' — below your usual margin'}
                    </p>
                  )}
                </Field>
              </div>
              {!salePriceTouched && draft.salePrice > 0 && (
                <AiBadge text="Price suggested from your markup — edit it any time." />
              )}

              {/* Quality tiers — only relevant once buying as a batch */}
              {batchMode && (
                <button
                  onClick={handleToggleTiers}
                  className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700 transition"
                >
                  <Layers size={15} />
                  <span>{tiersEnabled ? '− Sell this batch at one price' : 'Sizes or quality vary in this batch?'}</span>
                </button>
              )}

              {batchMode && tiersEnabled && (
                <div className="rounded-xl bg-cream-100 border border-stone-200 p-3 space-y-2.5 animate-fadeIn">
                  <p className="text-xs text-stone-500 leading-snug">
                    Same cost per plant ({currencySymbol}{draft.purchasePrice.toFixed(2)}), different sale prices —
                    each tier saves as its own stock item.
                  </p>
                  {tiers.map((tier) => (
                    <div key={tier.id} className="flex gap-2 items-start bg-white rounded-lg border border-stone-200 p-2.5">
                      <input
                        value={tier.label}
                        onChange={(e) => updateTier(tier.id, { label: e.target.value })}
                        placeholder="Label, e.g. Small"
                        className="input flex-1"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        value={tier.quantity || ''}
                        onChange={(e) => updateTier(tier.id, { quantity: parseInt(e.target.value) || 0 })}
                        placeholder="Qty"
                        className="input w-16"
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        step={0.5}
                        value={tier.markup || ''}
                        onChange={(e) => updateTier(tier.id, { markup: parseFloat(e.target.value) || 0 })}
                        placeholder="×"
                        className="input w-16"
                      />
                      <span className="text-xs text-stone-500 pt-2.5 w-16 shrink-0 text-right">
                        {currencySymbol}{suggestSalePrice(draft.purchasePrice, tier.markup).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeTier(tier.id)}
                        className="text-stone-400 hover:text-red-500 transition shrink-0 pt-2"
                        aria-label="Remove tier"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addTier}
                    className="inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
                  >
                    <Plus size={16} />
                    Add tier
                  </button>
                  {draft.quantity > 0 && tierQuantityTotal(tiers) !== draft.quantity && (
                    <p className="text-[11px] text-amber-600 leading-snug flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Tiers add up to {tierQuantityTotal(tiers)}, batch has {draft.quantity} — adjust quantities to match.
                    </p>
                  )}
                </div>
              )}

              {/* More details toggle — inline text link */}
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className="w-full flex items-center justify-center gap-1 pt-1 text-sm font-medium text-accent-600 hover:text-accent-700 transition"
              >
                <span>{moreOpen ? '− Fewer details' : '+ More details'}</span>
              </button>
            </div>

            {/* Expanded section — inline in the same card */}
            {moreOpen && (
              <div className="mt-2 bg-white rounded-2xl border border-stone-200 p-4 space-y-4 animate-fadeIn">
                <Field label="Category">
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}
                    className="input"
                  >
                    {tenantCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>

                <Field label={categoryFieldConfig(draft.category).environmentLabel}>
                  <input
                    value={draft.environment ?? ''}
                    onChange={(e) => setDraft({ ...draft, environment: e.target.value })}
                    placeholder={categoryFieldConfig(draft.category).environmentPlaceholder}
                    className="input"
                  />
                </Field>

                <Field label="Supplier">
                  <input
                    value={draft.supplier}
                    onChange={(e) => setDraft({ ...draft, supplier: e.target.value })}
                    placeholder="E.g. Columbia Road Market"
                    className="input"
                  />
                </Field>

                <Field label="Tags">
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {draft.tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cream-100 text-stone-600 text-xs">
                        {t}
                        <button
                          onClick={() => setDraft({ ...draft, tags: draft.tags.filter((x) => x !== t) })}
                          className="text-stone-400 hover:text-stone-600"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                        e.preventDefault();
                        setDraft({ ...draft, tags: [...draft.tags, tagInput.trim()] });
                        setTagInput('');
                      }
                    }}
                    placeholder="Type a tag + Enter"
                    className="input"
                  />
                </Field>

                <Field label="Image">
                  <input
                    ref={cardFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setDraft((d) => ({ ...d, imageUrl: reader.result as string }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                      e.target.value = '';
                    }}
                  />
                  {draft.imageUrl ? (
                    <button
                      onClick={() => cardFileInputRef.current?.click()}
                      className="w-full aspect-square max-h-32 rounded-xl overflow-hidden border border-stone-200 relative group"
                    >
                      <img src={draft.imageUrl} alt="" className="w-full h-full object-cover" />
                      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition">
                        Change photo
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => cardFileInputRef.current?.click()}
                      className="w-full aspect-square max-h-32 rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-400 hover:border-accent-300 hover:text-accent-500 transition"
                    >
                      <Camera size={22} />
                      <span className="text-xs mt-1.5">Upload image</span>
                    </button>
                  )}
                </Field>

                {/* Sales channels — dynamic list */}
                <div>
                  <span className="block text-xs font-medium text-stone-500 mb-1.5">Sales channels</span>

                  {/* Hint row — dismissible, once per session */}
                  {draft.channels.length > 0 && !hintDismissed && (
                    <div className="mb-2.5 flex items-start gap-2 px-3 py-2 rounded-xl bg-accent-50 text-accent-700 text-xs animate-fadeIn">
                      <span className="flex-1 leading-snug">
                        Price can differ per channel — leave the field empty to use the base price everywhere.
                      </span>
                      <button
                        onClick={() => setHintDismissed(true)}
                        className="text-accent-400 hover:text-accent-600 shrink-0"
                        aria-label="Dismiss hint"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Empty state */}
                  {draft.channels.length === 0 && !addingChannel && (
                    <div className="px-3 py-3 rounded-xl bg-cream-100 border border-stone-200">
                      <p className="text-xs text-stone-500 mb-2.5 leading-snug">
                        No channels added yet — the price above applies everywhere until you add one.
                      </p>
                      <button
                        onClick={() => setAddingChannel(true)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
                      >
                        <Plus size={16} />
                        Add channel
                      </button>
                    </div>
                  )}

                  {/* Channel list */}
                  {draft.channels.length > 0 && (
                    <div className="space-y-1.5">
                      {draft.channels.map((ch) => {
                        const hasCustomPrice = ch.price !== undefined && ch.price !== draft.salePrice;
                        return (
                          <div
                            key={ch.id}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-cream-100 border border-stone-200"
                          >
                            <span className="flex-1 text-sm font-semibold text-stone-800 truncate">{ch.name}</span>
                            <span className={`text-sm ${hasCustomPrice ? 'font-medium text-stone-700' : 'text-stone-400'}`}>
                              {hasCustomPrice ? `${ch.price} ${currencySymbol}` : 'Same as base price'}
                            </span>
                            <button
                              onClick={() => removeChannel(ch.id)}
                              className="text-stone-400 hover:text-red-500 transition shrink-0"
                              aria-label="Remove channel"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add channel row — inline */}
                  {addingChannel && (
                    <div className="mt-2 rounded-xl bg-white border border-accent-300 p-3 animate-fadeIn">
                      {/* Suggestion chips */}
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {CHANNEL_SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => setChannelInput(s)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition active:scale-95 ${
                              channelInput === s
                                ? 'bg-accent-500 text-white'
                                : 'bg-cream-100 text-stone-600 hover:bg-cream-200'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2 items-center">
                        <input
                          value={channelInput}
                          onChange={(e) => setChannelInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChannel())}
                          placeholder="Channel name"
                          className="input flex-1"
                          autoFocus
                        />
                        <input
                          type="number"
                          inputMode="decimal"
                          value={channelPrice}
                          onChange={(e) => setChannelPrice(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChannel())}
                          placeholder={draft.salePrice > 0 ? `${draft.salePrice} ${currencySymbol} — same` : 'Price'}
                          className="input w-24"
                        />
                        <button
                          onClick={addChannel}
                          disabled={!channelInput.trim()}
                          className="w-10 h-10 rounded-xl bg-accent-500 text-white flex items-center justify-center hover:bg-accent-600 active:scale-95 transition shrink-0 disabled:opacity-40"
                          aria-label="Confirm channel"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={cancelAddChannel}
                          className="w-10 h-10 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center hover:bg-stone-200 active:scale-95 transition shrink-0"
                          aria-label="Cancel"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      {draft.salePrice > 0 && (
                        <p className="mt-1.5 text-xs text-stone-400">
                          Leave empty to use the base price ({draft.salePrice} {currencySymbol}).
                        </p>
                      )}
                    </div>
                  )}

                  {/* Add button when channels exist and not adding */}
                  {draft.channels.length > 0 && !addingChannel && !showChannelUpgrade && (
                    <button
                      onClick={() => {
                        if (simulateFreePlan && draft.channels.length >= FREE_CHANNEL_LIMIT) {
                          setShowChannelUpgrade(true);
                        } else {
                          setAddingChannel(true);
                        }
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700 transition"
                    >
                      <Plus size={16} />
                      Add channel
                    </button>
                  )}

                  {showChannelUpgrade && (
                    <div className="mt-2">
                      <UpgradePrompt
                        title="Unlimited channels on the paid plan"
                        description={`Free includes ${FREE_CHANNEL_LIMIT} channel. Upgrade to add Facebook Marketplace, Instagram, TikTok and more — each with auto-styled ad copy.`}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: item saved — ready-to-post ad copy, channel-aware */}
        {savedStep && tierSaveSummary && (
          <div className="pt-2 animate-fadeIn">
            <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium">
              <CheckCircle2 size={18} />
              {tierSaveSummary.length} items added to stock, one per tier.
            </div>
            <div className="space-y-1.5">
              {tierSaveSummary.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white border border-stone-200"
                >
                  <span className="text-sm font-medium text-stone-800">{item.name}</span>
                  <span className="text-sm text-stone-500">
                    {item.quantity} × {currencySymbol}{item.salePrice.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-stone-400 leading-snug">
              Ad copy is written per item from the stock list — open each one to generate and copy its text.
            </p>
          </div>
        )}
        {savedStep && !tierSaveSummary && (
          <div className="pt-2 animate-fadeIn">
            <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium">
              <CheckCircle2 size={18} />
              Added to stock — here's copy ready to post.
            </div>

            {draft.channels.length > 0 && (
              <div className="mb-3">
                <span className="block text-xs font-medium text-stone-500 mb-1.5">Write for</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedChannelId('general')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 ${
                      selectedChannelId === 'general'
                        ? 'bg-accent-500 text-white'
                        : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    General
                  </button>
                  {draft.channels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChannelId(ch.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 ${
                        selectedChannelId === ch.id
                          ? 'bg-accent-500 text-white'
                          : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      {ch.name}
                    </button>
                  ))}
                </div>
                {selectedChannel && /instagram|tiktok/i.test(selectedChannel.name) && (
                  <p className="mt-1.5 text-[11px] text-stone-400">
                    Shorter, hashtag-style caption — built for {selectedChannel.name}
                  </p>
                )}
              </div>
            )}

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
        )}
      </div>

      {/* Sticky save / done */}
      {(showCard || savedStep) && (
        <div className="shrink-0 px-5 pt-3 pb-5 safe-bottom border-t border-stone-100 bg-cream-50">
          {savedStep ? (
            <button
              onClick={handleDone}
              className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition"
            >
              Done
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!draft.name.trim()}
              className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
            >
              Save
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-stone-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
