import { useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { demoSupabase } from '../lib/demoSupabaseClient';
import type { PilotSlug } from '../config';
import type { DemoCategoryRow, DemoProductRow } from '../lib/demoCloudTypes';

interface Props {
  slug: PilotSlug;
  categories: DemoCategoryRow[];
  products: DemoProductRow[];
  onChanged: () => void;
}

interface Channel {
  id: string;
  name: string;
  price: string;
}

interface DraftProduct {
  id: string | null;
  category_id: string;
  name: string;
  quantity: string;
  purchase_price: string;
  sale_price: string;
  currency: string;
  supplier: string;
  tagsCsv: string;
  image_url: string;
  environment: string;
  channels: Channel[];
  aging: boolean;
  sold_out: boolean;
  aging_action: string;
  aging_action_note: string;
  sort_order: string;
  created_at_ms: number;
  period_id: string;
  color: string;
  bulk_threshold: string;
  bulk_unit_price: string;
  season: string;
  variant_group: string;
  shop: string;
}

function toDraft(p: DemoProductRow, defaultCurrency: string): DraftProduct {
  return {
    id: p.id,
    category_id: p.category_id ?? '',
    name: p.name,
    quantity: String(p.quantity),
    purchase_price: String(p.purchase_price),
    sale_price: String(p.sale_price),
    currency: p.currency || defaultCurrency,
    supplier: p.supplier ?? '',
    tagsCsv: (p.tags ?? []).join(', '),
    image_url: p.image_url ?? '',
    environment: p.environment ?? '',
    channels: (p.channels ?? []).map((c) => ({ id: c.id, name: c.name, price: c.price != null ? String(c.price) : '' })),
    aging: p.aging,
    sold_out: p.sold_out,
    aging_action: p.aging_action ?? '',
    aging_action_note: p.aging_action_note ?? '',
    sort_order: String(p.sort_order),
    created_at_ms: p.created_at_ms,
    period_id: p.period_id ?? '',
    color: p.color ?? '',
    bulk_threshold: p.bulk_threshold != null ? String(p.bulk_threshold) : '',
    bulk_unit_price: p.bulk_unit_price != null ? String(p.bulk_unit_price) : '',
    season: p.season ?? '',
    variant_group: p.variant_group ?? '',
    shop: p.shop ?? '',
  };
}

const blankDraft = (defaultCurrency: string, sortOrder: number): DraftProduct => ({
  id: null,
  category_id: '',
  name: '',
  quantity: '0',
  purchase_price: '0',
  sale_price: '0',
  currency: defaultCurrency,
  supplier: '',
  tagsCsv: '',
  image_url: '',
  environment: '',
  channels: [],
  aging: false,
  sold_out: false,
  aging_action: '',
  aging_action_note: '',
  sort_order: String(sortOrder),
  created_at_ms: Date.now(),
  period_id: '',
  color: '',
  bulk_threshold: '',
  bulk_unit_price: '',
  season: '',
  variant_group: '',
  shop: '',
});

export function DemoAdminProducts({ slug, categories, products, onChanged }: Props) {
  const defaultCurrency = products[0]?.currency ?? '';
  const [drafts, setDrafts] = useState<DraftProduct[] | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [advanced, setAdvanced] = useState<Set<number>>(new Set());
  const [savingId, setSavingId] = useState<string | 'new' | null>(null);

  const rows = drafts ?? products.map((p) => toDraft(p, defaultCurrency));

  const updateRow = (index: number, patch: Partial<DraftProduct>) => {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    setDrafts(next);
  };

  const toggle = (set: Set<number>, setSet: (s: Set<number>) => void, i: number) => {
    const next = new Set(set);
    if (next.has(i)) {
      next.delete(i);
    } else {
      next.add(i);
    }
    setSet(next);
  };

  const addRow = () => {
    const next = [...rows, blankDraft(defaultCurrency, rows.length)];
    setDrafts(next);
    setExpanded(new Set([...expanded, next.length - 1]));
  };

  const addChannel = (i: number) => {
    updateRow(i, {
      channels: [...rows[i].channels, { id: Math.random().toString(36).slice(2, 9), name: '', price: '' }],
    });
  };

  const updateChannel = (i: number, ci: number, patch: Partial<Channel>) => {
    const channels = [...rows[i].channels];
    channels[ci] = { ...channels[ci], ...patch };
    updateRow(i, { channels });
  };

  const removeChannel = (i: number, ci: number) => {
    updateRow(i, { channels: rows[i].channels.filter((_, idx) => idx !== ci) });
  };

  const saveRow = async (row: DraftProduct) => {
    if (!demoSupabase || !row.name.trim()) return;
    setSavingId(row.id ?? 'new');

    const payload = {
      tenant_id: slug,
      category_id: row.category_id || null,
      name: row.name.trim(),
      quantity: Number(row.quantity) || 0,
      purchase_price: Number(row.purchase_price) || 0,
      sale_price: Number(row.sale_price) || 0,
      currency: row.currency,
      supplier: row.supplier || null,
      tags: row.tagsCsv.split(',').map((t) => t.trim()).filter(Boolean),
      image_url: row.image_url || null,
      environment: row.environment || null,
      channels: row.channels
        .filter((c) => c.name.trim())
        .map((c) => ({ id: c.id, name: c.name.trim(), ...(c.price ? { price: Number(c.price) } : {}) })),
      aging: row.aging,
      sold_out: row.sold_out,
      aging_action: row.aging_action || null,
      aging_action_note: row.aging_action_note || null,
      sort_order: Number(row.sort_order) || 0,
      created_at_ms: row.created_at_ms,
      period_id: row.period_id || null,
      color: row.color || null,
      bulk_threshold: row.bulk_threshold ? Number(row.bulk_threshold) : null,
      bulk_unit_price: row.bulk_unit_price ? Number(row.bulk_unit_price) : null,
      season: row.season || null,
      variant_group: row.variant_group || null,
      shop: row.shop || null,
      updated_at: new Date().toISOString(),
    };

    if (row.id) {
      await demoSupabase.from('demo_products').update(payload).eq('id', row.id);
    } else {
      await demoSupabase.from('demo_products').insert(payload);
    }

    setSavingId(null);
    setDrafts(null);
    onChanged();
  };

  const deleteRow = async (row: DraftProduct) => {
    if (!demoSupabase || !row.id) {
      setDrafts(null);
      return;
    }
    if (!confirm(`Delete "${row.name}"?`)) return;
    await demoSupabase.from('demo_products').delete().eq('id', row.id);
    setDrafts(null);
    onChanged();
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-stone-700">Products</h2>
        <button onClick={addRow} className="flex items-center gap-1 text-xs text-accent-600 font-medium">
          <Plus size={13} /> Add product
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => {
          const isOpen = expanded.has(i);
          return (
            <div key={row.id ?? `new-${i}`} className="rounded-lg border border-stone-200">
              <button
                onClick={() => toggle(expanded, setExpanded, i)}
                className="w-full flex items-center justify-between px-3 py-2 text-left"
              >
                <span className="text-sm text-stone-700">
                  {row.name || <span className="text-stone-400">Untitled</span>}
                  {row.sold_out && <span className="ml-2 text-[10px] text-stone-400">sold out</span>}
                </span>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-2 border-t border-stone-100 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="input"
                      placeholder="Name"
                      value={row.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                    />
                    <select
                      className="input"
                      value={row.category_id}
                      onChange={(e) => updateRow(i, { category_id: e.target.value })}
                    >
                      <option value="">No category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <input className="input" type="number" placeholder="Qty" value={row.quantity} onChange={(e) => updateRow(i, { quantity: e.target.value })} />
                    <input className="input" type="number" placeholder="Purchase price" value={row.purchase_price} onChange={(e) => updateRow(i, { purchase_price: e.target.value })} />
                    <input className="input" type="number" placeholder="Sale price" value={row.sale_price} onChange={(e) => updateRow(i, { sale_price: e.target.value })} />
                    <input className="input" placeholder="Currency" value={row.currency} onChange={(e) => updateRow(i, { currency: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input" placeholder="Supplier" value={row.supplier} onChange={(e) => updateRow(i, { supplier: e.target.value })} />
                    <input className="input" placeholder="Tags, comma-separated" value={row.tagsCsv} onChange={(e) => updateRow(i, { tagsCsv: e.target.value })} />
                  </div>
                  <input className="input w-full" placeholder="Environment / care / storage notes" value={row.environment} onChange={(e) => updateRow(i, { environment: e.target.value })} />
                  <input className="input w-full" placeholder="Image URL (optional)" value={row.image_url} onChange={(e) => updateRow(i, { image_url: e.target.value })} />

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-500">Sales channels</span>
                      <button onClick={() => addChannel(i)} className="text-xs text-accent-600">+ channel</button>
                    </div>
                    {row.channels.map((c, ci) => (
                      <div key={c.id} className="flex gap-2 mt-1">
                        <input className="input flex-1" placeholder="Channel name" value={c.name} onChange={(e) => updateChannel(i, ci, { name: e.target.value })} />
                        <input className="input w-24" type="number" placeholder="Price" value={c.price} onChange={(e) => updateChannel(i, ci, { price: e.target.value })} />
                        <button onClick={() => removeChannel(i, ci)} className="text-stone-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-stone-600">
                      <input type="checkbox" checked={row.aging} onChange={(e) => updateRow(i, { aging: e.target.checked })} />
                      Aging stock
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-stone-600">
                      <input type="checkbox" checked={row.sold_out} onChange={(e) => updateRow(i, { sold_out: e.target.checked })} />
                      Sold out
                    </label>
                  </div>

                  {row.aging && (
                    <div className="grid grid-cols-2 gap-2">
                      <select className="input" value={row.aging_action} onChange={(e) => updateRow(i, { aging_action: e.target.value })}>
                        <option value="">No action taken yet</option>
                        <option value="markdown">Markdown</option>
                        <option value="bundle">Bundle</option>
                        <option value="donate">Donate</option>
                        <option value="other">Other</option>
                      </select>
                      <input className="input" placeholder="Note about what was done" value={row.aging_action_note} onChange={(e) => updateRow(i, { aging_action_note: e.target.value })} />
                    </div>
                  )}

                  <button
                    onClick={() => toggle(advanced, setAdvanced, i)}
                    className="text-xs text-stone-400 hover:text-stone-600"
                  >
                    {advanced.has(i) ? 'Hide advanced fields' : 'Show advanced fields (period, color, bulk pricing, season, variant group, shop)'}
                  </button>
                  {advanced.has(i) && (
                    <div className="grid grid-cols-2 gap-2">
                      <input className="input" placeholder="Period ID" value={row.period_id} onChange={(e) => updateRow(i, { period_id: e.target.value })} />
                      <input className="input" placeholder="Color" value={row.color} onChange={(e) => updateRow(i, { color: e.target.value })} />
                      <input className="input" type="number" placeholder="Bulk threshold" value={row.bulk_threshold} onChange={(e) => updateRow(i, { bulk_threshold: e.target.value })} />
                      <input className="input" type="number" placeholder="Bulk unit price" value={row.bulk_unit_price} onChange={(e) => updateRow(i, { bulk_unit_price: e.target.value })} />
                      <input className="input" placeholder="Season" value={row.season} onChange={(e) => updateRow(i, { season: e.target.value })} />
                      <input className="input" placeholder="Variant group" value={row.variant_group} onChange={(e) => updateRow(i, { variant_group: e.target.value })} />
                      <input className="input" placeholder="Shop tag" value={row.shop} onChange={(e) => updateRow(i, { shop: e.target.value })} />
                      <input className="input" type="number" placeholder="Sort order" value={row.sort_order} onChange={(e) => updateRow(i, { sort_order: e.target.value })} />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => deleteRow(row)} className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-500">
                      <Trash2 size={12} /> Delete
                    </button>
                    <button
                      onClick={() => saveRow(row)}
                      disabled={savingId === (row.id ?? 'new')}
                      className="px-2.5 py-1 rounded-md bg-accent-500 text-white text-xs font-medium disabled:opacity-50"
                    >
                      {savingId === (row.id ?? 'new') ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-xs text-stone-400">No products yet.</p>}
      </div>
    </section>
  );
}
