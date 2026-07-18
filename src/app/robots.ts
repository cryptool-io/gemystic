import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';

/**
 * Answer-engine crawlers are explicitly welcomed. The commercial bet is that
 * being quotable by assistants is worth more to a one-of-a-kind inventory than
 * protecting listing text nobody would plagiarise anyway.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/studio', '/api/'] },
      {
        userAgent: [
          'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
          'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
          'PerplexityBot', 'Perplexity-User',
          'Google-Extended', 'Applebot-Extended', 'CCBot', 'meta-externalagent',
        ],
        allow: ['/', '/api/catalog', '/llms.txt'],
        disallow: ['/studio'],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
