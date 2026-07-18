import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Studio',
  robots: { index: false, follow: false },
};

const TABS = [
  ['/studio', 'Overview'],
  ['/studio/listings', 'Auto-listing'],
  ['/studio/finance', 'Finance'],
  ['/studio/system', 'System'],
] as const;

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap">
      <div className="mb-8 border-b border-line pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="label">Internal</div>
            <h1 className="mt-1 font-display text-3xl">Gemystic Studio</h1>
          </div>
          <Link href="/" className="btn-ghost">View storefront →</Link>
        </div>

        <nav className="mt-6 flex gap-2">
          {TABS.map(([href, label]) => (
            <Link key={href} href={href} className="chip transition hover:border-brand/60 hover:text-brand-dark">
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {children}
    </div>
  );
}
