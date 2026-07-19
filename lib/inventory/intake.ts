import 'server-only';
import { prisma } from '../prisma';

/**
 * Inventory intake, modelled on the owner's working spreadsheet rather than on
 * a generic product form. The sheet is the team's real vocabulary, so the code
 * uses its words: a stone has a type, a bench status, a Drive folder of photos,
 * and a presence on each sales channel.
 */

export type StoneType = 'cut' | 'pair' | 'specimen' | 'rough_parcel';

export const STONE_TYPES: { value: StoneType; label: string; prefix: string; hint: string }[] = [
  { value: 'cut', label: 'Cut stone', prefix: 'G', hint: 'Faceted or cabochon, priced per piece, weighed in carats' },
  { value: 'pair', label: 'Matched pair', prefix: 'P', hint: 'Two stones cut to match, sold together' },
  { value: 'specimen', label: 'Specimen', prefix: 'SP', hint: 'Mineral specimen, weighed in grams' },
  { value: 'rough_parcel', label: 'Rough parcel', prefix: 'RP', hint: 'A lot priced per gram, stones vary in size' },
];

/**
 * Bench workflow, in the order photography actually happens. These are the
 * sheet's own status words; renaming them would only force the team to
 * translate between the sheet and the screen.
 */
export type IntakeStatus = 'pending_images' | 'filter_images' | 'in_draft' | 'uploaded';

export const INTAKE_STATUSES: { value: IntakeStatus; label: string; hint: string }[] = [
  { value: 'pending_images', label: 'Pending images', hint: 'Stone logged, not photographed yet' },
  { value: 'filter_images', label: 'Filter images', hint: 'Photographed, best shots not chosen yet' },
  { value: 'in_draft', label: 'In draft', hint: 'Images chosen, listing copy being written' },
  { value: 'uploaded', label: 'Uploaded', hint: 'Ready to list, or already listed' },
];

/** The eight places stock is sold, from the sheet's own "Listed" columns. */
export const CHANNELS: { value: string; label: string }[] = [
  { value: 'web', label: 'This website' },
  { value: 'etsy', label: 'Etsy' },
  { value: 'ebay', label: 'eBay' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'gemrock', label: 'Gem Rock Auctions' },
  { value: 'erock', label: 'eRock' },
  { value: 'firstdibs', label: '1stDibs' },
];

export const CHANNEL_STATUSES = ['not_listed', 'draft', 'listed', 'sold', 'ended'] as const;

/**
 * Species abbreviation used inside a SKU. Three letters from the species name,
 * matching the sheet's existing codes (Amethyst AMT, Emerald EMD, Garnet GNT).
 * Known species are pinned so previously issued codes keep their meaning.
 */
const SPECIES_CODES: Record<string, string> = {
  amethyst: 'AMT',
  ametrine: 'AMR',
  aquamarine: 'AQM',
  citrine: 'CTR',
  emerald: 'EMD',
  garnet: 'GNT',
  'rhodolite garnet': 'GNT',
  morganite: 'MRG',
  peridot: 'PRD',
  quartz: 'QTZ',
  ruby: 'RBY',
  sapphire: 'SPH',
  spinel: 'SPL',
  topaz: 'TPZ',
  tourmaline: 'TML',
  fluorite: 'FLR',
  corundum: 'CRD',
};

export function speciesCode(species: string): string {
  const key = species.trim().toLowerCase();
  if (SPECIES_CODES[key]) return SPECIES_CODES[key];
  // Unknown species: first three letters that are not vowels after the first,
  // which is how the pinned codes above were formed (Topaz to TPZ).
  const letters = key.replace(/[^a-z]/g, '');
  if (letters.length <= 3) return letters.toUpperCase().padEnd(3, 'X');
  const [first, ...rest] = letters.split('');
  const consonants = rest.filter((c) => !'aeiou'.includes(c));
  return (first + consonants.slice(0, 2).join('')).toUpperCase().padEnd(3, 'X');
}

/**
 * Next SKU for a type and species, e.g. GAMT004. Sequence is per prefix so
 * cut stones and parcels of the same species number independently, exactly as
 * the sheet does it.
 */
export async function nextSku(stoneType: StoneType, species: string): Promise<string> {
  const prefix = STONE_TYPES.find((t) => t.value === stoneType)?.prefix ?? 'G';
  const stem = `${prefix}${speciesCode(species)}`;

  const last = await prisma.product.findFirst({
    where: { sku: { startsWith: stem } },
    orderBy: { sku: 'desc' },
    select: { sku: true },
  });

  const n = last?.sku ? Number(last.sku.slice(stem.length)) + 1 : 1;
  return `${stem}${String(Number.isNaN(n) ? 1 : n).padStart(3, '0')}`;
}

