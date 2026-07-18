'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Stars } from '@/components/reviews/Stars';

interface Row {
  id: string;
  productSlug: string | null;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  reply: string | null;
  createdAt: string;
}

const TABS = ['pending', 'approved', 'rejected'] as const;

export function ReviewModeration({ reviews }: { reviews: Row[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>('pending');
  const [busy, setBusy] = useState<string | null>(null);

  const shown = reviews.filter((r) => r.status === tab);

  async function act(id: string, patch: Record<string, unknown>) {
    setBusy(id);
    await fetch('/api/admin/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-2">
        {TABS.map((t) => {
          const n = reviews.filter((r) => r.status === t).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`chip capitalize transition ${
                tab === t ? 'chip-brand' : 'hover:border-brand-ring'
              }`}
            >
              {t} ({n})
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="card p-6 text-sm text-muted">Nothing {tab}.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="font-medium text-fg">{r.title}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {r.authorName} ·{' '}
                    {r.productSlug ? (
                      <a href={`/gem/${r.productSlug}`} className="hover:text-brand-dark">
                        {r.productSlug}
                      </a>
                    ) : (
                      'shop-wide'
                    )}{' '}
                    · {new Date(r.createdAt).toLocaleDateString('en-GB')}
                  </div>
                </div>

                <div className="flex gap-2">
                  {r.status !== 'approved' && (
                    <button
                      onClick={() => act(r.id, { status: 'approved' })}
                      disabled={busy === r.id}
                      className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      Approve
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button
                      onClick={() => act(r.id, { status: 'rejected' })}
                      disabled={busy === r.id}
                      className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted">{r.body}</p>

              <ReplyBox
                id={r.id}
                current={r.reply}
                busy={busy === r.id}
                onSave={(reply) => act(r.id, { reply })}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ReplyBox({
  id, current, busy, onSave,
}: {
  id: string;
  current: string | null;
  busy: boolean;
  onSave: (reply: string) => void;
}) {
  const [reply, setReply] = useState(current ?? '');
  const [editing, setEditing] = useState(false);

  if (!editing && !current) {
    return (
      <button onClick={() => setEditing(true)} className="mt-3 text-xs text-brand hover:text-brand-dark">
        + Add a public reply
      </button>
    );
  }

  if (!editing && current) {
    return (
      <div className="mt-3 rounded-lg border-l-2 border-brand-ring bg-brand-tint/50 p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-brand-deep">Your reply</div>
          <button onClick={() => setEditing(true)} className="text-xs text-brand hover:text-brand-dark">
            Edit
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">{current}</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={2}
        placeholder="Public reply (shown under the review)…"
        className="field text-sm"
        aria-label={`Reply to review ${id}`}
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => {
            onSave(reply);
            setEditing(false);
          }}
          disabled={busy}
          className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
        >
          Save reply
        </button>
        <button onClick={() => setEditing(false)} className="btn-ghost px-3 py-1.5 text-xs">
          Cancel
        </button>
      </div>
    </div>
  );
}
