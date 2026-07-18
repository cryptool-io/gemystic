import 'server-only';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Prisma client singleton (Trust-Agent's lib/prisma.ts pattern). Prisma 7 takes
 * a driver adapter; PrismaPg reads the pool config here so the connection URL
 * lives in the environment, never in code.
 *
 * Not yet imported by the runtime code paths, the JSON stores remain the
 * drivers until Postgres is up (`docker compose --profile db up -d`) and the
 * migration has run. Swapping a store to Prisma is then a one-file change.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function db(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Start Postgres (docker compose --profile db up -d) ' +
        'and add DATABASE_URL to .env.local, see .env.example.',
    );
  }

  const adapter = new PrismaPg({ connectionString: url });
  const client = new PrismaClient({ adapter });

  // Reuse across HMR reloads in dev so we do not leak connection pools.
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
  return client;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
