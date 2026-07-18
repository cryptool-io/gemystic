import { NextRequest, NextResponse } from 'next/server';
import { createReview } from '@/lib/reviews/store';
import { getProduct } from '@/lib/catalog';
import { mailer } from '@/lib/services/mailer';
import { config } from '@/lib/config';

export const runtime = 'nodejs';

const hits = new Map<string, number[]>();
function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (throttled(ip)) {
    return NextResponse.json({ error: 'Too many reviews from this address just now.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  if (String(body.website ?? '').trim()) return NextResponse.json({ ok: true }); // honeypot

  const rating = Number(body.rating);
  const authorName = String(body.authorName ?? '').trim();
  const authorEmail = String(body.authorEmail ?? '').trim();
  const title = String(body.title ?? '').trim();
  const reviewBody = String(body.body ?? '').trim();
  const productSlug = body.productSlug ? String(body.productSlug) : null;

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 });
  }
  if (!authorName || !title || !reviewBody) {
    return NextResponse.json({ error: 'Name, headline and review text are required.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) {
    return NextResponse.json({ error: 'A valid email is required (it is not published).' }, { status: 400 });
  }
  // Reject a slug that does not exist, so a review cannot be attached to nothing.
  if (productSlug && !getProduct(productSlug)) {
    return NextResponse.json({ error: 'Unknown product.' }, { status: 400 });
  }

  const review = await createReview({
    productSlug,
    authorName,
    authorEmail,
    rating: Math.round(rating),
    title,
    body: reviewBody,
  });

  // Tell the team a review is waiting to be moderated. Best-effort.
  try {
    await mailer().send({
      to: config.mail.to,
      subject: `[Review pending] ${rating}★ from ${authorName}`,
      text: `A new review needs moderation.\n\nProduct: ${productSlug ?? 'shop-wide'}\nRating: ${rating}/5\nTitle: ${title}\n\n${reviewBody}\n\nApprove it at /admin/reviews`,
    });
  } catch {
    // Moderation queue still holds the review even if the notice fails.
  }

  return NextResponse.json({ ok: true, id: review.id });
}
