'use client';

import { useState } from 'react';

type State = 'idle' | 'sending' | 'sent' | 'error';

export function ContactForm({ fallbackEmail }: { fallbackEmail: string }) {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');
    setError(null);

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong.');
        setState('error');
        return;
      }

      // Honest about the outbox case rather than claiming delivery.
      if (data.delivery && data.delivery.delivered === false) {
        setNote('Saved to the local outbox — no mail relay is configured on this deployment yet.');
      }
      setState('sent');
    } catch {
      setError('Could not reach the server.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className="card p-6">
        <h2 className="font-display text-xl text-brand">Message received</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          We reply within one working day, usually sooner. If it is urgent, WhatsApp is
          the fastest route.
        </p>
        {note && (
          <p className="mt-3 rounded-lg border border-accent/40 bg-accent-tint p-3 text-xs text-accent-dark">
            {note}
          </p>
        )}
        <button onClick={() => setState('idle')} className="btn-ghost mt-5">
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-6">
      <h2 className="font-display text-xl">Send a message</h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label mb-1.5 block">Your name</label>
          <input id="name" name="name" required autoComplete="name" className="field" />
        </div>
        <div>
          <label htmlFor="email" className="label mb-1.5 block">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="field" />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="subject" className="label mb-1.5 block">Subject</label>
        <input id="subject" name="subject" className="field" placeholder="e.g. 1.2ct Swat emerald — more photos?" />
      </div>

      <div className="mt-4">
        <label htmlFor="message" className="label mb-1.5 block">Message</label>
        <textarea id="message" name="message" required rows={6} className="field" />
      </div>

      {/* Honeypot — visually and programmatically hidden from people. */}
      <div aria-hidden="true" className="absolute left-[-9999px]">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">
          {error} You can always reach us at{' '}
          <a href={`mailto:${fallbackEmail}`} className="underline">{fallbackEmail}</a>.
        </p>
      )}

      <button type="submit" disabled={state === 'sending'} className="btn-primary mt-5 w-full sm:w-auto disabled:opacity-40">
        {state === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
