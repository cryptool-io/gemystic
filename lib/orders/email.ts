import 'server-only';
import { prisma } from '../prisma';
import { mailer } from '../services/mailer';
import { config } from '../config';
import { money } from '../seo';

/**
 * Order emails, one typed sender per event (Trust-Agent's lib/email-templates
 * pattern). Every send is written to email_log so "did the customer get told?"
 * is answerable from the admin instead of from someone's memory.
 */

type Template =
  | 'order_confirmation'
  | 'order_paid_team'
  | 'order_processing'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'review_request';

interface OrderLike {
  id: string;
  orderNumber: string;
  grandTotal: unknown;
  guestEmail: string | null;
  shippingAddress: unknown;
  items: { titleSnapshot: string; unitPrice: unknown }[];
  user?: { email: string; fullName: string | null } | null;
}

function addressOf(order: OrderLike) {
  return (order.shippingAddress ?? {}) as Record<string, string>;
}

export function customerEmail(order: OrderLike): string {
  return order.user?.email ?? order.guestEmail ?? addressOf(order).email ?? '';
}

function itemLines(order: OrderLike): string {
  return order.items
    .map((i) => `  - ${i.titleSnapshot}: ${money(Number(i.unitPrice))}`)
    .join('\n');
}

function siteUrl(): string {
  return config.site.url.replace(/\/$/, '');
}

