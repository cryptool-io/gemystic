import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { config } from '../config';
import type { Product } from '../types';

/**
 * Discount campaigns. Local-first JSON store (same pattern as auth/reviews);
 * shape mirrors a future `campaigns` table.
 *
 * A campaign targets stones by species and/or category, "15% off all peridot",
 * "10% off specimens in August". Discounts are display-side: the base USD price
 * in the catalogue is never mutated, so ending a campaign restores prices by
 * definition and two campaigns can never compound by accident (the single best
 * discount wins, which is also the honest one to advertise).
 */
export interface Campaign {
  id: string;
  name: string;
  /** 0–90 (0 = free-shipping-only offer). Capped: a fat-fingered 99 on one-of-a-kind stock is a real loss. */
  percentOff: number;
  /** Empty arrays = matches all. */
  species: string[];
  categories: string[];
  startsAt: string; // ISO date
  endsAt: string;   // ISO date, inclusive
  active: boolean;
  /**
   * If set, the discount is NOT applied automatically on the storefront, the
   * customer must enter this code in the cart. Uppercased, unique per store.
   */
  code: string | null;
  /** The offer can also (or only) grant free shipping below the threshold. */
  freeShipping: boolean;
  createdAt: string;
}

const DB_PATH = join(config.paths.var, 'campaigns', 'campaigns.json');

// A product grid calls the pricing helpers once per tile; a 3-second TTL keeps
// that at one file read per render burst without ever serving stale campaigns
// to the admin (writes clear it).
let cache: { at: number; db: { campaigns: Campaign[] } } | null = null;

async function read(): Promise<{ campaigns: Campaign[] }> {
  if (cache && Date.now() - cache.at < 3000) return cache.db;
  let db: { campaigns: Campaign[] };
  try {
    db = JSON.parse(await readFile(DB_PATH, 'utf8'));
  } catch {
    db = { campaigns: [] };
  }
  cache = { at: Date.now(), db };
  return db;
}

async function write(db: { campaigns: Campaign[] }): Promise<void> {
  await mkdir(dirname(DB_PATH), { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  cache = null;
}

export async function allCampaigns(): Promise<Campaign[]> {
  return (await read()).campaigns.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createCampaign(
  input: Omit<Campaign, 'id' | 'createdAt'>,
): Promise<Campaign> {
  const db = await read();
  const campaign: Campaign = {
    ...input,
    code: input.code ? input.code.trim().toUpperCase() : null,
    freeShipping: Boolean(input.freeShipping),
    percentOff: Math.min(90, Math.max(0, Math.round(input.percentOff))),
    id: globalThis.crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  db.campaigns.push(campaign);
  await write(db);
  return campaign;
}

export async function updateCampaign(id: string, patch: Partial<Campaign>): Promise<void> {
  const db = await read();
  const c = db.campaigns.find((x) => x.id === id);
  if (c) {
    Object.assign(c, patch, { id: c.id, createdAt: c.createdAt });
    if (patch.percentOff !== undefined) {
      c.percentOff = Math.min(90, Math.max(0, Math.round(patch.percentOff)));
    }
    await write(db);
  }
}

export async function deleteCampaign(id: string): Promise<void> {
  const db = await read();
  db.campaigns = db.campaigns.filter((x) => x.id !== id);
  await write(db);
}

function isLive(c: Campaign, now: Date): boolean {
  if (!c.active) return false;
  const start = new Date(c.startsAt);
  // endsAt is inclusive: a campaign "to 31 Aug" runs through 31 Aug 23:59 UTC.
  const end = new Date(c.endsAt);
  end.setUTCHours(23, 59, 59, 999);
  return now >= start && now <= end;
}

function matches(c: Campaign, p: Product): boolean {
  const speciesOk = c.species.length === 0 || c.species.includes(p.species);
  const categoryOk = c.categories.length === 0 || c.categories.includes(p.category);
  return speciesOk && categoryOk;
}

export interface EffectivePrice {
  /** What the customer pays, USD. */
  priceUsd: number;
  /** Set only when discounted, the pre-campaign price for the strikethrough. */
  originalUsd: number | null;
  campaign: { name: string; percentOff: number } | null;
}

/**
 * The one place discount arithmetic lives. Rounds half-up to whole cents on the
 * discounted amount, never on intermediate values, so the shown price, the
 * charged price and the invoice line can never disagree by a cent.
 */
export async function effectivePrice(p: Product): Promise<EffectivePrice> {
  const now = new Date();
  const live = (await read()).campaigns.filter((c) => isLive(c, now) && !c.code && matches(c, p));

  if (live.length === 0) {
    return { priceUsd: p.priceUsd, originalUsd: null, campaign: null };
  }

  // Best single discount wins; campaigns never stack.
  const best = live.reduce((a, b) => (b.percentOff > a.percentOff ? b : a));
  const discounted = Math.round(p.priceUsd * (100 - best.percentOff)) / 100;

  return {
    priceUsd: discounted,
    originalUsd: p.priceUsd,
    campaign: { name: best.name, percentOff: best.percentOff },
  };
}

/**
 * Validates a promo code the customer typed in the cart. Returns the live
 * campaign or null; matching is case-insensitive.
 */
export async function campaignByCode(code: string): Promise<Campaign | null> {
  const now = new Date();
  const wanted = code.trim().toUpperCase();
  if (!wanted) return null;
  return (
    (await read()).campaigns.find(
      (c) => isLive(c, now) && c.code && c.code.toUpperCase() === wanted,
    ) ?? null
  );
}

/** Batch variant so a grid of 40 tiles reads the store once, not 40 times. */
export async function effectivePrices(products: Product[]): Promise<Map<string, EffectivePrice>> {
  const now = new Date();
  const campaigns = (await read()).campaigns.filter((c) => isLive(c, now) && !c.code);
  const out = new Map<string, EffectivePrice>();

  for (const p of products) {
    const live = campaigns.filter((c) => matches(c, p));
    if (live.length === 0) {
      out.set(p.slug, { priceUsd: p.priceUsd, originalUsd: null, campaign: null });
    } else {
      const best = live.reduce((a, b) => (b.percentOff > a.percentOff ? b : a));
      out.set(p.slug, {
        priceUsd: Math.round(p.priceUsd * (100 - best.percentOff)) / 100,
        originalUsd: p.priceUsd,
        campaign: { name: best.name, percentOff: best.percentOff },
      });
    }
  }
  return out;
}
