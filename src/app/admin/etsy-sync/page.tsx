import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { requireRole } from '@/lib/auth/guard';
import { allProductsIncludingSold } from '@/lib/catalog';
import { getSettings } from '@/lib/settings';
import { SoldDisplaySetting } from '@/components/admin/SoldDisplaySetting';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

interface SyncResult {
  status: 'ok' | 'partial' | 'blocked' | 'empty_read';
  ranAt: string;
  fetchedPages: number;
  liveCount: number;
  applied?: boolean;
  sold: { etsyId: string; slug: string; title: string; priceUsd: number }[];
}

/**
 * Etsy sync status. While stock is dual-listed, a stone sold on Etsy must stop
 * being sellable here. The sync itself runs as a script (see runbook below) so
 * it can also be scheduled with cron/Task Scheduler; this page shows the last
 * run and what it found.
 */
export default async function EtsySyncPage() {
  await requireRole('admin', '/admin/etsy-sync');

  let last: SyncResult | null = null;
  try {
    last = JSON.parse(
      await readFile(join(process.cwd(), config.paths.var, 'etsy-sync.json'), 'utf8'),
    ) as SyncResult;
  } catch {
    last = null;
  }

  const all = allProductsIncludingSold();
  const inStock = all.filter((p) => p.stock > 0).length;
  const soldOut = all.length - inStock;
  const settings = getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Etsy sync</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Compares the live Etsy shop against this catalogue. A listing that has
          disappeared from Etsy is presumed sold and marked out of stock here, so a
          one-of-a-kind stone can never be sold twice.
        </p>
      </div>

      <SoldDisplaySetting current={settings.soldDisplayDays} />

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="In stock here" value={String(inStock)} />
        <Stat label="Marked sold" value={String(soldOut)} />
        <Stat
          label="Last sync"
          value={last ? new Date(last.ranAt).toLocaleString('en-GB') : 'never'}
        />
      </section>

      {last ? (
        <section className="card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`chip ${
                last.status === 'ok'
                  ? 'chip-brand'
                  : 'border-accent/40 text-accent-dark'
              }`}
            >
              {last.status === 'ok'
                ? 'Complete read'
                : last.status === 'blocked'
                ? 'Blocked by Etsy'
                : last.status}
            </span>
            <span className="text-sm text-muted">
              {last.liveCount} live on Etsy · {last.sold.length} presumed sold
              {last.applied ? ' · applied to catalogue' : ''}
            </span>
          </div>

          {last.sold.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-sm">
              {last.sold.map((s) => (
                <li key={s.etsyId} className="flex justify-between gap-4">
                  <span className="truncate text-fg">{s.title}</span>
                  <span className="shrink-0 text-muted">${s.priceUsd.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p className="card p-5 text-sm text-muted">No sync has been run yet.</p>
      )}

      <section className="card p-5">
        <h2 className="font-display text-base">Runbook</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-muted">Check without changing anything</dt>
            <dd className="mt-0.5"><code className="rounded bg-surface-2 px-2 py-1 text-xs text-brand-dark">npm run etsy:sync</code></dd>
          </div>
          <div>
            <dt className="text-muted">Check and mark sold stock</dt>
            <dd className="mt-0.5"><code className="rounded bg-surface-2 px-2 py-1 text-xs text-brand-dark">npm run etsy:sync -- --apply</code></dd>
          </div>
          <div>
            <dt className="text-muted">If Etsy blocks the fetch (403)</dt>
            <dd className="mt-0.5 leading-relaxed text-muted">
              Open the shop in a browser, save the five pages, then{' '}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-brand-dark">
                npm run etsy:sync -- --from-files page1.html … --apply
              </code>
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted">
          Safety rails: a partial or empty read never marks anything sold; --apply only
          acts on a complete read. Schedule the dry run daily with Task Scheduler and
          review here before applying. This whole tool retires once orders flow through
          the platform and Etsy becomes the secondary channel.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="label">{label}</div>
      <div className="mt-2 font-display text-2xl text-brand">{value}</div>
    </div>
  );
}
