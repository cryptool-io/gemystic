'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface CategoryRow {
  slug: string;
  name: string;
  description: string;
  position: number;
  isActive: boolean;
  formMapping: string[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  count: number;
  isCustom: boolean;
}

const BLANK: CategoryRow = {
  slug: '',
  name: '',
  description: '',
  position: 50,
  isActive: true,
  formMapping: [],
  seoTitle: '',
  seoDescription: '',
  seoKeywords: [],
  count: 0,
  isCustom: true,
};

/**
 * Category management: rename, reorder, re-map, hide, and create.
 *
 * Stock lands in a category through its form mapping rather than per-stone
 * tagging, so a new category is useful the moment it is saved.
 */
export function CategoryManager({
  categories,
  forms,
}: {
  categories: CategoryRow[];
  forms: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...editing, action: 'save' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Could not save.');
      } else {
        setEditing(null);
        router.refresh();
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  async function hide(slug: string) {
    setBusy(true);
    try {
      await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'delete', slug }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setEditing({ ...BLANK })} className="btn-primary">
          Add category
        </button>
      </div>

      {editing && (
        <div className="card p-5">
          <h2 className="font-display text-lg">
            {editing.slug && !editing.isCustom ? `Edit ${editing.name}` : 'New category'}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Name"
              value={editing.name}
              onChange={(v) => setEditing({ ...editing, name: v })}
            />
            <Field
              label="URL slug"
              value={editing.slug}
              onChange={(v) => setEditing({ ...editing, slug: v })}
              hint={editing.isCustom ? 'Used in /shop?category=…' : 'Fixed for existing categories'}
              readOnly={!editing.isCustom}
            />
            <div className="sm:col-span-2">
              <Field
                label="Description"
                value={editing.description}
                onChange={(v) => setEditing({ ...editing, description: v })}
                textarea
              />
            </div>
            <Field
              label="Position (lower shows first)"
              value={String(editing.position)}
              onChange={(v) => setEditing({ ...editing, position: Number(v) || 0 })}
              type="number"
            />
            <div>
              <span className="label mb-1.5 block">Visible</span>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                />
                Show in the shop and navigation
              </label>
            </div>

            <div className="sm:col-span-2">
              <span className="label mb-1.5 block">Stone types in this category</span>
              <div className="flex flex-wrap gap-2">
                {forms.map((f) => {
                  const on = editing.formMapping.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          formMapping: on
                            ? editing.formMapping.filter((x) => x !== f)
                            : [...editing.formMapping, f],
                        })
                      }
                      className={`chip capitalize transition ${on ? 'chip-brand' : 'hover:border-brand-ring'}`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-subtle">
                Stones fall into a category by their type, so a new category fills itself.
              </p>
            </div>

            <div className="sm:col-span-2">
              <Field
                label="Meta title"
                value={editing.seoTitle}
                onChange={(v) => setEditing({ ...editing, seoTitle: v })}
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Meta description"
                value={editing.seoDescription}
                onChange={(v) => setEditing({ ...editing, seoDescription: v })}
                textarea
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Keywords (comma separated)"
                value={editing.seoKeywords.join(', ')}
                onChange={(v) =>
                  setEditing({
                    ...editing,
                    seoKeywords: v.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-40">
              {busy ? 'Saving…' : 'Save category'}
            </button>
            <button onClick={() => setEditing(null)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="card scroll-x">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="p-3 font-normal">Category</th>
              <th className="p-3 font-normal">Types</th>
              <th className="p-3 text-right font-normal">Stones</th>
              <th className="p-3 text-right font-normal">Position</th>
              <th className="p-3 font-normal">Visible</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {categories.map((c) => (
              <tr key={c.slug} className={c.isActive ? '' : 'opacity-50'}>
                <td className="p-3">
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-xs text-muted">/{c.slug}</span>
                </td>
                <td className="p-3 capitalize text-muted">
                  {c.formMapping.join(', ') || '–'}
                </td>
                <td className="p-3 text-right text-muted">{c.count}</td>
                <td className="p-3 text-right text-muted">{c.position}</td>
                <td className="p-3">
                  <span className={c.isActive ? 'chip-brand text-[10px]' : 'chip text-[10px]'}>
                    {c.isActive ? 'Visible' : 'Hidden'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => setEditing({ ...c })}
                    className="text-xs text-brand hover:text-brand-dark"
                  >
                    Edit
                  </button>
                  {c.isActive && (
                    <button
                      onClick={() => hide(c.slug)}
                      disabled={busy}
                      className="ml-3 text-xs text-muted hover:text-accent-dark disabled:opacity-40"
                    >
                      Hide
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
  type = 'text',
  hint,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  type?: string;
  hint?: string;
  readOnly?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <div>
      <label htmlFor={id} className="label mb-1.5 block">{label}</label>
      {textarea ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="field"
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className={`field ${readOnly ? 'opacity-60' : ''}`}
        />
      )}
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}
