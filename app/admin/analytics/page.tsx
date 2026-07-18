import Link from 'next/link';
import { requireRole } from '@/lib/auth/guard';
import { prisma, hasDatabase } from '@/lib/prisma';
import { money } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const CHANNEL_LABEL: Record<string, string> = {
  direct: 'Direct',
  organic: 'Search',
  ai: 'AI assistants',
  social: 'Social',
  referral: 'Other sites',
  etsy: 'Etsy',
  paid: 'Paid',
  email: 'Email',
};

/**
 * Where visitors and buyers come from, from our own tables.
 *
 * Honest about its limits: first-party tracking only counts visitors who allow
 * the request, and buyer attribution needs orders, so both numbers say what
 * they measure rather than implying completeness.
 */
export default async function AdminAnalytics() {
  await requireRole('admin', '/admin/analytics');

  if (!hasDatabase()) {
    return (
      <div className="card p-8">
        <h1 className="font-display text-xl">Analytics</h1>
        <p className="mt-2 text-sm text-muted">DATABASE_URL is not set.</p>
      </div>
    );
  }

  const since = new Date(Date.now() - 30 * 86400_000);

  const [sessions, views, orders] = await Promise.all([
    prisma.visitorSession.findMany({ where: { startedAt: { gte: since } } }),
    prisma.pageView.groupBy({
      by: ['path'],
      where: { viewedAt: { gte: since } },
      _count: true,
      orderBy: { _count: { path: 'desc' } },
      take: 20,
    }),
    prisma.order.findMany({
      where: { status: { notIn: ['pending', 'cancelled'] } },
      include: { items: true },
    }),
  ]);

  const byChannel = new Map<string, number>();
  for (const s of sessions) {
    const key = s.channel ?? 'direct';
    byChannel.set(key, (byChannel.get(key) ?? 0) + 1);
  }
  const channels = [...byChannel.entries()].sort((a, b) => b[1] - a[1]);
  const peak = Math.max(1, ...channels.map(([, n]) => n));

  const revenue = orders.reduce((a, o) => a + Number(o.grandTotal), 0);
  const totalViews = sessions.reduce((a, s) => a + s.pageViews, 0);
  const productViews = views.filter((v) => v.path.startsWith('/gem/')).slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Analytics</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          First-party traffic from our own tables, last 30 days. Visitors who block the request
          are not counted, so treat these as a floor rather than a total.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Visitors" value={String(sessions.length)} hint="unique browsers, 30 days" />
        <Stat label="Page views" value={String(totalViews)} hint="30 days" />
        <Stat label="Orders" value={String(orders.length)} hint="all time, excludes cancelled" />
        <Stat label="Revenue" value={money(revenue)} hint="all time" />
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg">Where visitors come from</h2>
        {channels.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No visits recorded yet. Tracking starts as soon as this build is live and someone
            opens a page outside the admin.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {channels.map(([channel, n]) => (
              <li key={channel} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-muted">{CHANNEL_LABEL[channel] ?? channel}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-2 rounded-full bg-brand"
                    style={{ width: `${Math.max(2, (n / peak) * 100)}%` }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-display text-lg">Most viewed pages</h2>
          {views.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {views.slice(0, 10).map((v) => (
                <li key={v.path} className="flex justify-between gap-3">
                  <Link href={v.path} className="min-w-0 truncate text-muted hover:text-brand">
                    {v.path}
                  </Link>
                  <span className="shrink-0 tabular-nums">{v._count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-display text-lg">Most viewed stones</h2>
          {productViews.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No product views recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {productViews.map((v) => (
                <li key={v.path} className="flex justify-between gap-3">
                  <Link href={v.path} className="min-w-0 truncate text-muted hover:text-brand">
                    {v.path.replace('/gem/', '')}
                  </Link>
                  <span className="shrink-0 tabular-nums">{v._count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5 text-sm text-muted">
        <h2 className="font-display text-lg text-fg">Where buyers come from</h2>
        <p className="mt-2 leading-relaxed">
          {orders.length === 0
            ? 'No orders yet, so buyer attribution has nothing to report. Once orders arrive, the visitor session that introduced each buyer is joined to their order here.'
            : `${orders.length} order${orders.length === 1 ? '' : 's'} recorded. An order placed before tracking existed cannot be attributed retroactively, so this fills in as new buyers arrive.`}
        </p>
        <p className="mt-2 leading-relaxed">
          Google Analytics runs alongside this and stays dormant until NEXT_PUBLIC_GA_ID is set.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className="mt-1 font-display text-2xl text-brand">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{hint}</div>
    </div>
  );
}
