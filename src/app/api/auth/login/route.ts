import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth/service';

export const runtime = 'nodejs';

// Modest in-process throttle against credential stuffing. A production deploy
// behind a proxy should also rate-limit at the edge.
const attempts = new Map<string, number[]>();
const WINDOW = 15 * 60 * 1000;
const MAX = 10;

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

  const result = await login({
    email: String(body.email ?? ''),
    password: String(body.password ?? ''),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
  return NextResponse.json({ ok: true });
}
