import 'server-only';
import { cache } from 'react';
import {
  allProducts,
  allProductsIncludingSold,
  filterProducts,
  getProduct,
  type Query,
} from './catalog';
import { publishedInventory, publishedGalleries } from './catalog-db';
import { productImages } from './galleries';
import type { Product } from './types';

/**
 * What the shop sells, from both sources at once.
 *
 * Two catalogues exist for a real reason: the original 147 listings were
 * generated from the Etsy export, while stock entered at the bench lives in the
 * database and joins the shop when it is published. Everything downstream reads
 * through here so neither source has to be special-cased, and so publishing a
 * stone is genuinely all it takes to put it on the site.
 */
export const allListings = cache(async (): Promise<Product[]> => {
  const generated = allProducts();
  const published = await publishedInventory();
  // A slug can only belong to one listing; the generated catalogue wins, since
  // it is what search engines already know about.
  const seen = new Set(generated.map((p) => p.slug));
  return [...generated, ...published.filter((p) => !seen.has(p.slug))];
});

/** Includes sold stones, for pages that must keep resolving old links. */
export const allListingsIncludingSold = cache(async (): Promise<Product[]> => {
  const generated = allProductsIncludingSold();
  const published = await publishedInventory();
  const seen = new Set(generated.map((p) => p.slug));
  return [...generated, ...published.filter((p) => !seen.has(p.slug))];
});

export async function queryListings(q: Query): Promise<Product[]> {
  return filterProducts(await allListings(), q);
}

export async function findListing(slug: string): Promise<Product | undefined> {
  return getProduct(slug) ?? (await allListingsIncludingSold()).find((p) => p.slug === slug);
}

/**
 * Every photograph for a listing. Published inventory carries its uploaded set;
 * the generated catalogue falls back to the gallery file, then to its single
 * scraped image.
 */
export async function listingImages(p: Product): Promise<string[]> {
  const fromDb = (await publishedGalleries()).get(p.slug);
  if (fromDb && fromDb.length > 0) return fromDb;
  return productImages(p);
}
