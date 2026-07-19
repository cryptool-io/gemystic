'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface InventoryDraft {
  id: string;
  sku: string | null;
  title: string;
  description: string;
  stoneType: string;
  intakeStatus: string;
  colour: string;
  shape: string;
  categoryId: string;
  caratWeight: string;
  weightGrams: string;
  weightFromG: string;
  weightToG: string;
  lengthMm: string;
  widthMm: string;
  heightMm: string;
  diameterMm: string;
  unitPrice: string;
  priceUnit: string;
  price: string;
  costPrice: string;
  originCountry: string;
  treatment: string;
  shipsFrom: string;
  intakeNotes: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  status: string;
  aiGenerated: boolean;
  photoCount: number;
}

/**
 * Edit one stone, and take it from inventory to the shop.
 *
 * Generate and publish are separate buttons on purpose: generated copy lands in
 * the fields for review, and publishing is the act that says a person read it.
 */
export function InventoryEditor({
  draft,
  categories,
  stoneTypes,
  statuses,
  aiEnabled,
}: {
  draft: InventoryDraft;
  categories: { id: string; name: string }[];
  stoneTypes: { value: string; label: string }[];
  statuses: { value: string; label: string }[];
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(draft);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function set<K extends keyof InventoryDraft>(key: K, value: InventoryDraft[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isParcel = form.stoneType === 'rough_parcel';
  const isSpecimen = form.stoneType === 'specimen';
  const usesCarats = form.stoneType === 'cut' || form.stoneType === 'pair';
  const published = form.status === 'active';

  async function save() {
    setBusy('save');
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'update', productId: form.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok || data.error) setError(data.error ?? 'Could not save.');
      else {
        setMessage('Saved.');
        router.refresh();
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    setBusy('generate');
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/inventory/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'generate', productId: form.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Generation failed.');
      } else {
        const d = data.draft;
        setForm((f) => ({
          ...f,
          title: d.title ?? f.title,
          description: d.description ?? f.description,
          seoTitle: d.seoTitle ?? f.seoTitle,
          seoDescription: d.seoDescription ?? f.seoDescription,
          seoKeywords: (d.seoKeywords ?? []).join(', '),
          aiGenerated: true,
        }));
        setMessage('Draft written. Read it through, then publish.');
        router.refresh();
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(null);
    }
  }

  async function publish(action: 'publish' | 'unpublish') {
    setBusy(action);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/inventory/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, productId: form.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'That did not work.');
      } else {
        setMessage(
          action === 'publish'
            ? 'Live in the shop, with every photograph on this stone.'
            : 'Taken out of the shop.',
        );
        setForm((f) => ({ ...f, status: action === 'publish' ? 'active' : 'draft' }));
        router.refresh();
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Listing action bar */}
      <div className="card border-brand-ring bg-brand-tint/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-brand-deep">
              {published ? 'Live in the shop' : 'Not listed yet'}
            </h2>
            <p className="mt-1 text-xs text-brand-deep/80">
              {published
                ? 'Customers can see and buy this stone right now.'
                : `Fill the listing, then publish. ${form.photoCount} photograph${form.photoCount === 1 ? '' : 's'} attached.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={generate}
              disabled={busy !== null || !aiEnabled}
              title={aiEnabled ? undefined : 'Set an AI provider key to enable this'}
              className="btn-ghost disabled:opacity-40"
            >
              {busy === 'generate' ? 'Writing…' : 'Fill listing with AI'}
            </button>
            {published ? (
              <button
                onClick={() => publish('unpublish')}
                disabled={busy !== null}
                className="btn-ghost disabled:opacity-40"
              >
                {busy === 'unpublish' ? 'Removing…' : 'Take out of shop'}
              </button>
            ) : (
              <button
                onClick={() => publish('publish')}
                disabled={busy !== null}
                className="btn-primary disabled:opacity-40"
              >
                {busy === 'publish' ? 'Publishing…' : 'Publish to shop'}
              </button>
            )}
          </div>
        </div>
        {form.aiGenerated && (
          <p className="mt-3 text-xs text-brand-deep/80">
            The copy below was drafted by AI. Publishing records that you reviewed it.
          </p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg">Listing content</h2>
        <div className="mt-4 space-y-4">
          <F label="Title" value={form.title} onChange={(v) => set('title', v)} />
          <F label="Description" value={form.description} onChange={(v) => set('description', v)} textarea rows={6} />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg">SEO for this stone</h2>
        <div className="mt-4 space-y-4">
          <F
            label="Meta title"
            value={form.seoTitle}
            onChange={(v) => set('seoTitle', v)}
            hint={`${form.seoTitle.length} characters, aim for under 60`}
          />
          <F
            label="Meta description"
            value={form.seoDescription}
            onChange={(v) => set('seoDescription', v)}
            textarea
            hint={`${form.seoDescription.length} characters, aim for 140 to 160`}
          />
          <F label="Keywords (comma separated)" value={form.seoKeywords} onChange={(v) => set('seoKeywords', v)} />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg">The stone</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="stoneType" className="label mb-1.5 block">Type</label>
            <select id="stoneType" value={form.stoneType} onChange={(e) => set('stoneType', e.target.value)} className="field">
              {stoneTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="intakeStatus" className="label mb-1.5 block">Photo status</label>
            <select id="intakeStatus" value={form.intakeStatus} onChange={(e) => set('intakeStatus', e.target.value)} className="field">
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="categoryId" className="label mb-1.5 block">Category</label>
            <select id="categoryId" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className="field">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <F label="Colour" value={form.colour} onChange={(v) => set('colour', v)} />
          <F label="Shape or cut" value={form.shape} onChange={(v) => set('shape', v)} />
          <F label="Origin" value={form.originCountry} onChange={(v) => set('originCountry', v)} />
          <F label="Treatment" value={form.treatment} onChange={(v) => set('treatment', v)} />
          <div>
            <label htmlFor="shipsFrom" className="label mb-1.5 block">Ships from</label>
            <select id="shipsFrom" value={form.shipsFrom} onChange={(e) => set('shipsFrom', e.target.value)} className="field">
              <option value="PK">Pakistan</option>
              <option value="TH">Thailand</option>
            </select>
          </div>
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <span className="label mb-3 block">Measurements</span>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {usesCarats && (
              <>
                <F label="Weight (carats)" value={form.caratWeight} onChange={(v) => set('caratWeight', v)} type="number" />
                <F label="Length (mm)" value={form.lengthMm} onChange={(v) => set('lengthMm', v)} type="number" />
                <F label="Width (mm)" value={form.widthMm} onChange={(v) => set('widthMm', v)} type="number" />
                <F label="Thickness (mm)" value={form.heightMm} onChange={(v) => set('heightMm', v)} type="number" />
                <F label="Diameter (mm)" value={form.diameterMm} onChange={(v) => set('diameterMm', v)} type="number" />
              </>
            )}
            {isSpecimen && (
              <>
                <F label="Weight (grams)" value={form.weightGrams} onChange={(v) => set('weightGrams', v)} type="number" />
                <F label="Length (mm)" value={form.lengthMm} onChange={(v) => set('lengthMm', v)} type="number" />
                <F label="Width (mm)" value={form.widthMm} onChange={(v) => set('widthMm', v)} type="number" />
                <F label="Thickness (mm)" value={form.heightMm} onChange={(v) => set('heightMm', v)} type="number" />
              </>
            )}
            {isParcel && (
              <>
                <F label="Total weight (grams)" value={form.weightGrams} onChange={(v) => set('weightGrams', v)} type="number" />
                <F label="Smallest stone (g)" value={form.weightFromG} onChange={(v) => set('weightFromG', v)} type="number" />
                <F label="Largest stone (g)" value={form.weightToG} onChange={(v) => set('weightToG', v)} type="number" />
              </>
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <span className="label mb-3 block">Price</span>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="priceUnit" className="label mb-1.5 block">Priced by</label>
              <select id="priceUnit" value={form.priceUnit} onChange={(e) => set('priceUnit', e.target.value)} className="field">
                <option value="piece">The piece</option>
                <option value="gram">Per gram</option>
                <option value="carat">Per carat</option>
              </select>
            </div>
            {form.priceUnit !== 'piece' && (
              <F label={`Price per ${form.priceUnit}`} value={form.unitPrice} onChange={(v) => set('unitPrice', v)} type="number" />
            )}
            <F label="Selling price (USD)" value={form.price} onChange={(v) => set('price', v)} type="number" />
            <F
              label="Cost price (USD)"
              value={form.costPrice}
              onChange={(v) => set('costPrice', v)}
              type="number"
              hint="Needed for real margins"
            />
          </div>
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <F label="Internal notes" value={form.intakeNotes} onChange={(v) => set('intakeNotes', v)} textarea />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">{error}</p>
      )}
      {message && (
        <p className="rounded-lg border border-brand-ring bg-brand-tint p-3 text-sm text-brand-deep">{message}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button onClick={save} disabled={busy !== null} className="btn-primary disabled:opacity-40">
          {busy === 'save' ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function F({
  label,
  value,
  onChange,
  type = 'text',
  textarea = false,
  rows = 3,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
  rows?: number;
  hint?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <div>
      <label htmlFor={id} className="label mb-1.5 block">{label}</label>
      {textarea ? (
        <textarea id={id} value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className="field" />
      ) : (
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="field" />
      )}
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}
