import type { ExchangeRates } from './exchangeRates';

export type Category =
  | 'Foliage'
  | 'Flowering'
  | 'Succulents & Cacti'
  | 'Palms'
  | 'Ferns'
  | 'Trailing & Climbing'
  | 'Air Plants'
  | 'Three-piece'
  | 'Two-piece'
  | 'Saree'
  | 'Kurti'
  | 'Clothing'
  | 'Fabric'
  | 'Food & Drink'
  | 'Jewellery'
  | 'Clothing & Textiles'
  | 'Home & Décor'
  | 'Accessories'
  | 'Other'
  /** @deprecated legacy generic-florist categories, kept only for backward type-compatibility */
  | 'Flowers'
  | 'Vegetables'
  | 'Fruit'
  | 'Herbs';

/**
 * @deprecated Use CATEGORIES_BY_TENANT from categoryFieldMap.ts instead — a
 * single shared list is exactly the "hardcoded flower terminology" problem
 * flagged in the branch GAP-analysis. Kept here (rather than deleted) only
 * so nothing importing it breaks; new code should not add to this list.
 */
export const CATEGORIES: Category[] = [
  'Flowers',
  'Vegetables',
  'Fruit',
  'Herbs',
  'Accessories',
  'Other',
];

export type SortMode = 'alpha' | 'newest' | 'margin';

export interface SalesChannel {
  id: string;
  name: string;
  price?: number;
}

export type AgingAction = 'markdown' | 'bundle' | 'donate' | 'other';

export interface StockItem {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  supplier?: string;
  tags: string[];
  imageUrl?: string;
  environment?: string;
  channels: SalesChannel[];
  aging: boolean;
  soldOut: boolean;
  createdAt: number;
  /** What the seller decided to do about this item while it was aging —
   *  set once they pick an option from the aging-stock action sheet, so the
   *  card can show what happened instead of just losing the clock icon. */
  agingAction?: AgingAction;
  agingActionNote?: string;
  /** Optional tag to a StockPeriod (see below) — see
   *  tuvara-perioder-analys.md. Deliberately additive: undefined for any
   *  item created before periods existed, or for a seller who never
   *  starts one. Never used to hide/filter stock automatically — a period
   *  is purely an optional grouping the seller can filter by, since an
   *  item going out of stock is already handled by `quantity`/`soldOut`. */
  periodId?: string;
  /** Optional colour tag (B9, tuvara-bifogade-filer-analys.md) — a small
   *  fixed, generic palette (see colorPalette.ts), never industry-specific
   *  vocabulary. Purely a visual/matching aid: powers the small swatch on
   *  stock cards and the "matching colour" signal in bundleSuggestions.ts.
   *  Undefined is a completely normal, common case. */
  color?: string;
  /** Optional standing bulk-quantity price (B4, tuvara-bifogade-filer-analys.md)
   *  — "buy `bulkThreshold` or more of this, pay `bulkUnitPrice` each"
   *  instead of the regular `salePrice`. Deliberately never applied
   *  automatically/silently: QuoteCard only ever *suggests* switching to
   *  it once a cart line's quantity reaches the threshold, and the seller
   *  taps to apply — see the "never underprice silently" principle. Both
   *  fields are set together or not at all. */
  bulkThreshold?: number;
  bulkUnitPrice?: number;
  /** Optional link to a SeasonPreset's `name` (B2,
   *  tuvara-sasongspaslag-analys.md) — free enough that a seller can also
   *  just type something not in their preset list, but normally picked
   *  from it. Purely a markup-suggestion input; never hides/filters stock. */
  season?: string;
  /** Optional free-text group name (tuvara-visuell-lonsamhet-analys.md,
   *  "klusterbaserad variantvisualisering") — e.g. "Cotton batik
   *  three-piece" shared by a red, a blue and a green version of the same
   *  style. Deliberately explicit and seller-typed, never inferred from
   *  the name string: silently guessing which items are "the same
   *  product" risks grouping unrelated items together, which is worse
   *  than not grouping at all (see "never guess silently"). Two or more
   *  currently-visible items sharing the exact same (trimmed,
   *  case-insensitive) value cluster together in StockList; a single item
   *  with a group name set just renders normally, since a "cluster of
   *  one" isn't useful. Purely a display grouping — never affects
   *  filtering, stock counts, or sale logic. */
  variantGroup?: string;
}

/** Lager 2 (tuvara-sasongspaslag-analys.md) — a seller-defined tag →
 *  suggested-markup preset. Deliberately zero seeded content: the whole
 *  point is that it's the seller's own vocabulary, never a hardcoded
 *  industry list (see the categorised-list rule in CLAUDE.md). */
export interface MarkupPreset {
  id: string;
  tag: string;
  markup: number;
}

/** Lager 3 (tuvara-sasongspaslag-analys.md) — a named
 *  season/occasion with a markup *boost multiplier* applied on top of
 *  whatever markup is already suggested (tag preset or the plain
 *  default) — confirmed combination rule: multiply on, not replace.
 *  Tenant-seeded starting list (see SEASON_PRESETS_BY_TENANT in
 *  categoryFieldMap.ts) but fully editable/extendable per seller once
 *  they touch it — see AppSettings.seasonPresets. */
