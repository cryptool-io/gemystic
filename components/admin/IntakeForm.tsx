'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface IntakeOption {
  value: string;
  label: string;
  hint?: string;
  prefix?: string;
}

/**
 * Step 1 intake, shaped like the owner's spreadsheet rather than like a generic
 * product form.
 *
 * Two decisions drive the layout. The SKU is generated, not typed, because the
 * codes follow a system (type, species, sequence) and a hand-typed one breaks
 * it silently. And the measurement fields switch on stone type, because a
 * parcel has a weight range and a per-gram price while a cut stone has carats
 * and millimetres, and showing all of them at once is how sheets end up with
 * columns nobody fills in.
 */
export function IntakeForm({
  categories,
  stoneTypes,
  statuses,
  channels,
}: {
  categories: { id: string; name: string }[];
  stoneTypes: IntakeOption[];
  statuses: IntakeOption[];
  channels: IntakeOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [sku, setSku] = useState('');

  const [form, setForm] = useState({
    stoneType: 'cut',
    species: '',
    title: '',
    colour: '',
    shape: '',
    intakeStatus: 'pending_images',
    categoryId: categories[0]?.id ?? '',
    caratWeight: '',
    lengthMm: '',
    widthMm: '',
    heightMm: '',
    diameterMm: '',
    weightGrams: '',
    weightFromG: '',
    weightToG: '',
    unitPrice: '',
    priceUnit: 'piece',
    price: '',
    costPrice: '',
    originCountry: 'Pakistan',
    treatment: '',
    shipsFrom: 'PK',
    mediaFolder: '',
    intakeNotes: '',
  });

  const [channelState, setChannelState] = useState<Record<string, { status: string; listingUrl: string }>>(
    Object.fromEntries(channels.map((c) => [c.value, { status: 'not_listed', listingUrl: '' }])),
  );

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isParcel = form.stoneType === 'rough_parcel';
  const isSpecimen = form.stoneType === 'specimen';
  const usesCarats = form.stoneType === 'cut' || form.stoneType === 'pair';

  // Live SKU preview, so the code is visible before the stone is saved.
  useEffect(() => {
    if (!open || !form.species.trim()) {
      setSku('');
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'preview-sku', stoneType: form.stoneType, species: form.species }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setSku(d.sku ?? '');
        })
        .catch(() => {});
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, form.stoneType, form.species]);

  // Parcels are priced per gram: show the total the buyer will pay as it is typed.
  const computedTotal = (() => {
    const unit = Number(form.unitPrice);
    if (!unit) return null;
    const qty =
      form.priceUnit === 'gram'
        ? Number(form.weightGrams)
        : form.priceUnit === 'carat'
          ? Number(form.caratWeight)
          : 1;
    if (!qty) return null;
    return Math.round(unit * qty * 100) / 100;
  })();

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...form,
          price: form.price || computedTotal || '',
          channels: Object.fromEntries(
            Object.entries(channelState).filter(([, v]) => v.status !== 'not_listed'),
          ),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Could not save the stone.');
      } else {
        setCreated(data.sku);
        setForm((f) => ({ ...f, title: '', caratWeight: '', weightGrams: '', price: '', unitPrice: '' }));
        router.refresh();
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen(true)} className="btn-primary">
          Add stone to inventory
        </button>
        {created && (
          <span className="text-sm text-brand">Saved {created}. Add another?</span>
        )}
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg">New stone</h2>
        {sku && (
          <span className="chip-brand tabular-nums">
            Code {sku}
          </span>
        )}
      </div>

      {/* Type drives which measurements make sense below. */}
      <div className="mt-4">
        <span className="label mb-2 block">What is it?</span>
        <div className="flex flex-wrap gap-2">
          {stoneTypes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set('stoneType', t.value)}
              className={`chip transition ${form.stoneType === t.value ? 'chip-brand' : 'hover:border-brand-ring'}`}
              title={t.hint}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-subtle">
          {stoneTypes.find((t) => t.value === form.stoneType)?.hint}
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <F label="Gemstone species" value={form.species} onChange={(v) => set('species', v)} placeholder="Amethyst" />
        <F label="Listing name" value={form.title} onChange={(v) => set('title', v)} placeholder="Amethyst 11.25ct Cushion" />
        <F label="Colour" value={form.colour} onChange={(v) => set('colour', v)} placeholder="Purple" />
        <F label="Shape or cut" value={form.shape} onChange={(v) => set('shape', v)} placeholder="Cushion" />

        <div>
          <label htmlFor="categoryId" className="label mb-1.5 block">Category</label>
          <select
            id="categoryId"
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
            className="field"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="intakeStatus" className="label mb-1.5 block">Photo status</label>
          <select
            id="intakeStatus"
            value={form.intakeStatus}
            onChange={(e) => set('intakeStatus', e.target.value)}
            className="field"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Measurements, by type */}
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

      {/* Money */}
      <div className="mt-5 border-t border-line pt-5">
        <span className="label mb-3 block">Price</span>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="priceUnit" className="label mb-1.5 block">Priced by</label>
            <select
              id="priceUnit"
              value={form.priceUnit}
              onChange={(e) => set('priceUnit', e.target.value)}
              className="field"
            >
              <option value="piece">The piece</option>
              <option value="gram">Per gram</option>
              <option value="carat">Per carat</option>
            </select>
          </div>
          {form.priceUnit !== 'piece' && (
            <F label={`Price per ${form.priceUnit}`} value={form.unitPrice} onChange={(v) => set('unitPrice', v)} type="number" />
          )}
          <F
            label="Selling price (USD)"
            value={form.price}
            onChange={(v) => set('price', v)}
            type="number"
            placeholder={computedTotal ? String(computedTotal) : undefined}
            hint={computedTotal ? `Calculated: $${computedTotal}` : undefined}
          />
          <F
            label="Cost price (USD)"
            value={form.costPrice}
            onChange={(v) => set('costPrice', v)}
            type="number"
            hint="What we paid. Without it, margin is guesswork"
          />
        </div>
      </div>

      {/* Provenance and photos */}
      <div className="mt-5 border-t border-line pt-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <F label="Origin" value={form.originCountry} onChange={(v) => set('originCountry', v)} />
          <F label="Treatment" value={form.treatment} onChange={(v) => set('treatment', v)} placeholder="None" />
          <div>
            <label htmlFor="shipsFrom" className="label mb-1.5 block">Ships from</label>
            <select id="shipsFrom" value={form.shipsFrom} onChange={(e) => set('shipsFrom', e.target.value)} className="field">
              <option value="PK">Pakistan</option>
              <option value="TH">Thailand</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <F
              label="Photo folder (Google Drive link)"
              value={form.mediaFolder}
              onChange={(v) => set('mediaFolder', v)}
              placeholder="https://drive.google.com/drive/folders/…"
            />
          </div>
          <F label="Notes" value={form.intakeNotes} onChange={(v) => set('intakeNotes', v)} />
        </div>
      </div>

      {/* Channels */}
      <div className="mt-5 border-t border-line pt-5">
        <span className="label mb-1 block">Where is it listed?</span>
        <p className="mb-3 text-xs text-subtle">
          Leave everything as not listed if the stone is only being logged for now.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {channels.map((c) => (
            <div key={c.value} className="flex items-center gap-2 rounded-lg border border-line p-2">
              <span className="w-32 shrink-0 text-sm text-muted">{c.label}</span>
              <select
                value={channelState[c.value]?.status ?? 'not_listed'}
                onChange={(e) =>
                  setChannelState((s) => ({
                    ...s,
                    [c.value]: { ...s[c.value], status: e.target.value },
                  }))
                }
                className="field py-1 text-xs"
                aria-label={`${c.label} status`}
              >
                <option value="not_listed">Not listed</option>
                <option value="draft">Draft</option>
                <option value="listed">Listed</option>
                <option value="sold">Sold</option>
                <option value="ended">Ended</option>
              </select>
              {channelState[c.value]?.status !== 'not_listed' && (
                <input
                  value={channelState[c.value]?.listingUrl ?? ''}
                  onChange={(e) =>
                    setChannelState((s) => ({
                      ...s,
                      [c.value]: { ...s[c.value], listingUrl: e.target.value },
                    }))
                  }
                  placeholder="Listing URL"
                  className="field py-1 text-xs"
                  aria-label={`${c.label} listing URL`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">
          {error}
        </p>
      )}
      {created && !error && (
        <p className="mt-4 rounded-lg border border-brand-ring bg-brand-tint p-3 text-sm text-brand-deep">
          Saved as {created}. The form is ready for the next stone.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-40">
          {busy ? 'Saving…' : 'Save stone'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-ghost">Close</button>
      </div>
    </div>
  );
}

function F({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <div>
      <label htmlFor={id} className="label mb-1.5 block">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field"
      />
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}
