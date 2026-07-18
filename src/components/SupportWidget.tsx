'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Human-support launcher, distinct from the AI assistant orb.
 *
 * The assistant answers gemmology and stock questions; this is the "talk to a
 * person" path. WhatsApp, email, phone and the contact form. Keeping them
 * separate matters: a customer with a payment or delivery problem wants a human,
 * and a single ambiguous chat bubble hides that. Positioned above the assistant
 * so both are reachable and clearly different.
 */
export function SupportWidget({
  email,
  phoneRaw,
  phone,
  whatsapp,
}: {
  email: string;
  phoneRaw: string;
  phone: string;
  whatsapp: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div ref={ref} className="fixed bottom-24 left-5 z-50">
      {open && (
        <div className="card mb-3 w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden p-0 shadow-pop">
          <div className="border-b border-line bg-brand-tint p-4">
            <div className="font-display text-base text-brand-deep">Need a hand?</div>
            <p className="mt-0.5 text-xs text-muted">
              Talk to a person, we reply within a working day, faster on WhatsApp.
            </p>
          </div>

          <div className="divide-y divide-line">
            <Option
              href={whatsapp}
              external
              title="WhatsApp"
              detail={phone}
              icon={<WhatsAppIcon />}
            />
            <Option
              href={`mailto:${email}`}
              title="Email us"
              detail={email}
              icon={<MailIcon />}
            />
            <Option
              href={`tel:${phoneRaw}`}
              title="Call us"
              detail={phone}
              icon={<PhoneIcon />}
            />
            <Option
              href="/contact"
              title="Contact form & help"
              detail="Custom cutting, wholesale, questions"
              icon={<FormIcon />}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Labeled pill, not a bare icon, "Support" says exactly what it is,
          which an ambiguous chat bubble did not. */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-12 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium text-brand shadow-lift ring-1 ring-line transition hover:ring-brand-ring"
      >
        {open ? (
          <>
            <span aria-hidden="true" className="text-lg leading-none">×</span>
            Close
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 12a8 8 0 1116 0v3a2 2 0 01-2 2h-1a1 1 0 01-1-1v-4a1 1 0 011-1h2M4 12v3a2 2 0 002 2h1a1 1 0 001-1v-4a1 1 0 00-1-1H5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Support
          </>
        )}
      </button>
    </div>
  );
}

function Option({
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
