import 'server-only';
import { prisma } from '../prisma';
import { getProduct } from '../catalog';
import { campaignByCode, effectivePrice } from '../campaigns/store';
import { soldMap, markSold } from '../sold';
import { SITE } from '../seo';
import type { Product } from '../types';

/**
 * Orders.
 *
 * The rule that shapes this module: the browser never sets a price. It sends
 * slugs and a promo code; every amount on the order is recomputed here from the
 * catalogue and the live campaign, using the same rounding the cart displays
 * (per item, then summed), so cart, checkout, charge and invoice cannot
 * disagree by a cent.
 *
 * Each stone is one of a kind, so an item that is already sold is rejected
 * rather than silently dropped: the buyer must see what changed before paying.
 */

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

/** Forward-only pipeline, mirroring the owner's step 4-6 flow. */
export const STATUS_FLOW: OrderStatus[] = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
];

export interface Address {
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postcode?: string;
  countryCode: string;
}

export interface DraftInput {
  slugs: string[];
  promoCode?: string | null;
  address: Address;
  shippingMethod: 'normal' | 'express';
  customerNote?: string | null;
  userId?: string | null;
}

export interface DraftResult {
  ok: boolean;
  error?: string;
  orderNumber?: string;
}

/**
 * Delivery profiles (owner spec step 1): two speeds, flat by weight class for
 * now. Free normal shipping over the published threshold, or when a promo
 * grants it. Express is never free: it is a real courier upcharge.
 */
export const SHIPPING = {
  normal: { label: 'Normal (insured, tracked)', usd: 25, days: '7 to 14 business days' },
  express: { label: 'Express (DHL/FedEx priority)', usd: 60, days: '3 to 5 business days' },
} as const;

export interface PricedLine {
  product: Product;
  unitPrice: number;
  discounted: boolean;
}

export interface Totals {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  grandTotal: number;
  freeShipping: boolean;
  promoName: string | null;
}

