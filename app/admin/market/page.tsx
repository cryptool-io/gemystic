import { requireRole } from '@/lib/auth/guard';
import { allProducts } from '@/lib/catalog';
import marketJson from '@/data/market-prices.json';

interface MarketEntry {
  key: string;
  variety: string | null;
  lowUsdPerCt: number;
  typicalUsdPerCt: number;
  highUsdPerCt: number;
  qualityNote: string;
  sources: string[];
}

interface MarketFile {
  generatedAt: string;
  methodology: string;
  disclaimer: string;
  entries: MarketEntry[];
}

const market = marketJson as unknown as MarketFile;

/**
 * Market price check: our asking prices against researched retail ranges.
 *
 * The ranges in data/market-prices.json are compiled by a research agent from
 * dealer sites and price guides (methodology below) and refreshed by re-running
 * that research, this page never invents a number. Comparison is per-carat on
 * faceted stones only; specimens and parcels price on other axes.
 */
export default async function MarketPage() {
  await requireRole('admin', '/admin/market');

  const faceted = allProducts().filter(
    (p) => p.caratWeight && p.caratWeight > 0 && ['faceted', 'cabochon'].includes(p.form),
  );

  const rows = market.entries
    .map((entry) => {
      // Variety entries match on variety, generic entries on species.
      const ours = faceted.filter((p) =>
        entry.variety ? p.variety === entry.variety : p.species === entry.key && !p.variety,
      );
      const rates = ours.map((p) => p.priceUsd / p.caratWeight!).sort((a, b) => a - b);
      const median = rates.length ? rates[Math.floor(rates.length / 2)] : null;

      let position: 'below' | 'within' | 'above' | null = null;
      if (median !== null) {
        position =
          median < entry.lowUsdPerCt ? 'below' : median > entry.highUsdPerCt ? 'above' : 'within';
      }

      return { entry, count: ours.length, median, min: rates[0] ?? null, max: rates.at(-1) ?? null, position };
    })
    .sort((a, b) => (b.count - a.count));

  const stocked = rows.filter((r) => r.count > 0);
  const unstocked = rows.filter((r) => r.count === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Market price check</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Our median asking price per carat against researched retail ranges. Data compiled{' '}
          {market.generatedAt} from dealer sites and price guides; refresh by re-running the
          research agent. {market.disclaimer}
        </p>
      </div>

      <div className="card scroll-x">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="p-3 font-normal">Stone</th>
              <th className="p-3 text-right font-normal">In stock</th>
              <th className="p-3 text-right font-normal">Our median $/ct</th>
              <th className="p-3 text-right font-normal">Market low</th>
              <th className="p-3 text-right font-normal">Typical</th>
              <th className="p-3 text-right font-normal">High</th>
              <th className="p-3 font-normal">Position</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {stocked.map(({ entry, count, median, position }) => (
              <tr key={`${entry.key}-${entry.variety}`}>
                <td className="p-3">
                  <div className="font-medium capitalize text-fg">
                    {entry.variety ?? entry.key}
                  </div>
                  <div className="max-w-[22rem] text-xs text-muted">{entry.qualityNote}</div>
                </td>
                <td className="p-3 text-right text-muted">{count}</td>
                <td className="p-3 text-right font-medium text-fg">${median!.toFixed(0)}</td>
                <td className="p-3 text-right text-muted">${entry.lowUsdPerCt}</td>
                <td className="p-3 text-right text-muted">${entry.typicalUsdPerCt}</td>
                <td className="p-3 text-right text-muted">${entry.highUsdPerCt}</td>
                <td className="p-3">
                  <span
                    className={`chip ${
                      position === 'within'
                        ? 'chip-brand'
                        : position === 'below'
                        ? 'border-brand-ring text-brand'
                        : 'border-accent/40 text-accent-dark'
                    }`}
                  >
                    {position === 'below'
                      ? 'below market'
                      : position === 'above'
                      ? 'above market'
                      : 'within range'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="card p-5 text-sm text-muted">
        <summary className="cursor-pointer font-medium text-fg">
          Methodology and reference ranges without matching stock ({unstocked.length})
        </summary>
        <p className="mt-3 leading-relaxed">{market.methodology}</p>
        <ul className="mt-3 space-y-1 text-xs">
          {unstocked.map(({ entry }) => (
            <li key={`${entry.key}-${entry.variety}`}>
              <span className="capitalize text-fg">{entry.variety ?? entry.key}</span>: $
              {entry.lowUsdPerCt}–${entry.highUsdPerCt}/ct (typical ${entry.typicalUsdPerCt})
            </li>
          ))}
        </ul>
      </details>

      <p className="text-xs text-muted">
        Reading it: <span className="text-brand">below market</span> can mean room to
        reprice upward, or honest pricing that undercuts to win trust, your call, stone by
        stone. <span className="text-accent-dark">Above market</span> needs the photo and
        the treatment story to justify it, or the stone will sit.
      </p>
    </div>
  );
}
