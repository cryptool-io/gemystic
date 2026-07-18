'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

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

/**
 * The single support entry point: one button, one panel, two tabs.
 *
 * Previously the AI assistant and human support were two separate floating
 * buttons whose popovers could overlap, which read as unprofessional. Now
 * "Support" opens a panel where the visitor chooses: ask the AI gemologist, or
 * reach a person (WhatsApp, email, phone, form). One affordance, no ambiguity.
 */
export function HelpHub({
  email,
  phone,
  phoneRaw,
  whatsapp,
}: {
  email: string;
  phone: string;
  phoneRaw: string;
  whatsapp: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'assistant' | 'human'>('assistant');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, busy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 flex h-12 items-center gap-2 rounded-full bg-brand px-5 text-sm font-medium text-white shadow-lift transition hover:bg-brand-dark"
      >
        {open ? (
          <>
            <span aria-hidden="true" className="text-lg leading-none">×</span> Close
          </>
        ) : (
          <>
            <HeadsetIcon /> Support
          </>
        )}
      </button>

      {open && (
        <div className="card fixed bottom-20 right-5 z-50 flex h-[34rem] w-[min(25rem,calc(100vw-2.5rem))] flex-col overflow-hidden shadow-pop">
          {/* Tabs */}
          <div className="flex border-b border-line" role="tablist" aria-label="Support options">
            {(
              [
                ['assistant', 'Ask the gemologist'],
                ['human', 'Talk to a person'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                  tab === key
                    ? 'border-b-2 border-brand text-brand'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'assistant' ? (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
                {msgs.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-muted">
                      Instant answers on gemmology, sizing, care and live stock. Try:
                    </p>
                    {OPENERS.map((o) => (
                      <button
                        key={o}
                        onClick={() => send(o)}
                        className="block w-full rounded-lg border border-line px-3 py-2 text-left text-xs text-muted transition hover:border-brand-ring hover:text-brand-dark"
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
                            className="flex items-center gap-3 rounded-lg border border-line p-2 transition hover:border-brand-ring"
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
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="border-b border-line bg-brand-tint p-4">
                <p className="text-sm text-brand-deep">
                  A real person replies within the working day, fastest on WhatsApp.
                </p>
              </div>
              <div className="divide-y divide-line">
                <ContactRow href={whatsapp} external title="WhatsApp" detail={phone} icon={<WhatsAppIcon />} />
                <ContactRow href={`mailto:${email}`} title="Email us" detail={email} icon={<MailIcon />} />
                <ContactRow href={`tel:${phoneRaw}`} title="Call us" detail={phone} icon={<PhoneIcon />} />
                <ContactRow
                  href="/help"
                  title="Help centre"
                  detail="Shipping, returns, payment, certificates"
                  icon={<FormIcon />}
                  onNavigate={() => setOpen(false)}
                />
                <ContactRow
                  href="/contact"
                  title="Contact form"
                  detail="Custom cutting, wholesale, anything else"
                  icon={<FormIcon />}
                  onNavigate={() => setOpen(false)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ContactRow({
  href, title, detail, icon, external = false, onNavigate,
}: {
  href: string;
  title: string;
  detail: string;
  icon: React.ReactNode;
  external?: boolean;
  onNavigate?: () => void;
}) {
  const inner = (
    <span className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-tint">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{title}</span>
        <span className="block truncate text-xs text-muted">{detail}</span>
      </span>
    </span>
  );

  if (external || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) {
    return (
      <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onNavigate}>
      {inner}
    </Link>
  );
}

function HeadsetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12a8 8 0 1116 0v3a2 2 0 01-2 2h-1a1 1 0 01-1-1v-4a1 1 0 011-1h2M4 12v3a2 2 0 002 2h1a1 1 0 001-1v-4a1 1 0 00-1-1H5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1012 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a11 11 0 01-5.4-4.7c-.4-.7-.7-1.5-.7-2.2 0-.7.4-1.4.8-1.7.2-.2.4-.2.6-.2h.4c.2 0 .4 0 .6.5l.7 1.7c.1.2 0 .4-.1.5l-.4.5c-.1.1-.2.3-.1.5.3.6.8 1.2 1.3 1.6.5.4 1 .6 1.3.7.2.1.4 0 .5-.1l.6-.7c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.2.1.6-.1 1z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="4" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 5.5l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 3h3l1.5 4-2 1.5a10 10 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2 2A14 14 0 013 5a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function FormIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="2.5" width="12" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
