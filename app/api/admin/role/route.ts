import { NextRequest, NextResponse } from 'next/server';
import { currentUser, hasRole, ROLE_RANK } from '@/lib/auth/session';
import { userStore, type Role } from '@/lib/auth/store';

export const runtime = 'nodejs';

const ROLES: Role[] = ['customer', 'staff', 'admin', 'owner'];

/**
 * Change a user's role. This is how you "add an admin".
 *
 * Guard rails, because role escalation is the most abused admin action:
 *   - only admin+ may call it at all
 *   - only the owner may grant or revoke owner or admin, staff cannot mint peers
 *   - nobody can change their own role (no self-promotion, no self-lockout)
 *   - the last owner cannot be demoted, so the site can never be left ownerless
 */
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

  const userId = String(body.userId ?? '');
  const role = String(body.role ?? '') as Role;

  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: 'Unknown role.' }, { status: 400 });
  }
  if (userId === actor.id) {
    return NextResponse.json({ error: 'You cannot change your own role.' }, { status: 400 });
  }

  const store = userStore();
  const target = await store.findById(userId);
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // Only the owner may hand out admin or owner, or take them away.
  const touchesPrivileged =
    ROLE_RANK[role] >= ROLE_RANK.admin || ROLE_RANK[target.role] >= ROLE_RANK.admin;
  if (touchesPrivileged && actor.role !== 'owner') {
    return NextResponse.json(
      { error: 'Only the owner can grant or revoke admin and owner roles.' },
      { status: 403 },
    );
  }

  // Never demote the last owner.
  if (target.role === 'owner' && role !== 'owner') {
    const owners = (await store.listUsers()).filter((u) => u.role === 'owner');
    if (owners.length <= 1) {
      return NextResponse.json(
        { error: 'This is the only owner. Promote someone else to owner first.' },
        { status: 400 },
      );
    }
  }

  await store.setRole(userId, role);
  // A demoted user should lose access immediately, not at session expiry.
  if (ROLE_RANK[role] < ROLE_RANK[target.role]) {
    await store.deleteUserSessions(userId);
  }

  return NextResponse.json({ ok: true });
}
