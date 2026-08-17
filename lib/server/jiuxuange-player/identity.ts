import 'server-only';

import { cookies } from 'next/headers';
import { resolveCaseOnlyActor } from '@/lib/server/jiuxuange-case-only/identity';
import type { PlayerSessionActor } from '@/lib/jiuxuange/player/types';
import { PLAYER_SESSION_COOKIE, resolvePlayerSession } from './session-repository';

export async function resolvePlayerActor(): Promise<PlayerSessionActor> {
  const sessionToken = (await cookies()).get(PLAYER_SESSION_COOKIE)?.value;
  if (sessionToken) {
    const actor = await resolvePlayerSession(sessionToken);
    if (actor) return actor;
  }
  if (
    process.env.JIUXUANGE_PLAYER_IDENTITY_MODE === 'anonymous-preview' &&
    process.env.JIUXUANGE_PLAYER_ALLOW_ANONYMOUS_PREVIEW === 'true'
  ) {
    const actor = await resolveCaseOnlyActor();
    return { userId: actor.userId, preview: true };
  }
  throw new Error('Player session is required');
}

export function canAccessPlayerPackage(actor: PlayerSessionActor, packageId: string): boolean {
  return !actor.packageId || actor.packageId === packageId;
}
