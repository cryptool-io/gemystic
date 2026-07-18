import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authorizationUrl, googleEnabled } from '@/lib/auth/google';

export const runtime = 'nodejs';

/** Starts Google sign-in: sets a state cookie, redirects to the consent screen. */
export async function GET(req: NextRequest) {
  if (!googleEnabled()) {
    return NextResponse.redirect(new URL('/login?error=google-unconfigured', req.url));
  }

  const next = req.nextUrl.searchParams.get('next');
  const state = randomBytes(16).toString('hex');

  const res = NextResponse.redirect(authorizationUrl(state));
  // Read back in the callback: proves the response belongs to this browser's
  // request and carries the post-login destination without trusting Google.
  res.cookies.set('gem_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  if (next && next.startsWith('/')) {
    res.cookies.set('gem_oauth_next', next, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 600,
    });
  }
  return res;
}
