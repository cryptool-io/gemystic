import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { config } from '../config';
import seedJson from '@/data/seed-reviews.json';

/**
 * Review store. Local-first JSON, same pattern as the auth and mail drivers, and
 * the same reason: real, working reviews today without a database. The shape
 * mirrors a future `reviews` table so the migration is a copy.
 *
 * Reviews are moderated: they are created `pending` and only render on the
 * storefront once `approved`. A gemstone shop trading on trust cannot let
 * arbitrary text publish itself.
 */

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  productSlug: string | null; // null = a general shop review
  authorName: string;
  authorEmail: string;
  rating: number; // 1..5
  title: string;
  body: string;
  status: ReviewStatus;
  reply: string | null; // shop owner's public response
  createdAt: string;
}

interface DbShape {
  reviews: Review[];
}

const DB_PATH = join(config.paths.var, 'reviews', 'reviews.json');

const SEED = (seedJson as unknown as { reviews: Review[] }).reviews;

async function read(): Promise<DbShape> {
  try {
    return JSON.parse(await readFile(DB_PATH, 'utf8')) as DbShape;
  } catch {
    // Fresh install: fall back to the real seed reviews so the shop shows genuine
    // social proof from day one. The first write persists these to disk.
    return { reviews: [...SEED] };
  }
}

async function write(db: DbShape): Promise<void> {
  await mkdir(dirname(DB_PATH), { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

export async function createReview(
  input: Omit<Review, 'id' | 'status' | 'reply' | 'createdAt'>,
): Promise<Review> {
  const db = await read();
  const review: Review = {
    ...input,
    id: globalThis.crypto.randomUUID(),
    status: 'pending',
    reply: null,
    createdAt: new Date().toISOString(),
  };
  db.reviews.push(review);
  await write(db);
  return review;
}

export async function approvedForProduct(productSlug: string): Promise<Review[]> {
  const db = await read();
  return db.reviews
    .filter((r) => r.status === 'approved' && r.productSlug === productSlug)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function approvedShopReviews(): Promise<Review[]> {
  const db = await read();
  return db.reviews
    .filter((r) => r.status === 'approved')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function allReviews(): Promise<Review[]> {
  const db = await read();
  return [...db.reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function setReviewStatus(id: string, status: ReviewStatus): Promise<void> {
  const db = await read();
  const r = db.reviews.find((x) => x.id === id);
  if (r) {
    r.status = status;
    await write(db);
  }
}

export async function setReviewReply(id: string, reply: string): Promise<void> {
  const db = await read();
  const r = db.reviews.find((x) => x.id === id);
  if (r) {
    r.reply = reply.trim() || null;
    await write(db);
  }
}

export interface RatingSummary {
  count: number;
  average: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function summarise(reviews: Review[]): RatingSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as RatingSummary['distribution'];
  for (const r of reviews) {
    const k = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[k]++;
  }
  const count = reviews.length;
  const average = count ? reviews.reduce((a, r) => a + r.rating, 0) / count : 0;
  return { count, average: Math.round(average * 10) / 10, distribution };
}
