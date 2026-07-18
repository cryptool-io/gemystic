import 'server-only';
import { userStore, type Role } from './store';
import { hashPassword, verifyPassword, createSession } from './session';
import type { GoogleProfile } from './google';

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
  // you get your first admin without a seeding step, see docs. Every later
  // signup is a customer, and roles are changed from the admin portal.
  const isFirst = (await store.countUsers()) === 0;
  const role: Role = isFirst ? 'owner' : 'customer';

  const user = await store.createUser({
    email,
    passwordHash: await hashPassword(input.password),
    googleId: null,
    avatarUrl: null,
    fullName: input.fullName?.trim() || null,
    role,
  });

  await createSession(user.id);
  return { ok: true, userId: user.id };
}

/**
 * Google sign-in and sign-up in one path, which is what visitors expect from a
 * "Continue with Google" button: an existing email account gets the Google id
 * linked on first use (same person, verified by Google), anyone else is
 * created. First account on a fresh install still becomes the owner.
 */
export async function signInWithGoogle(profile: GoogleProfile): Promise<AuthResult> {
  const store = userStore();

  const byGoogle = await store.findByGoogleId(profile.googleId);
  if (byGoogle) {
    await store.touchLogin(byGoogle.id);
    await createSession(byGoogle.id);
    return { ok: true, userId: byGoogle.id };
  }

  const byEmail = await store.findByEmail(profile.email);
  if (byEmail) {
    await store.linkGoogle(byEmail.id, profile.googleId, profile.avatarUrl);
    await store.touchLogin(byEmail.id);
    await createSession(byEmail.id);
    return { ok: true, userId: byEmail.id };
  }

  const isFirst = (await store.countUsers()) === 0;
  const user = await store.createUser({
    email: profile.email,
    // No local password: this account signs in at Google. A password can be
    // set later through the reset flow if they ever want one.
    passwordHash: '',
    googleId: profile.googleId,
    avatarUrl: profile.avatarUrl,
    fullName: profile.name,
    role: isFirst ? 'owner' : 'customer',
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
  const ok = user?.passwordHash
    ? await verifyPassword(input.password, user.passwordHash)
    : (await verifyPassword(input.password, dummy), false);

  // Google-only account: say so rather than "incorrect", which would be a dead
  // end (there is no password that would ever work).
  if (user && !user.passwordHash && user.googleId) {
    return {
      ok: false,
      error: 'This account signs in with Google. Use the Google button above, or reset your password to add one.',
    };
  }

  if (!user || !ok) return { ok: false, error: 'Email or password is incorrect.' };

  await store.touchLogin(user.id);
  await createSession(user.id);
  return { ok: true, userId: user.id };
}
