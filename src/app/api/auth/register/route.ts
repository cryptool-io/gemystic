import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/auth/service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const result = await register({
    email: String(body.email ?? ''),
    password: String(body.password ?? ''),
    fullName: body.fullName ? String(body.fullName) : undefined,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
