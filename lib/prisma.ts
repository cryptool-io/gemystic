import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
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
