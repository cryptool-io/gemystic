import Link from 'next/link';
import Image from 'next/image';
import { requireRole } from '@/lib/auth/guard';
import { allProducts, getSpecies } from '@/lib/catalog';
import { money } from '@/lib/seo';

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
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-surface-2">
                      <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                    <span className="min-w-0 truncate">{p.title}</span>
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
    </div>
  );
}
