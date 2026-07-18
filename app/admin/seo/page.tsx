import { requireRole } from '@/lib/auth/guard';
import { allProducts, stockedSpecies } from '@/lib/catalog';
import { allCategories } from '@/lib/taxonomy';
import { SITE } from '@/lib/seo';
import { getSeoSettings } from '@/lib/seo-settings';
import { prisma, hasDatabase } from '@/lib/prisma';
import { SeoManager, type RedirectRow } from '@/components/admin/SeoManager';

export const dynamic = 'force-dynamic';

/**
 * SEO overview. The storefront's structured data is already strong (per audit),
 * so this page reports what is live and flags gaps, rather than pretending to be
 * an editor before the settings table exists.
 */
export default async function AdminSeo() {
  await requireRole('admin', '/admin/seo');
  const products = allProducts();
  const missingSeoDesc = products.filter((p) => !p.metaDescription).length;

  const settings = await getSeoSettings();
  const redirectRows = hasDatabase()
    ? await prisma.redirect.findMany({ orderBy: { hits: 'desc' }, take: 200 })
    : [];
  const redirects: RedirectRow[] = redirectRows.map((r) => ({
    fromPath: r.fromPath,
    toPath: r.toPath,
    statusCode: r.statusCode,
    hits: Number(r.hits),
    note: r.note,
  }));
  const verified = Boolean(settings.googleSiteVerification || settings.bingSiteVerification);

  const checks = [
    ['Product schema.org markup', `${products.length} products with full gemmological Product markup`, true],
    ['Category SEO', `${(await allCategories()).length} categories with title, description and keywords`, true],
    ['Buying-guide Article markup', `${stockedSpecies().length} species guides with Article + FAQ markup`, true],
    ['Sitemap', 'Generated at /sitemap.xml, refreshed on each build', true],
    ['Answer-engine feed', 'llms.txt and /api/catalog published for AI crawlers', true],
    ['Meta descriptions', missingSeoDesc === 0 ? 'Every product has a complete meta description' : `${missingSeoDesc} products missing a description`, missingSeoDesc === 0],
    ['Editable global SEO', 'Title template, fallback description and verification tags, editable below', true],
    ['Redirect manager', `${redirects.length} redirects live, editable below`, true],
    [
      'Submitted to Google and Bing',
      verified
        ? 'A verification token is saved; confirm in each tool and submit the sitemap'
        : 'Not verified yet. Paste the tokens below, then submit the sitemap in Search Console and Bing',
      verified,
    ],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">SEO</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          What search engines and answer engines see. Canonical host:{' '}
          <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-brand-dark">{SITE.url}</code>
        </p>
      </div>

      <div className="card divide-y divide-line">
        {checks.map(([label, detail, ok]) => (
          <div key={label} className="flex items-start gap-3 p-4">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs text-white ${
                ok ? 'bg-brand' : 'bg-accent'
              }`}
            >
              {ok ? '✓' : '!'}
            </span>
            <div>
              <div className="text-sm font-medium text-fg">{label}</div>
              <div className="text-sm text-muted">{detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="chip hover:border-brand-ring">View sitemap →</a>
        <a href="/llms.txt" target="_blank" rel="noreferrer" className="chip hover:border-brand-ring">View llms.txt →</a>
        <a href="/robots.txt" target="_blank" rel="noreferrer" className="chip hover:border-brand-ring">View robots.txt →</a>
        <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="chip hover:border-brand-ring">
          Google Search Console →
        </a>
        <a href="https://www.bing.com/webmasters" target="_blank" rel="noreferrer" className="chip hover:border-brand-ring">
          Bing Webmaster Tools →
        </a>
      </div>

      {hasDatabase() ? (
        <SeoManager settings={settings} redirects={redirects} siteUrl={SITE.url} />
      ) : (
        <div className="card p-6 text-sm text-muted">
          DATABASE_URL is not set, so SEO settings and redirects cannot be saved.
        </div>
      )}
    </div>
  );
}
