import 'server-only';

import { createHash, randomBytes } from 'crypto';
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';
import { getCaseOnlyDatabase } from '@/lib/server/jiuxuange-case-only/db/client';
import {
  caseOnlyUsers,
  playerLaunchTickets,
  playerPreviewLinks,
  playerSessions,
} from '@/lib/server/jiuxuange-case-only/db/schema';
import type { PlayerSessionActor } from '@/lib/jiuxuange/player/types';

export const PLAYER_SESSION_COOKIE = 'jiuxuange_player_session';

function opaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sessionTtlSeconds(): number {
  const configured = Number(process.env.JIUXUANGE_PLAYER_SESSION_TTL_SECONDS ?? 8 * 60 * 60);
  return Number.isFinite(configured) && configured >= 300 ? configured : 8 * 60 * 60;
}

export async function createPlayerLaunchTicket(input: {
  userId: string;
  packageId: string;
  returnTo?: string;
}): Promise<{ ticket: string; expiresAt: string }> {
  const db = getCaseOnlyDatabase();
  await db.insert(caseOnlyUsers).values({ id: input.userId }).onConflictDoNothing();
  const ticket = opaqueToken();
  const expiresAt = new Date(Date.now() + 60_000);
  await db.insert(playerLaunchTickets).values({
    tokenHash: tokenHash(ticket),
    userId: input.userId,
    packageId: input.packageId,
    returnTo: input.returnTo,
    expiresAt,
  });
  return { ticket, expiresAt: expiresAt.toISOString() };
}

export async function consumePlayerLaunchTicket(ticket: string): Promise<{
  sessionToken: string;
  packageId: string;
  returnTo?: string;
}> {
  const db = getCaseOnlyDatabase();
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(playerLaunchTickets)
      .where(
        and(
          eq(playerLaunchTickets.tokenHash, tokenHash(ticket)),
          isNull(playerLaunchTickets.consumedAt),
          gt(playerLaunchTickets.expiresAt, new Date()),
        ),
      )
      .for('update');
    if (!row) throw new Error('Launch ticket is invalid, expired, or already used');
    await tx
      .update(playerLaunchTickets)
      .set({ consumedAt: new Date() })
      .where(eq(playerLaunchTickets.id, row.id));
    const sessionToken = opaqueToken();
    await tx.insert(playerSessions).values({
      tokenHash: tokenHash(sessionToken),
      userId: row.userId,
      packageId: row.packageId,
      preview: 0,
      expiresAt: new Date(Date.now() + sessionTtlSeconds() * 1000),
    });
    return {
      sessionToken,
      packageId: row.packageId,
      returnTo: row.returnTo ?? undefined,
    };
  });
}

export async function resolvePlayerSession(token: string): Promise<PlayerSessionActor | null> {
  const db = getCaseOnlyDatabase();
  const [row] = await db
    .select()
    .from(playerSessions)
    .where(
      and(
        eq(playerSessions.tokenHash, tokenHash(token)),
        isNull(playerSessions.revokedAt),
        gt(playerSessions.expiresAt, new Date()),
      ),
    );
  if (!row) return null;
  await db
    .update(playerSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(playerSessions.id, row.id));
  return {
    userId: row.userId,
    packageId: row.packageId ?? undefined,
    preview: row.preview === 1,
  };
}

export async function createPlayerPreviewLink(input: {
  packageId: string;
  createdBy: string;
  maxUses?: number;
  expiresInSeconds?: number;
}): Promise<{ id: string; token: string; expiresAt: string }> {
  const token = opaqueToken();
  const expiresAt = new Date(Date.now() + (input.expiresInSeconds ?? 24 * 60 * 60) * 1000);
  const [created] = await getCaseOnlyDatabase()
    .insert(playerPreviewLinks)
    .values({
      tokenHash: tokenHash(token),
      packageId: input.packageId,
      createdBy: input.createdBy,
      maxUses: input.maxUses ?? 10,
      expiresAt,
    })
    .returning({ id: playerPreviewLinks.id });
  return { id: created.id, token, expiresAt: expiresAt.toISOString() };
}

export async function consumePlayerPreviewLink(token: string, previewUserId: string): Promise<{
  sessionToken: string;
  packageId: string;
}> {
  const db = getCaseOnlyDatabase();
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(playerPreviewLinks)
      .where(
        and(
          eq(playerPreviewLinks.tokenHash, tokenHash(token)),
          isNull(playerPreviewLinks.revokedAt),
          gt(playerPreviewLinks.expiresAt, new Date()),
          lt(playerPreviewLinks.useCount, playerPreviewLinks.maxUses),
        ),
      )
      .for('update');
    if (!row) throw new Error('Preview link is invalid, expired, revoked, or exhausted');
    await tx
      .update(playerPreviewLinks)
      .set({ useCount: sql`${playerPreviewLinks.useCount} + 1` })
      .where(eq(playerPreviewLinks.id, row.id));
    await tx.insert(caseOnlyUsers).values({ id: previewUserId }).onConflictDoNothing();
    const sessionToken = opaqueToken();
    await tx.insert(playerSessions).values({
      tokenHash: tokenHash(sessionToken),
      userId: previewUserId,
      packageId: row.packageId,
      preview: 1,
      expiresAt: new Date(Date.now() + sessionTtlSeconds() * 1000),
    });
    return { sessionToken, packageId: row.packageId };
  });
}

export async function revokePlayerPreviewLink(id: string): Promise<boolean> {
  const rows = await getCaseOnlyDatabase()
    .update(playerPreviewLinks)
    .set({ revokedAt: new Date() })
    .where(eq(playerPreviewLinks.id, id))
    .returning({ id: playerPreviewLinks.id });
  return rows.length > 0;
}
