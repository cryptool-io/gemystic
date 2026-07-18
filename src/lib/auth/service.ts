import 'server-only';
import { userStore, type Role } from './store';
import { hashPassword, verifyPassword, createSession } from './session';

/**
 * Registration and login use-cases. Route handlers stay thin and call these,
 * so the same logic is reusable from a seed script or an admin "create staff"
 * action without duplicating the rules.
 */

export interface AuthResult {
  ok: boolean;
  error?: string;
  userId?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (pw.length > 200) return 'Password is too long.';
  return null;
}

export async function register(input: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'That email address does not look right.' };

  const pwError = validatePassword(input.password);
  if (pwError) return { ok: false, error: pwError };

  const store = userStore();
  if (await store.findByEmail(email)) {
    return { ok: false, error: 'An account with that email already exists. Try signing in.' };
  }

  // First account to register on a fresh install becomes the owner. This is how
  // you get your first admin without a seeding step — see docs. Every later
  // signup is a customer, and roles are changed from the admin portal.
  const isFirst = (await store.countUsers()) === 0;
  const role: Role = isFirst ? 'owner' : 'customer';

  const user = await store.createUser({
    email,
    passwordHash: await hashPassword(input.password),
    fullName: input.fullName?.trim() || null,
    role,
  });

  await createSession(user.id);
  return { ok: true, userId: user.id };
}

export async function login(input: { email: string; password: string }): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const store = userStore();
  const user = await store.findByEmail(email);

  // Same message and a real hash comparison whether or not the user exists, so
  // response timing does not reveal which emails are registered.
  const dummy = '$2a$12$0000000000000000000000000000000000000000000000000000';
  const ok = user
    ? await verifyPassword(input.password, user.passwordHash)
    : (await verifyPassword(input.password, dummy), false);

  if (!user || !ok) return { ok: false, error: 'Email or password is incorrect.' };

  await store.touchLogin(user.id);
  await createSession(user.id);
  return { ok: true, userId: user.id };
}
