import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { userStore, type Role, type StoredUser } from './store';

/**
 * Session and password handling.
 *
 * Design mirrors Trust-Agent's proven approach (docs/PLATFORM-AUDIT.md §5):
 *   - opaque random token in the cookie; only its SHA-256 hash is stored, so a
 *     leaked database cannot be replayed into live sessions
 *   - server-side sessions (not stateless JWTs) so "log out everywhere" and
 *     "revoke on password change" are actually possible
 *   - HttpOnly + SameSite=Lax + Secure-in-prod cookie
 */

const COOKIE = 'gem_session';
const TTL_DAYS = 30;
const BCRYPT_ROUNDS = 12;

export const ROLE_RANK: Record<Role, number> = {
  customer: 0,
  staff: 1,
  admin: 2,
  owner: 3,
};

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Issues a session and sets the cookie. Returns the raw token (not stored). */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86400_000);

  await userStore().createSession({
    userId,
    tokenHash: hashToken(token),
    expiresAt: expiresAt.toISOString(),
  });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await userStore().deleteSession(hashToken(token));
  jar.delete(COOKIE);
}

/** The current signed-in user, or null. Cheap to call in any server component. */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const session = await userStore().findSessionByTokenHash(hashToken(token));
  if (!session) return null;

  const user = await userStore().findById(session.userId);
  if (!user) return null;

  return toSessionUser(user);
}

export function toSessionUser(u: StoredUser): SessionUser {
  return { id: u.id, email: u.email, fullName: u.fullName, role: u.role };
}

export function hasRole(user: SessionUser | null, min: Role): boolean {
  return !!user && ROLE_RANK[user.role] >= ROLE_RANK[min];
}
