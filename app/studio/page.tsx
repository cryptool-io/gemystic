import Link from 'next/link';
import { allProducts, stockedSpecies, priceStats, facets, GENERATED_AT } from '@/lib/catalog';
import { inventorySummary, pricingFlags } from '@/lib/finance';
import { money } from '@/lib/seo';
import { hasApiKey } from '@/lib/ai';

export default function StudioOverview() {
  const products = allProducts();
  const species = stockedSpecies();
  const stats = priceStats();
  const summary = inventorySummary();
  const flags = pricingFlags();
  const f = facets();
  const aiReady = hasApiKey();

  return (
    <div className="space-y-10">
      {!aiReady && (
        <div className="card border-accent/40 bg-accent-tint p-5">
          <h2 className="font-display text-lg text-accent-dark">AI features are not configured</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Add <code className="rounded-sm bg-canvas px-1.5 py-0.5 text-brand-dark">ANTHROPIC_API_KEY</code> to{' '}
            <code className="rounded-sm bg-canvas px-1.5 py-0.5 text-brand-dark">.env.local</code> and restart
            the dev server to switch on the customer assistant, auto-listing and the written
            financial analysis. Everything else, the storefront, the catalogue, and every figure
            on this page, is computed locally and works without it.
          </p>
        </div>
      )}

      <section>
        <h2 className="mb-4 font-display text-xl">Inventory</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Live listings" value={String(products.length)} sub={`${species.length} species`} />
          <Stat label="Retail value" value={money(summary.retailValue)} sub={`avg ${money(stats.avg)}`} />
          <Stat label="Est. gross margin" value={`${summary.grossMarginPct}%`} sub={money(summary.grossMargin)} />
          <Stat
            label="Fees saved off Etsy"
            value={money(summary.feeSavings)}
            sub="if the whole shelf sold direct"
            accent
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">Pricing outliers</h2>
            <Link href="/studio/finance" className="text-sm text-brand hover:text-brand-dark">
              Full analysis →
            </Link>
          </div>
          <p className="mt-1 text-sm text-muted">
            Stones priced more than 35% away from the per-carat median of comparable stock
            in the same species and form.
          </p>

          {flags.length === 0 ? (
            <p className="mt-5 text-sm text-muted">Nothing is out of line right now.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {flags.slice(0, 6).map((fl) => (
                <li key={fl.product.slug} className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0">
                  <div className="min-w-0">
                    <Link href={`/gem/${fl.product.slug}`} className="block truncate text-sm text-fg hover:text-brand-dark">
                      {fl.product.title}
                    </Link>
                    <div className="mt-0.5 text-xs text-muted">
                      {money(fl.actualPerCarat)}/ct vs {money(fl.peerMedianPerCarat)}/ct median
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`text-sm ${fl.direction === 'underpriced' ? 'text-brand' : 'text-accent'}`}>
                      {fl.deltaPct > 0 ? '+' : ''}{fl.deltaPct}%
                    </div>
                    <div className="text-xs text-muted">→ {money(fl.suggestedPrice)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg">Catalogue mix</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            {Object.entries(f.form).map(([form, n]) => (
              <div key={form}>
                <div className="flex justify-between">
                  <dt className="capitalize text-muted">{form}</dt>
                  <dd className="text-fg">{n}</dd>
                </div>
                <div className="mt-1 h-1 rounded-sm bg-canvas">
                  <div
                    className="h-1 rounded-sm bg-brand/70"
                    style={{ width: `${(n / products.length) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/studio/listings" className="card p-6 transition hover:border-brand/50">
          <h2 className="font-display text-lg text-brand">Auto-listing</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Photograph a stone, add a line of notes, and get a full listing back, title,
            description, SEO metadata, 13 Etsy tags and a price anchored to what comparable
            stock in this shop actually sells for.
          </p>
        </Link>

        <Link href="/studio/finance" className="card p-6 transition hover:border-brand/50">
          <h2 className="font-display text-lg text-brand">Finance</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Margin by species, Etsy-versus-direct channel economics, repricing candidates,
            and an analyst you can ask questions in plain English.
          </p>
        </Link>
      </section>

      <p className="text-xs text-muted/60">
        Catalogue last normalised {new Date(GENERATED_AT).toLocaleString('en-GB')} ·
        re-run <code className="text-brand-dark">npm run normalize</code> after editing source data.
      </p>
    </div>
  );
}

function Stat({
  label, value, sub, accent = false,
}: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="card p-5">
      <div className="label">{label}</div>
      <div className={`mt-2 font-display text-2xl ${accent ? 'text-brand' : 'text-fg'}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
