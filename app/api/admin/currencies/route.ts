import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireRoleApi } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * Currency rates. Prices are stored in USD and converted at display time, so
 * these values change what a visitor sees, never what an order recorded: an
 * order keeps the USD figures it was created with.
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

  const code = String(body.code ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    return NextResponse.json({ error: 'Use a three letter currency code, e.g. GBP.' }, { status: 400 });
  }
  if (code === 'USD') {
    return NextResponse.json(
      { error: 'USD is the base currency and always has a rate of 1.' },
      { status: 400 },
    );
  }

  const rate = Number(body.rate);
  if (!Number.isFinite(rate) || rate <= 0) {
    return NextResponse.json({ error: 'Rate must be greater than zero.' }, { status: 400 });
  }

  const data = {
    label: String(body.label ?? code).trim() || code,
    symbol: String(body.symbol ?? '').trim() || code,
    rate,
    locale: String(body.locale ?? 'en-US').trim() || 'en-US',
    isActive: body.isActive !== false,
  };

  await prisma.currencyRate.upsert({ where: { code }, update: data, create: { code, ...data } });

  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true });
}
