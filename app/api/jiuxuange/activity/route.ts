import type { NextRequest } from 'next/server';
import { recordActivity } from '@/lib/jiuxuange/portal/domain';
import type { PortalContext } from '@/lib/jiuxuange/portal/types';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireLearner } from '@/lib/server/jiuxuange/api';
import { updatePortalState } from '@/lib/server/jiuxuange/repository';

interface ActivityBody {
  context?: PortalContext;
  visible?: boolean;
  secondsSinceInteraction?: number;
  intervalSeconds?: number;
}

export async function POST(req: NextRequest) {
  const auth = requireLearner(req);
  if (!auth.identity) return auth.error;
  let body: ActivityBody;
  try {
    body = (await req.json()) as ActivityBody;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Request body must be valid JSON.');
  }
  if (
    !body.context ||
    !['course', 'free_learning', 'assessment'].includes(body.context) ||
    typeof body.visible !== 'boolean' ||
    typeof body.secondsSinceInteraction !== 'number' ||
    typeof body.intervalSeconds !== 'number'
  ) {
    return apiError('INVALID_REQUEST', 400, 'A complete activity heartbeat is required.');
  }
  const event = await updatePortalState((state) =>
    recordActivity(state, auth.identity!.learnerId, {
      context: body.context!,
      visible: body.visible!,
      secondsSinceInteraction: body.secondsSinceInteraction!,
      intervalSeconds: body.intervalSeconds!,
    }),
  );
  return apiSuccess({ creditedSeconds: event.creditedSeconds });
}
