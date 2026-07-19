import 'server-only';
import { cache } from 'react';
import { prisma, hasDatabase } from './prisma';
import type { Product } from './types';

/**
 * Inventory stones that have been published to the shop.
 *
 * The original 147 listings come from data/catalog.json, generated from the
 * Etsy export. Stock entered through intake lives in the database instead, and
 * appears on the storefront once it is published. Both are mapped to the same
 * Product shape here so the rest of the site does not care which is which, and
 * so a published stone brings all of its photographs with it rather than the
 * single thumbnail an Etsy scrape could get.
 */
function toProduct(row: {
  id: string;
  sku: string | null;
  slug: string;
  title: string;
  description: string;
  price: unknown;
  compareAtPrice: unknown;
  colour: string | null;
  cut: string | null;
  shape: string | null;
  caratWeight: unknown;
  weightGrams: unknown;
  dimensionsText: string | null;
  originCountry: string | null;
  treatment: string;
  certified: boolean;
  quantity: number;
  shipsFrom: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  stoneType: string;
  publishedAt: Date | null;
  images: { url: string; isPrimary: boolean; position: number }[];
  category: { slug: string } | null;
  species: { slug: string; name: string } | null;
}): Product {
  const ordered = [...row.images].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position,
  );
  const primary = ordered[0]?.url ?? '/icon.svg';

  // The form label the storefront shows, in the shop's own words.
  const formLabel =
    row.stoneType === 'rough_parcel'
      ? 'Wholesale parcel'
      : row.stoneType === 'specimen'
        ? 'Mineral specimen'
        : row.stoneType === 'pair'
          ? 'Matched pair'
          : 'Loose faceted gemstone';

  const price = Number(row.price);
  const compareAt = row.compareAtPrice == null ? null : Number(row.compareAtPrice);

  return {
    slug: row.slug,
    // Inventory stones have no Etsy id; the SKU is their stable identifier and
    // the sold store keys off this same value.
    etsyId: row.sku ?? row.id,
    title: row.title,
    originalTitle: row.title,
    description: row.description,
    species: row.species?.slug ?? 'gemstone',
    variety: null,
    form: row.stoneType === 'rough_parcel' ? 'parcel' : row.stoneType === 'specimen' ? 'specimen' : 'faceted',
    formLabel,
    category: row.category?.slug ?? 'faceted-gemstones',
    cut: row.cut ?? row.shape ?? null,
    color: row.colour ?? 'Mixed',
    caratWeight: row.caratWeight == null ? null : Number(row.caratWeight),
    gramWeight: row.weightGrams == null ? null : Number(row.weightGrams),
    dimensions: row.dimensionsText,
    origin: row.originCountry ?? 'Pakistan',
    treatment: row.treatment,
    certified: row.certified,
    priceUsd: price,
    compareAtUsd: compareAt != null && compareAt > price ? compareAt : null,
    image: primary,
    imageLarge: primary,
    stock: row.quantity > 0 ? row.quantity : 0,
    shipsFrom: row.shipsFrom === 'TH' ? 'TH' : 'PK',
    keywords: row.seoKeywords ?? [],
    metaTitle: row.seoTitle ?? row.title,
    metaDescription: row.seoDescription ?? row.description.slice(0, 160),
  } as Product;
}

/** Published inventory listings, memoised per request. */
export const publishedInventory = cache(async (): Promise<Product[]> => {
  if (!hasDatabase()) return [];
  try {
    const rows = await prisma.product.findMany({
      where: { status: 'active', source: { in: ['intake', 'sheet', 'gemysticgems', 'manual'] } },
      include: {
        images: { orderBy: { position: 'asc' } },
        category: { select: { slug: true } },
        species: { select: { slug: true, name: true } },
      },
      orderBy: { publishedAt: 'desc' },
    });
    return rows.map(toProduct);
  } catch {
    // The shop must render without the database.
    return [];
  }
});

/** Every photograph for a published inventory stone, primary first. */
export const publishedGalleries = cache(async (): Promise<Map<string, string[]>> => {
  if (!hasDatabase()) return new Map();
  try {
    const rows = await prisma.product.findMany({
      where: { status: 'active' },
      select: {
        slug: true,
        images: { orderBy: { position: 'asc' }, select: { url: true, isPrimary: true, position: true } },
      },
    });
    return new Map(
      rows
        .filter((r) => r.images.length > 0)
        .map((r) => [
          r.slug,
          [...r.images]
            .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position)
            .map((i) => i.url),
        ]),
    );
  } catch {
    return new Map();
  }
});
