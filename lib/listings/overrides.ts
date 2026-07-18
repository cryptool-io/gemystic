import 'server-only';
import { cache } from 'react';
import { prisma, hasDatabase } from '../prisma';
import type { Product } from '../types';

/**
 * Listing overrides.
 *
 * The catalogue in data/catalog.json is generated from the Etsy export by
 * `npm run normalize`, so anything the owner edits by hand would be erased on
 * the next regeneration. Edits are therefore stored separately, keyed by slug,
 * and layered over the generated product at read time. The generator stays the
 * source of raw facts; the override is the source of intent.
 *
 * This is also what makes per-stone SEO editable (owner: "each stone has own
 * SEO") without waiting for products to move fully into the database.
 */

export interface ListingOverride {
  slug: string;
  title?: string | null;
  description?: string | null;
  priceUsd?: number | null;
  /** Pre-discount price; set above priceUsd to put this listing on sale. */
  compareAtUsd?: number | null;
  treatment?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[];
  /** Etsy's own tag vocabulary, which is not the same as our site keywords. */
  etsyTags?: string[];
  listedOnEtsy?: boolean;
  etsyListingId?: string | null;
  status?: 'active' | 'draft' | 'archived';
  aiGenerated?: boolean;
  aiReviewedAt?: string | null;
  updatedAt?: string;
}

/**
 * Request-memoised: a shop page renders 147 tiles, and each one asking the
 * database for its own override would be 147 queries for one small table.
 * React's cache() collapses them to a single fetch per request.
 */
export const allOverrides = cache(async (): Promise<Map<string, ListingOverride>> => {
  if (!hasDatabase()) return new Map();
  try {
    const rows = await prisma.listingOverride.findMany();
    return new Map(rows.map((r) => [r.slug, fromRow(r)]));
  } catch {
    // A listing edit is a nicety; the shop must render without the database.
    return new Map();
  }
});

export async function getOverride(slug: string): Promise<ListingOverride | null> {
  if (!hasDatabase()) return null;
  const row = await prisma.listingOverride.findUnique({ where: { slug } });
  return row ? fromRow(row) : null;
}

export async function saveOverride(
  slug: string,
  patch: Omit<ListingOverride, 'slug' | 'updatedAt'>,
): Promise<void> {
  const data = {
    title: patch.title ?? null,
    description: patch.description ?? null,
    priceUsd: patch.priceUsd ?? null,
    compareAtUsd: patch.compareAtUsd ?? null,
    treatment: patch.treatment ?? null,
    seoTitle: patch.seoTitle ?? null,
    seoDescription: patch.seoDescription ?? null,
    seoKeywords: patch.seoKeywords ?? [],
    etsyTags: patch.etsyTags ?? [],
    listedOnEtsy: patch.listedOnEtsy ?? false,
    etsyListingId: patch.etsyListingId ?? null,
    status: patch.status ?? 'active',
    aiGenerated: patch.aiGenerated ?? false,
    aiReviewedAt: patch.aiReviewedAt ? new Date(patch.aiReviewedAt) : null,
  };
  await prisma.listingOverride.upsert({
    where: { slug },
    update: data,
    create: { slug, ...data },
  });
}

function fromRow(r: {
  slug: string;
  title: string | null;
  description: string | null;
  priceUsd: unknown;
  compareAtUsd: unknown;
  treatment: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  etsyTags: string[];
  listedOnEtsy: boolean;
  etsyListingId: string | null;
  status: string;
  aiGenerated: boolean;
  aiReviewedAt: Date | null;
  updatedAt: Date;
}): ListingOverride {
  return {
    slug: r.slug,
    title: r.title,
    description: r.description,
    priceUsd: r.priceUsd == null ? null : Number(r.priceUsd),
    compareAtUsd: r.compareAtUsd == null ? null : Number(r.compareAtUsd),
    treatment: r.treatment,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
    seoKeywords: r.seoKeywords,
    etsyTags: r.etsyTags,
    listedOnEtsy: r.listedOnEtsy,
    etsyListingId: r.etsyListingId,
    status: r.status as ListingOverride['status'],
    aiGenerated: r.aiGenerated,
    aiReviewedAt: r.aiReviewedAt ? r.aiReviewedAt.toISOString() : null,
    updatedAt: r.updatedAt.toISOString(),
  };
}

/** Layers an override over the generated product. */
export function applyOverride(p: Product, o: ListingOverride | undefined | null): Product {
  if (!o) return p;
  return {
    ...p,
    title: o.title || p.title,
    description: o.description || p.description,
    priceUsd: o.priceUsd ?? p.priceUsd,
    // Only a compare-at above the selling price is a discount; anything else
    // would render a strikethrough that insults the buyer's arithmetic.
    compareAtUsd:
      o.compareAtUsd != null && o.compareAtUsd > (o.priceUsd ?? p.priceUsd)
        ? o.compareAtUsd
        : null,
    treatment: o.treatment || p.treatment,
    metaTitle: o.seoTitle || p.metaTitle,
    metaDescription: o.seoDescription || p.metaDescription,
    keywords: o.seoKeywords && o.seoKeywords.length > 0 ? o.seoKeywords : p.keywords,
  };
}
