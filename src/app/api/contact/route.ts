import { NextRequest, NextResponse } from 'next/server';
import { mailer } from '@/lib/services/mailer';
import { config } from '@/lib/config';

export const runtime = 'nodejs';

/**
 * Contact enquiries. Goes through the mailer abstraction, so this handler is
 * identical whether the deployment sends via local file outbox, an SMTP relay,
 * or AWS SES — only the env changes.
 */

// Crude in-process rate limit. Enough to stop a bored script; a real deployment
// behind a reverse proxy should also rate-limit at the edge.
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many messages from this address. Please try again shortly, or email us directly.' },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const subject = String(body.subject ?? '').trim();
  const message = String(body.message ?? '').trim();
  const honeypot = String(body.website ?? '').trim();

  // Bots fill every field they find; humans never see this one.
  if (honeypot) {
    return NextResponse.json({ ok: true });
  }

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Name, email and message are all required.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'That email address does not look right.' }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: 'Message is too long — please keep it under 5000 characters.' }, { status: 400 });
  }

  try {
    const result = await mailer().send({
      subject: subject ? `[Enquiry] ${subject}` : `[Enquiry] from ${name}`,
      replyTo: email,
      text: [
        `Name:    ${name}`,
        `Email:   ${email}`,
        `Subject: ${subject || '(none)'}`,
        `IP:      ${ip}`,
        '',
        message,
      ].join('\n'),
    });

    return NextResponse.json({
      ok: true,
      // Surfaced so a local operator can see where the message went rather than
      // being told "sent" when it is sitting in an outbox directory.
      delivery: {
        driver: result.driver,
        delivered: result.delivered,
        note: result.note,
      },
    });
  } catch (err) {
    console.error('[contact]', err);
    return NextResponse.json(
      {
        error: `We could not send that. Please email ${config.mail.to} directly.`,
      },
      { status: 502 },
    );
  }
}
