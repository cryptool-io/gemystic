import { NextRequest, NextResponse } from 'next/server';
import { campaignByCode } from '@/lib/campaigns/store';

export const runtime = 'nodejs';

/**
 * Validates a promo code from the cart. Returns only what the cart needs to
 * apply the offer, never the campaign internals. The discount itself is
 * recomputed server-side again at checkout, a client cannot invent a percentage.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? '';
  const campaign = await campaignByCode(code);

  if (!campaign) {
    return NextResponse.json(
      { valid: false, error: 'That code is not valid or has expired.' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    valid: true,
    name: campaign.name,
    percentOff: campaign.percentOff,
    freeShipping: campaign.freeShipping,
    // Scope for the cart to apply per-item: empty arrays mean everything.
    species: campaign.species,
    categories: campaign.categories,
  });
}
