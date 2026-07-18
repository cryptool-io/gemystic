import { config } from './config';

/**
 * Payment providers.
 *
 * Stripe and PayPal are the intended live rails; both need accounts the owner
 * has not opened yet. Until the keys exist a DEMO provider stands in: it runs
 * the full order lifecycle (order to payment row to sold stone to invoice to
 * emails) without moving money, so the whole flow is testable end to end.
 *
 * Demo mode is deliberately loud, every screen it touches says so. It disables
 * itself automatically the moment a real provider is configured, so there is no
 * way to accidentally ship a shop that takes fake payments.
 */

export type PaymentProvider = 'demo' | 'stripe' | 'paypal';

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export function demoMode(): boolean {
  if (stripeConfigured() || paypalConfigured()) return false;
  // Explicit opt-out for a live shop that wants the concierge flow only.
  return process.env.DEMO_PAYMENTS !== 'false';
}

export function availableProviders(): PaymentProvider[] {
  const out: PaymentProvider[] = [];
  if (stripeConfigured()) out.push('stripe');
  if (paypalConfigured()) out.push('paypal');
  if (demoMode()) out.push('demo');
  return out;
}

export const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  demo: 'Test card (demo mode)',
  stripe: 'Card payment',
  paypal: 'PayPal',
};

/** Test cards for the demo provider, so both outcomes can be exercised. */
export const DEMO_CARDS = {
  success: '4242 4242 4242 4242',
  decline: '4000 0000 0000 0002',
} as const;

export interface DemoChargeResult {
  ok: boolean;
  reference: string;
  error?: string;
}

/**
 * Simulated capture. Mirrors a real gateway's shape (reference in, decision
 * out) so swapping in Stripe means replacing this function's body, not the
 * call sites: the order, payment row, emails and invoice all stay put.
 */
export function demoCharge(cardNumber: string, orderNumber: string): DemoChargeResult {
  const digits = cardNumber.replace(/\D/g, '');
  const reference = `demo_${orderNumber}_${digits.slice(-4)}`;

  if (digits.length < 12) {
    return { ok: false, reference, error: 'That card number is too short.' };
  }
  if (digits === DEMO_CARDS.decline.replace(/\D/g, '')) {
    return { ok: false, reference, error: 'Card declined. Try the success test card.' };
  }
  return { ok: true, reference };
}

/** Shown wherever demo mode is active, so nobody mistakes it for a live charge. */
export const DEMO_NOTICE =
  'Demo mode: no money moves and no card details are stored. Use 4242 4242 4242 4242 to complete an order, or 4000 0000 0000 0002 to see a decline.';

export function siteUrl(): string {
  return config.site.url.replace(/\/$/, '');
}
