import { validateConfig, deploymentProfile, config } from '@/lib/config';
import { allProducts, GENERATED_AT } from '@/lib/catalog';

/**
 * Operational view. Shows which capabilities are local and which have been moved
 * to AWS, plus any misconfiguration — so "is this box actually set up right?" is
 * answerable without SSHing in and reading env vars.
 */
export default function SystemPage() {
  const issues = validateConfig();
  const profile = deploymentProfile();
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  const CAPABILITIES = [
    {
      name: 'Application',
      driver: 'self-hosted',
      local: true,
      detail: 'Next.js server, statically generated catalogue. Runs anywhere Node runs.',
    },
    {
      name: 'Catalogue data',
      driver: 'local files',
      local: true,
      detail: `${allProducts().length} products from data/catalog.json — no database required at this scale.`,
    },
    {
      name: 'Transactional email',
      driver: config.mail.driver,
      local: config.mail.driver !== 'ses',
      detail:
        config.mail.driver === 'file'
          ? 'Enquiries written to var/outbox as .eml files. Nothing is delivered yet.'
          : config.mail.driver === 'smtp'
          ? `Relayed via ${config.mail.smtp.host || 'unconfigured host'}.`
          : `AWS SES in ${config.mail.ses.region}.`,
    },
    {
      name: 'Media storage',
      driver: config.storage.driver,
      local: config.storage.driver === 'local',
      detail:
        config.storage.driver === 'local'
          ? 'Uploads on local disk, served through /media.'
          : `S3 bucket ${config.storage.s3.bucket || '(unset)'}.`,
    },
    {
      name: 'Backups',
      driver: config.backup.driver,
      local: config.backup.driver === 'local',
      detail:
        config.backup.driver === 'local'
          ? `Local archives in ${config.paths.backups}, kept ${config.backup.retainDays} days. No offsite copy.`
          : `Pushed to s3://${config.backup.s3.bucket || '(unset)'}.`,
    },
    {
      name: 'AI features',
      driver: config.ai.enabled ? 'anthropic' : 'disabled',
      local: false,
      detail: config.ai.enabled
        ? 'Assistant, auto-listing and financial analysis are live.'
        : 'No API key — these three features are off. Everything else works.',
    },
  ];

  return (
    <div className="space-y-10">
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl">Deployment</h2>
          <span className={`chip ${profile.fullyLocal ? 'chip-brand' : ''}`}>
            {profile.fullyLocal ? 'Fully self-hosted' : `Hybrid — AWS: ${profile.aws.join(', ')}`}
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Every capability below can run on our own hardware. AWS is opt-in per capability
          via a driver name in the environment — moving one does not touch application code,
          and nothing here requires an AWS account to operate.
        </p>
      </section>

      {errors.length > 0 && (
        <section className="card border-accent/50 bg-accent-tint p-5">
          <h3 className="font-display text-base text-accent-dark">
            {errors.length} configuration {errors.length === 1 ? 'error' : 'errors'}
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-accent-dark">
            {errors.map((e, i) => (
              <li key={i}>
                <span className="font-medium uppercase">{e.area}</span> — {e.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="card scroll-x">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="p-4 font-normal">Capability</th>
                <th className="p-4 font-normal">Driver</th>
                <th className="p-4 font-normal">Location</th>
                <th className="p-4 font-normal">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {CAPABILITIES.map((c) => (
                <tr key={c.name}>
                  <td className="p-4 font-medium">{c.name}</td>
                  <td className="p-4">
                    <span className="chip capitalize">{c.driver}</span>
                  </td>
                  <td className="p-4">
                    <span className={c.local ? 'text-brand' : 'text-muted'}>
                      {c.local ? 'On our hardware' : c.driver === 'disabled' ? '—' : 'External'}
                    </span>
                  </td>
                  <td className="p-4 text-muted">{c.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {warnings.length > 0 && (
        <section>
          <h3 className="font-display text-lg">Notes</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {warnings.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-accent">·</span>
                <span>
                  <span className="font-medium uppercase text-fg">{w.area}</span> — {w.message}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-display text-lg">Runbook</h3>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ['Rebuild catalogue', 'npm run normalize'],
              ['Back up now', 'npm run backup'],
              ['Restore an archive', 'npm run restore -- <file.json.gz>'],
              ['Health probe', 'curl localhost:3100/api/health'],
              ['Self-host', 'docker compose up -d --build'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted">{k}</dt>
                <dd className="mt-0.5">
                  <code className="rounded bg-surface-2 px-2 py-1 text-xs text-brand-dark">{v}</code>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="card p-6">
          <h3 className="font-display text-lg">Current values</h3>
          <dl className="mt-4 space-y-2 text-sm">
            {[
              ['Site URL', config.site.url],
              ['Environment', config.site.env],
              ['Catalogue built', new Date(GENERATED_AT).toLocaleString('en-GB')],
              ['Mail from', config.mail.from],
              ['Enquiries to', config.mail.to],
              ['Backup retention', `${config.backup.retainDays} days`],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
