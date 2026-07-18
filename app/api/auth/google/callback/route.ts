import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, googleEnabled } from '@/lib/auth/google';
import { signInWithGoogle } from '@/lib/auth/service';

export const runtime = 'nodejs';

/** Google consent callback: verifies state, exchanges the code, signs in. */
export async function GET(req: NextRequest) {
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));

  if (!googleEnabled()) return fail('google-unconfigured');

  const url = req.nextUrl;
  if (url.searchParams.get('error')) return fail('google-cancelled');

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = req.cookies.get('gem_oauth_state')?.value;
  if (!code || !state || !expected || state !== expected) return fail('google-state');

  let profile;
  try {
    profile = await exchangeCode(code);
  } catch {
    return fail('google-exchange');
  }
  if (!profile.emailVerified) return fail('google-unverified');

  await signInWithGoogle(profile);

  const next = req.cookies.get('gem_oauth_next')?.value;
  const res = NextResponse.redirect(
    new URL(next && next.startsWith('/') ? next : '/account', req.url),
  );
  res.cookies.delete('gem_oauth_state');
  res.cookies.delete('gem_oauth_next');
  return res;
}
