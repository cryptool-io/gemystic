'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface RedirectRow {
  fromPath: string;
  toPath: string;
  statusCode: number;
  hits: number;
  note: string | null;
}

export interface SeoForm {
  titleTemplate: string;
  defaultDescription: string;
  googleSiteVerification: string;
  bingSiteVerification: string;
  indexNowKey: string;
  noindexEverything: boolean;
}

/**
 * Global SEO settings and the redirect map.
 *
 * The verification fields are the ones that actually unblock submission: with a
 * token saved, the site serves the meta tag Google and Bing look for, the
 * owner clicks verify, and the sitemap can be submitted. Without that step the
 * rest of the SEO work is invisible to search engines.
 */
export function SeoManager({
  settings,
  redirects,
  siteUrl,
}: {
  settings: SeoForm;
  redirects: RedirectRow[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function post(body: Record<string, unknown>, okMessage: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/seo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) setError(data.error ?? 'That did not work.');
      else {
        setMessage(okMessage);
        router.refresh();
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-display text-lg">Search engine verification</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Paste the token from Google Search Console and Bing Webmaster Tools (the
          &ldquo;HTML tag&rdquo; method, content value only). Save, then click verify in each tool
          and submit <code className="rounded-sm bg-surface-2 px-1 py-0.5">{siteUrl}/sitemap.xml</code>.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <F
            label="Google verification token"
            value={form.googleSiteVerification}
            onChange={(v) => setForm({ ...form, googleSiteVerification: v })}
          />
          <F
            label="Bing verification token"
            value={form.bingSiteVerification}
            onChange={(v) => setForm({ ...form, bingSiteVerification: v })}
          />
          <F
            label="IndexNow key (optional)"
            value={form.indexNowKey}
            onChange={(v) => setForm({ ...form, indexNowKey: v })}
            hint="Pings Bing the moment a listing changes"
          />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg">Global defaults</h2>
        <div className="mt-4 grid gap-4">
          <F
            label="Title template"
            value={form.titleTemplate}
            onChange={(v) => setForm({ ...form, titleTemplate: v })}
            hint="%s is replaced by each page's own title"
          />
          <F
            label="Fallback meta description"
            value={form.defaultDescription}
            onChange={(v) => setForm({ ...form, defaultDescription: v })}
            textarea
          />
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.noindexEverything}
              onChange={(e) => setForm({ ...form, noindexEverything: e.target.checked })}
              className="mt-1"
            />
            <span>
              Hide the whole site from search engines
              <span className="block text-xs text-muted">
                For staging only. Leave off on the live shop, it removes every page from Google.
              </span>
            </span>
          </label>
        </div>

        <button
          onClick={() => post({ action: 'settings', ...form }, 'Saved.')}
          disabled={busy}
          className="btn-primary mt-5 disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Save SEO settings'}
        </button>
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg">Redirects</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Old URLs that should land somewhere on this site. Paste a full old URL or just its path.
          This is how the WordPress addresses keep their traffic when the domain moves.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="/product-category/emeralds/"
            className="field"
          />
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="/shop?species=emerald"
            className="field"
          />
          <button
            onClick={() =>
              post({ action: 'add-redirect', fromPath: from, toPath: to }, 'Redirect saved.').then(
                () => {
                  setFrom('');
                  setTo('');
                },
              )
            }
            disabled={busy || !from || !to}
            className="btn-primary disabled:opacity-40"
          >
            Add
          </button>
        </div>

        {redirects.length > 0 && (
          <div className="scroll-x mt-4">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-line text-left text-muted">
                <tr>
                  <th className="p-2 font-normal">From</th>
                  <th className="p-2 font-normal">To</th>
                  <th className="p-2 text-right font-normal">Hits</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {redirects.map((r) => (
                  <tr key={r.fromPath}>
                    <td className="p-2 font-mono text-xs">{r.fromPath}</td>
                    <td className="p-2 font-mono text-xs text-muted">{r.toPath}</td>
                    <td className="p-2 text-right tabular-nums text-muted">{r.hits}</td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() =>
                          post({ action: 'delete-redirect', fromPath: r.fromPath }, 'Removed.')
                        }
                        disabled={busy}
                        className="text-xs text-muted hover:text-accent-dark disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
    </div>
  );
}

function F({
  label,
  value,
  onChange,
  hint,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  textarea?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <div>
      <label htmlFor={id} className="label mb-1.5 block">{label}</label>
      {textarea ? (
        <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="field" />
      ) : (
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field" />
      )}
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}
