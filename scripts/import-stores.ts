/**
 * One-shot import of the local-first JSON stores into Postgres.
 *
 *   DATABASE_URL=... npx tsx scripts/import-stores.ts
 *
 * Idempotent: users upsert by email, campaigns and reviews by id, so running
 * it twice changes nothing. Sessions are NOT imported (everyone just signs in
 * again); the JSON files are left in place untouched as a rollback path, they
 * are simply no longer read once DATABASE_URL is set.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const VAR_DIR = process.env.VAR_DIR ?? './var';
const prisma = new PrismaClient();

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

interface JsonUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string | null;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
}

interface JsonCampaign {
  id: string;
  name: string;
  percentOff: number;
  species: string[];
  categories: string[];
  startsAt: string;
  endsAt: string;
  active: boolean;
  code: string | null;
  freeShipping: boolean;
  createdAt: string;
}

interface JsonReview {
  id: string;
  productSlug: string | null;
  authorName: string;
  authorEmail: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  reply: string | null;
  createdAt: string;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set; nothing to import into.');
    process.exit(1);
  }

  const auth = await readJson<{ users: JsonUser[] }>(join(VAR_DIR, 'auth', 'users.json'));
  let users = 0;
  for (const u of auth?.users ?? []) {
    await prisma.user.upsert({
      where: { email: u.email.toLowerCase() },
      update: {
        passwordHash: u.passwordHash,
        fullName: u.fullName,
        role: u.role,
      },
      create: {
        email: u.email.toLowerCase(),
        passwordHash: u.passwordHash,
        fullName: u.fullName,
        role: u.role,
        createdAt: new Date(u.createdAt),
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : null,
      },
    });
    users++;
  }

  const campaignsFile = await readJson<{ campaigns: JsonCampaign[] }>(
    join(VAR_DIR, 'campaigns', 'campaigns.json'),
  );
  let campaigns = 0;
  for (const c of campaignsFile?.campaigns ?? []) {
    const data = {
      name: c.name,
      percentOff: c.percentOff,
      species: c.species,
      categories: c.categories,
      startsAt: new Date(c.startsAt),
      endsAt: new Date(c.endsAt),
      active: c.active,
      code: c.code,
      freeShipping: c.freeShipping,
    };
    await prisma.campaign.upsert({
      where: { id: c.id },
      update: data,
      create: { ...data, id: c.id, createdAt: new Date(c.createdAt) },
    });
    campaigns++;
  }

  // Reviews: whatever the JSON driver was serving (customer reviews written to
  // disk, or nothing, in which case lib/reviews seeds the DB on first read).
  const reviewsFile = await readJson<{ reviews: JsonReview[] }>(
    join(VAR_DIR, 'reviews', 'reviews.json'),
  );
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let reviews = 0;
  for (const r of reviewsFile?.reviews ?? []) {
    const data = {
      productSlug: r.productSlug,
      authorName: r.authorName,
      authorEmail: r.authorEmail,
      rating: r.rating,
      title: r.title,
      body: r.body,
      status: r.status,
      reply: r.reply,
    };
    if (UUID_RE.test(r.id)) {
      await prisma.review.upsert({
        where: { id: r.id },
        update: data,
        create: { ...data, id: r.id, createdAt: new Date(r.createdAt) },
      });
    } else {
      // Seed-file ids ("seed-1") predate the UUID column; match on content.
      const existing = await prisma.review.findFirst({
        where: { authorEmail: r.authorEmail, title: r.title, body: r.body },
      });
      if (!existing) {
        await prisma.review.create({ data: { ...data, createdAt: new Date(r.createdAt) } });
      }
    }
    reviews++;
  }

  console.log(`Imported: ${users} users, ${campaigns} campaigns, ${reviews} reviews.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
