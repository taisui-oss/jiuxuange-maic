import { describe, expect, it } from 'vitest';
import { migrateJiuxuangePortalState } from '@/lib/jiuxuange/portal/migrations';
import type { JiuxuangePortalState } from '@/lib/jiuxuange/portal/types';
import { MCKESS_ASSESSMENT_ASSIGNMENT_ID } from '@/lib/jiuxuange/portal/mckess-assessment';

describe('Jiuxuange portal demo migration', () => {
  it('preserves the old draft while publishing a separate Mckess-bound assessment', () => {
    const legacy = {
      schemaVersion: 1,
      courseVersions: [],
      courseEnrollments: [],
      learningSessions: [],
      groupMemberships: [
        {
          id: 'membership-demo-learner',
          learnerId: 'demo-learner',
          groupId: 'demo-group',
          classId: 'demo-class',
          status: 'active',
        },
      ],
      projectCardVersions: [
        {
          id: 'project-card-demo@1',
          groupId: 'demo-group',
          projectId: 'demo-project',
          version: '1',
          title: '中草药泥膜项目',
          facts: [],
          frozenAt: '2026-07-26T00:00:00.000Z',
        },
      ],
      assessmentAssignments: [
        {
          id: 'bm-assessment-v1',
          title: '旧测评',
          groupId: 'demo-group',
          projectCardVersionId: 'project-card-demo@1',
          questionVersion: 'old@1',
          questions: [],
          promptVersion: 'old@1',
          rubricVersion: 'old@1',
          status: 'published',
        },
      ],
      assessmentSessions: [
        {
          id: 'old-session',
          learnerId: 'demo-learner',
          assignmentId: 'bm-assessment-v1',
          projectCardVersionId: 'project-card-demo@1',
          questionVersion: 'old@1',
          questions: [],
          status: 'draft',
          draftAnswers: { old: '保留这份旧草稿' },
          attemptIds: [],
          updatedAt: '2026-07-26T00:00:00.000Z',
        },
      ],
      assessmentAttempts: [],
      activityEvents: [],
    } as unknown as JiuxuangePortalState;

    const migrated = migrateJiuxuangePortalState(legacy);
    const oldAssignment = migrated.assessmentAssignments.find(
      (assignment) => assignment.id === 'bm-assessment-v1',
    );
    const newAssignment = migrated.assessmentAssignments.find(
      (assignment) => assignment.id === MCKESS_ASSESSMENT_ASSIGNMENT_ID,
    );

    expect(oldAssignment?.status).toBe('closed');
    expect(migrated.assessmentSessions[0].draftAnswers).toEqual({
      old: '保留这份旧草稿',
    });
    expect(migrated.assessmentSessions[0].projectId).toBe('demo-project');
    expect(newAssignment?.projectId).toBe('mckess-central-kitchen');
    expect(newAssignment?.id).toBe('bm-assessment-mckess-v2');
    expect(newAssignment?.questions).toHaveLength(6);
    expect(newAssignment?.questionVersion).toBe('bm-mckess-six-open-scenarios@2');
    expect(
      migrated.projectCardVersions.find((card) => card.id === newAssignment?.projectCardVersionId)
        ?.projectId,
    ).toBe(newAssignment?.projectId);
    expect(
      migrated.projectCardVersions.find((card) => card.id === newAssignment?.projectCardVersionId)
        ?.version,
    ).toBe('1.1.0-draft');
    expect(
      migrated.groupMemberships.some(
        (membership) =>
          membership.learnerId === 'demo-learner' && membership.groupId === newAssignment?.groupId,
      ),
    ).toBe(true);
  });
});
