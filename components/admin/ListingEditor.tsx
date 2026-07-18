'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ListingOverride } from '@/lib/listings/overrides';

interface Generated {
  title: string;
  description: string;
  priceUsd: number;
  treatment: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
}

/**
 * Listing editor. Every field shows the generated value as its placeholder, so
 * an empty box means "keep what the catalogue produced" and a filled box means
 * "the owner decided this". Clearing a field reverts to generated rather than
 * blanking the listing, which is what makes editing safe on a catalogue that
 * gets regenerated.
 */
export function ListingEditor({
  slug,
  generated,
  override,
  aiEnabled,
}: {
  slug: string;
  generated: Generated;
  override: ListingOverride | null;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: override?.title ?? '',
    description: override?.description ?? '',
    priceUsd: override?.priceUsd != null ? String(override.priceUsd) : '',
    compareAtUsd: override?.compareAtUsd != null ? String(override.compareAtUsd) : '',
    treatment: override?.treatment ?? '',
    seoTitle: override?.seoTitle ?? '',
    seoDescription: override?.seoDescription ?? '',
    seoKeywords: (override?.seoKeywords ?? []).join(', '),
    etsyTags: (override?.etsyTags ?? []).join(', '),
    listedOnEtsy: override?.listedOnEtsy ?? false,
    etsyListingId: override?.etsyListingId ?? '',
    status: override?.status ?? 'active',
  });
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Live read-back of the discount, so the owner sees the result before saving.
  const nowPrice = Number(form.priceUsd) || generated.priceUsd;
  const wasPrice = Number(form.compareAtUsd) || 0;
  const discountPct =
    wasPrice > nowPrice ? Math.round(((wasPrice - nowPrice) / wasPrice) * 100) : null;
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const currentWas = fmt(wasPrice);
  const currentNow = fmt(nowPrice);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/listings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug,
          ...form,
          priceUsd: form.priceUsd ? Number(form.priceUsd) : null,
          compareAtUsd: form.compareAtUsd ? Number(form.compareAtUsd) : null,
          seoKeywords: splitList(form.seoKeywords),
          etsyTags: splitList(form.etsyTags),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Could not save.');
      } else {
        setMessage('Saved. The storefront updates within the hour, or immediately on rebuild.');
        router.refresh();
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setAiBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/listings/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Generation failed.');
      } else {
        setForm((f) => ({
          ...f,
          title: data.title ?? f.title,
          description: data.description ?? f.description,
          seoTitle: data.seoTitle ?? f.seoTitle,
          seoDescription: data.seoDescription ?? f.seoDescription,
          seoKeywords: (data.seoKeywords ?? []).join(', '),
          etsyTags: (data.etsyTags ?? []).join(', '),
        }));
        setMessage('Draft generated. Review every line, then save.');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg">Listing content</h2>
          <button
            onClick={generate}
            disabled={aiBusy || !aiEnabled}
            title={aiEnabled ? undefined : 'Set an AI provider key to enable generation'}
            className="btn-ghost text-xs disabled:opacity-40"
          >
            {aiBusy ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <Field
            label="Title"
            value={form.title}
            onChange={(v) => set('title', v)}
            placeholder={generated.title}
          />
          <Field
            label="Description"
            value={form.description}
            onChange={(v) => set('description', v)}
            placeholder={generated.description.slice(0, 160)}
            textarea
            rows={6}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Price (USD)"
              value={form.priceUsd}
              onChange={(v) => set('priceUsd', v)}
              placeholder={String(generated.priceUsd)}
              type="number"
            />
            <Field
              label="Treatment"
              value={form.treatment}
              onChange={(v) => set('treatment', v)}
              placeholder={generated.treatment}
            />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg">Discount</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Set what this stone used to cost. The shop then shows the old price struck through next
          to the new one. Leave it empty to sell at full price. A shop-wide discount code never
          stacks on top of this: whichever gives the buyer the lower price is the one that applies.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Was (USD, before discount)"
            value={form.compareAtUsd}
            onChange={(v) => set('compareAtUsd', v)}
            placeholder="e.g. 800"
            type="number"
          />
          <div>
            <span className="label mb-1.5 block">Or take a percentage off</span>
            <div className="flex flex-wrap gap-2">
              {[10, 15, 20, 25, 30, 40].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    // The current price becomes the "was", and the new selling
                    // price is that figure less the percentage.
                    const was = Number(form.compareAtUsd) || Number(form.priceUsd) || generated.priceUsd;
                    const now = Math.round(was * (100 - pct)) / 100;
                    set('compareAtUsd', String(was));
                    set('priceUsd', String(now));
                  }}
                  className="chip hover:border-brand-ring"
                >
                  −{pct}%
                </button>
              ))}
              {(form.compareAtUsd || form.priceUsd) && (
                <button
                  type="button"
                  onClick={() => {
                    // Back to full price: restore the "was" and drop the sale.
                    if (form.compareAtUsd) set('priceUsd', form.compareAtUsd);
                    set('compareAtUsd', '');
                  }}
                  className="chip hover:border-brand-ring"
                >
                  Clear discount
                </button>
              )}
            </div>
          </div>
        </div>

        {discountPct !== null && (
          <p className="mt-3 rounded-lg border border-brand-ring bg-brand-tint p-3 text-sm text-brand-deep">
            On sale: {discountPct}% off, {currentWas} down to {currentNow}.
          </p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg">SEO for this stone</h2>
        <p className="mt-1 text-xs text-muted">
          Every stone carries its own meta title, description and keywords. Leave a field empty to
          use the generated one shown as the placeholder.
        </p>
        <div className="mt-4 space-y-4">
          <Field
            label="Meta title"
            value={form.seoTitle}
            onChange={(v) => set('seoTitle', v)}
            placeholder={generated.metaTitle}
            hint={`${form.seoTitle.length || generated.metaTitle.length} characters, aim for under 60`}
          />
          <Field
            label="Meta description"
            value={form.seoDescription}
            onChange={(v) => set('seoDescription', v)}
            placeholder={generated.metaDescription}
            textarea
            rows={3}
            hint={`${form.seoDescription.length || generated.metaDescription.length} characters, aim for 140 to 160`}
          />
          <Field
            label="Site keywords (comma separated)"
            value={form.seoKeywords}
            onChange={(v) => set('seoKeywords', v)}
            placeholder={generated.keywords.slice(0, 6).join(', ')}
          />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg">Channels</h2>
        <p className="mt-1 text-xs text-muted">
          This site always lists the stone. Etsy is opt-in per stone because each Etsy listing
          costs money, and Etsy uses its own tag vocabulary rather than site keywords.
        </p>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.listedOnEtsy}
              onChange={(e) => set('listedOnEtsy', e.target.checked)}
            />
            Also listed on Etsy
          </label>
          {form.listedOnEtsy && (
            <>
              <Field
                label="Etsy listing id"
                value={form.etsyListingId}
                onChange={(v) => set('etsyListingId', v)}
                placeholder="e.g. 1784563210"
              />
              <Field
                label="Etsy tags (13 max, comma separated)"
                value={form.etsyTags}
                onChange={(v) => set('etsyTags', v)}
                placeholder="natural emerald, swat emerald, loose gemstone…"
                hint={`${splitList(form.etsyTags).length} of 13 used`}
              />
            </>
          )}
          <div>
            <label htmlFor="status" className="label mb-1.5 block">Status</label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as typeof form.status)}
              className="field"
            >
              <option value="active">Active</option>
              <option value="draft">Draft (hidden from the shop)</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-brand-ring bg-brand-tint p-3 text-sm text-brand-deep">
          {message}
        </p>
      )}

      <div className="flex gap-3">
        <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-40">
          {busy ? 'Saving…' : 'Save listing'}
        </button>
        <a href={`/gem/${slug}`} target="_blank" rel="noreferrer" className="btn-ghost">
          View on site →
        </a>
      </div>
    </div>
  );
}

function splitList(v: string): string[] {
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea = false,
  rows = 3,
  type = 'text',
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
  type?: string;
  hint?: string;
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
          placeholder={placeholder}
          rows={rows}
          className="field"
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="field"
        />
      )}
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}
