import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { JsonLd } from '@/components/JsonLd';
import { queryProducts, facets, stockedSpecies } from '@/lib/catalog';
import { itemListJsonLd } from '@/lib/seo';
import { FilterPanel } from '@/components/FilterPanel';

export const metadata: Metadata = {
  title: 'Shop All Natural Gemstones',
  description:
    'Browse every natural gemstone in stock — loose faceted stones, mineral specimens, rough crystals and handmade silver jewellery, hand-cut in Peshawar, Pakistan.',
  alternates: { canonical: '/shop' },
};

type SearchParams = Promise<Record<string, string | undefined>>;

const SORTS = [
  ['featured', 'Featured'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['carat-desc', 'Largest carat'],
] as const;

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  const query = {
    species: sp.species,
    form: sp.form,
    color: sp.color,
    category: sp.category,
    gender: sp.gender,
    search: sp.q,
    minPrice: sp.min ? Number(sp.min) : undefined,
    maxPrice: sp.max ? Number(sp.max) : undefined,
    sort: (sp.sort as 'featured' | 'price-asc' | 'price-desc' | 'carat-desc') ?? 'featured',
  };

  const results = queryProducts(query);
  const f = facets();
  const species = stockedSpecies();

  const active = Object.entries({
    species: sp.species,
    form: sp.form,
    color: sp.color,
    gender: sp.gender,
    q: sp.q,
  }).filter(([, v]) => v);

  /** Preserves the other filters when toggling one of them. */
  const withParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== key) next.set(k, v);
    if (value) next.set(key, value);
    const qs = next.toString();
    return `/shop${qs ? `?${qs}` : ''}`;
  };

  return (
    <>
      <JsonLd data={itemListJsonLd(results, 'Gemystic gemstone catalogue', '/shop')} />

      <div className="wrap">
        <header className="mb-8">
          <h1 className="font-display text-3xl">
            {sp.q ? `Results for “${sp.q}”` : 'All gemstones'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {results.length} {results.length === 1 ? 'stone' : 'stones'} · every piece unique and
            photographed as received
          </p>

          {active.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {active.map(([k, v]) => (
                <Link key={k} href={withParam(k, undefined)} className="chip hover:border-brand/60">
                  {v} ×
                </Link>
              ))}
              <Link href="/shop" className="text-xs text-muted underline hover:text-brand-dark">
                Clear all
              </Link>
            </div>
          )}
        </header>

        <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
          {/* Filters — collapsed behind a toggle on phones, sidebar on desktop */}
          <FilterPanel activeCount={active.length}>
            <FilterGroup title="Stone">
              {species.map((s) => (
                <FilterLink
                  key={s.key}
                  href={withParam('species', sp.species === s.key ? undefined : s.key)}
                  active={sp.species === s.key}
                  label={s.species.name}
                  count={s.count}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Type">
              {Object.entries(f.form).map(([form, n]) => (
                <FilterLink
                  key={form}
                  href={withParam('form', sp.form === form ? undefined : form)}
                  active={sp.form === form}
                  label={form}
                  count={n}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Colour">
              {Object.entries(f.color).map(([colour, n]) => (
                <FilterLink
                  key={colour}
                  href={withParam('color', sp.color === colour ? undefined : colour)}
                  active={sp.color === colour}
                  label={colour}
                  count={n}
                />
              ))}
            </FilterGroup>
          </FilterPanel>

          {/* Results */}
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              {SORTS.map(([value, label]) => (
                <Link
                  key={value}
                  href={withParam('sort', value)}
                  className={`chip transition ${
                    (sp.sort ?? 'featured') === value
                      ? 'border-brand/60 text-brand-dark'
                      : 'hover:border-brand/40'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            {results.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="font-display text-lg">Nothing matches those filters</p>
                <p className="mt-2 text-sm text-muted">
                  Every stone is one of a kind, so the catalogue is narrower than a mass
                  retailer&rsquo;s. Try loosening a filter — or ask the assistant and it will
                  find the nearest thing we have.
                </p>
                <Link href="/shop" className="btn-ghost mt-5">Reset filters</Link>
              </div>
            ) : (
              <div className="grid-products">
                {results.map((p, i) => (
                  <ProductCard key={p.slug} p={p} priority={i < 3} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-3">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function FilterLink({
  href, active, label, count,
}: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between text-sm capitalize transition ${
        active ? 'text-brand' : 'text-muted hover:text-brand-dark'
      }`}
    >
      <span>{label}</span>
      <span className="text-xs text-muted/50">{count}</span>
    </Link>
  );
}
