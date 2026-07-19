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
}

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

export interface Customer {
  id: string;
  name: string;
  consented: boolean;
  addedAt: number;
}

export interface Bundle {
  id: string;
  name: string;
  itemIds: string[];
  bundlePrice: number;
  onSale: boolean;
  createdAt: number;
}

export interface AppSettings {
  currencySymbol: string;
  businessName: string;
  contactInfo: string;
  language: string;
  simulateFreePlan: boolean;
}

export const defaultSettings: AppSettings = {
  currencySymbol: 'kr',
  businessName: 'My Shop',
  contactInfo: '',
  language: 'English',
  simulateFreePlan: false,
};

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
}
