import 'server-only';
import { redirect } from 'next/navigation';
import { currentUser, hasRole, type SessionUser } from './session';
import type { Role } from './store';

/**
 * Page guards. Use at the top of a server component to gate a route.
 *
 *   const user = await requireRole('admin');   // redirects if not permitted
 *
 * Modelled on Trust-Agent's `requirePageRole`, kept minimal.
 */

export async function requireUser(returnTo = '/account'): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function requireRole(min: Role, returnTo = '/admin'): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!hasRole(user, min)) redirect('/account?denied=1');
  return user;
}
