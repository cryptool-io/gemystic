import { requireRole } from '@/lib/auth/guard';
import { allCategoriesForAdmin } from '@/lib/taxonomy';
import { allProducts, facets } from '@/lib/catalog';
import { hasDatabase } from '@/lib/prisma';
import { CategoryManager, type CategoryRow } from '@/components/admin/CategoryManager';

export const dynamic = 'force-dynamic';

/**
 * Category management (owner: "I should be able to add categories myself").
 *
 * The taxonomy file still ships the defaults; edits and new categories are
 * stored as overrides so nothing is lost on the next deploy and nothing needs
 * a developer.
 */
export default async function AdminCategories() {
  await requireRole('admin', '/admin/categories');

  const categories = await allCategoriesForAdmin();
  const products = allProducts();
  const forms = Object.keys(facets().form).sort();

  const rows: CategoryRow[] = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description ?? '',
    position: c.position,
    isActive: c.isActive,
    formMapping: c.formMapping ?? [],
    seoTitle: c.seoTitle ?? '',
    seoDescription: c.seoDescription ?? '',
    seoKeywords: c.seoKeywords ?? [],
    count: products.filter((p) => p.category === c.slug).length,
    isCustom: false,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Categories</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The categories that structure the shop and its navigation. Rename, reorder, re-map or
          hide any of them, and add your own. Stones join a category by their type, so a new
          category fills itself rather than needing every stone tagged.
        </p>
      </div>

      {!hasDatabase() ? (
        <div className="card p-6 text-sm text-muted">
          DATABASE_URL is not set, so category edits cannot be saved. The list below is the
          taxonomy file as shipped.
        </div>
      ) : (
        <CategoryManager categories={rows} forms={forms} />
      )}
    </div>
  );
}
