import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { demoSupabase } from '../lib/demoSupabaseClient';
import type { PilotSlug } from '../config';
import type { DemoCategoryRow, DemoCategoryKeywordRow } from '../lib/demoCloudTypes';

interface Props {
  slug: PilotSlug;
  categories: DemoCategoryRow[];
  keywords: DemoCategoryKeywordRow[];
  onChanged: () => void;
}

interface DraftCategory {
  id: string | null; // null = not yet saved
  name: string;
  environment_label: string;
  environment_placeholder: string;
  name_hint: string;
  sort_order: number;
  keywordsCsv: string;
}

function toDraft(c: DemoCategoryRow, keywords: DemoCategoryKeywordRow[]): DraftCategory {
  return {
    id: c.id,
    name: c.name,
    environment_label: c.environment_label ?? '',
    environment_placeholder: c.environment_placeholder ?? '',
    name_hint: c.name_hint ?? '',
    sort_order: c.sort_order,
    keywordsCsv: keywords.filter((k) => k.category_id === c.id).map((k) => k.keyword).join(', '),
  };
}

const blankDraft = (sortOrder: number): DraftCategory => ({
  id: null,
  name: '',
  environment_label: '',
  environment_placeholder: '',
  name_hint: '',
  sort_order: sortOrder,
  keywordsCsv: '',
});

export function DemoAdminCategories({ slug, categories, keywords, onChanged }: Props) {
  const [drafts, setDrafts] = useState<DraftCategory[] | null>(null);
  const [savingId, setSavingId] = useState<string | 'new' | null>(null);

  const rows = drafts ?? categories.map((c) => toDraft(c, keywords));

  const updateRow = (index: number, patch: Partial<DraftCategory>) => {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    setDrafts(next);
  };

  const addRow = () => setDrafts([...rows, blankDraft(rows.length)]);

  const saveRow = async (row: DraftCategory) => {
    if (!demoSupabase || !row.name.trim()) return;
    setSavingId(row.id ?? 'new');

    let categoryId = row.id;
    if (categoryId) {
      await demoSupabase
        .from('demo_categories')
        .update({
          name: row.name.trim(),
          environment_label: row.environment_label || null,
          environment_placeholder: row.environment_placeholder || null,
          name_hint: row.name_hint || null,
          sort_order: row.sort_order,
        })
        .eq('id', categoryId);
    } else {
      const { data } = await demoSupabase
        .from('demo_categories')
        .insert({
          tenant_id: slug,
          name: row.name.trim(),
          environment_label: row.environment_label || null,
          environment_placeholder: row.environment_placeholder || null,
          name_hint: row.name_hint || null,
          sort_order: row.sort_order,
        })
        .select()
        .single();
      categoryId = data?.id ?? null;
    }

    if (categoryId) {
      // Simplest-correct approach for a low-traffic single-admin tool:
      // replace this category's keyword rows wholesale rather than diffing.
      await demoSupabase.from('demo_category_keywords').delete().eq('category_id', categoryId);
      const newKeywords = row.keywordsCsv
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      if (newKeywords.length > 0) {
        await demoSupabase.from('demo_category_keywords').insert(
          newKeywords.map((keyword) => ({ tenant_id: slug, category_id: categoryId, keyword }))
        );
      }
    }

    setSavingId(null);
    setDrafts(null);
    onChanged();
  };

  const deleteRow = async (row: DraftCategory) => {
    if (!demoSupabase || !row.id) {
      setDrafts(null);
      return;
    }
    if (!confirm(`Delete category "${row.name}"? Any products in it will keep their name but lose their category link.`)) return;
    await demoSupabase.from('demo_categories').delete().eq('id', row.id);
    setDrafts(null);
    onChanged();
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-stone-700">Categories</h2>
        <button onClick={addRow} className="flex items-center gap-1 text-xs text-accent-600 font-medium">
          <Plus size={13} /> Add category
        </button>
      </div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.id ?? `new-${i}`} className="p-3 rounded-lg border border-stone-200 space-y-2">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Category name"
                value={row.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
              />
              <input
                className="input w-20"
                type="number"
                placeholder="Order"
                value={row.sort_order}
                onChange={(e) => updateRow(i, { sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input"
                placeholder="Environment field label (e.g. Size range)"
                value={row.environment_label}
                onChange={(e) => updateRow(i, { environment_label: e.target.value })}
              />
              <input
                className="input"
                placeholder="Environment field placeholder"
                value={row.environment_placeholder}
                onChange={(e) => updateRow(i, { environment_placeholder: e.target.value })}
              />
            </div>
            <input
              className="input w-full"
              placeholder="Name hint (optional)"
              value={row.name_hint}
              onChange={(e) => updateRow(i, { name_hint: e.target.value })}
            />
            <input
              className="input w-full"
              placeholder="Keywords, comma-separated (used for free-text category guessing)"
              value={row.keywordsCsv}
              onChange={(e) => updateRow(i, { keywordsCsv: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => deleteRow(row)}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-500"
              >
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
        ))}
        {rows.length === 0 && <p className="text-xs text-stone-400">No categories yet.</p>}
      </div>
    </section>
  );
}
