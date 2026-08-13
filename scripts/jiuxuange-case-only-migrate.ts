import { migrate } from 'drizzle-orm/node-postgres/migrator';
import {
  closeCaseOnlyDatabaseForTests,
  getCaseOnlyDatabase,
} from '@/lib/server/jiuxuange-case-only/db/client';

async function main(): Promise<void> {
  await migrate(getCaseOnlyDatabase(), {
    migrationsFolder: 'drizzle/jiuxuange-case-only',
    migrationsSchema: 'jiuxuange_migrations',
    migrationsTable: '__drizzle_migrations',
  });
  await closeCaseOnlyDatabaseForTests();
  process.stdout.write('[case-only-migrate] migrations applied\n');
}

main().catch(async (error) => {
  await closeCaseOnlyDatabaseForTests().catch(() => undefined);
  console.error(error);
  process.exitCode = 1;
});
