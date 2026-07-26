import type { NextRequest } from 'next/server';
import {
  saveAssessmentDraft,
  submitAssessmentAttempt,
  type AssessmentAnswers,
} from '@/lib/jiuxuange/portal/domain';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { domainError, requireLearner } from '@/lib/server/jiuxuange/api';
import { updatePortalState } from '@/lib/server/jiuxuange/repository';

interface RequestBody {
  action?: 'save_draft' | 'submit';
  answers?: AssessmentAnswers;
}

export async function POST(req: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const auth = requireLearner(req);
  if (!auth.identity) return auth.error;

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Request body must be valid JSON.');
  }
  if (
    (body.action !== 'save_draft' && body.action !== 'submit') ||
    !body.answers ||
    typeof body.answers !== 'object'
  ) {
    return apiError('INVALID_REQUEST', 400, 'Action and answers are required.');
  }

  try {
    const { sessionId } = await context.params;
    const result = await updatePortalState((state) => {
      if (body.action === 'save_draft') {
        return {
          session: saveAssessmentDraft(state, auth.identity!.learnerId, sessionId, body.answers!),
        };
      }
      const attempt = submitAssessmentAttempt(
        state,
        auth.identity!.learnerId,
        sessionId,
        body.answers!,
      );
      const session = state.assessmentSessions.find((item) => item.id === sessionId);
      return { session, attempt };
    });
    return apiSuccess(result);
  } catch (error) {
    return domainError(error);
  }
}
