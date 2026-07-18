import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireRoleApi } from '@/lib/auth/guard';
import { saveSeoSettings, type SeoSettings } from '@/lib/seo-settings';
import { prisma } from '@/lib/prisma';

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

  const action = String(body.action ?? 'settings');

  if (action === 'settings') {
    const patch: Partial<SeoSettings> = {
      titleTemplate: String(body.titleTemplate ?? '').trim() || '%s | Gemystic Gems',
      defaultDescription: String(body.defaultDescription ?? '').trim(),
      googleSiteVerification: String(body.googleSiteVerification ?? '').trim(),
      bingSiteVerification: String(body.bingSiteVerification ?? '').trim(),
      indexNowKey: String(body.indexNowKey ?? '').trim(),
      noindexEverything: Boolean(body.noindexEverything),
    };
    await saveSeoSettings(patch);
    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true });
  }

  if (action === 'add-redirect') {
    const fromPath = normalisePath(String(body.fromPath ?? ''));
    const toPath = String(body.toPath ?? '').trim();
    if (!fromPath || !toPath) {
      return NextResponse.json({ error: 'Both paths are required.' }, { status: 400 });
    }
    if (fromPath === toPath) {
      return NextResponse.json({ error: 'That redirect would loop.' }, { status: 400 });
    }
    await prisma.redirect.upsert({
      where: { fromPath },
      update: { toPath, statusCode: Number(body.statusCode) === 302 ? 302 : 301, note: str(body.note) },
      create: {
        fromPath,
        toPath,
        statusCode: Number(body.statusCode) === 302 ? 302 : 301,
        note: str(body.note),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete-redirect') {
    await prisma.redirect.deleteMany({ where: { fromPath: String(body.fromPath ?? '') } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}

function normalisePath(v: string): string {
  const s = v.trim();
  if (!s) return '';
  // Accept a full URL pasted from the old site and keep just the path.
  try {
    if (s.startsWith('http')) return new URL(s).pathname;
  } catch {
    // Not a URL; fall through.
  }
  return s.startsWith('/') ? s : `/${s}`;
}

function str(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length > 0 ? s : null;
}
