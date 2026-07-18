import taxonomyJson from '../../data/taxonomy.json';
import { allProducts } from './catalog';
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
 * Interim taxonomy source. Reads data/taxonomy.json today; the shape is identical
 * to the `categories` table in db/migrations/001_init.sql, so swapping this module
 * to a database query is a one-file change with no caller impact.
 */
export function allCategories(): Category[] {
  return [...taxonomy.categories]
    .filter((c) => c.isActive)
    .sort((a, b) => a.position - b.position);
}

export function getCategory(slug: string): Category | undefined {
  return taxonomy.categories.find((c) => c.slug === slug);
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
export function categoryTree(speciesNames: Record<string, string>): CategoryNode[] {
  const products = allProducts();

  return allCategories().map((category) => {
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
