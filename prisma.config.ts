import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 config. Connection URLs live here (and in the client adapter), not
 * in schema.prisma. DATABASE_URL comes from .env.local / the environment —
 * local Postgres in development, RDS in a later AWS phase.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://gem:gem@localhost:5432/gemystic',
  },
});