async function send(
  order: OrderLike,
  template: Template,
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  if (!to) return;
  let status = 'sent';
  let errorMessage: string | null = null;
  let providerRef: string | null = null;

  try {
    const result = await mailer().send({ to, subject, text });
    providerRef = result.id;
    if (!result.delivered) status = 'queued';
  } catch (err) {
    status = 'failed';
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  await prisma.emailLog.create({
    data: {
      template,
      toAddress: to,
      subject,
      orderId: order.id,
      driver: config.mail.driver,
      providerRef,
      status,
      errorMessage,
      sentAt: status === 'sent' ? new Date() : null,
    },
  });
}

export async function sendOrderConfirmation(order: OrderLike): Promise<void> {
  const addr = addressOf(order);
  await send(
    order,
    'order_confirmation',
    customerEmail(order),
    `Order ${order.orderNumber} confirmed`,
    [
      `Thank you${addr.fullName ? `, ${addr.fullName}` : ''}.`,
      '',
      `Your order ${order.orderNumber} is confirmed and paid.`,
      '',
      'Stones:',
      itemLines(order),
      '',
      `Total paid: ${money(Number(order.grandTotal))}`,
      '',
      `Shipping to: ${[addr.line1, addr.line2, addr.city, addr.region, addr.postcode, addr.countryCode].filter(Boolean).join(', ')}`,
      `Method: ${addr.shippingLabel ?? 'Normal'}`,
      '',
      `Invoice: ${siteUrl()}/order/${order.orderNumber}/invoice`,
      `Order status: ${siteUrl()}/order/${order.orderNumber}`,
      '',
      'Each stone is one of a kind, so yours is now reserved for you alone and',
      'has been removed from the shop. We will email you again the moment it ships.',
    ].join('\n'),
  );
}

/** Owner request: "emailing team members in case of an order". */
export async function sendTeamOrderNotice(order: OrderLike): Promise<void> {
  const addr = addressOf(order);
  // Explicit subscribers first; otherwise everyone who can act on an order,
  // so a new shop notifies its team without anyone configuring anything.
  const subscribers = await prisma.notificationSubscription.findMany({
    where: { event: 'order_placed', channel: 'email' },
    select: { user: { select: { email: true } } },
  });

  let recipients = subscribers.map((s) => s.user.email);
  if (recipients.length === 0) {
    const staff = await prisma.user.findMany({
      where: { role: { in: ['staff', 'admin', 'owner'] }, archivedAt: null },
      select: { email: true },
    });
    recipients = staff.map((s) => s.email);
  }
  if (recipients.length === 0) recipients = [config.mail.to];

  for (const to of recipients) {
    await send(
      order,
      'order_paid_team',
      to,
      `New order ${order.orderNumber}: ${money(Number(order.grandTotal))}`,
      [
        `A new order has been paid.`,
        '',
        `Order: ${order.orderNumber}`,
        `Customer: ${addr.fullName ?? ''} <${customerEmail(order)}> ${addr.phone ?? ''}`,
        `Total: ${money(Number(order.grandTotal))}`,
        `Shipping: ${addr.shippingLabel ?? 'Normal'} to ${addr.countryCode ?? ''}`,
        '',
        'Stones:',
        itemLines(order),
        '',
        `Admin: ${siteUrl()}/admin/orders/${order.orderNumber}`,
        '',
        'Next steps: prepare the parcel, generate the export documents, then enter',
        'the carrier and tracking number to notify the customer automatically.',
      ].join('\n'),
    );
  }
}

export async function sendStatusEmail(
  order: OrderLike,
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled',
  extra?: { carrier?: string; tracking?: string; trackingUrl?: string },
): Promise<void> {
  const addr = addressOf(order);
  const greeting = `Hello${addr.fullName ? ` ${addr.fullName}` : ''},`;

  const bodies: Record<typeof status, { subject: string; text: string }> = {
    processing: {
      subject: `Order ${order.orderNumber} is being prepared`,
      text: [
        greeting,
        '',
        `Your order ${order.orderNumber} is being prepared for dispatch. We are`,
        'photographing the parcel contents and completing the export paperwork.',
        '',
        `Track progress: ${siteUrl()}/order/${order.orderNumber}`,
      ].join('\n'),
    },
    shipped: {
      subject: `Order ${order.orderNumber} has shipped`,
      text: [
        greeting,
        '',
        `Your order ${order.orderNumber} is on its way.`,
        '',
        extra?.carrier ? `Carrier: ${extra.carrier}` : '',
        extra?.tracking ? `Tracking number: ${extra.tracking}` : '',
        extra?.trackingUrl ? `Track it: ${extra.trackingUrl}` : '',
        '',
        'The parcel is insured for its full declared value and requires a',
        'signature on delivery.',
        '',
        `Order: ${siteUrl()}/order/${order.orderNumber}`,
      ]
        .filter(Boolean)
        .join('\n'),
    },
    delivered: {
      subject: `Order ${order.orderNumber} delivered`,
      text: [
        greeting,
        '',
        `Our carrier reports that order ${order.orderNumber} has been delivered.`,
        '',
        'If anything is not exactly as described, reply to this email within the',
        `${14} day return window and we will make it right.`,
      ].join('\n'),
    },
    cancelled: {
      subject: `Order ${order.orderNumber} cancelled`,
      text: [
        greeting,
        '',
        `Order ${order.orderNumber} has been cancelled and the stones returned to`,
        'the shop. Any payment taken is refunded to the original method.',
      ].join('\n'),
    },
  };

  const body = bodies[status];
  await send(order, `order_${status}` as Template, customerEmail(order), body.subject, body.text);
}

/** Post-delivery ask, the step the owner's WhatsApp flow ends on. */
export async function sendReviewRequest(order: OrderLike): Promise<void> {
  const addr = addressOf(order);
  const first = order.items[0];
  await send(
    order,
    'review_request',
    customerEmail(order),
    `How is your ${first?.titleSnapshot ?? 'gemstone'}?`,
    [
      `Hello${addr.fullName ? ` ${addr.fullName}` : ''},`,
      '',
      'Your parcel should be with you by now. If you have a moment, a short review',
      'helps other buyers judge stones they cannot hold in their hand.',
      '',
      `Leave a review: ${siteUrl()}/reviews`,
      '',
      'If something is wrong instead, reply to this email and we will fix it.',
    ].join('\n'),
  );
}
