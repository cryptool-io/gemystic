import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/guard';
import { hasRole } from '@/lib/auth/session';
import { userStore } from '@/lib/auth/store';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { PasswordForm } from '@/components/account/PasswordForm';

export const metadata: Metadata = {
  title: 'Your Account',
  robots: { index: false, follow: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const user = await requireUser('/account');
  const { denied } = await searchParams;
  const isAdmin = hasRole(user, 'admin');
  // Google-only accounts have no local password, so the form asks them to set
  // a first one rather than to confirm one that does not exist.
  const hasPassword = Boolean((await userStore().findById(user.id))?.passwordHash);

  return (
    <div className="wrap max-w-3xl">
      {denied && (
        <div className="mb-6 rounded-lg border border-accent/40 bg-accent-tint p-4 text-sm text-accent-dark">
          That area needs an admin or staff role. Your account does not have it.
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="label">Account</div>
          <h1 className="mt-1 font-display text-3xl">{user.fullName ?? 'Welcome'}</h1>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
          <span className="chip-brand mt-3 inline-flex capitalize">{user.role}</span>
        </div>
        <LogoutButton />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Card
          title="Orders"
          body="Track current orders, view past purchases, and download invoices."
          href="/account/orders"
          cta="View orders"
        />
        <Card
          title="Saved stones"
          body="The one-of-a-kind stones you have favourited. Once a stone sells it is gone."
          href="/account/saved"
          cta="View saved"
        />
        <Card
          title="Addresses"
          body="Manage the delivery addresses used at checkout."
          href="/account/addresses"
          cta="Manage addresses"
        />
        <Card
          title="Reviews"
          body="Reviews you have left on stones you have bought."
          href="/account/reviews"
          cta="Your reviews"
        />
      </div>

      <div className="mt-8">
        <PasswordForm hasPassword={hasPassword} />
      </div>

      {isAdmin && (
        <div className="mt-8 card border-brand-ring bg-brand-tint p-6">
          <h2 className="font-display text-lg text-brand-deep">Admin</h2>
          <p className="mt-1 text-sm text-brand-deep/80">
            You have admin access. Manage inventory, listings, orders, shipping and finances.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin" className="btn-primary">Open admin portal</Link>
            <Link href="/studio" className="btn-ghost">Studio (internal tools)</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({
  title, body, href, cta,
}: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="card p-6">
      <h2 className="font-display text-lg">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      <Link href={href} className="btn-ghost mt-4">{cta}</Link>
    </div>
  );
}