export interface IntakeInput {
  stoneType: StoneType;
  species: string;
  title: string;
  colour?: string | null;
  shape?: string | null;
  intakeStatus: IntakeStatus;
  categoryId: string;

  /** Cut stones and pairs. */
  caratWeight?: number | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  diameterMm?: number | null;

  /** Specimens and parcels. */
  weightGrams?: number | null;
  weightFromG?: number | null;
  weightToG?: number | null;

  unitPrice?: number | null;
  priceUnit?: 'gram' | 'carat' | 'piece' | null;
  price: number;
  costPrice?: number | null;

  originCountry?: string | null;
  treatment?: string | null;
  shipsFrom?: 'PK' | 'TH';
  mediaFolder?: string | null;
  intakeNotes?: string | null;

  /** channel value to listing state. */
  channels?: Record<string, { status: string; listingUrl?: string | null }>;
}

function slugify(v: string): string {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Totals for a parcel: per-gram price times overall weight, rounded once. */
export function computeTotal(input: {
  unitPrice?: number | null;
  priceUnit?: string | null;
  weightGrams?: number | null;
  caratWeight?: number | null;
}): number | null {
  if (!input.unitPrice) return null;
  const qty =
    input.priceUnit === 'gram'
      ? input.weightGrams
      : input.priceUnit === 'carat'
        ? input.caratWeight
        : 1;
  if (!qty) return null;
  return Math.round(input.unitPrice * qty * 100) / 100;
}

export async function createIntake(input: IntakeInput): Promise<{ id: string; sku: string }> {
  const sku = await nextSku(input.stoneType, input.species);

  // Slug stays unique even when two stones share a title, which they will:
  // "Amethyst 11.25ct Cushion" describes a dozen stones over a year.
  const slug = `${slugify(input.title)}-${sku.toLowerCase()}`;

  const product = await prisma.product.create({
    data: {
      sku,
      slug,
      categoryId: input.categoryId,
      title: input.title,
      description: input.intakeNotes ?? '',
      price: input.price,
      quantity: 1,
      tags: [],
      stoneType: input.stoneType,
      intakeStatus: input.intakeStatus,
      colour: input.colour ?? null,
      shape: input.shape ?? null,
      caratWeight: input.caratWeight ?? null,
      lengthMm: input.lengthMm ?? null,
      widthMm: input.widthMm ?? null,
      heightMm: input.heightMm ?? null,
      diameterMm: input.diameterMm ?? null,
      weightGrams: input.weightGrams ?? null,
      weightFromG: input.weightFromG ?? null,
      weightToG: input.weightToG ?? null,
      unitPrice: input.unitPrice ?? null,
      priceUnit: input.priceUnit ?? null,
      costPrice: input.costPrice ?? null,
      originCountry: input.originCountry ?? 'Pakistan',
      treatment: input.treatment ?? 'Not disclosed',
      shipsFrom: input.shipsFrom ?? 'PK',
      mediaFolder: input.mediaFolder ?? null,
      intakeNotes: input.intakeNotes ?? null,
      // Intake creates stock, not a listing. Listing is step 2.
      status: 'draft',
      source: 'intake',
    },
  });

  const channels = input.channels ?? {};
  const rows = Object.entries(channels)
    .filter(([channel]) => CHANNELS.some((c) => c.value === channel))
    .map(([channel, v]) => ({
      productId: product.id,
      channel,
      status: v.status,
      listingUrl: v.listingUrl?.trim() || null,
      listedAt: v.status === 'listed' ? new Date() : null,
    }));

  if (rows.length > 0) await prisma.productChannel.createMany({ data: rows });

  return { id: product.id, sku };
}

export async function updateChannel(
  productId: string,
  channel: string,
  patch: { status: string; listingUrl?: string | null },
): Promise<void> {
  await prisma.productChannel.upsert({
    where: { productId_channel: { productId, channel } },
    update: {
      status: patch.status,
      listingUrl: patch.listingUrl?.trim() || null,
      listedAt: patch.status === 'listed' ? new Date() : null,
    },
    create: {
      productId,
      channel,
      status: patch.status,
      listingUrl: patch.listingUrl?.trim() || null,
      listedAt: patch.status === 'listed' ? new Date() : null,
    },
  });
}
