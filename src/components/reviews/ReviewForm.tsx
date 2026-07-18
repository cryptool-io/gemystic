'use client';

import { useState } from 'react';

/**
 * Review submission. Interactive star picker with keyboard support, posts to
 * /api/reviews. Submitted reviews are held for moderation, and the form says so
 * rather than implying instant publication.
 */
export function ReviewForm({ productSlug }: { productSlug?: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (rating === 0) {
      setError('Please choose a star rating.');
      return;
    }
    setState('sending');
    setError(null);

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...Object.fromEntries(form),
          rating,
          productSlug: productSlug ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong.');
        setState('error');
        return;
      }
      setState('sent');
    } catch {
      setError('Could not reach the server.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className="card p-5">
        <h3 className="font-display text-base text-brand">Thank you</h3>
        <p className="mt-1.5 text-sm text-muted">
          Your review has been submitted and will appear once we have checked it. We read
          every one.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost">
        Write a review
      </button>
    );
  }

  const shown = hover || rating;

  return (
    <form onSubmit={onSubmit} className="card p-5 sm:p-6">
      <h3 className="font-display text-lg">Write a review</h3>

      <div className="mt-4">
        <span className="label mb-1.5 block">Your rating</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === i}
              aria-label={`${i} star${i > 1 ? 's' : ''}`}
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              className="p-0.5 transition"
            >
              <svg width="26" height="26" viewBox="0 0 20 20">
                <path
                  d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z"
                  fill={shown >= i ? '#047857' : 'none'}
                  stroke="#047857"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="authorName" className="label mb-1.5 block">Your name</label>
          <input id="authorName" name="authorName" required className="field" />
        </div>
        <div>
          <label htmlFor="authorEmail" className="label mb-1.5 block">Email (not published)</label>
          <input id="authorEmail" name="authorEmail" type="email" required className="field" />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="title" className="label mb-1.5 block">Headline</label>
        <input id="title" name="title" required maxLength={80} className="field" />
      </div>

      <div className="mt-4">
        <label htmlFor="body" className="label mb-1.5 block">Your review</label>
        <textarea id="body" name="body" required rows={4} maxLength={2000} className="field" />
      </div>

      {/* Honeypot */}
      <div aria-hidden="true" className="absolute left-[-9999px]">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <button type="submit" disabled={state === 'sending'} className="btn-primary disabled:opacity-40">
          {state === 'sending' ? 'Submitting…' : 'Submit review'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
          Cancel
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">Reviews are checked before they appear.</p>
    </form>
  );
}
