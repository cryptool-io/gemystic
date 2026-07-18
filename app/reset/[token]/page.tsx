import type { Metadata } from 'next';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';

export const metadata: Metadata = {
  title: 'Reset Password',
  robots: { index: false, follow: false },
};

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <div className="wrap">
      <PasswordResetForm mode="reset" token={token} />
    </div>
  );
}
