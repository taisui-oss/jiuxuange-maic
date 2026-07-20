import { describe, expect, it } from 'vitest';

import { BUSINESS_MODEL_SINGLE_COURSE_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v4';
import { BUSINESS_MODEL_SIX_LEVEL_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v3';
import { getCoursePackage } from '@/lib/c-cubic/course-package/registry';
import { validateCoursePackage } from '@/lib/c-cubic/course-package/validate';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';

describe('Jiuxuange single-course orientation V4', () => {
  it('starts learning directly without the legacy qualification orientation', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_SINGLE_COURSE_PACKAGE, {
      now: '2026-07-20T00:00:00.000Z',
    });

    expect(project.uiPhase).toBe('workspace');
    expect(project.jiuxuange?.entryMode).toBe('learning-first');
    expect(project.jiuxuange?.orientation).toBeUndefined();
    expect(project.milestones[0]?.microtasks[0]?.jiuxuange?.teachingText).toContain(
      '商业模式不等于',
    );
  });

  it('keeps exactly three ordered orientation tasks and excludes assessment', () => {
    const prelude = BUSINESS_MODEL_SINGLE_COURSE_PACKAGE.modules.find(
      (module) => module.id === 'course-foundations',
    );
    expect(prelude?.questionTemplateIds).toEqual([
      'orientation-must-know',
      'orientation-convenience-bee',
      'orientation-six-element-map',
    ]);
    expect(
      BUSINESS_MODEL_SINGLE_COURSE_PACKAGE.questionTemplates['orientation-convenience-bee']
        ?.caseId,
    ).toBe('convenience-bee');
    expect(JSON.stringify(prelude)).not.toMatch(/测评|评分|assessment/i);
  });

  it('keeps V3 resumable with its original orientation state', () => {
    const oldProject = createJiuxuangeProject(BUSINESS_MODEL_SIX_LEVEL_PACKAGE, {
      now: '2026-07-20T00:00:00.000Z',
    });
    expect(oldProject.jiuxuange?.orientation).toBeDefined();
    expect(getCoursePackage('business-model', '3.0.0-six-level-pbl')).toBe(
      BUSINESS_MODEL_SIX_LEVEL_PACKAGE,
    );
  });

  it('is registered, structurally valid, and contains no locked case analysis', () => {
    expect(
      getCoursePackage('business-model', '4.0.0-learning-first-orientation'),
    ).toBe(BUSINESS_MODEL_SINGLE_COURSE_PACKAGE);
    expect(validateCoursePackage(BUSINESS_MODEL_SINGLE_COURSE_PACKAGE)).toEqual([]);
    expect(JSON.stringify(BUSINESS_MODEL_SINGLE_COURSE_PACKAGE)).not.toContain('locked_analysis');
  });
});
