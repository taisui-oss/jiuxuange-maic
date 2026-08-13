import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/server/jiuxuange-case-only/db/schema.ts',
  out: './drizzle/jiuxuange-case-only',
  dbCredentials: {
    url: process.env.JIUXUANGE_DATABASE_URL ?? 'postgresql://localhost/jiuxuange_case_only',
  },
  migrations: {
    schema: 'jiuxuange_migrations',
    table: '__drizzle_migrations',
  },
  strict: true,
  verbose: true,
});
