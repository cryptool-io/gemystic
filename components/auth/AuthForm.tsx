'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

/**
 * Shared sign-in / sign-up form. One component, two modes, so the two pages
 * stay in visual lockstep and validation lives in one place.
 */
export function AuthForm({ mode, next }: { mode: 'login' | 'register'; next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
          {isRegister && (
            <p className="mt-1.5 text-xs text-subtle">At least 8 characters.</p>
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
