import { describe, expect, it } from 'vitest';

import { shouldEnterJiuxuangeWorkspaceDirectly } from '@/lib/c-cubic/workspace-entry';
import type { PBLProjectV2 } from '@/lib/pbl/v2/types';

function project(uiPhase: PBLProjectV2['uiPhase'], jiuxuange: boolean): PBLProjectV2 {
  return {
    uiPhase,
    jiuxuange: jiuxuange
      ? {
          courseId: 'business-model-foundations',
          courseVersion: '2.0.0-guided-course',
          moduleId: 'guided-course',
          curriculumOrder: 0,
          releaseStatus: 'full',
          factPackHash: 'test-hash',
          caseId: 'guided-course',
          runtimeMode: 'curated_course',
          formalScoringEnabled: false,
        }
      : undefined,
  } as PBLProjectV2;
}

describe('Jiuxuange direct workspace entry', () => {
  it('takes over the viewport when an existing course workspace is resumed', () => {
    expect(shouldEnterJiuxuangeWorkspaceDirectly(project('workspace', true))).toBe(true);
  });

  it('keeps the course hero docked until the learner starts it', () => {
    expect(shouldEnterJiuxuangeWorkspaceDirectly(project('hero', true))).toBe(false);
  });

  it('does not change the entry behavior of generic OpenMAIC projects', () => {
    expect(shouldEnterJiuxuangeWorkspaceDirectly(project('workspace', false))).toBe(false);
  });
});
