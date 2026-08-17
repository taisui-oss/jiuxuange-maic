import { afterAll, beforeEach, describe, expect, test } from 'vitest';
import { sql } from 'drizzle-orm';
import {
  closeCaseOnlyDatabaseForTests,
  getCaseOnlyDatabase,
} from '@/lib/server/jiuxuange-case-only/db/client';
import {
  consumePlayerLaunchTicket,
  consumePlayerPreviewLink,
  createPlayerLaunchTicket,
  createPlayerPreviewLink,
  resolvePlayerSession,
  revokePlayerPreviewLink,
} from '@/lib/server/jiuxuange-player/session-repository';

const USER_ID = '20000000-0000-4000-8000-000000000001';
const PREVIEW_USER_ID = '20000000-0000-4000-8000-000000000002';
const PACKAGE_ID = 'breakfast-chain-six-elements-foundation';

async function resetTables() {
  await getCaseOnlyDatabase().execute(sql`
    truncate table
      jiuxuange_case_only.player_sessions,
      jiuxuange_case_only.player_launch_tickets,
      jiuxuange_case_only.player_preview_links,
      jiuxuange_case_only.progress_submissions,
      jiuxuange_case_only.case_progress,
      jiuxuange_case_only.users
    cascade
  `);
}

describe('Jiuxuange Player sessions', () => {
  beforeEach(resetTables);
  afterAll(closeCaseOnlyDatabaseForTests);

  test('exchanges a launch ticket exactly once for a scoped session', async () => {
    const launch = await createPlayerLaunchTicket({ userId: USER_ID, packageId: PACKAGE_ID });
    const exchanged = await consumePlayerLaunchTicket(launch.ticket);
    expect(exchanged.packageId).toBe(PACKAGE_ID);
    await expect(consumePlayerLaunchTicket(launch.ticket)).rejects.toThrow(/already used/);
    await expect(resolvePlayerSession(exchanged.sessionToken)).resolves.toMatchObject({
      userId: USER_ID,
      packageId: PACKAGE_ID,
      preview: false,
    });
  });

  test('enforces preview usage limits and revocation', async () => {
    const preview = await createPlayerPreviewLink({
      packageId: PACKAGE_ID,
      createdBy: 'curriculum-researcher',
      maxUses: 1,
    });
    const exchanged = await consumePlayerPreviewLink(preview.token, PREVIEW_USER_ID);
    await expect(resolvePlayerSession(exchanged.sessionToken)).resolves.toMatchObject({
      packageId: PACKAGE_ID,
      preview: true,
    });
    await expect(consumePlayerPreviewLink(preview.token, PREVIEW_USER_ID)).rejects.toThrow(
      /exhausted/,
    );

    const revocable = await createPlayerPreviewLink({
      packageId: PACKAGE_ID,
      createdBy: 'curriculum-researcher',
    });
    expect(await revokePlayerPreviewLink(revocable.id)).toBe(true);
    await expect(consumePlayerPreviewLink(revocable.token, PREVIEW_USER_ID)).rejects.toThrow(
      /revoked/,
    );
  });
});
