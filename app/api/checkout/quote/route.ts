import { NextRequest, NextResponse } from 'next/server';
import { priceCart, SHIPPING } from '@/lib/orders/store';

export const runtime = 'nodejs';

/**
 * Server-priced cart preview. The checkout page never adds up money itself; it
 * asks for a quote, so what the buyer sees is exactly what will be charged.
 */
export async function POST(req: NextRequest) {
  let body: { slugs?: unknown; promoCode?: unknown; shippingMethod?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const slugs = Array.isArray(body.slugs) ? body.slugs.map(String).slice(0, 50) : [];
  const method = body.shippingMethod === 'express' ? 'express' : 'normal';
  const totals = await priceCart(slugs, body.promoCode ? String(body.promoCode) : null, method);

  return NextResponse.json({
    lines: totals.lines.map((l) => ({
      slug: l.product.slug,
      title: l.product.title,
      image: l.product.image,
      unitPrice: l.unitPrice,
      discounted: l.discounted,
    })),
    subtotal: totals.subtotal,
    discount: totals.discount,
    shipping: totals.shipping,
    grandTotal: totals.grandTotal,
    freeShipping: totals.freeShipping,
    promoName: totals.promoName,
    unavailable: slugs.filter((s) => !totals.lines.some((l) => l.product.slug === s)),
    shippingOptions: SHIPPING,
  });
}
