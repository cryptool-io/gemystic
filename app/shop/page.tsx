import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { JsonLd } from '@/components/JsonLd';
import { queryProducts, facets, stockedSpecies, allProducts, priceStats } from '@/lib/catalog';
import { allCategories, getCategory } from '@/lib/taxonomy';
import { itemListJsonLd } from '@/lib/seo';
import { FilterPanel } from '@/components/FilterPanel';
import { SortSelect } from '@/components/SortSelect';
import { RangeFilter } from '@/components/RangeFilter';

export const metadata: Metadata = {
  title: 'Shop All Natural Gemstones',
  description:
    'Browse every natural gemstone in stock, filter by stone, price, carat weight, colour, cut and origin. Hand-cut in Peshawar, Pakistan.',
  alternates: { canonical: '/shop' },
};

type SearchParams = Promise<Record<string, string | undefined>>;

const SORTS = [
  ['featured', 'Featured'],
  ['newest', 'Just listed'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['carat-desc', 'Largest carat'],
] as const;

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  const num = (v?: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

  const query = {
    species: sp.species,
    form: sp.form,
    color: sp.color,
    cut: sp.cut,
    origin: sp.origin,
    category: sp.category,
    gender: sp.gender,
    search: sp.q,
    minPrice: num(sp.min),
    maxPrice: num(sp.max),
    minCarat: num(sp.minct),
    maxCarat: num(sp.maxct),
    sort: (sp.sort as 'featured' | 'price-asc' | 'price-desc' | 'carat-desc' | 'newest') ?? 'featured',
  };

  const results = queryProducts(query);
  const f = facets();
  const species = stockedSpecies();

  // Origin facet computed from live stock (not precomputed in the catalogue).
  const originCounts = new Map<string, number>();
  for (const p of allProducts()) {
    const key = p.origin.split(',')[0];
    originCounts.set(key, (originCounts.get(key) ?? 0) + 1);
  }

  const categories = await allCategories();
  const activeCategory = sp.category ? await getCategory(sp.category) : undefined;
  const activeSpecies = sp.species
    ? species.find((s) => s.key === sp.species)?.species.name
    : undefined;

  // Category counts from live stock, so an empty category is never offered.
  const categoryCounts = new Map<string, number>();
  for (const p of allProducts()) {
    categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + 1);
  }

  // A slider left at its end stop is not a filter: the range form always posts
  // both handles, so bound-equal values must not become chips.
  const priceBound = { min: Math.floor(priceStats().min), max: Math.ceil(priceStats().max) };
  const caratBound = { min: 0, max: Math.ceil(Math.max(...allProducts().map((p) => p.caratWeight ?? 0), 1)) };
  const narrowed = (raw: string | undefined, endStop: number) =>
    raw && num(raw) !== endStop ? raw : undefined;

  const active = Object.entries({
    // Category first: it is usually how the visitor arrived (nav menu), and
    // without a chip here a filtered page is indistinguishable from /shop.
    category: activeCategory?.name,
    species: activeSpecies,
    form: sp.form,
    color: sp.color,
    cut: sp.cut,
    origin: sp.origin,
    q: sp.q,
    min: narrowed(sp.min, priceBound.min) && `min $${sp.min}`,
    max: narrowed(sp.max, priceBound.max) && `max $${sp.max}`,
    minct: narrowed(sp.minct, caratBound.min) && `min ${sp.minct}ct`,
    maxct: narrowed(sp.maxct, caratBound.max) && `max ${sp.maxct}ct`,
  }).filter(([, v]) => v) as [string, string][];

  // The heading names what is actually on screen, so arriving from a category
  // menu never reads as the unfiltered catalogue.
  const heading = sp.q
    ? `Results for “${sp.q}”`
    : activeSpecies && activeCategory
      ? `${activeSpecies} · ${activeCategory.name}`
      : (activeSpecies ?? activeCategory?.name ?? 'All gemstones');

  const stats = priceBound;
  const caratMax = caratBound.max;

  /** Preserves the other filters when toggling one of them. */
  const withParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== key) next.set(k, v);
    if (value) next.set(key, value);
    const qs = next.toString();
    return `/shop${qs ? `?${qs}` : ''}`;
  };

  /** Hidden inputs that keep the current filters when the range form submits. */
  const carried = Object.entries(sp).filter(
    ([k, v]) => v && !['min', 'max', 'minct', 'maxct'].includes(k),
  ) as [string, string][];

  return (
    <>
      <JsonLd data={itemListJsonLd(results, 'Gemystic gemstone catalogue', '/shop')} />

      <div className="wrap">
        {/* Compact header: on a phone this block is ~3 short rows, not half the
            screen, title+count share a line, chips appear only when filters are
            active, and sort lives inside the Filters row below lg. */}
        <header className="mb-4 sm:mb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 className="font-display text-2xl capitalize sm:text-3xl">{heading}</h1>
            <p className="text-xs text-muted sm:text-sm">
              {results.length} {results.length === 1 ? 'stone' : 'stones'}
            </p>
          </div>

          {active.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {active.map(([k, v]) => (
                <Link key={k} href={withParam(k, undefined)} className="chip hover:border-brand-ring">
                  {v} ×
                </Link>
              ))}
              <Link href="/shop" className="text-xs text-muted underline hover:text-brand-dark">
                Clear all
              </Link>
            </div>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-[230px_1fr] lg:gap-8">
          <FilterPanel
            activeCount={active.length}
            sortSlot={<SortSelect current={sp.sort ?? 'featured'} options={SORTS} />}
          >
            {/* Price and carat: dual sliders, submitted as one form so both
                ranges apply together. Number inputs stay for exact entry. */}
            <form action="/shop" method="get">
              {carried.map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <FilterGroup title="Price (USD)">
                <RangeFilter
                  minName="min"
                  maxName="max"
                  bound={stats}
                  value={{ min: num(sp.min), max: num(sp.max) }}
                  step={5}
                  prefix="$"
                />
              </FilterGroup>
              <FilterGroup title="Carat weight">
                <RangeFilter
                  minName="minct"
                  maxName="maxct"
                  bound={{ min: 0, max: Math.ceil(caratMax) }}
                  value={{ min: num(sp.minct), max: num(sp.maxct) }}
                  step={0.5}
                  suffix=" ct"
                />
                <button type="submit" className="btn-ghost mt-3 w-full py-1.5 text-xs">
                  Apply ranges
                </button>
              </FilterGroup>
            </form>

            <FilterGroup title="Category">
              {categories
                .filter((c) => (categoryCounts.get(c.slug) ?? 0) > 0)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <FilterLink
                    key={c.slug}
                    href={withParam('category', sp.category === c.slug ? undefined : c.slug)}
                    active={sp.category === c.slug}
                    label={c.name}
                    count={categoryCounts.get(c.slug) ?? 0}
                  />
                ))}
            </FilterGroup>

            {/* Every facet list is alphabetical: a buyer looks for a known name,
                and hunting for it in count order costs longer than it saves. */}
            <FilterGroup title="Stone">
              {[...species]
                .sort((a, b) => a.species.name.localeCompare(b.species.name))
                .map((s) => (
                  <FilterLink
                    key={s.key}
                    href={withParam('species', sp.species === s.key ? undefined : s.key)}
                    active={sp.species === s.key}
                    label={s.species.name}
                    count={s.count}
                  />
                ))}
            </FilterGroup>

            <FilterGroup title="Colour">
              {Object.entries(f.color)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([colour, n]) => (
                  <FilterLink
                    key={colour}
                    href={withParam('color', sp.color === colour ? undefined : colour)}
                    active={sp.color === colour}
                    label={colour}
                    count={n}
                  />
                ))}
            </FilterGroup>

            <FilterGroup title="Cut">
              {Object.entries(f.cut)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([cut, n]) => (
                  <FilterLink
                    key={cut}
                    href={withParam('cut', sp.cut === cut ? undefined : cut)}
                    active={sp.cut === cut}
                    label={cut}
                    count={n}
                  />
                ))}
            </FilterGroup>

            <FilterGroup title="Origin">
              {[...originCounts.entries()]
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([origin, n]) => (
                  <FilterLink
                    key={origin}
                    href={withParam('origin', sp.origin === origin ? undefined : origin)}
                    active={sp.origin === origin}
                    label={origin}
                    count={n}
                  />
                ))}
            </FilterGroup>

            <FilterGroup title="Type">
              {Object.entries(f.form)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([form, n]) => (
                  <FilterLink
                    key={form}
                    href={withParam('form', sp.form === form ? undefined : form)}
                    active={sp.form === form}
                    label={form}
                    count={n}
                  />
                ))}
            </FilterGroup>
          </FilterPanel>

          {/* Results */}
          <div>
            {/* Desktop sort chips; below lg sorting lives inside the Filters row */}
            <div className="mb-5 hidden flex-wrap gap-2 lg:flex">
              {SORTS.map(([value, label]) => (
                <Link
                  key={value}
                  href={withParam('sort', value)}
                  className={`chip transition ${
                    (sp.sort ?? 'featured') === value ? 'chip-brand' : 'hover:border-brand-ring'
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
                  retailer&rsquo;s. Try loosening a filter, or ask the assistant and it will
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
    <div className="mb-6">
      <div className="label mb-2.5">{title}</div>
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
        active ? 'font-medium text-brand' : 'text-muted hover:text-brand-dark'
      }`}
    >
      <span>{label}</span>
      <span className="text-xs text-subtle">{count}</span>
    </Link>
  );
}
