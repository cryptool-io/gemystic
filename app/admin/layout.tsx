import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/guard';
import { Logo } from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

/**
 * Nav follows the owner's pipeline in order (inventory, listings, orders,
 * shipping, finances) with the supporting tools below it, so the sequence a
 * stone travels is the sequence on screen. Step numbers are the owner's own.
 */
const PIPELINE: [string, string, string][] = [
  ['/admin/inventory', 'Inventory', '1'],
  ['/admin/listings', 'Listings', '2 & 3'],
  ['/admin/orders', 'Orders', '4 & 5'],
  ['/admin/shipping', 'Shipping', '6'],
  ['/admin/finances', 'Finances', '7'],
];

const TOOLS: [string, string][] = [
  ['/admin', 'Overview'],
  ['/admin/categories', 'Categories'],
  ['/admin/etsy-sync', 'Etsy sync'],
  ['/admin/campaigns', 'Discounts'],
  ['/admin/market', 'Market check'],
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
          <div className="label hidden px-3 pb-1 lg:block">Pipeline</div>
          {PIPELINE.map(([href, label, step]) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-brand-tint hover:text-brand-dark"
            >
              {label}
              <span className="hidden text-[10px] text-subtle lg:inline">{step}</span>
            </Link>
          ))}

          <div className="label hidden px-3 pb-1 pt-4 lg:block">Tools</div>
          {TOOLS.map(([href, label]) => (
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
