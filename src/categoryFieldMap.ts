import type { Category } from './types';
import type { TenantId } from './config';

/**
 * Which categories a tenant sees, and how the shared StockItem fields
 * should be labelled for that category. This is the smallest possible fix
 * for the "hardcoded flower terminology" gap identified in the branch
 * GAP-analysis: instead of one flower-shop category list shared by every
 * tenant, each tenant gets its own list, and a couple of generic fields
 * (currently just "environment") get a category-appropriate label and
 * placeholder instead of a flower-specific one.
 *
 * This intentionally does NOT touch the data model or the Category type's
 * shape — it only changes what's shown in the UI. A full branch-agnostic
 * domain model (industry_presets, tenant_channels) is still Phase D of the
 * planned migration and stays out of scope here.
 */

export const CATEGORIES_BY_TENANT: Record<TenantId, Category[]> = {
  // Flowertot Botanicals sells houseplants, not cut flowers or produce — the
  // original 'Flowers/Vegetables/Fruit/Herbs' list was wrong for this
  // tenant's actual business, not just generic. This grouping follows the
  // same genus/type split used by UK houseplant retailers and hobbyist
  // collections (Hortology's A-Z, RHS, Masterclass's houseplant guide):
  // foliage vs. flowering vs. succulents/cacti as the three big buckets,
  // with palms, ferns, trailing/climbing and air plants split out because
  // each has genuinely different care needs, not just cosmetic grouping.
  flowertot: [
    'Foliage',
    'Flowering',
    'Succulents & Cacti',
    'Palms',
    'Ferns',
    'Trailing & Climbing',
    'Air Plants',
    'Accessories',
    'Other',
  ],
  // Jhum Fashion sells women's clothing, and Bangladeshi fashion retailers
  // (Othoba, Triple, RightChoice, Mesmeric Apparel — checked independently,
  // all agree) consistently split by garment type as the primary category,
  // not a single generic "Clothing" bucket: three-piece (kameez + salwar/
  // pant + dupatta) is the single most searched term, followed by
  // two-piece, saree, and kurti as their own categories. Fabric type
  // (cotton/georgette/batik/embroidery) is a property WITHIN a garment
  // listing in every real retailer checked, not a category of its own —
  // 'Fabric' is kept here only because Jhum Fashion may also sell loose
  // fabric by the metre (per the original pilot brief); worth confirming
  // directly with her whether that's still accurate before relying on it.
  jhums: ['Three-piece', 'Two-piece', 'Saree', 'Kurti', 'Fabric', 'Accessories', 'Other'],
};

interface CategoryFieldConfig {
  /** Label for the shared "environment" free-text field. */
  environmentLabel: string;
  environmentPlaceholder: string;
  /** Shown as a subtle hint above the name field when this category is selected. */
  nameHint?: string;
}

const DEFAULT_CONFIG: CategoryFieldConfig = {
  environmentLabel: 'Notes',
  environmentPlaceholder: 'Anything worth remembering about this item',
};

const CONFIG_BY_CATEGORY: Partial<Record<Category, CategoryFieldConfig>> = {
  Foliage: {
    environmentLabel: 'Care conditions',
    environmentPlaceholder: 'E.g. Bright indirect light, water weekly',
    nameHint: 'Genus + common name helps buyers recognise it — e.g. "Monstera deliciosa — Swiss cheese plant"',
  },
  Flowering: {
    environmentLabel: 'Care conditions',
    environmentPlaceholder: 'E.g. Bright light, feed while in bloom',
  },
  'Succulents & Cacti': {
    environmentLabel: 'Care conditions',
    environmentPlaceholder: 'E.g. Full sun, water sparingly',
  },
  Palms: {
    environmentLabel: 'Care conditions',
    environmentPlaceholder: 'E.g. Bright indirect light, likes humidity',
  },
  Ferns: {
    environmentLabel: 'Care conditions',
    environmentPlaceholder: 'E.g. Shade, keep soil consistently moist',
  },
  'Trailing & Climbing': {
    environmentLabel: 'Care conditions',
    environmentPlaceholder: 'E.g. Medium light, let soil dry between waterings',
  },
  'Air Plants': {
    environmentLabel: 'Care conditions',
    environmentPlaceholder: 'E.g. Bright light, mist 2-3x weekly, no soil',
  },
  'Three-piece': {
    environmentLabel: 'Size range',
    environmentPlaceholder: 'E.g. S–XL, or free size',
    nameHint: 'Fabric or occasion helps buyers picture it — e.g. "Cotton batik three-piece, daily wear"',
  },
  'Two-piece': {
    environmentLabel: 'Size range',
    environmentPlaceholder: 'E.g. S–XL, or free size',
  },
  Saree: {
    environmentLabel: 'Fabric',
    environmentPlaceholder: 'E.g. Jamdani, Katan, Georgette',
  },
  Kurti: {
    environmentLabel: 'Size range',
    environmentPlaceholder: 'E.g. S–XL, or free size',
  },
  Fabric: {
    environmentLabel: 'Width / length available',
    environmentPlaceholder: 'E.g. 44 inch width, sold per metre',
  },
};

export function categoryFieldConfig(category: Category): CategoryFieldConfig {
  return CONFIG_BY_CATEGORY[category] ?? DEFAULT_CONFIG;
}

/**
 * Small, deliberately modest keyword lists for a first-pass category guess
 * from free text — English/romanised terms only. This is NOT meant to be
 * comprehensive, and especially not for non-Latin-script text (see
 * categoryLearning.ts for how that's actually handled — a keyword list
 * this small can never cover Bangla script or every regional term, and a
 * bigger hardcoded list I can't verify natively would be a false promise
 * of coverage, not a real fix). This only replaces the old, stale
 * rose/tulip/tomato keywords that predated the houseplant taxonomy and
 * never had a jhums entry at all.
 */
export const CATEGORY_KEYWORDS_BY_TENANT: Record<TenantId, Partial<Record<Category, string[]>>> = {
  flowertot: {
    Foliage: ['monstera', 'pothos', 'snake plant', 'sansevieria', 'philodendron', 'calathea', 'zz plant', 'ivy', 'spider plant'],
    Flowering: ['orchid', 'peace lily', 'anthurium', 'african violet'],
    'Succulents & Cacti': ['succulent', 'cactus', 'cacti', 'echeveria', 'aloe'],
    Palms: ['palm', 'parlour palm', 'areca'],
    Ferns: ['fern', 'boston fern'],
    'Trailing & Climbing': ['string of pearls', 'string of hearts', 'trailing'],
    'Air Plants': ['air plant', 'tillandsia'],
  },
  jhums: {
    'Three-piece': ['থ্রি-পিস', 'থ্রি পিস', 'three-piece', 'three piece', '3 piece', '3-piece', 'salwar kameez', 'shalwar kameez'],
    'Two-piece': ['টু-পিস', 'টু পিস', 'two-piece', 'two piece', '2 piece', '2-piece'],
    Saree: ['শাড়ি', 'saree', 'sari', 'jamdani', 'katan'],
    Kurti: ['কুর্তি', 'kurti', 'kurta'],
    Fabric: ['fabric', 'cotton', 'georgette', 'silk', 'বাটিক', 'batik'],
  },
};
