import { describe, expect, it } from 'vitest';

import { BUSINESS_MODEL_SIX_LEVEL_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v3';
import { validateCoursePackage } from '@/lib/c-cubic/course-package/validate';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';

const LEVEL_IDS = [
  'positioning',
  'business-system',
  'key-resources-capabilities',
  'profit-model',
  'cash-flow-structure',
  'enterprise-value',
];

describe('Jiuxuange six-level course package', () => {
  it('opens a new V3 session directly in the unified workspace', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_SIX_LEVEL_PACKAGE, {
      now: '2026-07-20T00:00:00.000Z',
    });

    expect(project.uiPhase).toBe('workspace');
  });

  it('publishes exactly six visible levels without exposing internal steps as levels', () => {
    expect(BUSINESS_MODEL_SIX_LEVEL_PACKAGE.version).toBe('3.0.0-six-level-pbl');
    expect(BUSINESS_MODEL_SIX_LEVEL_PACKAGE.journey?.levels.map((level) => level.id)).toEqual(
      LEVEL_IDS,
    );
    expect(BUSINESS_MODEL_SIX_LEVEL_PACKAGE.journey?.preludeModuleIds).toEqual([
      'course-foundations',
    ]);
    expect(BUSINESS_MODEL_SIX_LEVEL_PACKAGE.journey?.postludeModuleIds).toEqual([
      'project-synthesis',
      'personal-assessment',
      'final-review',
    ]);
  });

  it('requires four ordered learning actions inside every visible level', () => {
    for (const level of BUSINESS_MODEL_SIX_LEVEL_PACKAGE.journey?.levels ?? []) {
      const learningModule = BUSINESS_MODEL_SIX_LEVEL_PACKAGE.modules.find(
        (module) => module.id === level.moduleIds[0],
      );
      expect(learningModule?.questionTemplateIds).toHaveLength(4);
      expect(
        learningModule?.questionTemplateIds.map(
          (id) => BUSINESS_MODEL_SIX_LEVEL_PACKAGE.questionTemplates[id]?.phase,
        ),
      ).toEqual(['ground', 'apply', 'tension', 'reflect']);
    }
  });

  it('keeps three deterministic scaffolds on every level question', () => {
    const levelModuleIds = new Set(
      BUSINESS_MODEL_SIX_LEVEL_PACKAGE.journey?.levels.flatMap((level) => level.moduleIds) ?? [],
    );
    const questionIds = BUSINESS_MODEL_SIX_LEVEL_PACKAGE.modules
      .filter((module) => levelModuleIds.has(module.id) && module.caseIds.length === 0)
      .flatMap((module) => module.questionTemplateIds);

    for (const questionId of questionIds) {
      const question = BUSINESS_MODEL_SIX_LEVEL_PACKAGE.questionTemplates[questionId];
      expect(question.scaffolds?.map((scaffold) => scaffold.hintLevel)).toEqual([1, 2, 3]);
      expect(question.learningFragmentIds?.length).toBeGreaterThan(0);
    }
  });

  it('keeps the shared package structurally valid and free of locked analysis text', () => {
    expect(validateCoursePackage(BUSINESS_MODEL_SIX_LEVEL_PACKAGE)).toEqual([]);
    expect(JSON.stringify(BUSINESS_MODEL_SIX_LEVEL_PACKAGE)).not.toContain('locked_analysis');
    expect(JSON.stringify(BUSINESS_MODEL_SIX_LEVEL_PACKAGE)).not.toContain('analysis-unlock');
  });
});
