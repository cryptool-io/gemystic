'use client';

import { useState } from 'react';

/**
 * Change password from the account page. `hasPassword` is false for accounts
 * created through Google, which are setting their first password rather than
 * replacing one, so the current-password field would have nothing to check.
 */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get('newPassword') ?? '');
    const confirm = String(form.get('confirmPassword') ?? '');

    if (newPassword !== confirm) {
      setError('Those two passwords do not match.');
      setBusy(false);
      return;
    }

    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currentPassword: String(form.get('currentPassword') ?? ''),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Could not change your password.');
      } else {
        setDone(true);
        e.currentTarget.reset();
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card p-6">
        <h2 className="font-display text-lg">Password changed</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Your new password is set, and any other device that was signed in has been signed out.
        </p>
        <button onClick={() => setDone(false)} className="btn-ghost mt-4">
          Change it again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-6">
      <h2 className="font-display text-lg">
        {hasPassword ? 'Change password' : 'Set a password'}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {hasPassword
          ? 'Changing it signs out every other device.'
          : 'You signed in with Google. Setting a password lets you sign in either way.'}
      </p>

      <div className="mt-4 grid gap-4 sm:max-w-md">
        {hasPassword && (
          <div>
            <label htmlFor="currentPassword" className="label mb-1.5 block">Current password</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="field"
            />
          </div>
        )}
        <div>
          <label htmlFor="newPassword" className="label mb-1.5 block">New password</label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="field"
          />
          <p className="mt-1 text-xs text-subtle">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="label mb-1.5 block">Confirm new password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="field"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark sm:max-w-md">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary mt-5 disabled:opacity-40">
        {busy ? 'Saving…' : hasPassword ? 'Change password' : 'Set password'}
      </button>
    </form>
  );
}
