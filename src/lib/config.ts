/**
 * Single source of truth for runtime configuration.
 *
 * The deployment story is local-first: everything runs on our own box with no
 * cloud account required. Individual capabilities can then be moved to AWS one
 * at a time by changing a driver name in the environment, never by editing
 * application code. Nothing here imports an AWS SDK; the adapters load theirs
 * lazily so an install without AWS packages still builds and runs.
 */

export type MailDriver = 'file' | 'smtp' | 'ses';
export type StorageDriver = 'local' | 's3';
export type BackupDriver = 'local' | 's3';

function env(key: string, fallback = ''): string {
  return process.env[key]?.trim() || fallback;
}

function oneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const v = env(key) as T;
  return allowed.includes(v) ? v : fallback;
}

export const config = {
  site: {
    url: env('NEXT_PUBLIC_SITE_URL', 'http://localhost:3100'),
    env: env('NODE_ENV', 'development'),
  },

  /** Where generated and uploaded data lives when running self-hosted. */
  paths: {
    data: env('DATA_DIR', './data'),
    var: env('VAR_DIR', './var'),
    uploads: env('UPLOAD_DIR', './var/uploads'),
    outbox: env('OUTBOX_DIR', './var/outbox'),
    backups: env('BACKUP_DIR', './var/backups'),
  },

  mail: {
    driver: oneOf<MailDriver>('MAIL_DRIVER', ['file', 'smtp', 'ses'], 'file'),
    from: env('MAIL_FROM', 'Gemystic Gems <no-reply@gemysticgems.com>'),
    // Where contact-form enquiries land.
    to: env('MAIL_TO', 'Info@gemysticgems.com'),
    smtp: {
      host: env('SMTP_HOST'),
      port: Number(env('SMTP_PORT', '587')),
      user: env('SMTP_USER'),
      pass: env('SMTP_PASS'),
      secure: env('SMTP_SECURE') === 'true',
    },
    ses: {
      region: env('AWS_REGION', 'eu-west-1'),
      configurationSet: env('SES_CONFIGURATION_SET'),
    },
  },

  storage: {
    driver: oneOf<StorageDriver>('STORAGE_DRIVER', ['local', 's3'], 'local'),
    s3: {
      bucket: env('S3_BUCKET'),
      region: env('AWS_REGION', 'eu-west-1'),
      prefix: env('S3_PREFIX', 'media/'),
      publicBaseUrl: env('S3_PUBLIC_BASE_URL'),
    },
  },

  backup: {
    driver: oneOf<BackupDriver>('BACKUP_DRIVER', ['local', 's3'], 'local'),
    retainDays: Number(env('BACKUP_RETAIN_DAYS', '30')),
    s3: {
      bucket: env('BACKUP_S3_BUCKET'),
      region: env('AWS_REGION', 'eu-west-1'),
      prefix: env('BACKUP_S3_PREFIX', 'backups/'),
    },
  },

  ai: {
    apiKey: env('ANTHROPIC_API_KEY'),
    enabled: Boolean(env('ANTHROPIC_API_KEY')),
  },
} as const;

export interface ConfigIssue {
  level: 'error' | 'warning';
  area: string;
  message: string;
}

/**
 * Fails loudly at startup rather than at 2am when someone submits a contact form.
 * Returns issues instead of throwing so the studio can render them as a checklist.
 */
export function validateConfig(): ConfigIssue[] {
  const issues: ConfigIssue[] = [];

  if (config.mail.driver === 'smtp') {
    if (!config.mail.smtp.host) {
      issues.push({ level: 'error', area: 'mail', message: 'MAIL_DRIVER=smtp but SMTP_HOST is not set.' });
    }
    if (!config.mail.smtp.user || !config.mail.smtp.pass) {
      issues.push({ level: 'warning', area: 'mail', message: 'SMTP credentials are missing; relay must allow unauthenticated send.' });
    }
  }

  if (config.mail.driver === 'ses' && !config.mail.ses.region) {
    issues.push({ level: 'error', area: 'mail', message: 'MAIL_DRIVER=ses but AWS_REGION is not set.' });
  }

  if (config.storage.driver === 's3' && !config.storage.s3.bucket) {
    issues.push({ level: 'error', area: 'storage', message: 'STORAGE_DRIVER=s3 but S3_BUCKET is not set.' });
  }

  if (config.backup.driver === 's3' && !config.backup.s3.bucket) {
    issues.push({ level: 'error', area: 'backup', message: 'BACKUP_DRIVER=s3 but BACKUP_S3_BUCKET is not set.' });
  }

  if (!config.ai.enabled) {
    issues.push({ level: 'warning', area: 'ai', message: 'ANTHROPIC_API_KEY is not set, assistant, auto-listing and written analysis are disabled.' });
  }

  if (config.site.env === 'production' && config.site.url.includes('localhost')) {
    issues.push({ level: 'error', area: 'site', message: 'NEXT_PUBLIC_SITE_URL still points at localhost in production; canonical URLs and sitemap will be wrong.' });
  }

  if (config.site.env === 'production' && config.mail.driver === 'file') {
    issues.push({ level: 'warning', area: 'mail', message: 'MAIL_DRIVER=file in production, enquiries are written to disk and never delivered.' });
  }

  return issues;
}

/** Summary for the studio dashboard. */
export function deploymentProfile() {
  const onAws = [
    config.mail.driver === 'ses' && 'SES',
    config.storage.driver === 's3' && 'S3 media',
    config.backup.driver === 's3' && 'S3 backups',
  ].filter(Boolean) as string[];

  return {
    mail: config.mail.driver,
    storage: config.storage.driver,
    backup: config.backup.driver,
    aws: onAws,
    fullyLocal: onAws.length === 0,
  };
}
