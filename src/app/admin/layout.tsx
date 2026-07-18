import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/guard';
import { Logo } from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

const NAV: [string, string][] = [
  ['/admin', 'Overview'],
  ['/admin/catalogue', 'Catalogue'],
  ['/admin/categories', 'Categories'],
  ['/admin/orders', 'Orders'],
  ['/admin/etsy-sync', 'Etsy sync'],
  ['/admin/campaigns', 'Campaigns'],
  ['/admin/reviews', 'Reviews'],
  ['/admin/team', 'Team'],
  ['/admin/seo', 'SEO'],
  ['/admin/analytics', 'Analytics'],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Everything under /admin requires at least staff; the guard redirects
  // customers to /account?denied and signed-out visitors to /login.
  const user = await requireRole('staff', '/admin');

  return (
    <div className="wrap">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          <Logo markClass="h-6 w-6" />
          <span className="chip">Admin</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted">
            {user.fullName ?? user.email} · <span className="capitalize text-brand">{user.role}</span>
          </span>
          <Link href="/" className="btn-ghost">View shop →</Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[190px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Admin">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-brand-tint hover:text-brand-dark"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
