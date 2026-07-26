import type { NextRequest } from 'next/server';
import { getLearnerPortal } from '@/lib/jiuxuange/portal/domain';
import { apiSuccess } from '@/lib/server/api-response';
import { requireLearner } from '@/lib/server/jiuxuange/api';
import { readPortalState } from '@/lib/server/jiuxuange/repository';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireLearner(req);
  if (!auth.identity) return auth.error;
  const state = await readPortalState();
  return apiSuccess({
    identitySource: auth.identity.source,
    portal: getLearnerPortal(state, auth.identity.learnerId),
  });
}
