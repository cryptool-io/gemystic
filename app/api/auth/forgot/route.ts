import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/auth/reset';

export const runtime = 'nodejs';

// Tighter throttle than login: each accepted request sends an email.
const attempts = new Map<string, number[]>();
const WINDOW = 15 * 60 * 1000;
const MAX = 5;

function throttled(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > MAX;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  if (throttled(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a few minutes and try again.' },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  // Same response whether or not the account exists: no address enumeration.
  await requestPasswordReset(String(body.email ?? ''));
  return NextResponse.json({ ok: true });
}
