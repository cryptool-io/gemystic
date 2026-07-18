import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/session';
import { changePassword } from '@/lib/auth/service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const result = await changePassword(
    user.id,
    String(body.currentPassword ?? ''),
    String(body.newPassword ?? ''),
  );

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
