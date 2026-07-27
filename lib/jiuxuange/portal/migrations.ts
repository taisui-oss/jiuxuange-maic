import type { AssessmentAssignment, AssessmentSession, JiuxuangePortalState } from './types';
import {
  createMckessAssessmentAssignment,
  createMckessAssessmentProjectCardVersion,
} from './mckess-assessment';

type LegacyAssessmentAssignment = AssessmentAssignment & { projectId?: string };
type LegacyAssessmentSession = AssessmentSession & { projectId?: string };

export function migrateJiuxuangePortalState(state: JiuxuangePortalState): JiuxuangePortalState {
  for (const assignment of state.assessmentAssignments as LegacyAssessmentAssignment[]) {
    if (assignment.projectId) continue;
    assignment.projectId =
      state.projectCardVersions.find((card) => card.id === assignment.projectCardVersionId)
        ?.projectId ?? 'unknown-project';
  }

  for (const session of state.assessmentSessions as LegacyAssessmentSession[]) {
    if (session.projectId) continue;
    session.projectId =
      state.projectCardVersions.find((card) => card.id === session.projectCardVersionId)
        ?.projectId ?? 'unknown-project';
  }

  const legacyDemoCard = state.projectCardVersions.find(
    (card) => card.id === 'project-card-demo@1' && card.projectId === 'demo-project',
  );
  if (!legacyDemoCard) return state;

  const mckessCard = createMckessAssessmentProjectCardVersion();
  const mckessAssignment = createMckessAssessmentAssignment();
  if (!state.projectCardVersions.some((card) => card.id === mckessCard.id)) {
    state.projectCardVersions.push(mckessCard);
  }
  if (!state.assessmentAssignments.some((assignment) => assignment.id === mckessAssignment.id)) {
    state.assessmentAssignments.push(mckessAssignment);
  }

  for (const assignment of state.assessmentAssignments) {
    if (assignment.id === 'bm-assessment-v1' && assignment.projectId === legacyDemoCard.projectId) {
      assignment.status = 'closed';
    }
  }

  const legacyMemberships = state.groupMemberships.filter(
    (membership) => membership.groupId === legacyDemoCard.groupId,
  );
  for (const membership of legacyMemberships) {
    if (
      state.groupMemberships.some(
        (candidate) =>
          candidate.learnerId === membership.learnerId && candidate.groupId === mckessCard.groupId,
      )
    ) {
      continue;
    }
    state.groupMemberships.push({
      ...membership,
      id: `membership-${membership.learnerId}-mckess`,
      groupId: mckessCard.groupId,
    });
  }

  return state;
}
