import Link from 'next/link';
import Image from 'next/image';
import { requireRole } from '@/lib/auth/guard';
import { prisma, hasDatabase } from '@/lib/prisma';
import { money } from '@/lib/seo';
import { CHANNELS, INTAKE_STATUSES, STONE_TYPES } from '@/lib/inventory/intake';
import { IntakeForm } from '@/components/admin/IntakeForm';

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
  searchParams: Promise<{ q?: string; status?: string; type?: string; channel?: string }>;
}) {
  await requireRole('admin', '/admin/inventory');
  const sp = await searchParams;

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
      ...(sp.q
        ? {
            OR: [
              { title: { contains: sp.q, mode: 'insensitive' as const } },
              { sku: { contains: sp.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(sp.status ? { intakeStatus: sp.status } : {}),
      ...(sp.type ? { stoneType: sp.type } : {}),
      ...(sp.channel ? { channels: { some: { channel: sp.channel, status: 'listed' } } } : {}),
    },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      category: { select: { name: true } },
      channels: true,
      _count: { select: { images: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 300,
  });

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

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Chip href="/admin/inventory" label="All" active={!sp.status && !sp.type && !sp.channel} />
        {INTAKE_STATUSES.map((s) => (
          <Chip
            key={s.value}
            href={`/admin/inventory?status=${s.value}`}
            label={s.label}
            active={sp.status === s.value}
          />
        ))}
        {STONE_TYPES.map((t) => (
          <Chip
            key={t.value}
            href={`/admin/inventory?type=${t.value}`}
            label={t.label}
            active={sp.type === t.value}
          />
        ))}
      </div>

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
                    <span className="flex items-center gap-3">
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-surface-2">
                        {i.images[0] && (
                          <Image src={i.images[0].url} alt="" fill sizes="40px" className="object-cover" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{i.title}</span>
                        <span className="block truncate text-xs text-muted">{i.category.name}</span>
                      </span>
                    </span>
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

function Chip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`chip transition ${active ? 'chip-brand' : 'hover:border-brand-ring'}`}>
      {label}
    </Link>
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
