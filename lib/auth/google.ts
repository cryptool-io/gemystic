import 'server-only';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';

/**
 * Google sign-in, server-side authorization-code flow.
 *
 * Code flow rather than the one-tap ID-token button: no Google JavaScript on
 * the page (so nothing to consent to before the visitor chooses to sign in),
 * it works with JS disabled, and the secret exchange happens server-side.
 * Trust-Agent's lib/auth-google.ts verifies the same id_token payload; this is
 * that verification plus the redirect handshake around it.
 */

const SCOPES = ['openid', 'email', 'profile'];

export function googleEnabled(): boolean {
  return config.google.enabled;
}

export function redirectUri(): string {
  return `${config.site.url.replace(/\/$/, '')}/api/auth/google/callback`;
}

function client(): OAuth2Client {
  if (!config.google.enabled) throw new Error('Google sign-in is not configured.');
  return new OAuth2Client(config.google.clientId, config.google.clientSecret, redirectUri());
}

/** Consent-screen URL. `state` is echoed back and checked against a cookie. */
export function authorizationUrl(state: string): string {
  return client().generateAuthUrl({
    access_type: 'online',
    scope: SCOPES,
    state,
    prompt: 'select_account',
    include_granted_scopes: true,
  });
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
}

/** Exchanges the callback code and verifies the returned id_token. */
export async function exchangeCode(code: string): Promise<GoogleProfile> {
  const c = client();
  const { tokens } = await c.getToken(code);
  if (!tokens.id_token) throw new Error('Google did not return an id_token.');

  const ticket = await c.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.google.clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) throw new Error('Google token payload missing email.');

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? null,
    avatarUrl: payload.picture ?? null,
    emailVerified: Boolean(payload.email_verified),
  };
}
