import { useState } from 'react';
import { Search, SlidersHorizontal, Plus, Clock, Package2, ChevronDown, Layers } from 'lucide-react';
import type { StockItem, Sale, StockPeriod, TeamUser, Filters } from '../types';
import { emptyFilters } from '../types';
import { swatchFor } from '../colorPalette';
import { margin } from '../types';
import { HeaderIconButtons } from './HeaderIconButtons';
import { InsightBar } from './InsightBar';
import { stockInsights } from '../insights';
import { EarningsStrip } from './EarningsStrip';
import { ShareAccountHint } from './ShareAccountHint';
import { LegalAcceptanceHint } from './LegalAcceptanceHint';
import { BusinessProfileHint } from './BusinessProfileHint';
import { DemoCurrencySwitcher } from './DemoCurrencySwitcher';
import { isDemoPilot, PILOT_SLUG } from '../config';
import { fromLocal, CURRENCY_SYMBOLS, type CurrencyCode, type ExchangeRates } from '../exchangeRates';
import { exportTenantData } from '../usePersistentState';
import { useLanguage } from '../useLanguage';

interface StockListProps {
  items: StockItem[];
  /** Unfiltered item list — insights are computed on the whole business,
   *  not just whatever the seller's currently searching or filtering. */
  allItems: StockItem[];
  sales: Sale[];
  team: TeamUser[];
  activeCount: number;
  activeFilterCount: number;
  onSearch: (q: string) => void;
  onOpenFilters: () => void;
  /** Applies a filter set directly, bypassing the FilterSheet UI — used to
   *  make the Stock insight chips ("N aging", "N below margin", "N sold
   *  out") actually take the seller to the item(s) they're about, not just
   *  report a number. Always passed a fresh `{ ...emptyFilters, onlyX:
   *  true }` object so any previously-active filter doesn't hide the very
   *  items the chip is pointing at. */
  onFocusFilter: (f: Filters) => void;
  onAdd: () => void;
  onEditItem: (item: StockItem) => void;
  onGetWhatsAppCard: () => void;
  onAddCustomer: () => void;
  onOpenSettings: () => void;
  onOpenBookings: () => void;
  onOpenDebts: () => void;
  onOpenBusinessHealth: () => void;
  onOpenCustomers: () => void;
  onOpenAging: (item: StockItem) => void;
  /** Terms of Use acceptance status + opener — see LegalAcceptanceHint.tsx
   *  and legalText.ts. Surfaced here (same "hint on the tab everyone lands
   *  on" pattern as ShareAccountHint) rather than only in Settings. */
  termsSigned: boolean;
  onOpenLegal: () => void;
  /** "About your business" profile status + opener — see
   *  BusinessProfileHint.tsx and businessProfile.ts. Same "hint on the tab
   *  everyone lands on" pattern as ShareAccountHint/LegalAcceptanceHint. */
  hasBusinessProfile: boolean;
  onOpenBusinessProfile: () => void;
  currencySymbol: string;
  exchangeRates: ExchangeRates;
  /** Optional period filter chips — see tuvara-perioder-analys.md. Only
   *  rendered at all once `periods` is non-empty, so a seller who's never
   *  started one never sees this row (decision: invisible until opted
   *  into, not a mode everyone has to learn). */
  periods: StockPeriod[];
  periodFilter?: string;
  onPeriodFilterChange: (id: string | undefined) => void;
  /** Optional shop filter chips — see
   *  tuvara-app-personal-moms-butiker-kostnader-insights-analys.md punkt 3.
   *  Same "invisible until named" pattern as periods above: only rendered
   *  once `shops` (Settings' shopNames) is non-empty. */
  shops: string[];
  shopFilter?: string;
  onShopFilterChange: (name: string | undefined) => void;
  /** Staff-rättigheter (punkt 1,
   *  tuvara-app-personal-moms-butiker-kostnader-insights-analys.md) —
   *  when true, hides margin/cost info on every card, showing only sale
   *  price. Same soft UI gate as AddSheet's hideCostInfo. */
  hideCostInfo?: boolean;
}

const AGING_ACTION_LABEL: Record<NonNullable<StockItem['agingAction']>, string> = {
  markdown: 'Marked down',
  bundle: 'Bundled',
  donate: 'Given away',
  other: 'Noted',
};

type DisplayEntry = { type: 'single'; item: StockItem } | { type: 'cluster'; groupName: string; items: StockItem[] };

