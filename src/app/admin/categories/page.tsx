import { requireRole } from '@/lib/auth/guard';
import { categoryTree } from '@/lib/taxonomy';
import { stockedSpecies } from '@/lib/catalog';

/**
 * Category management. Read + explain today; the write path (add/reorder/edit)
 * lands with the Postgres `categories` table, at which point this page gets an
 * "Add category" form posting to /api/admin/categories. The data shape shown
 * here is already the final one, so that is additive, not a rebuild.
 */
export default async function AdminCategories() {
  await requireRole('admin', '/admin/categories');
  const species = stockedSpecies();
  const tree = categoryTree(Object.fromEntries(species.map((s) => [s.key, s.species.name])));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Categories</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The categories that structure the shop, each with the stone types stocked beneath
          it and its own SEO. Editing is done in{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-brand-dark">data/taxonomy.json</code>{' '}
          today; the in-place editor arrives with the database migration.
        </p>
      </div>

      <div className="space-y-3">
        {tree.map((c) => (
          <div key={c.slug} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg text-brand-deep">{c.name}</h2>
                  <span className="chip">{c.count} in stock</span>
                  {!c.isActive && <span className="chip">hidden</span>}
                  {c.count === 0 && <span className="chip border-accent/40 text-accent-dark">empty</span>}
                </div>
                <p className="mt-1.5 text-sm text-muted">{c.description}</p>
                <code className="mt-2 inline-block rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">
                  /shop?category={c.slug}
                </code>
              </div>
            </div>

            {c.species.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
                {c.species.map((s) => (
                  <span key={s.key} className="chip">
                    {s.name} · {s.count}
                  </span>
                ))}
              </div>
            )}

            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted">SEO</summary>
              <dl className="mt-2 space-y-1 text-xs">
                <div><dt className="inline text-muted">Title: </dt><dd className="inline">{c.seoTitle}</dd></div>
                <div><dt className="inline text-muted">Description: </dt><dd className="inline">{c.seoDescription}</dd></div>
                <div><dt className="inline text-muted">Keywords: </dt><dd className="inline">{c.seoKeywords.join(', ')}</dd></div>
              </dl>
            </details>
          </div>
        ))}
      </div>

      <div className="card border-dashed border-line-strong p-5 text-center text-sm text-muted">
        + Add category, available once the catalogue moves to Postgres. The form will post to
        <code className="mx-1 rounded bg-surface-2 px-1.5 py-0.5 text-brand-dark">/api/admin/categories</code>
        and write the same fields shown above.
      </div>
    </div>
  );
}
