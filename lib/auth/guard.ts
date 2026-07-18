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

/**
 * Route-handler guard. Returns a response to send back when the caller is not
 * permitted, or null to continue, since an API must answer with a status code
 * rather than a redirect to a login page.
 */
export async function requireRoleApi(min: Role): Promise<Response | null> {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Sign in required.' }, { status: 401 });
  if (!hasRole(user, min)) return Response.json({ error: 'Not permitted.' }, { status: 403 });
  return null;
}
