import { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Sparkles, Plus, Trash2, Check, Camera, AlertTriangle, Copy, CheckCircle2, ImagePlus, Calculator, Layers, Lock } from 'lucide-react';
import type { StockItem, Category, SalesChannel, Sale, MarkupPreset, SeasonPreset } from '../types';
import { margin } from '../types';
import { parseEntry, createDraftFromParsed, type ParsedEntry } from '../parse';
import { buildAdCopy, copyToClipboard } from '../adCopy';
import { Sheet } from './Sheet';
import { UpgradePrompt } from './UpgradePrompt';
import { AiBadge } from './AiBadge';
import { COLOR_PALETTE } from '../colorPalette';
import { forecastForName } from '../forecast';
import { suggestMarkup } from '../markupSuggestions';
import { categoriesForPilot, categoryFieldConfigForPilot, ADD_ITEM_TEXT_BY_TENANT, SEASON_PRESETS_BY_TENANT } from '../categoryFieldMap';
import { recordCategoryCorrection } from '../categoryLearning';
import { TENANT, PILOT_SLUG } from '../config';
import { useSpeechToText } from '../useSpeechToText';
import { useLanguage } from '../useLanguage';
import { vatPortionOfPrice } from '../vat';
import type { Lang } from '../strings';
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
import {
  CURRENCY_SYMBOLS,
  availableCurrencies,
  toLocal,
  fromLocal,
  type CurrencyCode,
  type ExchangeRates,
} from '../exchangeRates';

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: Omit<StockItem, 'id' | 'createdAt'>) => void;
  /** Present only in edit mode — the item being edited. */
  editItem?: StockItem | null;
  onUpdate?: (item: StockItem) => void;
  onDelete?: (id: string) => void;
  simulateFreePlan?: boolean;
  currencySymbol?: string;
  exchangeRates?: ExchangeRates;
  /** B7 (tuvara-bifogade-filer-analys.md) — needed only to compute the
   *  sell-through forecast hint below the quantity field. Optional/defaults
   *  to empty so nothing breaks if a caller doesn't pass them. */
  items?: StockItem[];
  sales?: Sale[];
  /** B2/B3 (tuvara-sasongspaslag-analys.md) — seller's own tag-markup
   *  presets (Lager 2, no seeded default) and season/occasion presets
   *  (Lager 3, tenant-seeded but editable). Both optional: an unset
   *  markupPresets means no tag-based suggestion applies yet, and an unset
   *  seasonPresets falls back to SEASON_PRESETS_BY_TENANT[TENANT]. */
  markupPresets?: MarkupPreset[];
  seasonPresets?: SeasonPreset[];
  /** Moms/VAT display on the suggested price — see vat.ts and Settings'
   *  "Include VAT in prices" toggle. Purely a display line; never touches
   *  salePrice itself. */
  vatEnabled?: boolean;
  vatRatePct?: number;
  /** Staff-rättigheter (punkt 1,
   *  tuvara-app-personal-moms-butiker-kostnader-insights-analys.md) — when
   *  true, purchase price, markup, margin and any cost breakdown are
   *  hidden; only quantity and sale price stay editable. A soft UI gate,
   *  not real access control — see App.tsx's isOwner. Editing an existing
   *  item under this flag leaves its stored purchasePrice untouched (the
   *  field is hidden, not cleared). */
  hideCostInfo?: boolean;
  /** Named shops (Settings' shopNames) — see
   *  tuvara-app-personal-moms-butiker-kostnader-insights-analys.md punkt 3.
   *  Empty by default; the "Shop" field is only shown once the seller has
   *  named at least one. */
  shopNames?: string[];
}

const FREE_CHANNEL_LIMIT = 1;

type Draft = Omit<StockItem, 'id' | 'createdAt'>;

/** One row of the ephemeral cost-part calculator — never persisted, never a
 *  StockItem field. See AddSheet's cost-calculator block below. */
interface CostPart {
  id: string;
  label: string;
  amount: string;
}

function costPartsTotal(parts: CostPart[]): number {
  return parts.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
}

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