export interface SeasonPreset {
  id: string;
  name: string;
  boostMultiplier: number;
}

/** A seller-defined stretch of stock — "Eid Collection 2026", "Autumn
 *  restock", or just "Week 34" if that's how someone thinks about it. See
 *  tuvara-perioder-analys.md: generalises `flowertotcalculator.html`'s
 *  hardcoded Sunday-anchored "week" into something that fits Jhum
 *  Fashion/Shoilee's collection-based rhythm too, not just Flowertot's.
 *
 *  Deliberately has no `closedAt` — periods don't get formally closed,
 *  the newest one (periods[0], list is newest-first) is simply treated as
 *  "current" for tagging newly added items. One field, not two, per the
 *  "open until the next one starts" decision. */
export interface StockPeriod {
  id: string;
  name: string;
  startedAt: number;
}

/** Sentinel passed as the "copy from" choice in Settings' period starter
 *  to mean "copy whatever's in stock that predates periods (periodId ===
 *  undefined)" rather than copying from another named StockPeriod. Not a
 *  real period id, never stored on a StockPeriod itself. */
export const CURRENT_STOCK_SENTINEL = '__current_stock__';

export interface Filters {
  categories: Category[];
  showSoldOut: boolean;
  sort: SortMode;
  onlyAging: boolean;
}

export const emptyFilters: Filters = {
  categories: [],
  showSoldOut: false,
  sort: 'newest',
  onlyAging: false,
};

export function margin(purchase: number, sale: number): number {
  if (sale <= 0) return 0;
  return Math.round(((sale - purchase) / sale) * 100);
}

/**
 * A single owed amount (বাকি) against a customer. A customer can rack up
 * several of these over time — e.g. one tab from a market-stall sale, a
 * separate one from a WhatsApp order — so debts live as a list on the
 * customer rather than being a single running balance.
 */
export interface CustomerDebt {
  id: string;
  amount: number;
  /** Free text, e.g. what the debt is for. */
  note?: string;
  createdAt: number;
  /** Optional day to follow up — drives both the sort order in the বাকি
   *  list and the .ics reminder. */
  followUpDate?: number;
  /** How many times a WhatsApp reminder has been sent for this debt — picks
   *  which of the fixed message templates shows next (softer to firmer). */
  reminderCount: number;
  /** null/undefined = still unpaid. Set once, never un-set — "mark as paid"
   *  is a one-way action, not editable bookkeeping. */
  settledAt?: number | null;
}

export interface Customer {
  id: string;
  name: string;
  consented: boolean;
  addedAt: number;
  /** Needed to build the wa.me reminder link — optional because a customer
   *  can be added (e.g. from a market-stall conversation) before their
   *  number is known, and filled in later from the বাকি sheet. */
  phone?: string;
  debts: CustomerDebt[];
}

export interface Bundle {
  id: string;
  name: string;
  itemIds: string[];
  bundlePrice: number;
  onSale: boolean;
  createdAt: number;
}

/** A single social/marketplace link shown on the printable/shareable
 *  receipt (Instagram, Etsy, Facebook Marketplace, a local classifieds
 *  site, ...). Deliberately a free-form label+URL pair rather than a
 *  fixed set of named platforms — Flowertot and Jhum Fashion/Shoilee
 *  don't use the same channels, so hardcoding "Instagram field" /
 *  "Etsy field" would fit neither pilot well. See
 *  tuvara-perioder-analys.md-style reasoning: additive, not assumed. */
export interface SocialLink {
  id: string;
  label: string;
  url: string;
}

/** Paper format for the real (non-mockup) receipt print — see
 *  ReceiptLayout.tsx / printFormats.ts. A4 is the safe universal
 *  default (works on any regular printer with zero setup); the two
 *  thermal widths are for a physical receipt printer at a market
 *  stall. Deliberately per-tenant-setting rather than asked at every
 *  print, since a seller's printer rarely changes between sales. */
export type PrintFormat = 'a4' | 'thermal80' | 'thermal58';

export interface AppSettings {
  currencySymbol: string;
  businessName: string;
  contactInfo: string;
  language: string;
  simulateFreePlan: boolean;
  /** Manually entered reference rates for converting to/from foreign
   *  currencies — see exchangeRates.ts. Optional per currency; a returning
   *  user's persisted settings predate this field, so always read it as
   *  `settings.exchangeRates ?? {}` rather than assuming it's present. */
  exchangeRates: ExchangeRates;
  /** Receipt/quote branding — all optional so existing persisted settings
   *  (predating this field) degrade gracefully to the plain text-only
   *  receipt that already existed. See ReceiptLayout.tsx. */
  logoUrl?: string;
  website?: string;
  socialLinks?: SocialLink[];
  printFormat?: PrintFormat;
  /** B2/B3 (tuvara-sasongspaslag-analys.md). markupPresets has no seeded
   *  default anywhere (Lager 2, seller's own vocabulary). seasonPresets
   *  is undefined until the seller first edits the list — read it as
   *  `settings.seasonPresets ?? SEASON_PRESETS_BY_TENANT[TENANT]`
   *  (categoryFieldMap.ts) rather than assuming it's set, so the tenant's
   *  starter list is the default without needing a migration. */
  markupPresets?: MarkupPreset[];
  seasonPresets?: SeasonPreset[];
}

