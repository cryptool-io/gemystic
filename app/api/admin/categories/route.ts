import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireRoleApi } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * Category create, edit and hide.
 *
 * Categories live in data/taxonomy.json; this writes an override row per slug
 * so the owner can rename, reorder, re-map or hide any of them, and add new
 * ones, without a deploy. A new category takes stock through formMapping
 * (which product forms belong to it) rather than by tagging stones by hand.
 */
export async function POST(req: NextRequest) {
  const denied = await requireRoleApi('admin');
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const action = String(body.action ?? 'save');

  if (action === 'delete') {
    const slug = String(body.slug ?? '');
    const row = await prisma.categoryOverride.findUnique({ where: { slug } });
    if (!row) return NextResponse.json({ error: 'Nothing to remove.' }, { status: 404 });
    if (!row.isCustom) {
      // A taxonomy-file category cannot be deleted, only hidden, otherwise the
      // next deploy would silently resurrect it.
      await prisma.categoryOverride.update({ where: { slug }, data: { isActive: false } });
    } else {
      await prisma.categoryOverride.delete({ where: { slug } });
    }
    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true });
  }

  const slug = slugify(String(body.slug ?? ''));
  if (!slug) return NextResponse.json({ error: 'A URL slug is required.' }, { status: 400 });

  const name = String(body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'A name is required.' }, { status: 400 });

  const data = {
    name,
    description: str(body.description),
    position: body.position == null ? null : Number(body.position),
    isActive: body.isActive !== false,
    formMapping: asList(body.formMapping),
    seoTitle: str(body.seoTitle),
    seoDescription: str(body.seoDescription),
    seoKeywords: asList(body.seoKeywords),
    isCustom: Boolean(body.isCustom),
  };

  await prisma.categoryOverride.upsert({
    where: { slug },
    update: data,
    create: { slug, ...data },
  });

  // The nav lives in the root layout, so every page carries it.
  revalidatePath('/', 'layout');
  revalidatePath('/shop');

  return NextResponse.json({ ok: true, slug });
}

function slugify(v: string): string {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
