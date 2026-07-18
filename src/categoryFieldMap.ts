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
  flowertot: ['Flowers', 'Vegetables', 'Fruit', 'Herbs', 'Accessories', 'Other'],
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
  Flowers: {
    environmentLabel: 'Care conditions',
    environmentPlaceholder: 'E.g. Cool, 4°C',
  },
  Vegetables: {
    environmentLabel: 'Storage conditions',
    environmentPlaceholder: 'E.g. Cool, dry',
  },
  Fruit: {
    environmentLabel: 'Storage conditions',
    environmentPlaceholder: 'E.g. Room temperature',
  },
  Herbs: {
    environmentLabel: 'Care conditions',
    environmentPlaceholder: 'E.g. Sunny, humid',
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
