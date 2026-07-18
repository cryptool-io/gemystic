import { requireRole } from '@/lib/auth/guard';
import { Pending } from '@/components/admin/Pending';

export default async function AdminAnalytics() {
  await requireRole('admin', '/admin/analytics');
  return (
    <Pending
      title="Analytics"
      summary="First-party analytics and attribution — where visitors and buyers come from, kept in our own database rather than sent to a third party."
      willDo={[
        'Traffic by channel: organic, direct, social, AI answer engines, referral, paid.',
        'UTM capture on first touch, held across the session and tied to any resulting order.',
        'The question that matters: where BUYERS come from, not just visitors — revenue by source.',
        'Top landing pages, top products by views-to-sale, and search terms used on site.',
        'No cookie banner headache: first-party, no third-party trackers, ad-blocker resilient.',
      ]}
      dependsOn="the analytics tables (visitor_sessions, page_views, order_attribution)"
    />
  );
}
