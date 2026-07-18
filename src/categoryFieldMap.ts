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
  jhums: ['Clothing', 'Fabric', 'Accessories', 'Other'],
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
  Clothing: {
    environmentLabel: 'Size range',
    environmentPlaceholder: 'E.g. S–XL, or a single size',
    nameHint: 'Include fabric or style if it helps buyers picture it — e.g. "Cotton shalwar kameez"',
  },
  Fabric: {
    environmentLabel: 'Width / length available',
    environmentPlaceholder: 'E.g. 44 inch width, sold per metre',
  },
};

export function categoryFieldConfig(category: Category): CategoryFieldConfig {
  return CONFIG_BY_CATEGORY[category] ?? DEFAULT_CONFIG;
}
