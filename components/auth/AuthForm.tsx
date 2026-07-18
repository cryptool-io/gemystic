'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

/**
 * Shared sign-in / sign-up form. One component, two modes, so the two pages
 * stay in visual lockstep and validation lives in one place.
 */
export function AuthForm({
  mode,
  next,
  googleEnabled = false,
  initialError,
}: {
  mode: 'login' | 'register';
  next: string;
  googleEnabled?: boolean;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const isRegister = mode === 'register';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong.');
        setBusy(false);
        return;
      }

      // Full navigation so server components re-read the new session cookie.
      router.push(next);
      router.refresh();
    } catch {
      setError('Could not reach the server.');
      setBusy(false);
    }
  }

  return (
    <div className="card mx-auto w-full max-w-md p-6 sm:p-8">
      <h1 className="font-display text-2xl">
        {isRegister ? 'Create your account' : 'Welcome back'}
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        {isRegister
          ? 'Save stones, track orders and check out faster.'
          : 'Sign in to your account, orders and saved stones.'}
      </p>

      {googleEnabled && (
        <>
          <a
            href={`/api/auth/google?next=${encodeURIComponent(next)}`}
            className="btn-ghost mt-6 w-full gap-3"
          >
            <GoogleMark />
            Continue with Google
          </a>
          <div className="my-5 flex items-center gap-3 text-xs text-subtle">
            <span className="h-px flex-1 bg-line" />
            or {isRegister ? 'sign up' : 'sign in'} with email
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className={googleEnabled ? 'space-y-4' : 'mt-6 space-y-4'}>
        {isRegister && (
          <div>
            <label htmlFor="fullName" className="label mb-1.5 block">Full name</label>
            <input id="fullName" name="fullName" autoComplete="name" className="field" />
          </div>
        )}

        <div>
          <label htmlFor="email" className="label mb-1.5 block">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="field" />
        </div>

        <div>
          <label htmlFor="password" className="label mb-1.5 block">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            className="field"
          />
          {isRegister ? (
            <p className="mt-1.5 text-xs text-subtle">At least 8 characters.</p>
          ) : (
            <p className="mt-1.5 text-right text-xs">
              <Link href="/forgot" className="text-muted hover:text-brand">
                Forgot your password?
              </Link>
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-40">
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {isRegister ? (
          <>
            Already have an account?{' '}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-brand hover:text-brand-dark">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{' '}
            <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-brand hover:text-brand-dark">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

/** Google's four-colour mark, inline so the button needs no network request. */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

