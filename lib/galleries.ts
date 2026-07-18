import galleriesJson from '@/data/galleries.json';
import type { Product } from './types';

/**
 * Multi-image galleries, keyed by product slug.
 *
 * Source today: scripts/gemysticgems-sync.mjs matching the original
 * WooCommerce shop's photo sets onto our catalogue (the WP photos are the
 * originals at 1000px, so when a gallery exists it replaces the single Etsy
 * thumbnail). Inventory-born listings will write their own galleries once the
 * pipeline's step 1 intake lands.
 */
const GALLERIES = galleriesJson as unknown as Record<string, string[]>;

/** Every image for a product, primary first. Falls back to the single catalogue image. */
export function productImages(p: Product): string[] {
  const gallery = GALLERIES[p.slug];
  if (gallery && gallery.length > 0) return gallery;
  return [p.image];
}
