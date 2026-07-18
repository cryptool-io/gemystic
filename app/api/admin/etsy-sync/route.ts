import { NextRequest, NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/auth/guard';
import { getProduct } from '@/lib/catalog';
import { markSold, soldMap, unmarkSold } from '@/lib/sold';

export const runtime = 'nodejs';

/**
 * Etsy reconciliation from the admin UI.
 *
 * Etsy publishes no webhooks and the write API needs an approved developer app
 * the owner has not been granted yet, so this checks the public listing page:
 * a listing that no longer resolves, or that reads as sold out, is marked sold
 * here too. It is the same logic scripts/etsy-sync.mjs runs on a timer, exposed
 * as a button for "I just sold this on Etsy, take it down here".
 *
 * Etsy blocks datacentre requests with TLS fingerprinting, so a fetch failure
 * is reported honestly rather than being treated as "not sold".
 */
async function etsySold(etsyId: string): Promise<boolean | null> {
  try {
    const res = await fetch(`https://www.etsy.com/listing/${etsyId}`, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
        accept: 'text/html',
      },
      redirect: 'follow',
    });
    if (res.status === 404 || res.status === 410) return true;
    if (!res.ok) return null;
    const html = await res.text();
    if (/this item (has )?sold|sold out|no longer available/i.test(html)) return true;
    return false;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireRoleApi('admin');
  if (denied) return denied;

  let body: { slug?: string } = {};
  try {
    body = await req.json();
  } catch {
    // No body: full sync.
  }

  const sold = soldMap();

  if (body.slug) {
    const product = getProduct(body.slug);
    if (!product) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const state = await etsySold(product.etsyId);
    if (state === null) {
      return NextResponse.json({
        message: 'Etsy did not answer (it blocks server requests). Mark it sold manually if needed.',
      });
    }
    if (state && !sold[product.etsyId]) {
      await markSold([product.etsyId]);
      return NextResponse.json({ message: 'Sold on Etsy: marked sold here too.' });
    }
    if (!state && sold[product.etsyId]) {
      await unmarkSold(product.etsyId);
      return NextResponse.json({ message: 'Live on Etsy: restored here.' });
    }
    return NextResponse.json({ message: 'Already in sync.' });
  }

  return NextResponse.json({
    message:
      'Full sync runs from the server: npm run etsy:sync (add -- --watch 10 to poll). Per-listing sync works from each listing page.',
  });
}
