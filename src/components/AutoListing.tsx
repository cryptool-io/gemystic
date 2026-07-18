'use client';

import { useState } from 'react';
import type { DraftListing } from '@/app/api/autolist/route';

const EXAMPLE =
  '1.15 ct emerald cut, Swat rough I bought last month. Cool bluish green, ' +
  'good saturation, one small inclusion at the girdle you need a loupe for. ' +
  'Cut in-house last week. Not oiled.';

export function AutoListing({ species }: { species: { key: string; name: string }[] }) {
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [speciesHint, setSpeciesHint] = useState('');
  const [draft, setDraft] = useState<DraftListing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    setDraft(null);
    try {
      const res = await fetch('/api/autolist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          notes: notes.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          speciesHint: speciesHint || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setDraft(data.draft);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
      {/* Input */}
      <div className="card h-fit p-6">
        <h2 className="font-display text-xl">Draft a listing</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Notes, a photo, or both. The draft is priced against comparable stones already
          in this catalogue, not against a generic market rate.
        </p>

        <label className="label mt-6 block">Cutter&rsquo;s notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={7}
          placeholder={EXAMPLE}
          className="mt-2 w-full rounded-lg border border-line bg-canvas p-3 text-sm leading-relaxed outline-none placeholder:text-muted/40 focus:border-brand/60"
        />
        <button
          onClick={() => setNotes(EXAMPLE)}
          className="mt-1.5 text-xs text-muted underline hover:text-brand-dark"
        >
          Use the example
        </button>

        <label className="label mt-5 block">Photo URL (optional)</label>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
          className="mt-2 w-full rounded-lg border border-line bg-canvas p-2.5 text-sm outline-none placeholder:text-muted/40 focus:border-brand/60"
        />
        <p className="mt-1.5 text-xs text-muted/60">
          The model reads the photograph for colour, cut and clarity, and flags anything
          it inferred rather than knew.
        </p>

        <label className="label mt-5 block">Species (optional)</label>
        <select
          value={speciesHint}
          onChange={(e) => setSpeciesHint(e.target.value)}
          className="field mt-2"
        >
          <option value="">Let the model identify it</option>
          {species.map((s) => (
            <option key={s.key} value={s.key}>{s.name}</option>
          ))}
        </select>

        <button
          onClick={generate}
          disabled={busy || (!notes.trim() && !imageUrl.trim())}
          className="btn-primary mt-6 w-full disabled:opacity-40"
        >
          {busy ? 'Drafting…' : 'Generate listing'}
        </button>

        {error && (
          <p className="mt-4 rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">
            {error}
          </p>
        )}
      </div>

      {/* Output */}
      <div>
        {!draft && !busy && (
          <div className="card flex h-full min-h-80 items-center justify-center p-10 text-center">
            <div>
              <div className="font-display text-2xl text-brand">◆</div>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                The generated listing appears here, title, description, meta tags, Etsy tags
                and a priced recommendation with its reasoning.
              </p>
            </div>
          </div>
        )}

        {busy && (
          <div className="card p-10 text-center text-sm text-muted">
            Reading the stone and checking comparable prices…
          </div>
        )}

        {draft && (
          <div className="space-y-4">
            {draft.warnings?.length > 0 && (
              <div className="card border-accent/40 bg-accent-tint p-5">
                <h3 className="font-display text-base text-accent-dark">Check before publishing</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-muted">
                  {draft.warnings.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-brand">·</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="label">Title</div>
                  <h2 className="mt-1.5 font-display text-2xl leading-snug">{draft.title}</h2>
                </div>
                <button onClick={() => copy('title', draft.title)} className="btn-ghost shrink-0 text-xs">
                  {copied === 'title' ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="chip">{draft.species}</span>
                {draft.variety && <span className="chip">{draft.variety}</span>}
                {draft.caratWeight && <span className="chip">{draft.caratWeight} ct</span>}
                {draft.cut && <span className="chip">{draft.cut}</span>}
                <span className="chip">{draft.colour}</span>
                <span className="chip">{draft.form}</span>
                <span
                  className={`chip ${
                    draft.confidence === 'high'
                      ? 'border-brand-ring/60 text-brand'
                      : draft.confidence === 'low'
                      ? 'border-brand/60 text-brand-dark'
                      : ''
                  }`}
                >
                  {draft.confidence} confidence
                </span>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-baseline justify-between">
                <div className="label">Suggested price</div>
                <div className="font-display text-3xl text-brand">
                  ${draft.suggestedPriceUsd?.toFixed(2)}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{draft.priceRationale}</p>
            </div>

            <Block
              title="Description"
              onCopy={() => copy('desc', draft.description)}
              copied={copied === 'desc'}
            >
              <div className="space-y-3 text-sm leading-relaxed text-muted">
                {draft.description.split('\n').filter(Boolean).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              {draft.bulletPoints?.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm text-muted">
                  {draft.bulletPoints.map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-brand">·</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>

            <Block title="Search metadata">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="label">Meta title ({draft.metaTitle?.length} chars)</dt>
                  <dd className="mt-1 text-fg">{draft.metaTitle}</dd>
                </div>
                <div>
                  <dt className="label">Meta description ({draft.metaDescription?.length} chars)</dt>
                  <dd className="mt-1 text-muted">{draft.metaDescription}</dd>
                </div>
                <div>
                  <dt className="label">Keywords</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {draft.keywords?.map((k) => <span key={k} className="chip">{k}</span>)}
                  </dd>
                </div>
              </dl>
            </Block>

            <Block
              title={`Etsy tags (${draft.etsyTags?.length}/13)`}
              onCopy={() => copy('tags', draft.etsyTags.join(', '))}
              copied={copied === 'tags'}
            >
              <div className="flex flex-wrap gap-1.5">
                {draft.etsyTags?.map((t) => (
                  <span key={t} className="chip border-brand-ring/40 text-brand">{t}</span>
                ))}
              </div>
            </Block>
          </div>
        )}
      </div>
    </div>
  );
}

function Block({
  title, children, onCopy, copied,
}: {
  title: string;
  children: React.ReactNode;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base">{title}</h3>
        {onCopy && (
          <button onClick={onCopy} className="btn-ghost text-xs">
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
