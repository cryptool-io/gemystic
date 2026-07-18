import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';
import { currentUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Forgot Password',
  robots: { index: false, follow: false },
};

export default async function ForgotPage() {
  if (await currentUser()) redirect('/account');

  return (
    <div className="wrap">
      <PasswordResetForm mode="request" />
    </div>
  );
}
