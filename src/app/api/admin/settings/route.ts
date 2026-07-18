import { NextRequest, NextResponse } from 'next/server';
import { currentUser, hasRole } from '@/lib/auth/session';
import { getSettings, saveSettings } from '@/lib/settings';

export const runtime = 'nodejs';

export async function GET() {
  const actor = await currentUser();
  if (!actor || !hasRole(actor, 'staff')) {
    return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  }
  return NextResponse.json({ settings: getSettings() });
}

export async function POST(req: NextRequest) {
  const actor = await currentUser();
  if (!actor || !hasRole(actor, 'admin')) {
    return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const soldDisplayDays = Number(body.soldDisplayDays);
  if (!Number.isFinite(soldDisplayDays)) {
    return NextResponse.json({ error: 'soldDisplayDays must be a number.' }, { status: 400 });
  }

  const settings = await saveSettings({ soldDisplayDays });
  return NextResponse.json({ ok: true, settings });
}
