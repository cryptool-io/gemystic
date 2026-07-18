import { NextRequest, NextResponse } from 'next/server';
import { currentUser, hasRole } from '@/lib/auth/session';
import { setReviewStatus, setReviewReply, type ReviewStatus } from '@/lib/reviews/store';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const actor = await currentUser();
  if (!actor || !hasRole(actor, 'staff')) {
    return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const id = String(body.id ?? '');
  if (!id) return NextResponse.json({ error: 'Missing review id.' }, { status: 400 });

  if (body.status) {
    const status = String(body.status) as ReviewStatus;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Unknown status.' }, { status: 400 });
    }
    await setReviewStatus(id, status);
  }

  if (typeof body.reply === 'string') {
    await setReviewReply(id, body.reply);
  }

  return NextResponse.json({ ok: true });
}
