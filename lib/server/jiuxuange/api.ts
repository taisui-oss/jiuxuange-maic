import type { NextRequest } from 'next/server';
import { apiError } from '@/lib/server/api-response';
import { resolveLearnerIdentity } from './identity';

export function requireLearner(req: NextRequest) {
  const identity = resolveLearnerIdentity(req);
  if (!identity) {
    return {
      identity: null,
      error: apiError('INVALID_REQUEST', 401, 'A trusted Jiuxuange learner identity is required.'),
    };
  }
  return { identity, error: null };
}

export function domainError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Jiuxuange request failed.';
  const status = /not found|not assigned|unavailable/i.test(message)
    ? 404
    : /published|locked|complete|required/i.test(message)
      ? 409
      : 400;
  return apiError('INVALID_REQUEST', status, message);
}
