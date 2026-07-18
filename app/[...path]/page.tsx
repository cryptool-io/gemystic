import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { prisma, hasDatabase } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Redirect catch-all: the last route to match, so it only sees paths nothing
 * else claimed. Every would-be 404 is checked against the redirect table before
 * being given up on, which is how the old WordPress URLs keep their traffic and
 * their accumulated ranking when the domain moves.
 *
 * Middleware would be the usual home for this, but middleware runs on the edge
 * runtime and cannot reach Postgres. Doing it here costs one query per 404 and
 * nothing at all on a normal page view.
 *
 * Next issues 308 (permanent) rather than 301; search engines treat the two the
 * same for ranking transfer, and 308 additionally preserves the method.
 */
export default async function CatchAll({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const fromPath = `/${(path ?? []).join('/')}`;

  let rule: { id: string; toPath: string; statusCode: number } | null = null;

  if (hasDatabase()) {
    try {
      rule =
        (await prisma.redirect.findUnique({ where: { fromPath } })) ??
        // WordPress linked both ways, and Next strips the trailing slash before
        // this route sees the request, so try both spellings.
        (fromPath.endsWith('/')
          ? await prisma.redirect.findUnique({ where: { fromPath: fromPath.slice(0, -1) } })
          : await prisma.redirect.findUnique({ where: { fromPath: `${fromPath}/` } }));
    } catch {
      // A database hiccup must still produce an honest 404, not a 500.
      rule = null;
    }
  }

  // redirect() and notFound() work by throwing, so they must be called outside
  // the try block: catching them turns a working redirect into a 404.
  if (rule) {
    // Best-effort counter: knowing which old URLs still pull traffic tells the
    // owner which ones are worth pointing somewhere useful.
    prisma.redirect
      .update({ where: { id: rule.id }, data: { hits: { increment: 1 } } })
      .catch(() => {});

    if (rule.statusCode === 302) redirect(rule.toPath);
    permanentRedirect(rule.toPath);
  }

  notFound();
}
