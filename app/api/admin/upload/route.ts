import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireRoleApi } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/services/storage';

export const runtime = 'nodejs';
// Photographs of gemstones come off a camera, not a phone screenshot.
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/**
 * Photo upload. Files are written through the storage adapter, which means
 * var/uploads today and S3 the moment STORAGE_DRIVER changes, with no call site
 * touched. Photographs live on our server rather than in a Drive folder, so a
 * shared-folder permission change can no longer take the shop's pictures away.
 */
export async function POST(req: NextRequest) {
  const denied = await requireRoleApi('admin');
  if (denied) return denied;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected a file upload.' }, { status: 400 });
  }

  const productId = String(form.get('productId') ?? '');
  if (!productId) return NextResponse.json({ error: 'Which stone is this for?' }, { status: 400 });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { _count: { select: { images: true } } },
  });
  if (!product) return NextResponse.json({ error: 'Stone not found.' }, { status: 404 });

  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: 'No files received.' }, { status: 400 });

  const saved: { id: string; url: string }[] = [];
  const rejected: string[] = [];
  let position = product._count.images;

  for (const file of files) {
    const ext = ALLOWED[file.type];
    if (!ext) {
      rejected.push(`${file.name}: only JPEG, PNG, WebP and AVIF are accepted`);
      continue;
    }
    if (file.size > MAX_BYTES) {
      rejected.push(`${file.name}: larger than 15 MB`);
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `products/${product.sku ?? product.id}/${randomUUID()}.${ext}`;
    const put = await storage().put(key, buffer, file.type);

    const row = await prisma.productImage.create({
      data: {
        productId: product.id,
        url: put.url,
        alt: product.title,
        position,
        // The first photograph a stone ever gets is its primary.
        isPrimary: position === 0,
      },
    });

    saved.push({ id: row.id, url: put.url });
    position++;
  }

  // Photographs exist now, so the bench status can move on from waiting for them.
  if (saved.length > 0 && product.intakeStatus === 'pending_images') {
    await prisma.product.update({
      where: { id: product.id },
      data: { intakeStatus: 'filter_images' },
    });
  }

  return NextResponse.json({ ok: saved.length > 0, saved, rejected });
}

/** Remove a photograph, or make a different one the primary. */
export async function PATCH(req: NextRequest) {
  const denied = await requireRoleApi('admin');
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const imageId = String(body.imageId ?? '');
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });

  if (body.action === 'delete') {
    await prisma.productImage.delete({ where: { id: imageId } });
    // If the primary went, promote whatever is now first rather than leaving
    // the stone with photographs but no lead image.
    if (image.isPrimary) {
      const next = await prisma.productImage.findFirst({
        where: { productId: image.productId },
        orderBy: { position: 'asc' },
      });
      if (next) {
        await prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'make-primary') {
    await prisma.productImage.updateMany({
      where: { productId: image.productId },
      data: { isPrimary: false },
    });
    await prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