export function AddSheet({
  open,
  onClose,
  onSave,
  editItem = null,
  onUpdate,
  onDelete,
  simulateFreePlan = false,
  currencySymbol = 'kr',
  exchangeRates = {},
  items = [],
  sales = [],
  markupPresets,
  seasonPresets,
  vatEnabled = false,
  vatRatePct,
  shopNames = [],
  hideCostInfo = false,
}: AddSheetProps) {
  const { t, lang } = useLanguage();
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // Which language the generated ad copy's template phrases are written in
  // (tuvara-visuell-lonsamhet-analys.md) — starts at the app's own UI
  // language but is independently switchable, since a seller posting to a
  // Bangla-speaking audience isn't always reading Tuvara itself in Bangla.
  const [copyLang, setCopyLang] = useState<Lang>(lang);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);
  const tenantCategories = categoriesForPilot(PILOT_SLUG, TENANT);
  const addItemText = ADD_ITEM_TEXT_BY_TENANT[TENANT];

  const speech = useSpeechToText((transcript) => {
    setRawText((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
  });

  // Groups the three alternate ways of arriving at a purchase price (batch/
  // tray buying, foreign currency, cost-part breakdown) behind a single
  // disclosure instead of three separate always-visible toggles — see
  // tuvara-ux-intuitivitet-analys.md P0.3. Purely presentational; none of
  // the calculators below changed.
  const [pricingOptionsOpen, setPricingOptionsOpen] = useState(false);

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

  // "Paid in a different currency?" — converts a foreign-currency purchase
  // into the seller's trading currency using her saved reference rate (see
  // exchangeRates.ts), then writes the result into purchasePrice like any
  // manually typed number. Mutually exclusive with batch mode, which already
  // owns purchasePrice while it's on.
  const [foreignPurchaseMode, setForeignPurchaseMode] = useState(false);
  const [foreignAmount, setForeignAmount] = useState('');
  const [foreignCurrency, setForeignCurrency] = useState<CurrencyCode | ''>('');

  // Cost part breakdown — ephemeral helper for building up purchasePrice
  // from several material/labour lines instead of doing the addition by
  // hand. Nothing here is persisted once applied; see AddSheet's CLAUDE.md
  // scope note on this feature.
  const [costCalcOpen, setCostCalcOpen] = useState(false);
  const [costParts, setCostParts] = useState<CostPart[]>([]);

  // "Show price in more currencies" — purely a display toggle next to the
  // sale price; nothing here is ever written back into the draft.
  const [showMultiCurrency, setShowMultiCurrency] = useState(false);

  // Edit mode — jump straight to the editable card, prefilled from the
  // existing item, instead of the free-text/photo entry steps that only
  // make sense when creating something new. salePriceTouched is set so
  // editing purchase price never silently overwrites a sale price the
  // seller already chose.
  useEffect(() => {
    if (open && editItem) {
      setDraft({
        name: editItem.name,
        category: editItem.category,
        quantity: editItem.quantity,
        purchasePrice: editItem.purchasePrice,
        salePrice: editItem.salePrice,
        supplier: editItem.supplier ?? '',
        tags: editItem.tags,
        imageUrl: editItem.imageUrl,
        environment: editItem.environment,
        channels: editItem.channels,
        aging: editItem.aging,
        soldOut: editItem.soldOut,
        agingAction: editItem.agingAction,
        agingActionNote: editItem.agingActionNote,
        color: editItem.color,
        bulkThreshold: editItem.bulkThreshold,
        bulkUnitPrice: editItem.bulkUnitPrice,
        season: editItem.season,
      });
      setParsed(null);
      setShowCard(true);
      setSavedStep(false);
      setSalePriceTouched(true);
      setDeleteConfirmOpen(false);
    }
  }, [open, editItem]);

  const availableCurrencyCodes = availableCurrencies(exchangeRates);
  const foreignRate = foreignCurrency ? exchangeRates[foreignCurrency]?.rate : undefined;
  const convertedLocalAmount =
    foreignRate !== undefined && foreignAmount
      ? toLocal(parseFloat(foreignAmount) || 0, foreignRate)
      : undefined;

  const applyForeignPurchase = () => {
    if (convertedLocalAmount === undefined) return;
    setDraft((d) => ({
      ...d,
      purchasePrice: convertedLocalAmount,
      salePrice: salePriceTouched ? d.salePrice : suggestSalePrice(convertedLocalAmount, markup),
    }));
    setForeignPurchaseMode(false);
    setForeignAmount('');
    setForeignCurrency('');
  };

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
    setDeleteConfirmOpen(false);
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

  /**
   * Entering batch mode hands control of quantity + purchase price to the
   * calculator below. Clear both first — otherwise a quantity/price that
   * free-text parsing already guessed (possibly wrongly, e.g. reading a
   * total cost as a per-unit price) lingers in the fields and in the
   * "calculated automatically" badge even though the calculator hasn't
   * actually computed anything yet.
   */
  const handleToggleBatchMode = () => {
    setBatchMode((v) => {
      const next = !v;
      if (next) {
        setDraft((d) => ({ ...d, quantity: 0, purchasePrice: 0 }));
        setBatchTotalCost('');
        setBatchTrays('');
        setBatchPiecesPerTray('');
      }
      return next;
    });
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
    if (editItem) {
      onUpdate?.({ ...editItem, ...draft });
      handleClose();
      return;
    }
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
      recordCategoryCorrection(draft.name, draft.category);
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
    recordCategoryCorrection(draft.name, draft.category);
    // Don't close yet — this is the whole point of the feature: logging the
    // item and getting ready-to-post copy happen in one continuous flow.
    setSavedStep(true);
  };

  const handleDone = () => {
    reset();
    onClose();
  };

  const handleDelete = () => {
    if (editItem) onDelete?.(editItem.id);
    handleClose();
  };

  const selectedChannel: SalesChannel | undefined =
    selectedChannelId === 'general' ? undefined : draft.channels.find((c) => c.id === selectedChannelId);
  const adCopyText = buildAdCopy(draft, selectedChannel, currencySymbol, copyLang);

  const handleCopy = async () => {
    const ok = await copyToClipboard(adCopyText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const m = margin(draft.purchasePrice, draft.salePrice);

  // B7 (tuvara-bifogade-filer-analys.md) — only for a brand-new item
  // (editItem is when you're correcting an existing entry, not restocking
  // a fresh batch) and only once there's a real quantity to forecast
  // against. forecastForName itself returns null with no match/history,
  // so nothing renders for a genuinely new item name — see forecast.ts.
  const sellThroughForecast =
    !editItem ? forecastForName(draft.name, draft.quantity, items, sales) : null;

  // B2/B3 (tuvara-sasongspaslag-analys.md) — combines tag presets (Lager 2)
  // and the chosen season/occasion's boost (Lager 3) into one suggested
  // price. Falls back to the tenant's starter season list until the seller
  // has edited it herself in Settings (see AppSettings.seasonPresets).
  const resolvedSeasonPresets = seasonPresets ?? SEASON_PRESETS_BY_TENANT[TENANT];
  const markupSuggestion = suggestMarkup(
    draft.purchasePrice,
    draft.tags,
    draft.season,
    markupPresets ?? [],
    resolvedSeasonPresets
  );
  const showMarkupSuggestion =
    markupSuggestion !== null && Math.abs(markupSuggestion.suggestedPrice - draft.salePrice) > 0.01;

  // tuvara-visuell-lonsamhet-analys.md — existing group names, so a seller
  // adding the second/third variant of a style can reuse the exact same
  // spelling instead of retyping it (and risking a typo that would silently
  // stop the items from clustering in StockList).
  const existingVariantGroups = Array.from(
    new Set(items.map((i) => i.variantGroup).filter((g): g is string => Boolean(g)))
  ).sort();

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
        <h2 className="text-lg font-bold text-stone-900">{editItem ? t('addItemEditTitle') : t('addItemTitle')}</h2>
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
                placeholder={addItemText.rawTextExample(currencySymbol)}
                rows={3}
                className="w-full p-4 pr-12 rounded-2xl bg-white border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 transition resize-none"
              />
              {speech.supported && (
                <button
                  onClick={() => (speech.listening ? speech.stop() : speech.start())}
                  className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 ${
                    speech.listening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-cream-100 text-stone-500 hover:bg-stone-200'
                  }`}
                  aria-label={speech.listening ? 'Stop dictating' : 'Dictate'}
                >
                  {speech.listening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}
            </div>
            {!rawText.trim() && (
              <button
                onClick={() => setRawText(addItemText.quickFillRawText(currencySymbol))}
                className="mt-2 text-xs text-stone-400 hover:text-accent-600 transition text-left"
              >
                {addItemText.quickFillPrompt}{' '}
                <span className="underline decoration-dotted">
                  "{addItemText.quickFillRawText(currencySymbol)}"
                </span>
              </button>
            )}
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
            {!parsed && !editItem && draft.imageUrl && (
              <div className="mb-3">
                <AiBadge text="Category set from your photo — the fields below adjust to match it." />
              </div>
            )}

            {/* The essentials — always visible */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3.5">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide">The essentials</h3>

              <Field label={t('addItemNameLabel')}>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder={addItemText.namePlaceholder}
                  className="input"
                />
              </Field>

              <Field label={t('addItemImageLabel')}>
                <input
                  ref={cardFileInputRef}
                  type="file"
                  accept="image/*"
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
                      {t('addItemChangePhoto')}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => cardFileInputRef.current?.click()}
                    className="w-full aspect-square max-h-32 rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-400 hover:border-accent-300 hover:text-accent-500 transition"
                  >
                    <Camera size={22} />
                    <span className="text-xs mt-1.5">{t('addItemUploadImage')}</span>
                  </button>
                )}
              </Field>

              {/* Single disclosure for the three alternate ways of arriving
                  at a purchase price — batch/tray buying, foreign currency,
                  cost-part breakdown. Collapsed by default: a plain single-
                  item entry never needs to see any of these. Hidden
                  entirely for hideCostInfo — every path here computes
                  purchasePrice, which Staff shouldn't see or set. */}
              {!hideCostInfo && (
              <div>
                <button
                  onClick={() => setPricingOptionsOpen((v) => !v)}
                  className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700 transition"
                >
                  <Calculator size={15} />
                  <span>
                    {pricingOptionsOpen
                      ? t('addItemPricingOptionsOpen')
                      : t('addItemPricingOptionsClosed')}
                  </span>
                </button>

                {pricingOptionsOpen && (
                  <div className="mt-2.5 space-y-3 animate-fadeIn">
                    {/* Batch/tray purchase toggle */}
                    <button
                      onClick={handleToggleBatchMode}
                      className="w-full text-sm font-medium text-accent-600 hover:text-accent-700 transition"
                    >
                      <span>{batchMode ? t('addItemBatchToggleOn') : t('addItemBatchToggleOff')}</span>
                    </button>

                    {batchMode && (
                      <div className="rounded-xl bg-cream-100 border border-stone-200 p-3 space-y-2.5 animate-fadeIn">
                        <p className="text-xs text-stone-500 leading-snug">
                          Enter what you paid in total — the cost per unit is worked out for you.
                          <br />
                          E.g. 2 {addItemText.batchUnitLabel.toLowerCase()} × 6 {addItemText.batchPerUnitLabel.toLowerCase()} = 12 units, {currencySymbol}20 total →{' '}
                          {currencySymbol}1.67 each.
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
                          <Field label={addItemText.batchUnitLabel}>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={batchTrays}
                              onChange={(e) => {
                                setBatchTrays(e.target.value);
                                applyBatchCalculation(batchTotalCost, e.target.value, batchPiecesPerTray);
                              }}
                              placeholder={addItemText.batchUnitPlaceholder}
                              className="input"
                            />
                          </Field>
                          <Field label={addItemText.batchPerUnitLabel}>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={batchPiecesPerTray}
                              onChange={(e) => {
                                setBatchPiecesPerTray(e.target.value);
                                applyBatchCalculation(batchTotalCost, batchTrays, e.target.value);
                              }}
                              placeholder={addItemText.batchPerUnitPlaceholder}
                              className="input"
                            />
                          </Field>
                        </div>
                        {batchTotalCost && batchTrays && batchPiecesPerTray && draft.quantity > 0 && draft.purchasePrice > 0 && (
                          <AiBadge
                            text={`${draft.quantity} units at ${currencySymbol}${draft.purchasePrice.toFixed(2)} each — cost calculated automatically.`}
                          />
                        )}
                      </div>
                    )}

                    {!batchMode && (
                      <div>
                        <button
                          onClick={() => setForeignPurchaseMode((v) => !v)}
                          className="text-xs font-medium text-accent-600 hover:text-accent-700 transition"
                        >
                          {foreignPurchaseMode ? '− Paid in a different currency?' : '+ Paid in a different currency?'}
                        </button>
                        {foreignPurchaseMode && (
                          availableCurrencyCodes.length === 0 ? (
                            <p className="mt-1.5 text-[11px] text-stone-400 leading-snug">
                              Add a rate in Settings first.
                            </p>
                          ) : (
                            <div className="mt-2 space-y-2 animate-fadeIn">
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={foreignAmount}
                                  onChange={(e) => setForeignAmount(e.target.value)}
                                  placeholder="Amount"
                                  className="input"
                                />
                                <select
                                  value={foreignCurrency}
                                  onChange={(e) => setForeignCurrency(e.target.value as CurrencyCode | '')}
                                  className="input"
                                >
                                  <option value="">Currency</option>
                                  {availableCurrencyCodes.map((code) => (
                                    <option key={code} value={code}>{code}</option>
                                  ))}
                                </select>
                              </div>
                              {convertedLocalAmount !== undefined && (
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs text-stone-500 leading-snug">
                                    ≈ {currencySymbol}{convertedLocalAmount.toFixed(2)} based on your saved rate
                                  </p>
                                  <button
                                    onClick={applyForeignPurchase}
                                    className="shrink-0 px-3 py-1.5 rounded-full bg-accent-500 text-white text-xs font-semibold active:scale-95 transition"
                                  >
                                    Use this
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {!batchMode && (
                      <div>
                        <button
                          onClick={() => setCostCalcOpen((v) => !v)}
                          className="text-xs font-medium text-accent-600 hover:text-accent-700 transition"
                        >
                          {costCalcOpen ? '− Add cost part' : '+ Add cost part'}
                        </button>
                        {costCalcOpen && (
                          <div className="mt-2">
                            <CostPartsCalculator
                              parts={costParts}
                              onPartsChange={setCostParts}
                              currencySymbol={currencySymbol}
                              onApply={(total) => {
                                setDraft((d) => ({
                                  ...d,
                                  purchasePrice: total,
                                  salePrice: salePriceTouched ? d.salePrice : suggestSalePrice(total, markup),
                                }));
                                setCostParts([]);
                                setCostCalcOpen(false);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

              <div className={hideCostInfo ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'}>
                <Field label={t('addItemQuantityLabel')}>
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
                  {sellThroughForecast && (
                    <p className="mt-1.5 text-[11px] text-accent-600 leading-snug flex items-start gap-1">
                      <Sparkles size={11} className="shrink-0 mt-0.5" />
                      Past batches of "{draft.name.trim()}" sold through{' '}
                      {Math.round(sellThroughForecast.sellThroughRate * 100)}% — expect to sell ~
                      {sellThroughForecast.expectedToSell} of {draft.quantity}.
                    </p>
                  )}
                </Field>
                {!hideCostInfo && (
                  <Field label={`${t('addItemPurchasePriceLabel')} (${currencySymbol}/unit)`}>
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
                )}
              </div>

              {hideCostInfo && (
                <p className="text-[11px] text-stone-400 leading-snug flex items-center gap-1">
                  <Lock size={11} className="shrink-0" />
                  Purchase price, markup and margin are hidden for your role — you can still set
                  the sale price below.
                </p>
              )}

              <div className={hideCostInfo ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'}>
                {!hideCostInfo && (
                  <Field label={t('addItemMarkupLabel')}>
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
                      {t('addItemMarkupHint')} {MIN_MARKUP}×–{MAX_MARKUP}×
                    </p>
                  </Field>
                )}
                <Field label={`${t('addItemSuggestedPriceLabel')} (${currencySymbol}/unit)`}>
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
                  {!hideCostInfo && draft.salePrice > 0 && draft.purchasePrice >= 0 && (
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
                  {vatEnabled && vatRatePct !== undefined && draft.salePrice > 0 && (
                    <p className="mt-1 text-[11px] text-stone-400">
                      of which VAT ({vatRatePct}%): {currencySymbol}
                      {vatPortionOfPrice(draft.salePrice, vatRatePct).toFixed(2)}
                    </p>
                  )}
                  {availableCurrencyCodes.length > 0 && (
                    <button
                      onClick={() => setShowMultiCurrency((v) => !v)}
                      className="mt-1.5 text-[11px] font-medium text-accent-600 hover:text-accent-700 transition"
                    >
                      {showMultiCurrency ? '− Hide other currencies' : 'Show price in more currencies'}
                    </button>
                  )}
                  {showMultiCurrency && draft.salePrice > 0 && availableCurrencyCodes.length > 0 && (
                    <p className="mt-1 text-[11px] text-stone-400">
                      ≈{' '}
                      {availableCurrencyCodes
                        .map((code) => {
                          const rate = exchangeRates[code]?.rate;
                          if (rate === undefined) return null;
                          return `${CURRENCY_SYMBOLS[code]}${fromLocal(draft.salePrice, rate).toFixed(0)}`;
                        })
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </Field>
              </div>
              {!salePriceTouched && draft.salePrice > 0 && (
                <AiBadge text="Price suggested from your markup — edit it any time." />
              )}

              {/* tuvara-visuell-lonsamhet-analys.md — a plain cost-vs-profit
                  bar for *this item's* price, distinct from the
                  business-wide "sales/week to cover fixed costs" break-even
                  already shown in Business Health. Deliberately not the
                  same number or the same UI, to avoid conflating the two
                  break-even concepts. */}
              {!hideCostInfo && draft.salePrice > 0 && draft.purchasePrice > 0 && (
                <PriceBreakdownBar
                  purchasePrice={draft.purchasePrice}
                  salePrice={draft.salePrice}
                  currencySymbol={currencySymbol}
                />
              )}

              {/* B2/B3 (tuvara-sasongspaslag-analys.md) — a separate,
                  explicit suggestion layered from tag presets + the chosen
                  season's boost. Never auto-applied; the seller taps "Use
                  this price" to accept it, same as the foreign-currency and
                  cost-part calculators above. Hidden for hideCostInfo since
                  it's markup-derived — same reasoning as the fields above. */}
              {!hideCostInfo && showMarkupSuggestion && markupSuggestion && (
                <div className="space-y-1.5">
                  <AiBadge
                    text={`${[
                      ...markupSuggestion.matchedTags.map((p) => `"${p.tag}"`),
                      ...(markupSuggestion.matchedSeason ? [markupSuggestion.matchedSeason.name] : []),
                    ].join(' + ')} suggests ${currencySymbol}${markupSuggestion.suggestedPrice.toFixed(2)} instead.`}
                  />
                  <button
                    onClick={() => {
                      setSalePriceTouched(true);
                      setDraft((d) => ({ ...d, salePrice: markupSuggestion.suggestedPrice }));
                    }}
                    className="text-xs font-medium text-accent-600 hover:text-accent-700 transition"
                  >
                    Use this price
                  </button>
                </div>
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
                    {hideCostInfo
                      ? 'Different sale prices per tier, each tier saves as its own stock item.'
                      : `Same cost per unit (${currencySymbol}${draft.purchasePrice.toFixed(2)}), different sale prices — each tier saves as its own stock item.`}{' '}
                    E.g. "Small" / 4 / 2.5× and "Large" / 2 / 4×.
                  </p>
                  {tiers.length > 0 && (
                    <div className="flex gap-2 px-2.5 text-[10px] font-medium text-stone-400 uppercase tracking-wide">
                      <span className="flex-1">Label</span>
                      <span className="w-16 text-center">Qty</span>
                      <span className="w-16 text-center">Markup</span>
                      <span className="w-16 text-right">Price</span>
                      <span className="w-[15px]" />
                    </div>
                  )}
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
                <span>{moreOpen ? t('addItemMoreDetailsOpen') : t('addItemMoreDetailsClosed')}</span>
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

                <Field label={categoryFieldConfigForPilot(PILOT_SLUG, draft.category).environmentLabel}>
                  <input
                    value={draft.environment ?? ''}
                    onChange={(e) => setDraft({ ...draft, environment: e.target.value })}
                    placeholder={categoryFieldConfigForPilot(PILOT_SLUG, draft.category).environmentPlaceholder}
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

                {shopNames.length > 0 && (
                  <Field label="Shop">
                    <select
                      value={draft.shop ?? ''}
                      onChange={(e) => setDraft({ ...draft, shop: e.target.value || undefined })}
                      className="input"
                    >
                      <option value="">No shop set</option>
                      {shopNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </Field>
                )}

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

                {/* B2/B3 (tuvara-sasongspaslag-analys.md) — free text with
                    the tenant's presets as suggestions (datalist), not a
                    closed picker: a seller can type something not in her
                    own list yet. Feeds the markup suggestion above and,
                    once added, is fully seller-editable in Settings. */}
                <Field label="Season / occasion (optional)">
                  <input
                    list="tuvara-season-presets"
                    value={draft.season ?? ''}
                    onChange={(e) => setDraft({ ...draft, season: e.target.value.trim() ? e.target.value : undefined })}
                    placeholder="E.g. Valentine's Day"
                    className="input"
                  />
                  <datalist id="tuvara-season-presets">
                    {resolvedSeasonPresets.map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                </Field>

                {/* B9 (tuvara-bifogade-filer-analys.md) — a small, fixed,
                    generic palette (colorPalette.ts), never industry
                    vocabulary. Optional; also feeds bundleSuggestions.ts. */}
                <Field label="Colour (optional)">
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PALETTE.map((c) => {
                      const active = draft.color === c.name;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setDraft({ ...draft, color: active ? undefined : c.name })}
                          title={c.name}
                          aria-pressed={active}
                          className={`h-8 w-8 rounded-full border-2 transition ${
                            active ? 'border-accent-500 scale-110' : 'border-stone-200'
                          }`}
                          style={{ background: c.swatch }}
                        />
                      );
                    })}
                  </div>
                </Field>

                {/* tuvara-visuell-lonsamhet-analys.md — clusters this item
                    with others of the same style (different colour/size)
                    in StockList, e.g. "6 variants · 14 total". Free text
                    with existing group names as suggestions (datalist), same
                    "explicit, seller-typed, never inferred" discipline as
                    Season/occasion above — matching by exact string is
                    honest about what it's doing, unlike guessing from the
                    item name. */}
                <Field label="Variant group (optional)">
                  <input
                    list="tuvara-variant-groups"
                    value={draft.variantGroup ?? ''}
                    onChange={(e) =>
                      setDraft({ ...draft, variantGroup: e.target.value.trim() ? e.target.value : undefined })
                    }
                    placeholder="E.g. Cotton batik three-piece"
                    className="input"
                  />
                  <datalist id="tuvara-variant-groups">
                    {existingVariantGroups.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-[11px] text-stone-400 leading-snug">
                    Use the same name as another item (e.g. a different colour of the same style) to
                    show them grouped together in Stock.
                  </p>
                </Field>

                {/* B4 (tuvara-bifogade-filer-analys.md) — a standing bulk
                    price, never applied silently: QuoteCard only ever
                    suggests switching to it once a cart line's quantity
                    reaches the threshold, and the seller taps to apply. */}
                <div>
                  <span className="block text-xs font-medium text-stone-500 mb-1.5">
                    Bulk price (optional)
                  </span>
                  <p className="mb-2 text-[11px] text-stone-400 leading-snug">
                    Buy this many or more, pay a lower price each — suggested at checkout, never
                    applied automatically.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="At quantity">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={draft.bulkThreshold ?? ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setDraft({ ...draft, bulkThreshold: value > 0 ? value : undefined });
                        }}
                        placeholder="e.g. 5"
                        className="input"
                      />
                    </Field>
                    <Field label={`Price each (${currencySymbol})`}>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={draft.bulkUnitPrice ?? ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setDraft({ ...draft, bulkUnitPrice: value > 0 ? value : undefined });
                        }}
                        placeholder="e.g. 8"
                        className="input"
                      />
                    </Field>
                  </div>
                  {draft.bulkThreshold &&
                    draft.bulkUnitPrice &&
                    draft.salePrice > 0 &&
                    draft.bulkUnitPrice >= draft.salePrice && (
                      <p className="mt-1.5 text-[11px] text-amber-600 leading-snug">
                        This isn't lower than the regular price ({draft.salePrice} {currencySymbol}) —
                        won't look like a deal to a buyer.
                      </p>
                    )}
                </div>

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

            <div className="mb-3">
              <span className="block text-xs font-medium text-stone-500 mb-1.5">Write in</span>
              <div className="flex gap-1.5">
                {(['en', 'bn'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setCopyLang(l)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 ${
                      copyLang === l
                        ? 'bg-accent-500 text-white'
                        : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {l === 'en' ? 'English' : 'বাংলা'}
                  </button>
                ))}
              </div>
              {copyLang === 'bn' && (
                <p className="mt-1.5 text-[11px] text-amber-600 leading-snug">
                  Bangla wording not yet reviewed by a native speaker — check before posting.
                </p>
              )}
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
            <div className="space-y-2">
              <button
                onClick={handleSave}
                disabled={!draft.name.trim()}
                className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
              >
                {editItem ? t('addItemSaveChanges') : t('addItemSave')}
              </button>
              {editItem && (
                deleteConfirmOpen ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2 animate-fadeIn">
                    <p className="text-xs text-red-700 leading-snug">
                      Delete "{editItem.name}"? This can't be undone.
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
                    Delete item
                  </button>
                )
              )}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

/**
 * A plain horizontal bar splitting this item's sale price into the cost
 * portion (the "zero point" — what you need back just to break even on this
 * one item) and the profit portion. tuvara-visuell-lonsamhet-analys.md,
 * avsnitt 4 — the "visual paperslip" idea, scoped to a single item's own
 * price rather than reusing the business-wide classic break-even (that one
 * needs fixed costs and stays in Business Health; mixing the two would
 * conflate two genuinely different questions). Purely derived from numbers
 * already on the draft — no new data, no AI badge needed.
 */
function PriceBreakdownBar({
  purchasePrice,
  salePrice,
  currencySymbol,
}: {
  purchasePrice: number;
  salePrice: number;
  currencySymbol: string;
}) {
  const profit = salePrice - purchasePrice;
  const atALoss = profit < 0;
  // When selling at a loss there's no "profit segment" to show at all —
  // the whole bar is cost you won't fully recover, so it renders as one
  // solid red bar rather than a misleading grey/green split.
  const costPct = atALoss ? 100 : Math.max(0, Math.min(100, (purchasePrice / salePrice) * 100));
  const profitPct = 100 - costPct;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 mb-1.5">
        <span>Cost: {purchasePrice.toFixed(2)} {currencySymbol}</span>
        <span className={atALoss ? 'text-red-600' : 'text-emerald-600'}>
          {atALoss ? 'Loss' : 'Profit'}: {profit.toFixed(2)} {currencySymbol}
        </span>
      </div>
      <div className="h-3 w-full rounded-full overflow-hidden bg-stone-100 flex">
        <div
          className={`h-full ${atALoss ? 'bg-red-400' : 'bg-stone-400'}`}
          style={{ width: `${costPct}%` }}
          title="Cost — this is your zero point"
        />
        {!atALoss && (
          <div className="h-full bg-emerald-400" style={{ width: `${profitPct}%` }} title="Profit" />
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-stone-400 leading-snug">
        {atALoss
          ? "This price doesn't cover what you paid — you'd sell at a loss."
          : 'The grey part is your zero point — what you paid for this item. Everything past it is profit.'}
      </p>
    </div>
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

/**
 * Ephemeral material/labour cost breakdown — adds up freeform rows (e.g.
 * "brass wire" + amount) and hands the total to `onApply`, which writes it
 * straight into purchasePrice like any manually typed number. The rows
 * themselves are never saved anywhere; available to every tenant since the
 * need (several cost components per item) isn't industry-specific.
 */
function CostPartsCalculator({
  parts,
  onPartsChange,
  currencySymbol,
  onApply,
}: {
  parts: CostPart[];
  onPartsChange: (parts: CostPart[]) => void;
  currencySymbol: string;
  onApply: (total: number) => void;
}) {
  const total = costPartsTotal(parts);

  const updatePart = (id: string, patch: Partial<CostPart>) =>
    onPartsChange(parts.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const removePart = (id: string) => onPartsChange(parts.filter((p) => p.id !== id));

  const addPart = () =>
    onPartsChange([...parts, { id: Math.random().toString(36).slice(2, 9), label: '', amount: '' }]);

  return (
    <div className="rounded-xl bg-cream-100 border border-stone-200 p-3 space-y-2 animate-fadeIn">
      {parts.map((part) => (
        <div key={part.id} className="flex gap-2 items-center">
          <input
            value={part.label}
            onChange={(e) => updatePart(part.id, { label: e.target.value })}
            placeholder="E.g. Brass wire"
            className="input flex-1"
          />
          <input
            type="number"
            inputMode="decimal"
            value={part.amount}
            onChange={(e) => updatePart(part.id, { amount: e.target.value })}
            placeholder="0"
            className="input w-20"
          />
          <button
            onClick={() => removePart(part.id)}
            aria-label="Remove cost part"
            className="text-stone-400 hover:text-red-500 transition shrink-0"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button
        onClick={addPart}
        className="inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
      >
        <Plus size={16} />
        Add row
      </button>
      <div className="flex items-center justify-between pt-2 border-t border-stone-200">
        <span className="text-sm font-semibold text-stone-700">
          Total: {currencySymbol}{total.toFixed(2)}
        </span>
        <button
          onClick={() => onApply(total)}
          disabled={total <= 0}
          className="px-3 py-1.5 rounded-full bg-accent-500 text-white text-xs font-semibold disabled:opacity-40 active:scale-95 transition"
        >
          Use this total
        </button>
      </div>
    </div>
  );
}
