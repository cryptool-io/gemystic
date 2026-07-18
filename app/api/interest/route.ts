import { NextRequest, NextResponse } from 'next/server';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { config } from '@/lib/config';
import { getProduct } from '@/lib/catalog';

export const runtime = 'nodejs';

/**
 * "Someone is shopping for this stone" signal.
 *
 * When a visitor adds a one-of-a-kind stone to their cart, other visitors see
 * an urgency indicator for the next 30 minutes. Only ever TRUE data: an entry
 * exists solely because a real add-to-cart happened, and it expires. Fake
 * urgency ("3 people are viewing!") cheapens a luxury brand; real scarcity on
 * unique goods is legitimate to surface.
 *
 * Shape on disk: { [slug]: lastAddedAtISO }
 */
const PATH = join(config.paths.var, 'interest.json');
const TTL_MS = 30 * 60 * 1000;

async function read(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(PATH, 'utf8'));
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const slug = String(body.slug ?? '');
  if (!slug || !getProduct(slug)) {
    return NextResponse.json({ error: 'Unknown product.' }, { status: 400 });
  }

  const map = await read();
  const now = Date.now();
  // Sweep expired entries while we are here.
  for (const [k, v] of Object.entries(map)) {
    if (now - new Date(v).getTime() > TTL_MS) delete map[k];
  }
  map[slug] = new Date(now).toISOString();

  await mkdir(dirname(PATH), { recursive: true });
  await writeFile(PATH, JSON.stringify(map, null, 2), 'utf8');
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const map = await read();
  const at = map[slug];
  const active = Boolean(at && Date.now() - new Date(at).getTime() <= TTL_MS);
  return NextResponse.json(
    { active },
    { headers: { 'cache-control': 'no-store' } },
  );
}
