import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { config } from '@/lib/config';

export const runtime = 'nodejs';

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

/**
 * Serves runtime uploads when STORAGE_DRIVER=local.
 *
 * `public/` is not usable for this: Next only indexes it at build time, so files
 * written after a deploy would 404 until the next build. On S3 this route is
 * bypassed entirely, storage.urlFor() returns the bucket URL directly.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const rel = key.join('/');

  // Path traversal guard: resolve, then confirm the result is still inside the
  // uploads root before touching the filesystem.
  const root = normalize(join(process.cwd(), config.paths.uploads));
  const target = normalize(join(root, rel));
  if (!target.startsWith(root)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) return new NextResponse('Not found', { status: 404 });

    const body = await readFile(target);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'content-type': TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
        'content-length': String(info.size),
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