/** The single pricing path: cart preview, order creation and invoice all call this. */
export async function priceCart(
  slugs: string[],
  promoCode: string | null | undefined,
  shippingMethod: 'normal' | 'express',
): Promise<Totals> {
  const sold = soldMap();
  const lines: PricedLine[] = [];

  for (const slug of slugs) {
    const product = getProduct(slug);
    if (!product) continue;
    if (sold[product.etsyId]) continue;
    const pricing = await effectivePrice(product);
    lines.push({
      product,
      unitPrice: pricing.priceUsd,
      discounted: pricing.originalUsd != null,
    });
  }

  const subtotal = round2(lines.reduce((a, l) => a + l.unitPrice, 0));

  // Promo: same scope rule as the cart (empty arrays match everything),
  // rounded per item then summed.
  const promo = promoCode ? await campaignByCode(promoCode) : null;
  let discount = 0;
  if (promo) {
    for (const l of lines) {
      const speciesOk = promo.species.length === 0 || promo.species.includes(l.product.species);
      const categoryOk =
        promo.categories.length === 0 || promo.categories.includes(l.product.category);
      if (speciesOk && categoryOk) {
        discount += Math.round(l.unitPrice * promo.percentOff) / 100;
      }
    }
    discount = round2(discount);
  }

  const afterDiscount = round2(subtotal - discount);
  const freeShipping =
    shippingMethod === 'normal' &&
    (afterDiscount >= SITE.policy.freeShippingOver || Boolean(promo?.freeShipping));
  const shipping = freeShipping ? 0 : SHIPPING[shippingMethod].usd;

  return {
    lines,
    subtotal,
    discount,
    shipping,
    grandTotal: round2(afterDiscount + shipping),
    freeShipping,
    promoName: promo?.name ?? null,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** GEM-YYYY-NNNN, sequential within the year. */
async function nextOrderNumber(): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `GEM-${year}-`;
  const last = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });
  const n = last ? Number(last.orderNumber.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, '0')}`;
}

export async function createOrder(input: DraftInput): Promise<DraftResult> {
  if (input.slugs.length === 0) return { ok: false, error: 'Your cart is empty.' };

  const sold = soldMap();
  const unavailable = input.slugs.filter((s) => {
    const p = getProduct(s);
    return !p || sold[p.etsyId];
  });
  if (unavailable.length > 0) {
    return {
      ok: false,
      error:
        'One of these stones has just sold. Please review your cart, the totals have changed.',
    };
  }

  const totals = await priceCart(input.slugs, input.promoCode, input.shippingMethod);
  if (totals.lines.length === 0) return { ok: false, error: 'Your cart is empty.' };

  const orderNumber = await nextOrderNumber();

  await prisma.order.create({
    data: {
      orderNumber,
      userId: input.userId ?? null,
      guestEmail: input.userId ? null : input.address.email,
      status: 'pending',
      subtotal: totals.subtotal,
      shippingTotal: totals.shipping,
      discountTotal: totals.discount,
      grandTotal: totals.grandTotal,
      shippingAddress: {
        ...input.address,
        shippingMethod: input.shippingMethod,
        shippingLabel: SHIPPING[input.shippingMethod].label,
      },
      customerNote: input.customerNote ?? null,
      items: {
        create: totals.lines.map((l) => ({
          titleSnapshot: l.product.title,
          skuSnapshot: l.product.etsyId,
          imageSnapshot: l.product.image,
          specsSnapshot: {
            slug: l.product.slug,
            species: l.product.species,
            caratWeight: l.product.caratWeight ?? null,
            gramWeight: l.product.gramWeight ?? null,
            cut: l.product.cut ?? null,
            colour: l.product.color,
            origin: l.product.origin,
            treatment: l.product.treatment,
            shipsFrom: l.product.shipsFrom,
          },
          unitPrice: l.unitPrice,
          quantity: 1,
          lineTotal: l.unitPrice,
        })),
      },
    },
  });

  return { ok: true, orderNumber };
}

export async function getOrder(orderNumber: string) {
  return prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      payments: { orderBy: { createdAt: 'desc' } },
      shipments: { include: { documents: true }, orderBy: { createdAt: 'desc' } },
      user: { select: { email: true, fullName: true } },
    },
  });
}

export async function listOrders(filter?: { status?: string; q?: string }) {
  return prisma.order.findMany({
    where: {
      ...(filter?.status && filter.status !== 'all' ? { status: filter.status } : {}),
      ...(filter?.q
        ? {
            OR: [
              { orderNumber: { contains: filter.q, mode: 'insensitive' as const } },
              { guestEmail: { contains: filter.q, mode: 'insensitive' as const } },
              { items: { some: { titleSnapshot: { contains: filter.q, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    },
    include: { items: true, payments: true, user: { select: { email: true } } },
    orderBy: { placedAt: 'desc' },
    take: 200,
  });
}

/**
 * Marks an order paid: records the payment, takes the stones off the market and
 * stamps paidAt. Idempotent on (provider, providerRef) so a retried webhook or a
 * double-clicked button cannot charge or sell twice.
 */
export async function markPaid(
  orderNumber: string,
  payment: { provider: string; providerRef: string; amount: number; raw?: unknown },
): Promise<{ ok: boolean; error?: string; alreadyPaid?: boolean }> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  if (!order) return { ok: false, error: 'Order not found.' };
  if (order.status !== 'pending') return { ok: true, alreadyPaid: true };

  const existing = await prisma.payment.findUnique({
    where: {
      provider_providerRef: { provider: payment.provider, providerRef: payment.providerRef },
    },
  });
  if (existing) return { ok: true, alreadyPaid: true };

  await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: payment.provider,
      providerRef: payment.providerRef,
      status: 'captured',
      amount: payment.amount,
      rawResponse: (payment.raw ?? null) as never,
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'paid', paidAt: new Date() },
  });

  // One-of-a-kind: the moment it is paid for, it leaves both channels.
  const etsyIds = order.items.map((i) => i.skuSnapshot).filter((v): v is string => Boolean(v));
  if (etsyIds.length > 0) await markSold(etsyIds);

  return { ok: true };
}

export async function advanceStatus(
  orderNumber: string,
  next: OrderStatus,
): Promise<{ ok: boolean; error?: string }> {
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) return { ok: false, error: 'Order not found.' };

  if (next === 'cancelled' || next === 'refunded') {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: next, cancelledAt: next === 'cancelled' ? new Date() : undefined },
    });
    return { ok: true };
  }

  const from = STATUS_FLOW.indexOf(order.status as OrderStatus);
  const to = STATUS_FLOW.indexOf(next);
  if (to === -1) return { ok: false, error: 'Unknown status.' };
  // Forward-only: an order cannot un-ship. Corrections are cancel plus a note.
  if (to <= from) return { ok: false, error: 'That status is not a step forward.' };

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: next,
      ...(next === 'paid' && !order.paidAt ? { paidAt: new Date() } : {}),
    },
  });
  return { ok: true };
}
