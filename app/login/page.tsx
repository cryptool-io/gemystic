import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
import { currentUser } from '@/lib/auth/session';
import { googleEnabled } from '@/lib/auth/google';

/** Callback failures come back as ?error=; say something useful about each. */
const OAUTH_ERRORS: Record<string, string> = {
  'google-unconfigured': 'Google sign-in is not configured on this site yet.',
  'google-cancelled': 'Google sign-in was cancelled.',
  'google-state': 'That Google sign-in link expired. Please try again.',
  'google-exchange': 'Google sign-in could not be completed. Please try again.',
  'google-unverified': 'That Google account does not have a verified email address.',
};

export const metadata: Metadata = {
  title: 'Sign In',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const target = next && next.startsWith('/') ? next : '/account';

  // Already signed in, no reason to show the form.
  if (await currentUser()) redirect(target);

  return (
    <div className="wrap">
      <AuthForm
        mode="login"
        next={target}
        googleEnabled={googleEnabled()}
        initialError={error ? (OAUTH_ERRORS[error] ?? 'Sign-in failed. Please try again.') : null}
      />
    </div>
  );
}
