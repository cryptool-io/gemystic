import catalogJson from '@/data/catalog.json';
import speciesJson from '@/data/species.json';
import type { Catalog, Product, Species } from './types';
import { soldMap, isSoldExpired } from './sold';

const catalog = catalogJson as unknown as Catalog;
const speciesMap = speciesJson as unknown as Record<string, Species>;

/**
 * Sold overlay: var/sold.json (written by the Etsy sync and, later, our own
 * orders) marks stones sold without touching the generated catalogue. Sold
 * stones show a SOLD banner for the admin-configured number of days, then
 * disappear from listings entirely. Product pages keep rendering so old links
 * degrade gracefully.
 */
function withSoldState(products: Product[]): Product[] {
  const sold = soldMap();
  return products.map((p) => {
    const soldAt = sold[p.etsyId];
    return soldAt ? { ...p, stock: 0, soldAt } : p;
  });
}

function excludeExpired(products: Product[]): Product[] {
  return products.filter((p) => !(p.soldAt && isSoldExpired(p.soldAt)));
}

export const CURRENCY = catalog.currency;
export const GENERATED_AT = catalog.generatedAt;

export function allProducts(): Product[] {
  return excludeExpired(withSoldState(catalog.products));
}

/** Everything including expired-sold, for admin views and static params. */
export function allProductsIncludingSold(): Product[] {
  return withSoldState(catalog.products);
}

export function getProduct(slug: string): Product | undefined {
  return withSoldState(catalog.products).find((p) => p.slug === slug);
}

export function getSpecies(key: string): Species | undefined {
  return speciesMap[key];
}

export function allSpecies(): [string, Species][] {
  return Object.entries(speciesMap);
}

/** Species that actually have stock, the nav should never link to an empty shelf. */
export function stockedSpecies(): {
  key: string;
  species: Species;
  count: number;
  heroImage: string;
}[] {
  return Object.entries(catalog.facets.species)
    .map(([key, count]) => ({ key, species: speciesMap[key], count, heroImage: speciesHeroImage(key) }))
    .filter((s) => s.species)
    .sort((a, b) => b.count - a.count);
}

/**
 * The single best photo to represent a species on a category tile, the
 * "specialist's pick", chosen by a rule rather than by hand so it stays correct
 * as stock turns over. Preference order: a faceted stone (shows colour and cut
 * best), then the most valuable piece (usually the most photogenic), avoiding
 * rough and parcels which read poorly at thumbnail size.
 */
export function speciesHeroImage(key: string): string {
  const inSpecies = catalog.products.filter((p) => p.species === key);
  if (inSpecies.length === 0) return '';

  const ranked = [...inSpecies].sort((a, b) => {
    const facetedA = a.form === 'faceted' ? 1 : 0;
    const facetedB = b.form === 'faceted' ? 1 : 0;
    if (facetedA !== facetedB) return facetedB - facetedA;
    return b.priceUsd - a.priceUsd;
  });
  return ranked[0].image;
}

export function facets() {
  return catalog.facets;
}

export interface Query {
  species?: string;
  category?: string;
  form?: string;
  color?: string;
  cut?: string;
  variety?: string;
  gender?: string;
  minPrice?: number;
  maxPrice?: number;
  minCarat?: number;
  maxCarat?: number;
  origin?: string;
  search?: string;
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'carat-desc' | 'newest';
}

export function queryProducts(q: Query): Product[] {
  return filterProducts(allProducts(), q);
}

/**
 * The filtering and sorting rules, over whichever set of products is handed in.
 * Split out so published inventory stones go through exactly the same path as
 * the generated catalogue rather than a parallel implementation that drifts.
 */
