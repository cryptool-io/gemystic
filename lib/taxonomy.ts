import { cache } from 'react';
import taxonomyJson from '@/data/taxonomy.json';
import { allProducts } from './catalog';
import { prisma, hasDatabase } from './prisma';
import type { Product } from './types';

export interface Category {
  slug: string;
  name: string;
  position: number;
  isActive: boolean;
  formMapping: string[];
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
}

interface TaxonomyFile {
  version: number;
  categories: Category[];
}

const taxonomy = taxonomyJson as unknown as TaxonomyFile;

/**
 * Categories come from data/taxonomy.json, with owner edits and owner-created
 * categories layered on top from the database (the same override pattern the
 * listings use). Memoised per request so a page rendering the nav, the filter
 * list and a category page costs one query, not three.
 */
const overrides = cache(async () => {
  if (!hasDatabase()) return [] as CategoryOverrideRow[];
  try {
    return await prisma.categoryOverride.findMany();
  } catch {
    // The shop must render even when the database is unreachable.
    return [] as CategoryOverrideRow[];
  }
});

interface CategoryOverrideRow {
  slug: string;
  name: string | null;
  description: string | null;
  position: number | null;
  isActive: boolean;
  formMapping: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  isCustom: boolean;
}

function merge(base: Category | undefined, o: CategoryOverrideRow | undefined): Category | null {
  if (!base && !o) return null;
  if (!base && o) {
    // Owner-created category: the override is the whole definition.
    return {
      slug: o.slug,
      name: o.name ?? o.slug,
      position: o.position ?? 99,
      isActive: o.isActive,
      formMapping: o.formMapping,
      description: o.description ?? '',
      seoTitle: o.seoTitle ?? o.name ?? o.slug,
      seoDescription: o.seoDescription ?? '',
      seoKeywords: o.seoKeywords,
    };
  }
  const b = base!;
  if (!o) return b;
  return {
    ...b,
    name: o.name ?? b.name,
    description: o.description ?? b.description,
    position: o.position ?? b.position,
    isActive: o.isActive,
    formMapping: o.formMapping.length > 0 ? o.formMapping : b.formMapping,
    seoTitle: o.seoTitle ?? b.seoTitle,
    seoDescription: o.seoDescription ?? b.seoDescription,
    seoKeywords: o.seoKeywords.length > 0 ? o.seoKeywords : b.seoKeywords,
  };
}

/** Active categories in display order, owner edits applied. */
export async function allCategories(): Promise<Category[]> {
  const rows = await overrides();
  const byslug = new Map(rows.map((r) => [r.slug, r]));

  const fromFile = taxonomy.categories.map((c) => merge(c, byslug.get(c.slug))!);
  const custom = rows.filter((r) => r.isCustom && !taxonomy.categories.some((c) => c.slug === r.slug));

  return [...fromFile, ...custom.map((r) => merge(undefined, r)!)]
    .filter((c) => c.isActive)
    .sort((a, b) => a.position - b.position);
}

/** Every category including hidden ones: the admin needs to see what it disabled. */
export async function allCategoriesForAdmin(): Promise<Category[]> {
  const rows = await overrides();
  const byslug = new Map(rows.map((r) => [r.slug, r]));
  const fromFile = taxonomy.categories.map((c) => merge(c, byslug.get(c.slug))!);
  const custom = rows.filter((r) => r.isCustom && !taxonomy.categories.some((c) => c.slug === r.slug));
  return [...fromFile, ...custom.map((r) => merge(undefined, r)!)].sort(
    (a, b) => a.position - b.position,
  );
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return (await allCategoriesForAdmin()).find((c) => c.slug === slug);
}

export interface CategoryNode extends Category {
  count: number;
  /** Species actually held in this category, never links to an empty shelf. */
  species: { key: string; name: string; count: number }[];
}

/**
 * The nav tree: categories with the stone types genuinely stocked beneath each.
 * Counts come from live stock rather than a static list, so a sold-out species
 * disappears instead of leading a customer to an empty page.
 */
export async function categoryTree(
  speciesNames: Record<string, string>,
): Promise<CategoryNode[]> {
  const products = allProducts();

  return (await allCategories()).map((category) => {
    const inCategory = products.filter((p) => p.category === category.slug);

    const bySpecies = new Map<string, number>();
    for (const p of inCategory) {
      bySpecies.set(p.species, (bySpecies.get(p.species) ?? 0) + 1);
    }

    return {
      ...category,
      count: inCategory.length,
      species: [...bySpecies.entries()]
        .map(([key, count]) => ({ key, name: speciesNames[key] ?? key, count }))
        .sort((a, b) => b.count - a.count),
    };
  });
}

export function productsInCategory(slug: string): Product[] {
  return allProducts().filter((p) => p.category === slug);
}
