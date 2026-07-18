import { NextRequest, NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import { advanceStatus, getOrder, markPaid, type OrderStatus } from '@/lib/orders/store';
import { sendOrderConfirmation, sendStatusEmail, sendTeamOrderNotice, sendReviewRequest } from '@/lib/orders/email';

export const runtime = 'nodejs';

/**
 * Admin order actions. One route, action-dispatched, because every one of them
 * is "change the order then tell the customer" and the notification must not be
 * a separate thing anyone can forget to do.
 */
export async function POST(req: NextRequest) {
  const denied = await requireRoleApi('staff');
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const orderNumber = String(body.orderNumber ?? '');
  const action = String(body.action ?? '');
  const order = await getOrder(orderNumber);
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  switch (action) {
    /** Bank transfer, cash, WhatsApp concierge deals: paid outside the gateway. */
    case 'confirm-manual-payment': {
      const result = await markPaid(orderNumber, {
        provider: 'manual',
        providerRef: `manual_${orderNumber}`,
        amount: Number(order.grandTotal),
        raw: { note: String(body.note ?? ''), by: 'admin' },
      });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      if (!result.alreadyPaid) {
        const paid = await getOrder(orderNumber);
        if (paid) {
          await sendOrderConfirmation(paid);
          await sendTeamOrderNotice(paid);
        }
      }
      return NextResponse.json({ ok: true });
    }

    case 'advance': {
      const next = String(body.status ?? '') as OrderStatus;
      const result = await advanceStatus(orderNumber, next);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

      const updated = await getOrder(orderNumber);
      if (updated && ['processing', 'delivered', 'cancelled'].includes(next)) {
        await sendStatusEmail(updated, next as 'processing' | 'delivered' | 'cancelled');
      }
      // Delivered closes the loop the owner's flow ends on: ask for a review.
      if (updated && next === 'delivered') await sendReviewRequest(updated);
      return NextResponse.json({ ok: true });
    }

    /** Step 5/6: create the shipment, generate docs, notify on dispatch. */
    case 'ship': {
      const carrier = String(body.carrier ?? '').trim();
      const trackingNumber = String(body.trackingNumber ?? '').trim();
      const shipsFrom = body.shipsFrom === 'TH' ? 'TH' : 'PK';
      if (!carrier) return NextResponse.json({ error: 'Carrier is required.' }, { status: 400 });

      const trackingUrl = trackingNumber
        ? `https://www.google.com/search?q=${encodeURIComponent(`${carrier} tracking ${trackingNumber}`)}`
        : null;

      const shipment = await prisma.shipment.create({
        data: {
          orderId: order.id,
          shipsFrom,
          carrier,
          serviceLevel: (order.shippingAddress as Record<string, string>).shippingLabel ?? null,
          trackingNumber: trackingNumber || null,
          trackingUrl,
          status: 'dispatched',
          // Policy: declare the true value. Under-declaring is fraud and voids
          // the insurance that makes shipping stones viable at all.
          declaredValue: Number(order.grandTotal),
          insured: true,
          dispatchedAt: new Date(),
          documents: {
            create: [
              { docType: 'commercial_invoice', reference: order.orderNumber, issuedAt: new Date() },
              { docType: 'packing_list', reference: order.orderNumber, issuedAt: new Date() },
              {
                docType: 'certificate_of_origin',
                reference: order.orderNumber,
                issuedAt: new Date(),
                notes: shipsFrom === 'TH' ? 'Origin: Thailand' : 'Origin: Pakistan',
              },
            ],
          },
        },
      });

      await advanceStatus(orderNumber, 'shipped');
      const shipped = await getOrder(orderNumber);
      if (shipped) {
        await sendStatusEmail(shipped, 'shipped', {
          carrier,
          tracking: trackingNumber,
          trackingUrl: trackingUrl ?? undefined,
        });
      }
      return NextResponse.json({ ok: true, shipmentId: shipment.id });
    }

    case 'note': {
      await prisma.order.update({
        where: { id: order.id },
        data: { internalNote: String(body.note ?? '').slice(0, 4000) },
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }
}
