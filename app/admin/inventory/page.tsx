import Link from 'next/link';
import Image from 'next/image';
import { requireRole } from '@/lib/auth/guard';
import { prisma, hasDatabase } from '@/lib/prisma';
import { money } from '@/lib/seo';
import { CHANNELS, INTAKE_STATUSES, STONE_TYPES } from '@/lib/inventory/intake';
import { IntakeForm } from '@/components/admin/IntakeForm';
import { RangeFilter } from '@/components/RangeFilter';

export const dynamic = 'force-dynamic';

const STATUS_LABEL = Object.fromEntries(INTAKE_STATUSES.map((s) => [s.value, s.label]));
const TYPE_LABEL = Object.fromEntries(STONE_TYPES.map((t) => [t.value, t.label]));

/**
 * Inventory: step 1 of the owner's pipeline. The stones themselves, before any
 * decision about where they are listed. Modelled on the working spreadsheet:
 * SKU codes, a photo workflow, per-gram pricing for parcels, and presence
 * across all eight sales channels rather than just this site and Etsy.
 */
export default async function AdminInventory({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    channel?: string;
    listed?: string;
    min?: string;
    max?: string;
    sort?: string;
  }>;
}) {
  await requireRole('admin', '/admin/inventory');
  const sp = await searchParams;
  const num = (v?: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

  if (!hasDatabase()) {
    return (
      <div className="card p-8">
        <h1 className="font-display text-xl">Inventory</h1>
        <p className="mt-2 text-sm text-muted">DATABASE_URL is not set.</p>
      </div>
    );
  }

  const priceFloor = num(sp.min);
  const priceCeiling = num(sp.max);

  const items = await prisma.product.findMany({
    where: {
      ...(sp.q
        ? {
            OR: [
              { title: { contains: sp.q, mode: 'insensitive' as const } },
              { sku: { contains: sp.q, mode: 'insensitive' as const } },
              { colour: { contains: sp.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(sp.status ? { intakeStatus: sp.status } : {}),
      ...(sp.type ? { stoneType: sp.type } : {}),
      ...(sp.channel ? { channels: { some: { channel: sp.channel, status: 'listed' } } } : {}),
      ...(sp.listed === 'yes' ? { status: 'active' } : {}),
      ...(sp.listed === 'no' ? { status: { not: 'active' } } : {}),
      ...(priceFloor != null || priceCeiling != null
        ? {
            price: {
              ...(priceFloor != null ? { gte: priceFloor } : {}),
              ...(priceCeiling != null ? { lte: priceCeiling } : {}),
            },
          }
        : {}),
    },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      category: { select: { name: true } },
      channels: true,
      _count: { select: { images: true } },
    },
    orderBy:
      sp.sort === 'price-asc'
        ? [{ price: 'asc' as const }]
        : sp.sort === 'price-desc'
          ? [{ price: 'desc' as const }]
          : sp.sort === 'name'
            ? [{ title: 'asc' as const }]
            : [{ createdAt: 'desc' as const }],
    take: 300,
  });

  // Bounds for the price slider, from real stock rather than a guess.
  const priceRange = await prisma.product.aggregate({ _min: { price: true }, _max: { price: true } });
  const bound = {
    min: Math.floor(Number(priceRange._min.price ?? 0)),
    max: Math.ceil(Number(priceRange._max.price ?? 1000)),
  };

  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const [total, byStatus, listedAnywhere, withCost] = await Promise.all([
    prisma.product.count(),
    prisma.product.groupBy({ by: ['intakeStatus'], _count: true }),
    prisma.productChannel.count({ where: { status: 'listed' } }),
    prisma.product.count({ where: { costPrice: { not: null } } }),
  ]);
  const countOf = (s: string) => byStatus.find((b) => b.intakeStatus === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Inventory</h1>
          <p className="mt-1 text-sm text-muted">
            Step 1: every stone we hold, with its code, photographs and where it is listed.
          </p>
        </div>
        <form action="/admin/inventory" className="w-full sm:w-64">
          <input name="q" defaultValue={sp.q} placeholder="Search name or code…" className="field" />
        </form>
      </div>

      <IntakeForm
        categories={categories}
        stoneTypes={STONE_TYPES.map((t) => ({ value: t.value, label: t.label, hint: t.hint }))}
        statuses={INTAKE_STATUSES.map((s) => ({ value: s.value, label: s.label, hint: s.hint }))}
        channels={CHANNELS}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Stones held" value={String(total)} hint="all inventory records" />
        <Stat label="Ready to list" value={String(countOf('uploaded'))} hint="photographed and drafted" />
        <Stat label="Awaiting photos" value={String(countOf('pending_images') + countOf('filter_images'))} hint="cannot be listed yet" />
        <Stat label="Live listings" value={String(listedAnywhere)} hint="across all channels" />
      </div>

      {withCost < total && (
        <p className="rounded-lg border border-accent/40 bg-accent-tint p-3 text-xs text-accent-dark">
          {total - withCost} of {total} stones have no cost price, so Finances cannot report a real
          margin on them. Add it when you enter a stone, or edit the record later.
        </p>
      )}

      {/* Filters, the same set the marketplace uses: search, the facets that
          matter here, a price range and a sort, all in one submit. */}
      <form action="/admin/inventory" className="card space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label htmlFor="q" className="label mb-1.5 block">Search</label>
            <input id="q" name="q" defaultValue={sp.q} placeholder="Name, code or colour…" className="field" />
          </div>
          <div>
            <label htmlFor="type" className="label mb-1.5 block">Stone type</label>
            <select id="type" name="type" defaultValue={sp.type ?? ''} className="field">
              <option value="">Any type</option>
              {STONE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="label mb-1.5 block">Photo status</label>
            <select id="status" name="status" defaultValue={sp.status ?? ''} className="field">
              <option value="">Any status</option>
              {INTAKE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="listed" className="label mb-1.5 block">In the shop</label>
            <select id="listed" name="listed" defaultValue={sp.listed ?? ''} className="field">
              <option value="">Either</option>
              <option value="yes">Listed on the site</option>
              <option value="no">Not listed yet</option>
            </select>
          </div>
          <div>
            <label htmlFor="channel" className="label mb-1.5 block">Live on channel</label>
            <select id="channel" name="channel" defaultValue={sp.channel ?? ''} className="field">
              <option value="">Any channel</option>
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sort" className="label mb-1.5 block">Sort</label>
            <select id="sort" name="sort" defaultValue={sp.sort ?? ''} className="field">
              <option value="">Newest first</option>
              <option value="price-desc">Price: high to low</option>
              <option value="price-asc">Price: low to high</option>
              <option value="name">Name A to Z</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="label mb-1.5 block">Price (USD)</span>
            <RangeFilter
              minName="min"
              maxName="max"
              bound={bound}
              value={{ min: priceFloor, max: priceCeiling }}
              step={5}
              prefix="$"
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn-primary flex-1">Filter</button>
            <Link href="/admin/inventory" className="btn-ghost">Reset</Link>
          </div>
        </div>
      </form>

      <div className="card scroll-x">
        <table className="w-full min-w-[60rem] text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="p-3 font-normal">Code</th>
              <th className="p-3 font-normal">Stone</th>
              <th className="p-3 font-normal">Type</th>
              <th className="p-3 text-right font-normal">Weight</th>
              <th className="p-3 text-right font-normal">Price</th>
              <th className="p-3 text-right font-normal">Cost</th>
              <th className="p-3 text-right font-normal">Photos</th>
              <th className="p-3 font-normal">Photo status</th>
              <th className="p-3 font-normal">Listed on</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((i) => {
              const live = i.channels.filter((c) => c.status === 'listed');
              return (
                <tr key={i.id}>
                  <td className="p-3 font-mono text-xs text-muted">{i.sku ?? '–'}</td>
                  <td className="p-3">
                    <Link href={`/admin/inventory/${i.id}`} className="flex items-center gap-3 hover:text-brand">
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-surface-2">
                        {i.images[0] && (
                          <Image src={i.images[0].url} alt="" fill sizes="40px" className="object-cover" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{i.title}</span>
                        <span className="block truncate text-xs text-muted">{i.category.name}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-3 text-muted">{TYPE_LABEL[i.stoneType] ?? i.stoneType}</td>
                  <td className="p-3 text-right text-muted">
                    {i.caratWeight
                      ? `${i.caratWeight} ct`
                      : i.weightGrams
                        ? `${i.weightGrams} g`
                        : '–'}
                    {i.weightFromG && i.weightToG && (
                      <span className="block text-[10px] text-subtle">
                        {String(i.weightFromG)} to {String(i.weightToG)} g each
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right font-medium text-brand">
                    {money(Number(i.price))}
                    {i.unitPrice && i.priceUnit !== 'piece' && (
                      <span className="block text-[10px] text-subtle">
                        {money(Number(i.unitPrice))}/{i.priceUnit}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right text-muted">
                    {i.costPrice ? money(Number(i.costPrice)) : <span className="text-subtle">not set</span>}
                  </td>
                  <td className="p-3 text-right text-muted">
                    {i._count.images}
                    {i.mediaFolder && (
                      <a
                        href={i.mediaFolder}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1 text-xs text-brand hover:text-brand-dark"
                      >
                        Drive
                      </a>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={i.intakeStatus === 'uploaded' ? 'chip-brand text-[10px]' : 'chip text-[10px]'}>
                      {STATUS_LABEL[i.intakeStatus] ?? i.intakeStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    {live.length === 0 ? (
                      <span className="text-xs text-subtle">Nowhere yet</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {live.map((c) => {
                          const label = CHANNELS.find((x) => x.value === c.channel)?.label ?? c.channel;
                          return c.listingUrl ? (
                            <a
                              key={c.id}
                              href={c.listingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="chip text-[10px] hover:border-brand-ring"
                            >
                              {label}
                            </a>
                          ) : (
                            <span key={c.id} className="chip text-[10px]">{label}</span>
                          );
                        })}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="card p-10 text-center">
          <p className="font-display text-lg">Nothing matches</p>
          <Link href="/admin/inventory" className="btn-ghost mt-4">Clear filters</Link>
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
