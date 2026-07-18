import Link from 'next/link';
import Image from 'next/image';
import { requireRole } from '@/lib/auth/guard';
import { allProductsIncludingSold, featuredProducts, getSpecies, stockedSpecies } from '@/lib/catalog';
import { allCategories } from '@/lib/taxonomy';
import { allOverrides } from '@/lib/listings/overrides';
import { soldMap } from '@/lib/sold';
import { money } from '@/lib/seo';
import { EtsySyncButton } from '@/components/admin/EtsySyncButton';

export const dynamic = 'force-dynamic';

/**
 * Listing management (owner steps 2 and 3): what exists, where it is listed,
 * and what the copy says. Editing happens per listing; this page is the filter
 * and the overview.
 */
export default async function AdminListings({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    species?: string;
    status?: string;
    channel?: string;
    edited?: string;
  }>;
}) {
  await requireRole('admin', '/admin/listings');
  const sp = await searchParams;

  const overrides = await allOverrides();
  const sold = soldMap();
  const featured = featuredProducts();
  const heroSlugs = new Set(featured.slice(0, 4).map((p) => p.slug));
  const fineRareSlugs = new Set(featured.slice(4).map((p) => p.slug));

  let products = allProductsIncludingSold();

  if (sp.q) {
    const term = sp.q.toLowerCase();
    products = products.filter(
      (p) => p.title.toLowerCase().includes(term) || p.species.includes(term) || p.etsyId.includes(term),
    );
  }
  if (sp.category) products = products.filter((p) => p.category === sp.category);
  if (sp.species) products = products.filter((p) => p.species === sp.species);
  if (sp.status === 'sold') products = products.filter((p) => Boolean(sold[p.etsyId]));
  if (sp.status === 'live') products = products.filter((p) => !sold[p.etsyId]);
  if (sp.channel === 'etsy') products = products.filter((p) => overrides.get(p.slug)?.listedOnEtsy);
  if (sp.channel === 'site-only') products = products.filter((p) => !overrides.get(p.slug)?.listedOnEtsy);
  if (sp.edited === '1') products = products.filter((p) => overrides.has(p.slug));

  const categories = allCategories();
  const species = [...stockedSpecies()].sort((a, b) => a.species.name.localeCompare(b.species.name));
  const etsyCount = [...overrides.values()].filter((o) => o.listedOnEtsy).length;

  const qs = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) next.set(k, v);
    const s = next.toString();
    return `/admin/listings${s ? `?${s}` : ''}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Listings</h1>
          <p className="mt-1 text-sm text-muted">
            Steps 2 and 3: choose where each stone is listed and what its listing says.
            {' '}{products.length} shown of {allProductsIncludingSold().length}, {overrides.size} edited,
            {' '}{etsyCount} also on Etsy.
          </p>
        </div>
        <div className="flex gap-2">
          <EtsySyncButton />
        </div>
      </div>

      {/* Filters */}
      <form action="/admin/listings" className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input name="q" defaultValue={sp.q} placeholder="Search title, species, Etsy id…" className="field lg:col-span-2" />
        <select name="category" defaultValue={sp.category ?? ''} className="field">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select name="species" defaultValue={sp.species ?? ''} className="field">
          <option value="">All stones</option>
          {species.map((s) => (
            <option key={s.key} value={s.key}>{s.species.name}</option>
          ))}
        </select>
        <select name="status" defaultValue={sp.status ?? ''} className="field">
          <option value="">Any status</option>
          <option value="live">Live</option>
          <option value="sold">Sold</option>
        </select>
        <select name="channel" defaultValue={sp.channel ?? ''} className="field">
          <option value="">Any channel</option>
          <option value="etsy">On Etsy too</option>
          <option value="site-only">This site only</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="edited" value="1" defaultChecked={sp.edited === '1'} />
          Edited only
        </label>
        <div className="flex gap-2 lg:col-span-2">
          <button type="submit" className="btn-primary flex-1">Filter</button>
          <Link href="/admin/listings" className="btn-ghost">Reset</Link>
        </div>
      </form>

      <div className="card scroll-x">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="p-3 font-normal">Stone</th>
              <th className="p-3 font-normal">Species</th>
              <th className="p-3 text-right font-normal">Price</th>
              <th className="p-3 font-normal">Channels</th>
              <th className="p-3 font-normal">Status</th>
              <th className="p-3 font-normal">SEO</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.slice(0, 200).map((p) => {
              const o = overrides.get(p.slug);
              const isSold = Boolean(sold[p.etsyId]);
              return (
                <tr key={p.slug}>
                  <td className="p-3">
                    <span className="flex items-center gap-3">
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-surface-2">
                        <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{o?.title || p.title}</span>
                        <span className="flex flex-wrap gap-1 pt-0.5">
                          {heroSlugs.has(p.slug) && <span className="chip-brand text-[10px]">Landing hero</span>}
                          {fineRareSlugs.has(p.slug) && <span className="chip text-[10px]">Fine &amp; rare</span>}
                          {o && <span className="chip text-[10px]">Edited</span>}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="p-3 capitalize text-muted">{getSpecies(p.species)?.name ?? p.species}</td>
                  <td className="p-3 text-right font-medium text-brand">
                    {money(o?.priceUsd ?? p.priceUsd)}
                    {o?.priceUsd != null && o.priceUsd !== p.priceUsd && (
                      <span className="block text-[10px] text-muted line-through">{money(p.priceUsd)}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="flex flex-wrap gap-1">
                      <span className="chip-brand text-[10px]">Site</span>
                      {o?.listedOnEtsy && <span className="chip text-[10px]">Etsy</span>}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`chip text-[10px] ${isSold ? 'border-accent/40 text-accent-dark' : ''}`}>
                      {isSold ? 'Sold' : (o?.status ?? 'active')}
                    </span>
                  </td>
                  <td className="p-3 text-muted">
                    {o?.seoTitle || o?.seoDescription ? (
                      <span className="chip-brand text-[10px]">Custom</span>
                    ) : (
                      <span className="text-xs text-subtle">Generated</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/listings/${p.slug}`}
                      className="text-xs text-brand hover:text-brand-dark"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {products.length > 200 && (
        <p className="text-xs text-muted">Showing first 200 of {products.length}. Narrow with the filters.</p>
      )}
      {products.length === 0 && (
        <div className="card p-10 text-center">
          <p className="font-display text-lg">Nothing matches those filters</p>
          <Link href="/admin/listings" className="btn-ghost mt-4">Reset filters</Link>
        </div>
      )}
    </div>
  );
}
