import { requireRole } from '@/lib/auth/guard';
import { allCampaigns } from '@/lib/campaigns/store';
import { stockedSpecies } from '@/lib/catalog';
import { allCategories } from '@/lib/taxonomy';
import { CampaignManager } from '@/components/admin/CampaignManager';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  await requireRole('admin', '/admin/campaigns');
  const campaigns = await allCampaigns();
  const species = stockedSpecies().map((s) => ({ key: s.key, name: s.species.name }));
  const categories = (await allCategories()).map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Discount campaigns</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Run time-boxed offers on selected stone types or whole categories. Discounts are
          applied at display and checkout from one calculation, base prices are never
          edited, so ending a campaign restores everything automatically. If several
          campaigns match a stone, the single best discount applies; they never stack.
        </p>
      </div>

      <CampaignManager campaigns={campaigns} species={species} categories={categories} />
    </div>
  );
}
