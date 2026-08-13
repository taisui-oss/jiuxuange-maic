import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

type CaseOnlyDatabase = NodePgDatabase<typeof schema>;

const globalDatabase = globalThis as typeof globalThis & {
  __jiuxuangeCaseOnlyPool?: Pool;
  __jiuxuangeCaseOnlyDb?: CaseOnlyDatabase;
};

function databaseUrl(): string {
  const value = process.env.JIUXUANGE_DATABASE_URL?.trim();
  if (!value) throw new Error('JIUXUANGE_DATABASE_URL is required for case-only Gate 2');
  return value;
}

export function getCaseOnlyPool(): Pool {
  if (!globalDatabase.__jiuxuangeCaseOnlyPool) {
    globalDatabase.__jiuxuangeCaseOnlyPool = new Pool({
      connectionString: databaseUrl(),
      application_name: 'jiuxuange-case-only-web',
      max: Number(process.env.JIUXUANGE_DATABASE_POOL_MAX ?? 10),
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      ssl:
        process.env.JIUXUANGE_DATABASE_SSL === 'require' ? { rejectUnauthorized: true } : undefined,
    });
  }
  return globalDatabase.__jiuxuangeCaseOnlyPool;
}

export function getCaseOnlyDatabase(): CaseOnlyDatabase {
  if (!globalDatabase.__jiuxuangeCaseOnlyDb) {
    globalDatabase.__jiuxuangeCaseOnlyDb = drizzle(getCaseOnlyPool(), { schema });
  }
  return globalDatabase.__jiuxuangeCaseOnlyDb;
}

export async function closeCaseOnlyDatabaseForTests(): Promise<void> {
  await globalDatabase.__jiuxuangeCaseOnlyPool?.end();
  delete globalDatabase.__jiuxuangeCaseOnlyPool;
  delete globalDatabase.__jiuxuangeCaseOnlyDb;
}
