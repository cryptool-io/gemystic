import { NextRequest, NextResponse } from 'next/server';
import { getOrder, markPaid } from '@/lib/orders/store';
import { sendOrderConfirmation, sendTeamOrderNotice } from '@/lib/orders/email';
import { demoCharge, demoMode } from '@/lib/payments';

export const runtime = 'nodejs';

/**
 * Demo capture. A real Stripe integration replaces the demoCharge call with a
 * PaymentIntent confirmation and moves this logic behind the webhook; the
 * order, payment row, stock and email side effects stay exactly as they are.
 */
export async function POST(req: NextRequest) {
  if (!demoMode()) {
    return NextResponse.json(
      { error: 'Demo payments are disabled because a live provider is configured.' },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const orderNumber = String(body.orderNumber ?? '');
  const order = await getOrder(orderNumber);
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (order.status !== 'pending') {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  const charge = demoCharge(String(body.cardNumber ?? ''), orderNumber);
  if (!charge.ok) {
    return NextResponse.json({ error: charge.error }, { status: 402 });
  }

  const result = await markPaid(orderNumber, {
    provider: 'demo',
    providerRef: charge.reference,
    amount: Number(order.grandTotal),
    raw: { mode: 'demo', at: new Date().toISOString() },
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  // Emails are best-effort: a mail outage must not lose a paid order.
  const paid = await getOrder(orderNumber);
  if (paid && !result.alreadyPaid) {
    try {
      await sendOrderConfirmation(paid);
      await sendTeamOrderNotice(paid);
    } catch {
      // Logged in email_log by the sender itself.
    }
  }

  return NextResponse.json({ ok: true });
}
