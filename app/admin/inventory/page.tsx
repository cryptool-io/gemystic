import Link from 'next/link';
import Image from 'next/image';
import { requireRole } from '@/lib/auth/guard';
import { prisma, hasDatabase } from '@/lib/prisma';
import { money } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/**
 * Inventory: step 1 of the owner's pipeline, the stones themselves, before any
 * decision about where they are listed. Today it holds what the legacy
 * gemysticgems.com shop knew; intake of new stock (measurements, cost price,
 * photos at the bench) is the next build on this page.
 */
export default async function AdminInventory({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireRole('admin', '/admin/inventory');
  const { q, status } = await searchParams;

  if (!hasDatabase()) {
    return (
      <div className="card p-8">
        <h1 className="font-display text-xl">Inventory</h1>
        <p className="mt-2 text-sm text-muted">DATABASE_URL is not set.</p>
      </div>
    );
  }

  const items = await prisma.product.findMany({
    where: {
      ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
      ...(status && status !== 'all' ? { status } : {}),
    },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      category: { select: { name: true } },
      _count: { select: { images: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 300,
  });

  const totals = await prisma.product.groupBy({ by: ['status'], _count: true });
  const countOf = (s: string) => totals.find((t) => t.status === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Inventory</h1>
          <p className="mt-1 text-sm text-muted">
            Step 1: every stone we hold, before it becomes a listing. Imported from
            gemysticgems.com with full photo sets.
          </p>
        </div>
        <form action="/admin/inventory" className="w-full sm:w-64">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search inventory…" className="field" />
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="In stock, unlisted" value={String(countOf('draft'))} hint="ready for step 2" />
        <Stat label="Sold (history)" value={String(countOf('sold'))} hint="kept for records" />
        <Stat label="Total records" value={String(totals.reduce((a, t) => a + t._count, 0))} hint="all inventory" />
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'draft', 'sold', 'active'].map((s) => (
          <Link
            key={s}
            href={`/admin/inventory${s === 'all' ? '' : `?status=${s}`}`}
            className={`chip capitalize transition ${
              (status ?? 'all') === s ? 'chip-brand' : 'hover:border-brand-ring'
            }`}
          >
            {s === 'draft' ? 'In stock' : s}
          </Link>
        ))}
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
            {items.map((i) => (
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
                    {i.status === 'draft' ? 'In stock, unlisted' : i.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="card p-10 text-center">
          <p className="font-display text-lg">Nothing here yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Run <code className="rounded-sm bg-surface-2 px-1.5 py-0.5">npm run gemystic:sync -- --import</code>{' '}
            to pull the legacy shop&rsquo;s stock in with its photos.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className="mt-1 font-display text-2xl text-brand">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{hint}</div>
    </div>
  );
}
