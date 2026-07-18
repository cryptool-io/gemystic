import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

/**
 * Postgres on the deploy box is shared with the other apps on it, so this
 * client must not help itself to a large slice of the connection slots.
 * Prisma's default pool is cpus*2+1, which on a many-core server, multiplied by
 * a build that prerenders hundreds of pages, is enough to exhaust the server
 * and fail the build. Capping it here keeps a neighbour app from paying for
 * our traffic. Any explicit connection_limit in DATABASE_URL still wins.
 */
function pooledUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("connection_limit=")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=5&pool_timeout=20`;
}

export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    datasources: { db: { url: pooledUrl() } },
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

/**
 * Driver switch for the store modules: with DATABASE_URL set the stores run on
 * Prisma, without it they stay on their local-first JSON files, so a keyless
 * install keeps working (see ARCHITECTURE.md).
 */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
