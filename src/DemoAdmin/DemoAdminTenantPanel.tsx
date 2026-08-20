import { useCallback, useEffect, useState } from 'react';
import { demoSupabase } from '../lib/demoSupabaseClient';
import type { PilotSlug, TenantConfig } from '../config';
import { TENANT_CONFIGS } from '../config';
import type { DemoCategoryRow, DemoCategoryKeywordRow, DemoProductRow } from '../lib/demoCloudTypes';
import { DemoAdminCategories } from './DemoAdminCategories';
import { DemoAdminProducts } from './DemoAdminProducts';

interface Props {
  slug: PilotSlug;
}

export function DemoAdminTenantPanel({ slug }: Props) {
  const config: TenantConfig = TENANT_CONFIGS[slug];
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState(config.displayName);
  const [currency, setCurrency] = useState(config.currency);
  const [tenantSaving, setTenantSaving] = useState(false);
  const [categories, setCategories] = useState<DemoCategoryRow[]>([]);
  const [keywords, setKeywords] = useState<DemoCategoryKeywordRow[]>([]);
  const [products, setProducts] = useState<DemoProductRow[]>([]);

  const reload = useCallback(async () => {
    if (!demoSupabase) return;
    setLoading(true);
    const [tenantRes, categoriesRes, keywordsRes, productsRes] = await Promise.all([
      demoSupabase.from('demo_tenants').select('*').eq('id', slug).maybeSingle(),
      demoSupabase.from('demo_categories').select('*').eq('tenant_id', slug).order('sort_order'),
      demoSupabase.from('demo_category_keywords').select('*').eq('tenant_id', slug),
      demoSupabase.from('demo_products').select('*').eq('tenant_id', slug).order('sort_order'),
    ]);
    if (tenantRes.data) {
      setDisplayName(tenantRes.data.display_name);
      setCurrency(tenantRes.data.default_currency);
    }
    setCategories((categoriesRes.data as DemoCategoryRow[]) ?? []);
    setKeywords((keywordsRes.data as DemoCategoryKeywordRow[]) ?? []);
    setProducts((productsRes.data as DemoProductRow[]) ?? []);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveTenant = async () => {
    if (!demoSupabase) return;
    setTenantSaving(true);
    await demoSupabase
      .from('demo_tenants')
      .upsert({ id: slug, display_name: displayName, default_currency: currency, updated_at: new Date().toISOString() });
    setTenantSaving(false);
  };

  if (loading) return <p className="text-sm text-stone-400">Loading {slug}…</p>;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-stone-700 mb-2">Tenant</h2>
        <div className="flex gap-2 items-end">
          <label className="flex-1">
            <span className="block text-xs text-stone-500 mb-1">Display name (internal only)</span>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label className="w-24">
            <span className="block text-xs text-stone-500 mb-1">Currency</span>
            <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </label>
          <button
            onClick={saveTenant}
            disabled={tenantSaving}
            className="px-3 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {tenantSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </section>

      <DemoAdminCategories
        slug={slug}
        categories={categories}
        keywords={keywords}
        onChanged={reload}
      />

      <DemoAdminProducts
        slug={slug}
        categories={categories}
        products={products}
        onChanged={reload}
      />
    </div>
  );
}
