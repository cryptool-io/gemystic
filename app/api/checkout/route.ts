import { NextRequest, NextResponse } from 'next/server';
import { createOrder, type Address } from '@/lib/orders/store';
import { currentUser } from '@/lib/auth/session';

export const runtime = 'nodejs';

const REQUIRED: (keyof Address)[] = [
  'fullName',
  'email',
  'phone',
  'line1',
  'city',
  'countryCode',
];

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const raw = (body.address ?? {}) as Record<string, string>;
  const address: Address = {
    fullName: String(raw.fullName ?? '').trim(),
    // Phone is required by the owner's flow: the courier needs it for
    // international delivery, and it is how we reach a buyer about customs.
    phone: String(raw.phone ?? '').trim(),
    email: String(raw.email ?? '').trim().toLowerCase(),
    line1: String(raw.line1 ?? '').trim(),
    line2: String(raw.line2 ?? '').trim() || undefined,
    city: String(raw.city ?? '').trim(),
    region: String(raw.region ?? '').trim() || undefined,
    postcode: String(raw.postcode ?? '').trim() || undefined,
    countryCode: String(raw.countryCode ?? '').trim().toUpperCase(),
  };

  const missing = REQUIRED.filter((k) => !address[k]);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Please complete: ${missing.join(', ')}.` },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)) {
    return NextResponse.json({ error: 'That email address does not look right.' }, { status: 400 });
  }

  const user = await currentUser();

  const result = await createOrder({
    slugs: Array.isArray(body.slugs) ? body.slugs.map(String).slice(0, 50) : [],
    promoCode: body.promoCode ? String(body.promoCode) : null,
    address,
    shippingMethod: body.shippingMethod === 'express' ? 'express' : 'normal',
    customerNote: body.customerNote ? String(body.customerNote).slice(0, 2000) : null,
    userId: user?.id ?? null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ ok: true, orderNumber: result.orderNumber });
}