export function filterProducts(products: Product[], q: Query): Product[] {
  let out = products;

  if (q.species) out = out.filter((p) => p.species === q.species);
  if (q.category) out = out.filter((p) => p.category === q.category);
  if (q.form) out = out.filter((p) => p.form === q.form);
  if (q.color) out = out.filter((p) => p.color === q.color);
  if (q.cut) out = out.filter((p) => p.cut === q.cut);
  if (q.variety) out = out.filter((p) => p.variety === q.variety);
  if (q.gender) out = out.filter((p) => p.gender === q.gender);
  if (q.minPrice != null) out = out.filter((p) => p.priceUsd >= q.minPrice!);
  if (q.maxPrice != null) out = out.filter((p) => p.priceUsd <= q.maxPrice!);
  if (q.minCarat != null) out = out.filter((p) => (p.caratWeight ?? 0) >= q.minCarat!);
  if (q.maxCarat != null) out = out.filter((p) => p.caratWeight != null && p.caratWeight <= q.maxCarat!);
  if (q.origin) out = out.filter((p) => p.origin.startsWith(q.origin!));

  if (q.search) {
    const terms = q.search.toLowerCase().split(/\s+/).filter(Boolean);
    out = out
      .map((p) => ({ p, score: scoreMatch(p, terms) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.p);
    // A relevance-ranked search result shouldn't then be re-sorted by price
    // unless the visitor explicitly asked for that.
    if (!q.sort || q.sort === 'featured') return out;
  }

  switch (q.sort) {
    case 'price-asc':
      return [...out].sort((a, b) => a.priceUsd - b.priceUsd);
    case 'price-desc':
      return [...out].sort((a, b) => b.priceUsd - a.priceUsd);
    case 'carat-desc':
      return [...out].sort((a, b) => (b.caratWeight ?? 0) - (a.caratWeight ?? 0));
    case 'newest':
      // Etsy listing ids are chronological, highest id is the latest listing.
      return [...out].sort((a, b) => Number(b.etsyId) - Number(a.etsyId));
    default:
      return out;
  }
}

/**
 * Lightweight keyword scoring. Title hits count for more than description hits,
 * which keeps "emerald" from surfacing every listing whose care note mentions it.
 */
function scoreMatch(p: Product, terms: string[]): number {
  const title = p.title.toLowerCase();
  const meta = `${p.species} ${p.variety ?? ''} ${p.color} ${p.cut ?? ''} ${p.form} ${p.origin}`.toLowerCase();
  const body = `${p.description} ${p.keywords.join(' ')} ${p.originalTitle}`.toLowerCase();

  let score = 0;
  for (const t of terms) {
    if (title.includes(t)) score += 10;
    else if (meta.includes(t)) score += 5;
    else if (body.includes(t)) score += 1;
    else return 0; // every term must appear somewhere
  }
  return score;
}

/** Stones a visitor looking at this one would plausibly also consider. */
export function relatedProducts(p: Product, limit = 4): Product[] {
  return allProducts()
    .filter((o) => o.slug !== p.slug)
    .map((o) => {
      let score = 0;
      if (o.species === p.species) score += 5;
      if (o.variety && o.variety === p.variety) score += 4;
      if (o.form === p.form) score += 2;
      if (o.color === p.color) score += 2;
      if (Math.abs(o.priceUsd - p.priceUsd) < p.priceUsd * 0.4) score += 2;
      return { o, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.o);
}

/**
 * The landing-page selection, one definition shared by the homepage and the
 * admin catalogue so "which stones are on the landing page" has a single
 * answer. First 4 = the hero grid, all 8 = the "Fine and rare" section.
 */
export function featuredProducts(limit = 8): Product[] {
  return [...allProducts()].sort((a, b) => b.priceUsd - a.priceUsd).slice(0, limit);
}

/** The latest additions. Etsy ids are chronological. */
export function justListed(limit = 12): Product[] {
  return [...allProducts()]
    .sort((a, b) => Number(b.etsyId) - Number(a.etsyId))
    .slice(0, limit);
}

export function priceStats() {
  const prices = catalog.products.map((p) => p.priceUsd);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    total: prices.reduce((a, b) => a + b, 0),
    avg: prices.reduce((a, b) => a + b, 0) / prices.length,
  };
}

/** Birthstone landing pages are among the highest-intent organic entry points. */
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function productsForBirthstone(month: string): Product[] {
  const keys = Object.entries(speciesMap)
    .filter(([, s]) => s.birthstone.includes(month))
    .map(([k]) => k);
  return allProducts().filter((p) => keys.includes(p.species));
}
