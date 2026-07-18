import { NextRequest, NextResponse } from 'next/server';
import { prisma, hasDatabase } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * First-party page-view tracking, so "where do buyers come from" is answerable
 * from our own database rather than only from Google Analytics.
 *
 * Deliberately minimal: an anonymous id the browser generates, the path, and
 * where the visit came from. No fingerprinting, no third-party beacon, nothing
 * that identifies a person. A visitor who blocks the request simply is not
 * counted, which is a better trade than pretending to know.
 *
 * Channel classification includes AI assistants, because a growing share of
 * gemstone research now starts in a chat window rather than a search box.
 */
function classify(referrerHost: string | null, utmMedium: string | null): string {
  if (utmMedium) {
    if (/cpc|ppc|paid/i.test(utmMedium)) return 'paid';
    if (/email/i.test(utmMedium)) return 'email';
    if (/social/i.test(utmMedium)) return 'social';
  }
  if (!referrerHost) return 'direct';
  if (/chatgpt|openai|perplexity|claude\.ai|copilot|gemini\.google/i.test(referrerHost)) return 'ai';
  if (/google|bing|duckduckgo|yahoo|ecosia|brave/i.test(referrerHost)) return 'organic';
  if (/facebook|instagram|pinterest|tiktok|twitter|x\.com|reddit|youtube/i.test(referrerHost)) return 'social';
  if (/etsy/i.test(referrerHost)) return 'etsy';
  return 'referral';
}

export async function POST(req: NextRequest) {
  if (!hasDatabase()) return NextResponse.json({ ok: true });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const anonId = String(body.anonId ?? '').slice(0, 64);
  const path = String(body.path ?? '').slice(0, 512);
  if (!anonId || !path) return NextResponse.json({ ok: true });

  const referrer = body.referrer ? String(body.referrer).slice(0, 512) : null;
  let referrerHost: string | null = null;
  try {
    if (referrer) referrerHost = new URL(referrer).hostname;
  } catch {
    referrerHost = null;
  }
  // A referrer from our own host is internal navigation, not a source.
  const selfHost = req.nextUrl.hostname;
  if (referrerHost === selfHost) referrerHost = null;

  const utmSource = str(body.utmSource);
  const utmMedium = str(body.utmMedium);
  const utmCampaign = str(body.utmCampaign);

  try {
    // One session row per anonymous id, first touch wins for attribution: the
    // channel that introduced the visitor is the one that earned the sale.
    let session = await prisma.visitorSession.findFirst({
      where: { anonId },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) {
      session = await prisma.visitorSession.create({
        data: {
          anonId,
          referrer,
          referrerHost,
          landingPath: path,
          utmSource,
          utmMedium,
          utmCampaign,
          channel: classify(referrerHost, utmMedium),
          countryCode:
            req.headers.get('cf-ipcountry')?.slice(0, 2).toUpperCase() ??
            req.headers.get('x-vercel-ip-country')?.slice(0, 2).toUpperCase() ??
            null,
          deviceType: /mobile/i.test(req.headers.get('user-agent') ?? '') ? 'mobile' : 'desktop',
          pageViews: 1,
        },
      });
    } else {
      await prisma.visitorSession.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date(), pageViews: { increment: 1 } },
      });
    }

    await prisma.pageView.create({ data: { sessionId: session.id, path } });
  } catch {
    // Analytics must never break a page view.
  }

  return NextResponse.json({ ok: true });
}

function str(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length > 0 ? s.slice(0, 200) : null;
}
