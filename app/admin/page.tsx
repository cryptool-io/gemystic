import Link from 'next/link';
import { allProducts, priceStats } from '@/lib/catalog';
import { allCategories } from '@/lib/taxonomy';
import { inventorySummary } from '@/lib/finance';
import { userStore } from '@/lib/auth/store';
import { money } from '@/lib/seo';
import { hasApiKey } from '@/lib/ai';
import { deploymentProfile } from '@/lib/config';

export default async function AdminOverview() {
  const products = allProducts();
  const stats = priceStats();
  const summary = inventorySummary();
  const users = await userStore().listUsers();
  const admins = users.filter((u) => u.role === 'admin' || u.role === 'owner').length;
  const profile = deploymentProfile();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl">Overview</h1>
        <p className="mt-1 text-sm text-muted">
          Everything you can manage. This portal is gated by role, customers never see it.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Live listings" value={String(products.length)} href="/admin/catalogue" />
        <Stat label="Retail value" value={money(summary.retailValue)} sub={`avg ${money(stats.avg)}`} href="/admin/catalogue" />
        <Stat label="Categories" value={String((await allCategories()).length)} href="/admin/categories" />
        <Stat label="Team members" value={String(users.length)} sub={`${admins} with admin`} href="/admin/team" />
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg">Manage</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Panel title="Catalogue" body="Products, images, pricing, publish state. Currently sourced from the generated catalogue; full CRUD lands with the Postgres migration." href="/admin/catalogue" />
          <Panel title="Categories" body="Add and reorder the categories that structure the shop, and edit their SEO." href="/admin/categories" />
          <Panel title="Discounts & campaigns" body="Create percentage offers and promo codes (like LAUNCH15), scoped to stone types or categories, with start and end dates." href="/admin/campaigns" />
          <Panel title="Market check" body="Compare our per-carat pricing against researched retail market ranges." href="/admin/market" />
          <Panel title="Orders" body="View and fulfil orders, print packing lists and export documents." href="/admin/orders" />
          <Panel title="Reviews" body="Approve, reply to and remove customer reviews." href="/admin/reviews" />
          <Panel title="Team" body="Invite staff and grant admin access. Only the owner can create admins." href="/admin/team" />
          <Panel title="SEO" body="Global meta, sitemap, and per-page overrides." href="/admin/seo" />
          <Panel title="Analytics" body="Where visitors and buyers come from, and which stones convert." href="/admin/analytics" />
          <Panel title="AI listing" body="Draft a full listing from a photo and notes, priced against comparable stock." href="/studio/listings" />
          <Panel title="Finance & system" body="Margins, channel economics, deployment health." href="/studio/finance" />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-base">System</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className={`chip ${profile.fullyLocal ? 'chip-brand' : ''}`}>
            {profile.fullyLocal ? 'Fully self-hosted' : `AWS: ${profile.aws.join(', ')}`}
          </span>
          <span className="chip">Mail: {profile.mail}</span>
          <span className="chip">Storage: {profile.storage}</span>
          <span className={`chip ${hasApiKey() ? 'chip-brand' : ''}`}>
            AI: {hasApiKey() ? 'on' : 'off'}
          </span>
          <Link href="/studio/system" className="chip hover:border-brand-ring hover:text-brand-dark">
            Full system view →
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: string; sub?: string; href: string }) {
  return (
    <Link href={href} className="card p-5 transition hover:border-brand-ring">
      <div className="label">{label}</div>
      <div className="mt-2 font-display text-2xl text-brand">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </Link>
  );
}

function Panel({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <Link href={href} className="card p-5 transition hover:border-brand-ring">
      <h3 className="font-display text-base text-brand-deep">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
    </Link>
  );
}