/**
 * Groups currently-visible items sharing the same (trimmed, case-insensitive)
 * variantGroup into a single cluster entry — see StockItem.variantGroup's
 * doc comment in types.ts (tuvara-visuell-lonsamhet-analys.md). Applied
 * *after* search/filtering, not before: if a search narrows a group down to
 * just one matching item, that item renders as a normal single card rather
 * than a "cluster of one" — clustering falls out naturally from whatever's
 * currently visible, no special-casing needed. Preserves first-appearance
 * order so grouping never reshuffles the list.
 */
function groupItemsForDisplay(items: StockItem[]): DisplayEntry[] {
  const byKey = new Map<string, StockItem[]>();
  for (const item of items) {
    const key = item.variantGroup?.trim().toLowerCase();
    if (!key) continue;
    const list = byKey.get(key) ?? [];
    list.push(item);
    byKey.set(key, list);
  }

  const entries: DisplayEntry[] = [];
  const emittedKeys = new Set<string>();
  for (const item of items) {
    const key = item.variantGroup?.trim().toLowerCase();
    const groupItems = key ? byKey.get(key) : undefined;
    if (key && groupItems && groupItems.length > 1) {
      if (emittedKeys.has(key)) continue;
      emittedKeys.add(key);
      entries.push({ type: 'cluster', groupName: item.variantGroup!.trim(), items: groupItems });
    } else {
      entries.push({ type: 'single', item });
    }
  }
  return entries;
}

