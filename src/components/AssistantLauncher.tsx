'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  products?: { slug: string; title: string; price: number; image: string }[];
}

const OPENERS = [
  'What is a good emerald under $300?',
  'Which stones suit an engagement ring?',
  'Explain pigeon blood ruby',
  'I want a green stone for a pendant',
];

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;

    const next = [...msgs, { role: 'user' as const, content: q }];
    setMsgs(next);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMsgs((m) => [
        ...m,
        {
          role: 'assistant',
          content: data.reply ?? data.error ?? 'Something went wrong.',
          products: data.products,
        },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: 'assistant', content: 'I could not reach the server. Please try again.' },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open the gemstone assistant"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-xl text-white shadow-lift transition hover:bg-brand-dark"
      >
        {open ? '×' : '◆'}
      </button>

      {open && (
        <div className="card fixed bottom-24 right-5 z-50 flex h-[32rem] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden shadow-pop">
          <div className="border-b border-line p-4">
            <div className="font-display text-base">Ask about any stone</div>
            <p className="mt-0.5 text-xs text-muted">
              Gemmology, sizing, care and what is in stock right now.
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
            {msgs.length === 0 && (
              <div className="space-y-2">
                <p className="text-muted">Try one of these:</p>
                {OPENERS.map((o) => (
                  <button
                    key={o}
                    onClick={() => send(o)}
                    className="block w-full rounded-lg border border-line px-3 py-2 text-left text-xs text-muted transition hover:border-brand/50 hover:text-brand-dark"
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i}>
                <div
                  className={
                    m.role === 'user'
                      ? 'ml-auto w-fit max-w-[85%] rounded-lg bg-brand px-3 py-2 text-white'
                      : 'max-w-full whitespace-pre-wrap leading-relaxed text-muted'
                  }
                >
                  {m.content}
                </div>

                {m.products && m.products.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {m.products.map((p) => (
                      <Link
                        key={p.slug}
                        href={`/gem/${p.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg border border-line p-2 transition hover:border-brand/50"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image} alt="" className="h-12 w-12 rounded object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs text-fg">{p.title}</span>
                          <span className="text-xs text-brand">${p.price.toFixed(2)}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {busy && <div className="text-xs text-muted">Looking through the catalogue…</div>}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-line p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="field py-2"
            />
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-40">
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