export const defaultSettings: AppSettings = {
  currencySymbol: 'kr',
  businessName: 'My Shop',
  contactInfo: '',
  language: 'English',
  simulateFreePlan: false,
  exchangeRates: {},
  website: '',
  socialLinks: [],
  printFormat: 'a4',
};

/**
 * "Business health" (tuvara-nyckeltal-analys.md) — three small, flat lists
 * that mirror the বাকি pattern (CustomerDebt) rather than inventing a real
 * bookkeeping/ledger model: no double-entry, no categorisation trees, no
 * accounts. Each is just "a thing you logged, with an amount and a note",
 * because that's the same shape a seller already understands from বাকি.
 */

/** A single boosted-post/ad spend you logged (Facebook/Instagram boost,
 *  etc). Deliberately NOT tied to a specific sale — there's no click
 *  tracking or attribution data available (see "no external data"
 *  principle), so ROAS-lite in businessHealth.ts can only correlate spend
 *  and revenue *on the same channel, in the same window* — a rough
 *  directional signal, not precise ad attribution. Always shown with that
 *  caveat in the UI copy, never presented as exact. */
export interface AdSpendEntry {
  id: string;
  /** Free text, matched against Sale.channelName for the ROAS-lite
   *  correlation — same "match by exact name, no fuzzy matching"
   *  discipline as forecast.ts. */
  channelName: string;
  amount: number;
  note?: string;
  loggedAt: number;
}

/** The mirror image of বাকি (CustomerDebt) — what the seller herself owes
 *  someone else (a supplier, a helper, a loan), not what a customer owes
 *  her. Same shape, same "mark as paid" one-way action, deliberately no
 *  reminder machinery (that's specifically for chasing customers, not
 *  something a seller needs for her own debts). `who` is free text, not a
 *  linked entity — Tuvara doesn't have a supplier/contact model, and
 *  adding one just for this would be actual bookkeeping scope-creep. */
export interface OwedEntry {
  id: string;
  who: string;
  amount: number;
  note?: string;
  createdAt: number;
  /** Optional day she plans to pay this — same shape and same purpose as
   *  CustomerDebt.followUpDate, just for the opposite direction of debt.
   *  Powers the "Upcoming" view in Business health (money coming in from
   *  বাকি next to money going out from owed), not a payment reminder —
   *  Tuvara doesn't send anything on her own debts, only on customers'. */
  dueDate?: number;
  settledAt?: number | null;
}

/** A recurring fixed cost the seller logs herself — rent, a phone/data
 *  bundle, delivery costs, packaging, a platform fee. Tuvara has no bank
 *  or POS integration (see "no external data"/"never process payments"
 *  principles) so there is no real data to auto-detect these from; the
 *  "AI helps you find them" affordance (FIXED_COST_SUGGESTIONS_BY_TENANT
 *  in categoryFieldMap.ts) is honestly just a tappable list of common
 *  cost *categories* for her kind of business, never a guessed amount —
 *  she always types her own number. */
export interface FixedCostEntry {
  id: string;
  label: string;
  amount: number;
  cadence: 'week' | 'month';
  createdAt: number;
}

export type TeamRole = 'Owner' | 'Staff';

export interface TeamUser {
  id: string;
  name: string;
  role: TeamRole;
}

export interface CartLine {
  id: string;
  kind: 'item' | 'bundle';
  refId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export type BookingStatus = 'upcoming' | 'completed';

export interface Booking {
  id: string;
  customerName: string;
  itemId: string;
  scheduledAt: string;
  notes: string;
  status: BookingStatus;
  createdAt: number;
}

/**
 * A completed sale, logged at checkout. This is the one piece of history
 * the mockup didn't have — everything else (StockItem, Bundle, Booking) is
 * "current state", not a timeline. Needed for anything forward-looking:
 * which channel sales actually come through, and whether a given item is
 * selling faster or slower than the stock sitting next to it.
 */
export interface SaleLine {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  date: number;
  lines: SaleLine[];
  total: number;
  /** Which channel this sale came through, if the seller specified one at
   *  checkout — optional because not every sale has a clean single channel
   *  (e.g. a walk-in). Left blank rather than guessed. */
  channelName?: string;
  /** Which Customer this sale belongs to, if the seller picked one at
   *  checkout — see tuvara-quote-card-analys.md P2 item 2. Optional: most
   *  sales (market-stall walk-ins) won't have one, and that's a valid,
   *  tracked choice, not a missing field. */
  customerId?: string;
}
