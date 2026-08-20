import type { Category, StockItem } from '../types';
import type { PilotSlug } from '../config';
import type { DemoCategoryOverride } from '../categoryFieldMap';
import { demoSupabase, demoSupabaseConfigured } from './demoSupabaseClient';
import type {
  DemoTenantRow,
  DemoCategoryRow,
  DemoCategoryKeywordRow,
  DemoProductRow,
} from './demoCloudTypes';

export interface DemoBaseline {
  displayName: string;
  currency: string;
  items: StockItem[];
  categoryOverride: DemoCategoryOverride;
}

/** Separate from STORAGE_PREFIX-namespaced keys on purpose — this is a
 *  network-fallback cache of the last-known cloud baseline, not session
 *  data, so it must never be swept by clearTenantStorage()/"Reset to demo
 *  data" (that action should still fall back to this cache if the network
 *  happens to be down right when someone resets). */
const cacheKey = (slug: PilotSlug) => `tuvara-demo-cache:${slug}`;

function readCache(slug: PilotSlug): DemoBaseline | null {
  try {
    const raw = localStorage.getItem(cacheKey(slug));
    return raw ? (JSON.parse(raw) as DemoBaseline) : null;
  } catch {
    return null;
  }
}

function writeCache(slug: PilotSlug, baseline: DemoBaseline): void {
  try {
    localStorage.setItem(cacheKey(slug), JSON.stringify(baseline));
  } catch {
    // Storage unavailable or full — the fetched baseline still renders this load.
  }
}

export function rowToItem(row: DemoProductRow, categoryName: Category): StockItem {
  const item: StockItem = {
    id: row.id,
    name: row.name,
    category: categoryName,
    quantity: row.quantity,
    purchasePrice: row.purchase_price,
    salePrice: row.sale_price,
    tags: row.tags ?? [],
    channels: row.channels ?? [],
    aging: row.aging,
    soldOut: row.sold_out,
    createdAt: row.created_at_ms,
  };
  if (row.supplier) item.supplier = row.supplier;
  if (row.image_url) item.imageUrl = row.image_url;
  if (row.environment) item.environment = row.environment;
  if (row.aging_action) item.agingAction = row.aging_action;
  if (row.aging_action_note) item.agingActionNote = row.aging_action_note;
  if (row.period_id) item.periodId = row.period_id;
  if (row.color) item.color = row.color;
  if (row.bulk_threshold != null) item.bulkThreshold = row.bulk_threshold;
  if (row.bulk_unit_price != null) item.bulkUnitPrice = row.bulk_unit_price;
  if (row.season) item.season = row.season;
  if (row.variant_group) item.variantGroup = row.variant_group;
  if (row.shop) item.shop = row.shop;
  return item;
}

/** Fetches this demo pilot's admin-configured tenant/categories/products
 *  from the tuvara-demo Supabase project. Falls back to the last
 *  successfully fetched baseline (see readCache) if the network fails, and
 *  returns null only if there's neither a live fetch nor a cache to fall
 *  back on (caller falls back further, to the hardcoded demoSeeds.ts). */
export async function fetchDemoBaseline(slug: PilotSlug): Promise<DemoBaseline | null> {
  if (!demoSupabaseConfigured || !demoSupabase) {
    return readCache(slug);
  }

  try {
    const [tenantRes, categoriesRes, keywordsRes, productsRes] = await Promise.all([
      demoSupabase.from('demo_tenants').select('*').eq('id', slug).maybeSingle(),
      demoSupabase.from('demo_categories').select('*').eq('tenant_id', slug).order('sort_order'),
      demoSupabase.from('demo_category_keywords').select('*').eq('tenant_id', slug),
      demoSupabase.from('demo_products').select('*').eq('tenant_id', slug).order('sort_order'),
    ]);

    if (tenantRes.error || categoriesRes.error || keywordsRes.error || productsRes.error) {
      throw tenantRes.error ?? categoriesRes.error ?? keywordsRes.error ?? productsRes.error;
    }

    const tenant = tenantRes.data as DemoTenantRow | null;
    const categoryRows = (categoriesRes.data ?? []) as DemoCategoryRow[];
    const keywordRows = (keywordsRes.data ?? []) as DemoCategoryKeywordRow[];
    const productRows = (productsRes.data ?? []) as DemoProductRow[];
    if (!tenant) throw new Error(`No demo_tenants row for ${slug}`);

    const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name as Category]));

    const categoryConfig: DemoBaseline['categoryOverride']['categoryConfig'] = {};
    for (const c of categoryRows) {
      if (c.environment_label || c.environment_placeholder || c.name_hint) {
        categoryConfig[c.name as Category] = {
          environmentLabel: c.environment_label ?? 'Notes',
          environmentPlaceholder: c.environment_placeholder ?? 'Anything worth remembering about this item',
          nameHint: c.name_hint ?? undefined,
        };
      }
    }

    const categoryKeywords: DemoBaseline['categoryOverride']['categoryKeywords'] = {};
    for (const kw of keywordRows) {
      const name = categoryNameById.get(kw.category_id);
      if (!name) continue;
      (categoryKeywords[name] ??= []).push(kw.keyword);
    }

    const items = productRows
      .filter((p) => p.category_id && categoryNameById.has(p.category_id))
      .map((p) => rowToItem(p, categoryNameById.get(p.category_id!)!));

    const baseline: DemoBaseline = {
      displayName: tenant.display_name,
      currency: tenant.default_currency,
      items,
      categoryOverride: {
        categories: categoryRows.map((c) => c.name as Category),
        categoryConfig,
        categoryKeywords,
      },
    };

    writeCache(slug, baseline);
    return baseline;
  } catch (err) {
    console.warn(`Demo cloud fetch failed for ${slug}, falling back to last-known cache`, err);
    return readCache(slug);
  }
}