export function StockList({
  items,
  allItems,
  sales,
  team,
  activeCount,
  activeFilterCount,
  onSearch,
  onOpenFilters,
  onFocusFilter,
  onAdd,
  onEditItem,
  onGetWhatsAppCard,
  onAddCustomer,
  onOpenSettings,
  onOpenBookings,
  onOpenDebts,
  onOpenBusinessHealth,
  onOpenCustomers,
  onOpenAging,
  termsSigned,
  onOpenLegal,
  hasBusinessProfile,
  onOpenBusinessProfile,
  currencySymbol,
  exchangeRates,
  periods,
  periodFilter,
  onPeriodFilterChange,
  shops,
  shopFilter,
  onShopFilterChange,
  hideCostInfo = false,
}: StockListProps) {
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode | 'native'>('native');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { t } = useLanguage();

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  // "Export"/"Import" used to be dead stubs here (onClick: () => {}) that
  // looked like working menu items but did nothing — see
  // tuvara-ux-intuitivitet-analys.md P0.2. Export now calls the same
  // exportTenantData() already used by Settings' "Backup & transfer";
  // Import opens Settings, which already has a real file-picker + status
  // flow (duplicating that here would risk a second, divergent import
  // path). "Saved weekly lists" was never built — removed rather than
  // left as a dead menu item; re-add once it's a real feature.
  const menuItems = [
    { label: 'Business health', onClick: onOpenBusinessHealth },
    { label: 'Bookings', onClick: onOpenBookings },
    { label: 'Customer বাকি', onClick: onOpenDebts },
    { label: 'Customers', onClick: onOpenCustomers },
    { label: t('settingsExportData'), onClick: exportTenantData },
    { label: t('settingsImportData'), onClick: onOpenSettings },
  ];

  const rate = displayCurrency === 'native' ? undefined : exchangeRates[displayCurrency]?.rate;
  const displaySymbol = rate !== undefined ? CURRENCY_SYMBOLS[displayCurrency as CurrencyCode] : currencySymbol;
  const convertPrice = (amount: number) => (rate !== undefined ? fromLocal(amount, rate) : amount);

  return (
    <div className="relative min-h-screen pb-24">
      {/* Row 1: Title bar */}
      <div className="sticky top-0 z-20 bg-cream-50/95 backdrop-blur-md px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">{t('stockTitle')}</h1>
            <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-accent-100 text-accent-700 text-xs font-semibold">
              {activeCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isDemoPilot(PILOT_SLUG) && (
              <DemoCurrencySwitcher
                nativeSymbol={currencySymbol}
                exchangeRates={exchangeRates}
                value={displayCurrency}
                onChange={setDisplayCurrency}
              />
            )}
            <HeaderIconButtons
              onGetWhatsAppCard={onGetWhatsAppCard}
              onAddCustomer={onAddCustomer}
              onOpenSettings={onOpenSettings}
              moreMenuItems={menuItems}
            />
          </div>
        </div>
      </div>

      <EarningsStrip sales={sales} items={allItems} currencySymbol={currencySymbol} />

      <InsightBar
        chips={stockInsights(allItems, sales, {
          onFocusAging: () => onFocusFilter({ ...emptyFilters, onlyAging: true }),
          onFocusBelowMargin: () => onFocusFilter({ ...emptyFilters, onlyBelowMargin: true }),
          onFocusSoldOut: () => onFocusFilter({ ...emptyFilters, onlySoldOut: true }),
          onOpenItem: onEditItem,
        })}
      />

      <ShareAccountHint teamSize={team.length} onOpenSettings={onOpenSettings} />
      <LegalAcceptanceHint termsSigned={termsSigned} onOpenLegal={onOpenLegal} />
      <BusinessProfileHint hasContent={hasBusinessProfile} onOpenProfile={onOpenBusinessProfile} />

      {/* Row 2: Search + Filter */}
      <div className="sticky top-[52px] z-10 bg-cream-50/95 backdrop-blur-md px-4 pb-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder={t('stockSearchPlaceholder')}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-full bg-white border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 transition"
            />
          </div>
          <button
            onClick={onOpenFilters}
            className="h-11 px-4 rounded-full bg-white border border-stone-200 flex items-center gap-1.5 text-sm font-medium text-stone-700 hover:border-accent-300 active:scale-95 transition"
          >
            <SlidersHorizontal size={16} />
            <span>{t('stockFilter')}</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-accent-500 text-white text-xs font-semibold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Optional period filter — see the periods prop comment above.
          Absent entirely until a seller has actually started using
          periods (Settings → Stock periods), never a mode forced on
          everyone. Most-recently-started period first, matching how
          `periods` itself is stored. */}
      {periods.length > 0 && (
        <div className="px-4 pb-3 -mt-1 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onPeriodFilterChange(undefined)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition active:scale-95 ${
              periodFilter === undefined
                ? 'bg-accent-500 text-white border border-accent-500'
                : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
            }`}
          >
            All periods
          </button>
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => onPeriodFilterChange(periodFilter === p.id ? undefined : p.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition active:scale-95 ${
                periodFilter === p.id
                  ? 'bg-accent-500 text-white border border-accent-500'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Optional shop filter — see the shops prop comment above. Same
          "absent until named" pattern as periods: a seller who hasn't set
          up any shop names in Settings never sees this row. */}
      {shops.length > 0 && (
        <div className="px-4 pb-3 -mt-1 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onShopFilterChange(undefined)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition active:scale-95 ${
              shopFilter === undefined
                ? 'bg-accent-500 text-white border border-accent-500'
                : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
            }`}
          >
            All shops
          </button>
          {shops.map((name) => (
            <button
              key={name}
              onClick={() => onShopFilterChange(shopFilter === name ? undefined : name)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition active:scale-95 ${
                shopFilter === name
                  ? 'bg-accent-500 text-white border border-accent-500'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Grid of cards */}
      <div className="px-4 pt-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package2 size={40} className="text-stone-300 mb-3" />
            <p className="text-stone-500 text-sm">{t('stockEmptyNoMatch')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {groupItemsForDisplay(items).map((entry) =>
              entry.type === 'single' ? (
                <StockCard
                  key={entry.item.id}
                  item={entry.item}
                  currencySymbol={displaySymbol}
                  displaySalePrice={convertPrice(entry.item.salePrice)}
                  onOpenAging={onOpenAging}
                  onEdit={onEditItem}
                  hideCostInfo={hideCostInfo}
                />
              ) : (
                <VariantClusterCard
                  key={entry.groupName}
                  groupName={entry.groupName}
                  items={entry.items}
                  expanded={expandedGroups.has(entry.groupName)}
                  onToggle={() => toggleGroup(entry.groupName)}
                  currencySymbol={displaySymbol}
                  convertPrice={convertPrice}
                  onOpenAging={onOpenAging}
                  onEdit={onEditItem}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={onAdd}
        className="fixed bottom-24 right-4 z-20 w-14 h-14 rounded-full bg-accent-500 text-white shadow-fab flex items-center justify-center hover:bg-accent-600 active:scale-90 transition"
        aria-label="Add item"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}

function StockCard({
  item,
  currencySymbol,
  displaySalePrice,
  onOpenAging,
  onEdit,
  hideCostInfo = false,
}: {
  item: StockItem;
  currencySymbol: string;
  displaySalePrice: number;
  onOpenAging: (item: StockItem) => void;
  onEdit: (item: StockItem) => void;
  hideCostInfo?: boolean;
}) {
  const m = margin(item.purchasePrice, item.salePrice);
  return (
    <button
      onClick={() => onEdit(item)}
      className="w-full text-left bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-cardHover active:scale-[0.98] transition"
    >
      <div className="relative aspect-square bg-gradient-to-br from-cream-100 to-stone-100">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-light text-stone-300">
              {item.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {item.agingAction ? (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-white/95 text-[10px] font-semibold text-stone-600 shadow-sm">
            {AGING_ACTION_LABEL[item.agingAction]}
          </div>
        ) : (
          item.aging && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenAging(item);
              }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-amber-100/95 flex items-center justify-center hover:bg-amber-200 active:scale-90 transition"
              title="Aging stock — tap for options"
              aria-label="Aging stock — tap for options"
            >
              <Clock size={14} className="text-amber-600" />
            </button>
          )
        )}
        {item.soldOut && (
          <div className="absolute inset-0 bg-stone-900/30 flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-white/95 text-stone-700 text-xs font-semibold">
              Sold out
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-stone-900 leading-tight truncate">{item.name}</h3>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="inline-block px-2 py-0.5 rounded-full bg-cream-100 text-stone-600 text-[11px] font-medium">
            {item.category}
          </span>
          {/* B9 — tuvara-bifogade-filer-analys.md: a quick visual scan aid,
              and feeds the "matching colour" signal in
              bundleSuggestions.ts (B8). Purely optional. */}
          {item.color && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-stone-300"
              style={{ background: swatchFor(item.color) }}
              title={item.color}
            />
          )}
        </div>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <span className="text-lg font-bold text-stone-900">{item.quantity}</span>
            <span className="text-xs text-stone-400 ml-1">pcs</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-stone-900">
              {displaySalePrice.toFixed(displaySalePrice % 1 === 0 ? 0 : 2)} {currencySymbol}
            </div>
            {!hideCostInfo && <div className="text-[10px] text-stone-400">{m}% margin</div>}
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * Collapsed: renders as a single grid cell — thumbnail, group name, "N
 * variants · X total" and a price (range if the variants don't all share
 * one). Expanded: spans both grid columns and lists every variant below as
 * normal StockCards, so editing/aging actions on an individual variant work
 * exactly as they already do — this is purely a display grouping layered on
 * top, not a new data model or a new place to edit an item.
 */
function VariantClusterCard({
  groupName,
  items,
  expanded,
  onToggle,
  currencySymbol,
  convertPrice,
  onOpenAging,
  onEdit,
}: {
  groupName: string;
  items: StockItem[];
  expanded: boolean;
  onToggle: () => void;
  currencySymbol: string;
  convertPrice: (amount: number) => number;
  onOpenAging: (item: StockItem) => void;
  onEdit: (item: StockItem) => void;
}) {
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  const prices = items.map((i) => convertPrice(i.salePrice));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const cover = items.find((i) => i.imageUrl) ?? items[0];
  const priceLabel =
    minPrice === maxPrice
      ? `${minPrice.toFixed(minPrice % 1 === 0 ? 0 : 2)} ${currencySymbol}`
      : `${minPrice.toFixed(0)}–${maxPrice.toFixed(0)} ${currencySymbol}`;

  return (
    <div className={expanded ? 'col-span-2' : ''}>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-cardHover active:scale-[0.98] transition"
      >
        {expanded ? (
          <div className="flex items-center gap-3 p-3">
            <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-cream-100 to-stone-100">
              {cover.imageUrl ? (
                <img src={cover.imageUrl} alt={groupName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Layers size={18} className="text-stone-300" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm text-stone-900 truncate">{groupName}</h3>
                <ChevronDown size={14} className="text-stone-400 shrink-0 rotate-180 transition-transform" />
              </div>
              <div className="mt-0.5 text-[11px] text-stone-500">
                {items.length} variants · {totalQty} total
              </div>
            </div>
            <div className="text-sm font-semibold text-stone-700 shrink-0">{priceLabel}</div>
          </div>
        ) : (
          <>
            <div className="relative aspect-square bg-gradient-to-br from-cream-100 to-stone-100">
              {cover.imageUrl ? (
                <img src={cover.imageUrl} alt={groupName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Layers size={28} className="text-stone-300" />
                </div>
              )}
              <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-white/95 text-[10px] font-semibold text-stone-600 shadow-sm flex items-center gap-1">
                <Layers size={11} /> {items.length}
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm text-stone-900 leading-tight truncate">{groupName}</h3>
                <ChevronDown size={14} className="text-stone-400 shrink-0 transition-transform" />
              </div>
              <div className="mt-1.5 text-[11px] text-stone-500">
                {items.length} variants · {totalQty} total
              </div>
              <div className="mt-1 text-sm font-semibold text-stone-900">{priceLabel}</div>
            </div>
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-2 grid grid-cols-2 gap-3">
          {items.map((item) => (
            <StockCard
              key={item.id}
              item={item}
              currencySymbol={currencySymbol}
              displaySalePrice={convertPrice(item.salePrice)}
              onOpenAging={onOpenAging}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
