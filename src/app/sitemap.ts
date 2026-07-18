import type { MetadataRoute } from 'next';
import { allProducts, stockedSpecies, GENERATED_AT } from '@/lib/catalog';
import { SITE } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date(GENERATED_AT);

  const statics: MetadataRoute.Sitemap = [
    { url: SITE.url, changeFrequency: 'daily' as const, priority: 1 },
    { url: `${SITE.url}/shop`, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${SITE.url}/collections`, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${SITE.url}/collections/birthstones`, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${SITE.url}/learn`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${SITE.url}/contact`, changeFrequency: 'yearly' as const, priority: 0.6 },
    ...['shipping', 'returns', 'privacy', 'terms'].map((p) => ({
      url: `${SITE.url}/policies/${p}`,
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    })),
  ].map((e) => ({ ...e, lastModified: now }));

  const collections = stockedSpecies().flatMap((s) => [
    {
      url: `${SITE.url}/collections/${s.key}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${SITE.url}/learn/${s.key}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
  ]);

  const products = allProducts().map((p) => ({
    url: `${SITE.url}/gem/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  return [...statics, ...collections, ...products];
}
