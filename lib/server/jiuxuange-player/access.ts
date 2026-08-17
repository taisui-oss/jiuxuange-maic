import 'server-only';

import type { PlayerSessionActor } from '@/lib/jiuxuange/player/types';
import {
  getAccessibleCaseOnlyContent,
  getDirectCaseOnlyContent,
} from '@/lib/server/jiuxuange-case-only/progress-repository';
import { canAccessPlayerPackage } from './identity';

export async function getAccessiblePlayerContent(
  actor: PlayerSessionActor,
  packageId: string,
) {
  if (!canAccessPlayerPackage(actor, packageId)) return null;
  return actor.preview
    ? getDirectCaseOnlyContent(actor.userId, packageId)
    : getAccessibleCaseOnlyContent(actor.userId, packageId);
}
