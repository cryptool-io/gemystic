import type { Metadata } from 'next';
import { CartContents } from '@/components/CartContents';

export const metadata: Metadata = {
  title: 'Your Bag',
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="wrap max-w-3xl">
      <h1 className="font-display text-3xl">Your bag</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Every stone here is one of a kind and stays on sale until someone completes a
        purchase, adding it to your bag does not reserve it.
      </p>
      <div className="mt-6">
        <CartContents />
      </div>
    </div>
  );
}
