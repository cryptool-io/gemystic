import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
import { currentUser } from '@/lib/auth/session';
import { userStore } from '@/lib/auth/store';
import { googleEnabled } from '@/lib/auth/google';

export const metadata: Metadata = {
  title: 'Create Account',
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next && next.startsWith('/') ? next : '/account';

  if (await currentUser()) redirect(target);

  // Signal the "first account becomes owner" rule so setting up admin is obvious.
  const isFirstAccount = (await userStore().countUsers()) === 0;

  return (
    <div className="wrap">
      {isFirstAccount && (
        <div className="mx-auto mb-5 max-w-md rounded-lg border border-brand-ring bg-brand-tint p-4 text-sm text-brand-deep">
          <strong className="font-medium">First account setup.</strong> No accounts exist yet,
          so this one becomes the <strong>owner</strong> with full admin access. Use your own
          email.
        </div>
      )}
      <AuthForm
        mode="register"
        next={isFirstAccount ? '/admin' : target}
        googleEnabled={googleEnabled()}
      />
    </div>
  );
}
