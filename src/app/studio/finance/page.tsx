import Link from 'next/link';
import { FinanceAnalyst } from '@/components/FinanceAnalyst';
import { inventorySummary, bySpecies, pricingFlags, economics, landedCost } from '@/lib/finance';
import { allProducts, getSpecies } from '@/lib/catalog';
import { money } from '@/lib/seo';

export default function FinancePage() {
  const summary = inventorySummary();
  const species = bySpecies();
  const flags = pricingFlags();

  const median = [...allProducts()].sort((a, b) => a.priceUsd - b.priceUsd)[
    Math.floor(allProducts().length / 2)
  ];
  const etsy = economics(median, 'etsy');
  const direct = economics(median, 'direct');

  return (
    <div className="space-y-12">
      {/* Headline */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Retail value" value={money(summary.retailValue)} sub={`${summary.units} pieces`} />
          <Stat label="Est. cost basis" value={money(summary.costValue)} sub="42% assumed" />
          <Stat label="Gross margin" value={`${summary.grossMarginPct}%`} sub={money(summary.grossMargin)} />
          <Stat
            label="Direct vs Etsy"
            value={`+${money(summary.feeSavings)}`}
            sub={`${summary.feeSavingsPct}% more net`}
            accent
          />
        </div>
      </section>

      {/* Channel economics — the case for leaving Etsy */}
      <section>
        <h2 className="font-display text-xl">Where the money goes on one sale</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">
          Modelled on {median.title} at {money(median.priceUsd)} — the median-priced stone in
          the catalogue.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[etsy, direct].map((e) => (
            <div key={e.channel} className="card p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg">{e.label}</h3>
                <span className={`font-display text-2xl ${e.channel === 'direct' ? 'text-brand' : 'text-brand'}`}>
                  {money(e.net)}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted">net of fees, before cost of goods</div>

              <dl className="mt-5 space-y-2 text-sm">
                <Row k="Sale price" v={money(e.price)} />
                {e.feeBreakdown.map((b) => (
                  <Row key={b.name} k={b.name} v={`−${money(b.amount)}`} dim />
                ))}
                <div className="border-t border-line pt-2">
                  <Row k="Total fees" v={`−${money(e.fees)}`} />
                </div>
                <Row k="Est. cost of goods" v={`−${money(e.cost)}`} dim />
                <div className="border-t border-line pt-2">
                  <Row k="Profit" v={money(e.profit)} strong />
                  <Row k="Margin" v={`${e.marginPct}%`} dim />
                </div>
              </dl>
            </div>
          ))}
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
          Across the whole shelf the difference is{' '}
          <span className="text-brand">{money(summary.feeSavings)}</span> — roughly the
          margin on {Math.round(summary.feeSavings / (summary.grossMargin / summary.units))} additional
          stones, earned without cutting a single new one. Etsy&rsquo;s fees buy discovery, so the
          honest way to read this number is as the marketing budget the direct store has to
          replace, not as free money.
        </p>
      </section>

      {/* By species */}
      <section>
        <h2 className="font-display text-xl">Margin by species</h2>
        <div className="card mt-5 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b border-line text-left">
              <tr className="text-muted">
                <th className="p-4 font-normal">Species</th>
                <th className="p-4 text-right font-normal">Units</th>
                <th className="p-4 text-right font-normal">Retail</th>
                <th className="p-4 text-right font-normal">Est. cost</th>
                <th className="p-4 text-right font-normal">Profit</th>
                <th className="p-4 text-right font-normal">Avg price</th>
                <th className="p-4 text-right font-normal">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {species.map((s) => (
                <tr key={s.species}>
                  <td className="p-4">
                    <Link href={`/collections/${s.species}`} className="capitalize hover:text-brand-dark">
                      {getSpecies(s.species)?.name ?? s.species}
                    </Link>
                  </td>
                  <td className="p-4 text-right text-muted">{s.units}</td>
                  <td className="p-4 text-right">{money(s.retailValue)}</td>
                  <td className="p-4 text-right text-muted">{money(s.costValue)}</td>
                  <td className="p-4 text-right text-brand">{money(s.profit)}</td>
                  <td className="p-4 text-right text-muted">{money(s.avgPrice)}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-muted">{s.shareOfInventory}%</span>
                      <span className="h-1 w-14 rounded bg-canvas">
                        <span
                          className="block h-1 rounded bg-brand/70"
                          style={{ width: `${s.shareOfInventory}%` }}
                        />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Repricing */}
      <section>
        <h2 className="font-display text-xl">Repricing candidates</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">
          Compared on price per carat against other stones of the same species and form.
          A flag is a prompt to look at the stone, not an instruction — a genuinely better
          stone should price above its peers.
        </p>

        <div className="mt-5 space-y-3">
          {flags.slice(0, 10).map((f) => (
            <div key={f.product.slug} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/gem/${f.product.slug}`} className="font-display text-base hover:text-brand-dark">
                    {f.product.title}
                  </Link>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.rationale}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="label">{f.direction}</div>
                  <div className={`font-display text-xl ${f.direction === 'underpriced' ? 'text-brand' : 'text-accent'}`}>
                    {f.deltaPct > 0 ? '+' : ''}{f.deltaPct}%
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {money(f.product.priceUsd)} → {money(f.suggestedPrice)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Landed cost */}
      <section>
        <h2 className="font-display text-xl">Landed cost for buyers</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">
          What a customer actually pays on that same {money(median.priceUsd)} stone. Worth
          quoting up front — surprise import VAT is a common cause of refused deliveries.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(['EU', 'US', 'UK', 'OTHER'] as const).map((dest) => {
            const l = landedCost(median.priceUsd, dest);
            return (
              <div key={dest} className="card p-5">
                <div className="label">{dest === 'OTHER' ? 'Rest of world' : dest}</div>
                <div className="mt-2 font-display text-2xl text-brand">{money(l.total)}</div>
                <dl className="mt-3 space-y-1 text-xs text-muted">
                  <Row k="Stone" v={money(l.price)} dim small />
                  <Row k="Shipping" v={money(l.shipping)} dim small />
                  {l.duty > 0 && <Row k="Duty" v={money(l.duty)} dim small />}
                  {l.vat > 0 && <Row k="Import VAT" v={money(l.vat)} dim small />}
                </dl>
                <p className="mt-3 text-[11px] leading-relaxed text-muted/60">{l.note}</p>
              </div>
            );
          })}
        </div>
      </section>

      <FinanceAnalyst />
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

function Row({
  k, v, dim = false, strong = false, small = false,
}: { k: string; v: string; dim?: boolean; strong?: boolean; small?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${small ? 'text-xs' : ''}`}>
      <span className={dim ? 'text-muted' : 'text-muted'}>{k}</span>
      <span className={strong ? 'font-display text-base text-fg' : dim ? 'text-muted' : 'text-fg'}>
        {v}
      </span>
    </div>
  );
}
