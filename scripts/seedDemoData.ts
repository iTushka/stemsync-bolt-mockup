/**
 * One-time migration: moves the three demo pilots' hardcoded content
 * (src/demoSeeds.ts items, src/categoryFieldMap.ts categories/keywords for
 * their underlying tenant) into the tuvara-demo Supabase project's
 * demo_tenants/demo_categories/demo_category_keywords/demo_products
 * tables. Safe to re-run: it deletes and re-inserts each demo tenant's
 * categories/keywords/products every time, so running it twice just
 * re-seeds the same content rather than duplicating rows. Any admin edits
 * made through /demo-admin since the last run would be overwritten by a
 * re-run — this is meant to be run once, right after the schema migration,
 * not as a recurring sync.
 *
 * Requires the SERVICE ROLE key (not the anon key) because RLS only allows
 * writes from an authenticated Supabase Auth session or here, a request
 * that bypasses RLS entirely — never commit this key or paste it in chat.
 *
 * Usage:
 *   SEED_SUPABASE_URL=https://xxxx.supabase.co \
 *   SEED_SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/seedDemoData.ts
 */
import { createClient } from '@supabase/supabase-js';
import { TENANT_CONFIGS, DEMO_PILOT_SLUGS, type PilotSlug } from '../src/config';
import { DEMO_SEEDS } from '../src/demoSeeds';
import { CATEGORIES_BY_TENANT, CATEGORY_KEYWORDS_BY_TENANT, categoryFieldConfig } from '../src/categoryFieldMap';
import type { Category } from '../src/types';

const url = process.env.SEED_SUPABASE_URL;
const serviceRoleKey = process.env.SEED_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Set SEED_SUPABASE_URL and SEED_SUPABASE_SERVICE_ROLE_KEY before running this script.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

async function seedTenant(slug: PilotSlug) {
  const config = TENANT_CONFIGS[slug];
  const seed = DEMO_SEEDS[slug];
  if (!seed) {
    console.warn(`No demoSeeds.ts entry for ${slug}, skipping.`);
    return;
  }

  console.log(`Seeding ${slug}...`);

  const { error: tenantError } = await supabase.from('demo_tenants').upsert({
    id: slug,
    display_name: config.displayName,
    default_currency: config.currency,
  });
  if (tenantError) throw tenantError;

  // Clear this tenant's existing categories/keywords/products so re-runs
  // don't duplicate rows (products first — no cascade from categories to
  // products, only category_id set null on delete).
  await supabase.from('demo_products').delete().eq('tenant_id', slug);
  await supabase.from('demo_category_keywords').delete().eq('tenant_id', slug);
  await supabase.from('demo_categories').delete().eq('tenant_id', slug);

  const categoryNames = CATEGORIES_BY_TENANT[config.tenant];
  const categoryIdByName = new Map<Category, string>();

  for (let i = 0; i < categoryNames.length; i++) {
    const name = categoryNames[i];
    const fieldConfig = categoryFieldConfig(name);
    const { data, error } = await supabase
      .from('demo_categories')
      .insert({
        tenant_id: slug,
        name,
        environment_label: fieldConfig.environmentLabel,
        environment_placeholder: fieldConfig.environmentPlaceholder,
        name_hint: fieldConfig.nameHint ?? null,
        sort_order: i,
      })
      .select()
      .single();
    if (error) throw error;
    categoryIdByName.set(name, data.id);
  }

  const keywordsByCategory = CATEGORY_KEYWORDS_BY_TENANT[config.tenant];
  const keywordRows: { tenant_id: PilotSlug; category_id: string; keyword: string }[] = [];
  for (const [category, keywords] of Object.entries(keywordsByCategory) as [Category, string[]][]) {
    const categoryId = categoryIdByName.get(category);
    if (!categoryId) continue;
    for (const keyword of keywords) {
      keywordRows.push({ tenant_id: slug, category_id: categoryId, keyword });
    }
  }
  if (keywordRows.length > 0) {
    const { error } = await supabase.from('demo_category_keywords').insert(keywordRows);
    if (error) throw error;
  }

  const productRows = seed.items.map((item, i) => ({
    tenant_id: slug,
    category_id: categoryIdByName.get(item.category) ?? null,
    name: item.name,
    quantity: item.quantity,
    purchase_price: item.purchasePrice,
    sale_price: item.salePrice,
    currency: config.currency,
    supplier: item.supplier ?? null,
    tags: item.tags,
    image_url: item.imageUrl ?? null,
    environment: item.environment ?? null,
    channels: item.channels,
    aging: item.aging,
    sold_out: item.soldOut,
    aging_action: item.agingAction ?? null,
    aging_action_note: item.agingActionNote ?? null,
    period_id: item.periodId ?? null,
    color: item.color ?? null,
    bulk_threshold: item.bulkThreshold ?? null,
    bulk_unit_price: item.bulkUnitPrice ?? null,
    season: item.season ?? null,
    variant_group: item.variantGroup ?? null,
    shop: item.shop ?? null,
    sort_order: i,
    created_at_ms: item.createdAt,
  }));

  const { error: productsError } = await supabase.from('demo_products').insert(productRows);
  if (productsError) throw productsError;

  console.log(`  ${categoryNames.length} categories, ${keywordRows.length} keywords, ${productRows.length} products.`);
}

async function main() {
  for (const slug of DEMO_PILOT_SLUGS) {
    await seedTenant(slug);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
