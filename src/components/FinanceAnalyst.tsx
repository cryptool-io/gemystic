'use client';

import { useState } from 'react';

const PROMPTS = [
  'Where am I leaving money on the table?',
  'Is my inventory too concentrated in emerald?',
  'What should I cut more of next quarter?',
  'Does leaving Etsy actually make sense for me?',
];

export function FinanceAnalyst() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask(q: string) {
    if (busy) return;
    setBusy(true);
    setAnswer(null);
    setNotice(null);
    setQuestion(q);

    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (data.analysis) setAnswer(data.analysis);
      if (data.error) setNotice(data.error);
    } catch {
      setNotice('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="font-display text-xl">Ask the analyst</h2>
      <p className="mt-1.5 max-w-2xl text-sm text-muted">
        Questions are answered against the figures on this page, the same computed
        numbers, not a general opinion about the gem trade.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => ask(p)}
            disabled={busy}
            className="chip transition hover:border-brand/60 hover:text-brand-dark disabled:opacity-40"
          >
            {p}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) ask(question);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything about these numbers…"
          className="field flex-1"
        />
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-40">
          {busy ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      {notice && (
        <p className="mt-4 rounded-lg border border-accent/40 bg-accent-tint p-4 text-sm text-accent-dark">
          {notice}
        </p>
      )}

      {answer && (
        <article className="card mt-5 p-6">
          <div className="space-y-3 text-sm leading-relaxed text-muted">
            {answer.split('\n').filter(Boolean).map((line, i) => {
              if (/^#{1,3}\s/.test(line)) {
                return (
                  <h3 key={i} className="pt-2 font-display text-base text-brand">
                    {line.replace(/^#+\s/, '')}
                  </h3>
                );
              }
              if (/^[-*]\s/.test(line)) {
                return (
                  <div key={i} className="flex gap-2 pl-1">
                    <span className="text-brand">·</span>
                    <span>{stripBold(line.replace(/^[-*]\s/, ''))}</span>
                  </div>
                );
              }
              if (line.trim().startsWith('|')) {
                return (
                  <pre key={i} className="overflow-x-auto text-xs text-muted/80">
                    {line}
                  </pre>
                );
              }
              return <p key={i}>{stripBold(line)}</p>;
            })}
          </div>
        </article>
      )}
    </section>
  );
}

/** The model occasionally reaches for bold; render it as plain emphasis-free text. */
function stripBold(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, '$1');
}
