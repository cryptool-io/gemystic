/**
 * Honest placeholder for admin sections whose write path depends on the Postgres
 * migration. States plainly what it will do and what it is waiting on, rather
 * than showing a fake empty table that implies it works. See docs/PLATFORM-AUDIT.md.
 */
export function Pending({
  title,
  summary,
  willDo,
  dependsOn = 'the Postgres migration (db/migrations/001_init.sql)',
}: {
  title: string;
  summary: string;
  willDo: string[];
  dependsOn?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{summary}</p>
      </div>

      <div className="card border-dashed border-line-strong p-6">
        <div className="flex items-center gap-2">
          <span className="chip border-accent/40 text-accent-dark">Not yet wired</span>
          <span className="text-sm text-muted">Depends on {dependsOn}</span>
        </div>
        <h2 className="mt-4 font-display text-base">What this section will do</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          {willDo.map((w, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-brand">·</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
