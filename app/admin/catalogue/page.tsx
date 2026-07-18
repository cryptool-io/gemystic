import Link from 'next/link';
import Image from 'next/image';
import { requireRole } from '@/lib/auth/guard';
import { allProducts, featuredProducts, getSpecies } from '@/lib/catalog';
import { money } from '@/lib/seo';
import { prisma, hasDatabase } from '@/lib/prisma';

/** DB inventory (pipeline step 1): stones that exist as records but are not
 *  live catalogue listings, e.g. the gemysticgems.com import. */
async function inventoryItems() {
  if (!hasDatabase()) return [];
  return prisma.product.findMany({
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      category: { select: { name: true } },
      _count: { select: { images: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

/**
 * Catalogue list, real data, read-only. Full CRUD (create, edit, image upload,
 * publish/unpublish) is the product-management milestone that follows the DB
 * migration. Shown as a real inventory view so the admin is useful today.
 */
export default async function AdminCatalogue({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole('admin', '/admin/catalogue');
  const { q } = await searchParams;

  let products = allProducts();
  if (q) {
    const term = q.toLowerCase();
    products = products.filter(
      (p) => p.title.toLowerCase().includes(term) || p.species.includes(term),
    );
  }

  // Same selection the homepage renders: first 4 = hero grid, all 8 = Fine and rare.
  const featured = featuredProducts();
  const heroSlugs = new Set(featured.slice(0, 4).map((p) => p.slug));
  const fineRareSlugs = new Set(featured.slice(4).map((p) => p.slug));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Catalogue</h1>
          <p className="mt-1 text-sm text-muted">
            {products.length} listings. Read-only until product CRUD lands with the database.
          </p>
        </div>
        <form action="/admin/catalogue" className="w-full sm:w-64">
          <input name="q" defaultValue={q} placeholder="Search listings…" className="field" />
        </form>
      </div>

      <div className="card scroll-x">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="p-3 font-normal">Stone</th>
              <th className="p-3 font-normal">Species</th>
              <th className="p-3 font-normal">Category</th>
              <th className="p-3 text-right font-normal">Weight</th>
              <th className="p-3 text-right font-normal">Price</th>
              <th className="p-3 font-normal">Treatment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.slice(0, 200).map((p) => (
              <tr key={p.slug}>
                <td className="p-3">
                  <Link href={`/gem/${p.slug}`} className="flex items-center gap-3 hover:text-brand-dark">
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-surface-2">
                      <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                    <span className="min-w-0 truncate">{p.title}</span>
                    {heroSlugs.has(p.slug) && (
                      <span className="chip-brand shrink-0 text-[10px]">Landing hero</span>
                    )}
                    {fineRareSlugs.has(p.slug) && (
                      <span className="chip shrink-0 text-[10px]">Fine &amp; rare</span>
                    )}
                  </Link>
                </td>
                <td className="p-3 capitalize text-muted">{getSpecies(p.species)?.name ?? p.species}</td>
                <td className="p-3 text-muted">{p.category}</td>
                <td className="p-3 text-right text-muted">
                  {p.caratWeight ? `${p.caratWeight} ct` : p.gramWeight ? `${p.gramWeight} g` : ','}
                </td>
                <td className="p-3 text-right font-medium text-brand">{money(p.priceUsd)}</td>
                <td className="p-3 text-muted">
                  <span className="line-clamp-1 max-w-[16rem]">{p.treatment}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {products.length > 200 && (
        <p className="text-xs text-muted">Showing first 200 of {products.length}.</p>
      )}

      <InventorySection />
    </div>
  );
}

async function InventorySection() {
  const items = await inventoryItems();
  if (items.length === 0) return null;

  const drafts = items.filter((i) => i.status === 'draft');
  const sold = items.filter((i) => i.status === 'sold');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl">Inventory (pipeline step 1)</h2>
        <p className="mt-1 text-sm text-muted">
          {items.length} stones in the database, imported from gemysticgems.com with their
          full photo sets: {drafts.length} in stock awaiting listing (step 2), {sold.length}{' '}
          recorded as sold. Listing management for these lands with the pipeline build.
        </p>
      </div>

      <div className="card scroll-x">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="p-3 font-normal">Stone</th>
              <th className="p-3 font-normal">Category</th>
              <th className="p-3 text-right font-normal">Weight</th>
              <th className="p-3 text-right font-normal">Price</th>
              <th className="p-3 text-right font-normal">Photos</th>
              <th className="p-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[...drafts, ...sold].slice(0, 250).map((i) => (
              <tr key={i.id}>
                <td className="p-3">
                  <span className="flex items-center gap-3">
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-surface-2">
                      {i.images[0] && (
                        <Image src={i.images[0].url} alt="" fill sizes="40px" className="object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 truncate">{i.title}</span>
                  </span>
                </td>
                <td className="p-3 text-muted">{i.category.name}</td>
                <td className="p-3 text-right text-muted">
                  {i.caratWeight ? `${i.caratWeight} ct` : i.weightGrams ? `${i.weightGrams} g` : '–'}
                </td>
                <td className="p-3 text-right font-medium text-brand">{money(Number(i.price))}</td>
                <td className="p-3 text-right text-muted">{i._count.images}</td>
                <td className="p-3">
                  <span className={i.status === 'draft' ? 'chip-brand text-[10px]' : 'chip text-[10px]'}>
                    {i.status === 'draft' ? 'In stock, unlisted' : 'Sold (history)'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
