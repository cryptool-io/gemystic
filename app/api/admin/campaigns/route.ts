import { NextRequest, NextResponse } from 'next/server';
import { currentUser, hasRole } from '@/lib/auth/session';
import { createCampaign, updateCampaign, deleteCampaign } from '@/lib/campaigns/store';

export const runtime = 'nodejs';

async function guard() {
  const actor = await currentUser();
  if (!actor || !hasRole(actor, 'admin')) return null;
  return actor;
}

export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const name = String(body.name ?? '').trim();
  const percentOff = Number(body.percentOff);
  const startsAt = String(body.startsAt ?? '');
  const endsAt = String(body.endsAt ?? '');

  if (!name) return NextResponse.json({ error: 'Campaign name is required.' }, { status: 400 });
  const freeShipping = Boolean(body.freeShipping);
  if (!Number.isFinite(percentOff) || percentOff < 0 || percentOff > 90) {
    return NextResponse.json({ error: 'Discount must be between 0% and 90%.' }, { status: 400 });
  }
  if (percentOff === 0 && !freeShipping) {
    return NextResponse.json({ error: 'A 0% campaign must at least grant free shipping.' }, { status: 400 });
  }
  if (!startsAt || !endsAt || new Date(endsAt) < new Date(startsAt)) {
    return NextResponse.json({ error: 'End date must not be before the start date.' }, { status: 400 });
  }

  const campaign = await createCampaign({
    name,
    percentOff,
    species: Array.isArray(body.species) ? body.species.map(String) : [],
    categories: Array.isArray(body.categories) ? body.categories.map(String) : [],
    startsAt,
    endsAt,
    active: body.active !== false,
    code: body.code ? String(body.code) : null,
    freeShipping: Boolean(body.freeShipping),
  });

  return NextResponse.json({ ok: true, campaign });
}

export async function PATCH(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  const body = await req.json();
  const id = String(body.id ?? '');
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  await updateCampaign(id, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  await deleteCampaign(id);
  return NextResponse.json({ ok: true });
}
