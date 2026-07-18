'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Both halves of the reset flow, mode-switched like AuthForm:
 *   request: email in, always answers "sent" (no account enumeration)
 *   reset:   new password in, posts with the token from the URL
 */
export function PasswordResetForm({ mode, token }: { mode: 'request' | 'reset'; token?: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRequest = mode === 'request';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const endpoint = isRequest ? '/api/auth/forgot' : '/api/auth/reset';
    const payload = isRequest
      ? { email: form.get('email') }
      : { token, password: form.get('password') };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong.');
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setError('Could not reach the server.');
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card mx-auto w-full max-w-md p-6 sm:p-8">
        <h1 className="font-display text-2xl">
          {isRequest ? 'Check your email' : 'Password changed'}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {isRequest
            ? 'If an account exists for that address, a reset link is on its way. The link works for one hour.'
            : 'Your new password is set and every other signed-in device has been signed out.'}
        </p>
        <Link href="/login" className="btn-primary mt-6">
          {isRequest ? 'Back to sign in' : 'Sign in with your new password'}
        </Link>
      </div>
    );
  }

  return (
    <div className="card mx-auto w-full max-w-md p-6 sm:p-8">
      <h1 className="font-display text-2xl">
        {isRequest ? 'Forgot your password?' : 'Choose a new password'}
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        {isRequest
          ? 'Enter your account email and we will send a reset link.'
          : 'Minimum 8 characters. Every other signed-in device signs out when you save.'}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {isRequest ? (
          <div>
            <label htmlFor="email" className="label mb-1.5 block">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="field" />
          </div>
        ) : (
          <div>
            <label htmlFor="password" className="label mb-1.5 block">New password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="field"
            />
          </div>
        )}

        {error && <p className="text-sm text-accent-dark">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
          {busy ? 'Working…' : isRequest ? 'Send reset link' : 'Set new password'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Remembered it?{' '}
        <Link href="/login" className="text-brand hover:text-brand-dark">Sign in</Link>
      </p>
    </div>
  );
}
