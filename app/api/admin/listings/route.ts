import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireRoleApi } from '@/lib/auth/guard';
import { getProduct } from '@/lib/catalog';
import { saveOverride } from '@/lib/listings/overrides';

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

  const slug = String(body.slug ?? '');
  if (!getProduct(slug)) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  const price = body.priceUsd == null ? null : Number(body.priceUsd);
  if (price != null && (Number.isNaN(price) || price < 0)) {
    return NextResponse.json({ error: 'Price must be a positive number.' }, { status: 400 });
  }

  const etsyTags = asList(body.etsyTags);
  if (etsyTags.length > 13) {
    return NextResponse.json({ error: 'Etsy allows at most 13 tags.' }, { status: 400 });
  }

  await saveOverride(slug, {
    title: str(body.title),
    description: str(body.description),
    priceUsd: price,
    treatment: str(body.treatment),
    seoTitle: str(body.seoTitle),
    seoDescription: str(body.seoDescription),
    seoKeywords: asList(body.seoKeywords),
    etsyTags,
    listedOnEtsy: Boolean(body.listedOnEtsy),
    etsyListingId: str(body.etsyListingId),
    status: (['active', 'draft', 'archived'] as const).includes(body.status as never)
      ? (body.status as 'active' | 'draft' | 'archived')
      : 'active',
  });

  // Product pages are prerendered with hourly ISR; an edit should not wait.
  revalidatePath(`/gem/${slug}`);
  revalidatePath('/shop');

  return NextResponse.json({ ok: true });
}

function str(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length > 0 ? s : null;
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}
