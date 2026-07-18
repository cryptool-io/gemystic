import 'server-only';
import { cache } from 'react';
import { prisma, hasDatabase } from './prisma';

/**
 * Owner-editable SEO settings, stored one row per key in seo_settings.
 *
 * Search Console and Bing both verify a site by serving a token, either as a
 * meta tag or a file. Storing the tokens here means the owner can verify the
 * domain (and submit the sitemap, which is the step that makes SEO work at all)
 * without a developer or a deploy.
 */
export interface SeoSettings {
  titleTemplate: string;
  defaultDescription: string;
  googleSiteVerification: string;
  bingSiteVerification: string;
  indexNowKey: string;
  /** Off switch for staging: emits noindex across the site. */
  noindexEverything: boolean;
}

export const SEO_DEFAULTS: SeoSettings = {
  titleTemplate: '%s | Gemystic Gems',
  defaultDescription: '',
  googleSiteVerification: '',
  bingSiteVerification: '',
  indexNowKey: '',
  noindexEverything: false,
};

export const getSeoSettings = cache(async (): Promise<SeoSettings> => {
  if (!hasDatabase()) return SEO_DEFAULTS;
  try {
    const rows = await prisma.seoSetting.findMany();
    const out = { ...SEO_DEFAULTS };
    for (const r of rows) {
      if (r.key in out) {
        (out as Record<string, unknown>)[r.key] = r.value as unknown;
      }
    }
    return out;
  } catch {
    return SEO_DEFAULTS;
  }
});

export async function saveSeoSettings(patch: Partial<SeoSettings>): Promise<void> {
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in SEO_DEFAULTS)) continue;
    await prisma.seoSetting.upsert({
      where: { key },
      update: { value: value as never },
      create: { key, value: value as never },
    });
  }
}
