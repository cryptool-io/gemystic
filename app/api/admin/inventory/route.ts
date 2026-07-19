import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireRoleApi } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import {
  CHANNELS,
  CHANNEL_STATUSES,
  INTAKE_STATUSES,
  STONE_TYPES,
  createIntake,
  nextSku,
  updateChannel,
  type IntakeStatus,
  type StoneType,
} from '@/lib/inventory/intake';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const denied = await requireRoleApi('admin');
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const action = String(body.action ?? 'create');

  /** Live SKU preview while the form is being filled in. */
  if (action === 'preview-sku') {
    const stoneType = asStoneType(body.stoneType);
    const species = String(body.species ?? '').trim();
    if (!species) return NextResponse.json({ sku: '' });
    return NextResponse.json({ sku: await nextSku(stoneType, species) });
  }

  if (action === 'set-channel') {
    const productId = String(body.productId ?? '');
    const channel = String(body.channel ?? '');
    const status = String(body.status ?? 'not_listed');
    if (!CHANNELS.some((c) => c.value === channel)) {
      return NextResponse.json({ error: 'Unknown channel.' }, { status: 400 });
    }
    if (!CHANNEL_STATUSES.includes(status as (typeof CHANNEL_STATUSES)[number])) {
      return NextResponse.json({ error: 'Unknown channel status.' }, { status: 400 });
    }
    await updateChannel(productId, channel, {
      status,
      listingUrl: body.listingUrl ? String(body.listingUrl) : null,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'set-status') {
    const productId = String(body.productId ?? '');
    const intakeStatus = asIntakeStatus(body.intakeStatus);
    await prisma.product.update({ where: { id: productId }, data: { intakeStatus } });
    return NextResponse.json({ ok: true });
  }

  // ── Create ────────────────────────────────────────────────────────────────
  const title = String(body.title ?? '').trim();
  const species = String(body.species ?? '').trim();
  if (!title) return NextResponse.json({ error: 'A name is required.' }, { status: 400 });
  if (!species) return NextResponse.json({ error: 'A gemstone species is required.' }, { status: 400 });

  const categoryId = String(body.categoryId ?? '');
  if (!categoryId) return NextResponse.json({ error: 'Pick a category.' }, { status: 400 });

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: 'Enter a selling price above zero.' }, { status: 400 });
  }

  const cost = body.costPrice == null || body.costPrice === '' ? null : Number(body.costPrice);
  if (cost != null && (!Number.isFinite(cost) || cost < 0)) {
    return NextResponse.json({ error: 'Cost price must be a positive number.' }, { status: 400 });
  }

  const from = num(body.weightFromG);
  const to = num(body.weightToG);
  if (from != null && to != null && from > to) {
    return NextResponse.json(
      { error: 'The lightest stone cannot weigh more than the heaviest.' },
      { status: 400 },
    );
  }

  try {
    const result = await createIntake({
      stoneType: asStoneType(body.stoneType),
      species,
      title,
      colour: str(body.colour),
      shape: str(body.shape),
      intakeStatus: asIntakeStatus(body.intakeStatus),
      categoryId,
      caratWeight: num(body.caratWeight),
      lengthMm: num(body.lengthMm),
      widthMm: num(body.widthMm),
      heightMm: num(body.heightMm),
      diameterMm: num(body.diameterMm),
      weightGrams: num(body.weightGrams),
      weightFromG: from,
      weightToG: to,
      unitPrice: num(body.unitPrice),
      priceUnit: (['gram', 'carat', 'piece'] as const).includes(body.priceUnit as never)
        ? (body.priceUnit as 'gram' | 'carat' | 'piece')
        : null,
      price,
      costPrice: cost,
      originCountry: str(body.originCountry),
      treatment: str(body.treatment),
      shipsFrom: body.shipsFrom === 'TH' ? 'TH' : 'PK',
      mediaFolder: str(body.mediaFolder),
      intakeNotes: str(body.intakeNotes),
      channels: (body.channels ?? {}) as Record<string, { status: string; listingUrl?: string }>,
    });

    revalidatePath('/admin/inventory');
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save the stone.';
    // A duplicate slug or SKU is the realistic failure here; say which.
    return NextResponse.json(
      { error: /unique/i.test(message) ? 'A stone with that code already exists.' : message },
      { status: 400 },
    );
  }
}

function asStoneType(v: unknown): StoneType {
  return STONE_TYPES.some((t) => t.value === v) ? (v as StoneType) : 'cut';
}

function asIntakeStatus(v: unknown): IntakeStatus {
  return INTAKE_STATUSES.some((s) => s.value === v) ? (v as IntakeStatus) : 'pending_images';
}

function str(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length > 0 ? s : null;
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
