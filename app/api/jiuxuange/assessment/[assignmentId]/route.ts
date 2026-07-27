import type { NextRequest } from 'next/server';
import { startAssessmentSession } from '@/lib/jiuxuange/portal/domain';
import { apiSuccess } from '@/lib/server/api-response';
import { domainError, requireLearner } from '@/lib/server/jiuxuange/api';
import { updatePortalState } from '@/lib/server/jiuxuange/repository';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ assignmentId: string }> },
) {
  const auth = requireLearner(req);
  if (!auth.identity) return auth.error;
  try {
    const { assignmentId } = await context.params;
    const detail = await updatePortalState((state) => {
      const session = startAssessmentSession(state, auth.identity!.learnerId, assignmentId);
      const projectCard = state.projectCardVersions.find(
        (item) => item.id === session.projectCardVersionId,
      );
      if (!projectCard || projectCard.projectId !== session.projectId) {
        throw new Error('Assessment project does not match its frozen project card.');
      }
      const attempts = session.attemptIds.flatMap((id) => {
        const attempt = state.assessmentAttempts.find((item) => item.id === id);
        return attempt ? [attempt] : [];
      });
      return { session, projectCard, attempts };
    });
    return apiSuccess({ detail });
  } catch (error) {
    return domainError(error);
  }
}
