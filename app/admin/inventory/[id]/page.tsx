import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { CHANNELS, INTAKE_STATUSES, STONE_TYPES } from '@/lib/inventory/intake';
import { InventoryEditor, type InventoryDraft } from '@/components/admin/InventoryEditor';
import { PhotoManager } from '@/components/admin/PhotoManager';
import { ChannelManager } from '@/components/admin/ChannelManager';

export const dynamic = 'force-dynamic';

const s = (v: unknown) => (v == null ? '' : String(v));

export default async function EditInventoryItem({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole('admin', '/admin/inventory');
  const { id } = await params;

  const item = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }] },
      channels: true,
      category: { select: { id: true, name: true } },
    },
  });
  if (!item) notFound();

  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const draft: InventoryDraft = {
    id: item.id,
    sku: item.sku,
    title: item.title,
    description: item.description,
    stoneType: item.stoneType,
    intakeStatus: item.intakeStatus,
    colour: s(item.colour),
    shape: s(item.shape),
    categoryId: item.categoryId,
    caratWeight: s(item.caratWeight),
    weightGrams: s(item.weightGrams),
    weightFromG: s(item.weightFromG),
    weightToG: s(item.weightToG),
    lengthMm: s(item.lengthMm),
    widthMm: s(item.widthMm),
    heightMm: s(item.heightMm),
    diameterMm: s(item.diameterMm),
    unitPrice: s(item.unitPrice),
    priceUnit: item.priceUnit ?? 'piece',
    price: s(item.price),
    costPrice: s(item.costPrice),
    originCountry: s(item.originCountry),
    treatment: item.treatment,
    shipsFrom: item.shipsFrom,
    intakeNotes: s(item.intakeNotes),
    seoTitle: s(item.seoTitle),
    seoDescription: s(item.seoDescription),
    seoKeywords: (item.seoKeywords ?? []).join(', '),
    status: item.status,
    aiGenerated: item.aiGenerated,
    photoCount: item.images.length,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory" className="text-sm text-muted hover:text-brand">
          ← All inventory
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-2xl">{item.title}</h1>
          <span className="flex items-center gap-2">
            <span className="chip font-mono text-[10px]">{item.sku ?? 'no code'}</span>
            <span className={item.status === 'active' ? 'chip-brand' : 'chip'}>
              {item.status === 'active' ? 'In the shop' : 'Inventory only'}
            </span>
          </span>
        </div>
        {item.status === 'active' && (
          <a
            href={`/gem/${item.slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-sm text-brand hover:text-brand-dark"
          >
            View in the shop →
          </a>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <InventoryEditor
          draft={draft}
          categories={categories}
          stoneTypes={STONE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          statuses={INTAKE_STATUSES.map((st) => ({ value: st.value, label: st.label }))}
          aiEnabled={config.ai.enabled || Boolean(process.env.AI_OPENAI_API_KEY)}
        />

        <aside className="space-y-4">
          <PhotoManager
            productId={item.id}
            photos={item.images.map((i) => ({ id: i.id, url: i.url, isPrimary: i.isPrimary }))}
            driveFolder={item.mediaFolder}
          />

          <ChannelManager
            productId={item.id}
            channels={CHANNELS}
            current={Object.fromEntries(
              item.channels.map((c) => [c.channel, { status: c.status, listingUrl: c.listingUrl ?? '' }]),
            )}
          />
        </aside>
      </div>
    </div>
  );
}
