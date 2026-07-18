import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config';
import { optionalRequire, MissingDependencyError } from './optional';

export interface Message {
  to?: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendResult {
  driver: string;
  id: string;
  delivered: boolean;
  note?: string;
}

export interface Mailer {
  readonly name: string;
  send(msg: Message): Promise<SendResult>;
}

/**
 * Minimal structural types for the optional drivers' packages. Declaring only the
 * surface we call means the project typechecks without those packages installed,
 * which is the whole point of them being optional.
 */
interface NodemailerModule {
  createTransport(opts: Record<string, unknown>): {
    sendMail(mail: Record<string, unknown>): Promise<{ messageId: string }>;
  };
}

interface SesModule {
  SESv2Client: new (cfg: { region: string }) => {
    send(cmd: unknown): Promise<{ MessageId?: string }>;
  };
  SendEmailCommand: new (input: Record<string, unknown>) => unknown;
}

/**
 * Default driver. Writes a real RFC-822 message to var/outbox instead of sending.
 *
 * This is not a stub — it is the correct behaviour for local development and for
 * a self-hosted install that has not yet been given a relay. Nothing is silently
 * dropped, every enquiry is on disk and openable in any mail client, and no
 * credentials are required to run the site.
 */
class FileMailer implements Mailer {
  readonly name = 'file';

  async send(msg: Message): Promise<SendResult> {
    const dir = config.paths.outbox;
    await mkdir(dir, { recursive: true });

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const to = msg.to ?? config.mail.to;
    const eml = [
      `Date: ${new Date().toUTCString()}`,
      `From: ${config.mail.from}`,
      `To: ${to}`,
      msg.replyTo ? `Reply-To: ${msg.replyTo}` : null,
      `Subject: ${msg.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      msg.text,
    ]
      .filter(Boolean)
      .join('\r\n');

    await writeFile(join(dir, `${id}.eml`), eml, 'utf8');

    return {
      driver: this.name,
      id,
      delivered: false,
      note: `Written to ${join(dir, `${id}.eml`)} — no relay configured.`,
    };
  }
}

/** Self-hosted or third-party SMTP relay. Also the path for SES's SMTP interface. */
class SmtpMailer implements Mailer {
  readonly name = 'smtp';

  async send(msg: Message): Promise<SendResult> {
    const nodemailer = optionalRequire<NodemailerModule>('nodemailer');
    if (!nodemailer) throw new MissingDependencyError('nodemailer', 'smtp');

    const { host, port, user, pass, secure } = config.mail.smtp;
    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });

    const info = await transport.sendMail({
      from: config.mail.from,
      to: msg.to ?? config.mail.to,
      replyTo: msg.replyTo,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });

    return { driver: this.name, id: info.messageId, delivered: true };
  }
}

/**
 * AWS SES v2. Intentionally the last thing to switch on — the site is fully
 * functional on `file` or `smtp` first, and moving here is a one-line env change.
 *
 * Credentials come from the standard AWS chain (instance role, env, or profile);
 * we never read access keys out of our own config.
 */
class SesMailer implements Mailer {
  readonly name = 'ses';

  async send(msg: Message): Promise<SendResult> {
    const ses = optionalRequire<SesModule>('@aws-sdk/client-sesv2');
    if (!ses) throw new MissingDependencyError('@aws-sdk/client-sesv2', 'ses');

    const client = new ses.SESv2Client({ region: config.mail.ses.region });
    const out = await client.send(
      new ses.SendEmailCommand({
        FromEmailAddress: config.mail.from,
        Destination: { ToAddresses: [msg.to ?? config.mail.to] },
        ReplyToAddresses: msg.replyTo ? [msg.replyTo] : undefined,
        ConfigurationSetName: config.mail.ses.configurationSet || undefined,
        Content: {
          Simple: {
            Subject: { Data: msg.subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: msg.text, Charset: 'UTF-8' },
              ...(msg.html ? { Html: { Data: msg.html, Charset: 'UTF-8' } } : {}),
            },
          },
        },
      }),
    );

    return { driver: this.name, id: out.MessageId ?? 'unknown', delivered: true };
  }
}

let instance: Mailer | null = null;

export function mailer(): Mailer {
  if (instance) return instance;
  instance =
    config.mail.driver === 'ses'
      ? new SesMailer()
      : config.mail.driver === 'smtp'
      ? new SmtpMailer()
      : new FileMailer();
  return instance;
}
