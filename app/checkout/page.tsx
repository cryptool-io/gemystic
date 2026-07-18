import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/CheckoutForm';
import { currentUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  // Guest checkout is allowed: asking a first-time buyer of a one-of-a-kind
  // stone to create an account first is the classic way to lose the sale.
  const user = await currentUser();

  return (
    <div className="wrap">
      <h1 className="mb-6 font-display text-2xl sm:text-3xl">Checkout</h1>
      <CheckoutForm
        defaults={user ? { email: user.email, fullName: user.fullName ?? '' } : null}
      />
    </div>
  );
}
