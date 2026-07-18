import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { config } from '../config';
import { mailer } from '../services/mailer';
import { userStore } from './store';
import { hashPassword } from './session';
import { validatePassword } from './service';

/**
 * Password reset. Same token discipline as sessions (Trust-Agent pattern):
 * the email link carries an opaque random token, only its SHA-256 hash is
 * stored, tokens are single-use and expire after an hour, and a re-request
 * invalidates any earlier link.
 */

const TTL_MINUTES = 60;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Always resolves ok: whether the email exists is never revealed to the
 * caller. The email only goes out when the account is real.
 */
export async function requestPasswordReset(emailRaw: string): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  const store = userStore();
  const user = await store.findByEmail(email);
  if (!user) return;

  const token = randomBytes(32).toString('hex');
  await store.createResetToken({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000).toISOString(),
  });

  const link = `${config.site.url}/reset/${token}`;
  await mailer().send({
    to: user.email,
    subject: 'Reset your Gemystic Gems password',
    text: [
      `Hello${user.fullName ? ` ${user.fullName}` : ''},`,
      '',
      'Someone asked to reset the password for this account. If that was you,',
      `open this link within ${TTL_MINUTES} minutes:`,
      '',
      link,
      '',
      'If you did not ask for this, ignore this email. Your password is unchanged',
      'and the link expires on its own.',
    ].join('\n'),
  });
}

export interface ResetResult {
  ok: boolean;
  error?: string;
}

export async function resetPassword(token: string, newPassword: string): Promise<ResetResult> {
  const pwError = validatePassword(newPassword);
  if (pwError) return { ok: false, error: pwError };

  const store = userStore();
  const stored = await store.findResetToken(hashToken(token));
  if (!stored) {
    return { ok: false, error: 'This reset link is invalid or has expired. Request a new one.' };
  }

  await store.setPassword(stored.userId, await hashPassword(newPassword));
  await store.consumeResetToken(stored.tokenHash);
  // Every existing session dies with the old password.
  await store.deleteUserSessions(stored.userId);

  return { ok: true };
}
