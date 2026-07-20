import { describe, expect, it } from 'vitest';

import { BUSINESS_MODEL_LEARNING_LOOP_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v5';
import { getCoursePackage } from '@/lib/c-cubic/course-package/registry';
import { validateCoursePackage } from '@/lib/c-cubic/course-package/validate';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';
import { retrieveCourseContext } from '@/lib/c-cubic/knowledge/retrieve';

describe('Jiuxuange business-model V5 learning-loop package', () => {
  it('publishes the ten-node learning loop without assessment or six-level expansion', () => {
    expect(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE.version).toBe('5.0.0-learning-loop-pilot');
    expect(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE.entryMode).toBe('learning-loop');
    expect(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE.formalScoringEnabled).toBe(false);
    expect(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE.modules.map((module) => module.id)).toEqual([
      'learning-baseline',
      'learning-foundations',
      'case-convenience-bee-loop',
      'fresh-grocery-transfer',
      'judgment-revision',
      'learning-feedback',
    ]);
    expect(
      BUSINESS_MODEL_LEARNING_LOOP_PACKAGE.modules.some((module) =>
        module.id.includes('assessment'),
      ),
    ).toBe(false);
    expect(validateCoursePackage(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE)).toEqual([]);
  });

  it('contains traceable, observed learner facts for the teaching and transfer cases', () => {
    const bee = BUSINESS_MODEL_LEARNING_LOOP_PACKAGE.cases['convenience-bee-loop'];
    const fresh = BUSINESS_MODEL_LEARNING_LOOP_PACKAGE.cases['fresh-grocery-transfer'];

    expect(bee.facts).toHaveLength(5);
    expect(fresh.facts).toHaveLength(6);
    for (const fact of [...bee.facts, ...fresh.facts]) {
      expect(fact.sourceKind).toBe('course_case');
      expect(fact.visibility).toBe('learner');
      expect(fact.verificationStatus).toBe('verified');
      expect(fact.sourceRef.verificationStatus).toBe('verified');
      expect(fact.sourceRef.locator).toMatch(/^PDF第\d+页/);
      expect(fact.sourceRef).toMatchObject({
        contentHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      });
      expect(fact.observedAt).toBeTruthy();
    }

    expect(new Set(bee.facts.map((fact) => fact.sourceRef.contentHash))).toEqual(
      new Set(['sha256:b5162cb5d933e7160d8910b4bce66f9d09de0be8f59c82e4b4f18161eee854e3']),
    );
    expect(new Set(fresh.facts.map((fact) => fact.sourceRef.contentHash))).toEqual(
      new Set(['sha256:143d8f315ed246ca3224cc2b11f067476a519d3b12bbf3322d534298265a3a36']),
    );
  });

  it('keeps author analysis out of the serializable course package', () => {
    const serialized = JSON.stringify(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE);
    expect(serialized).not.toContain('locked_analysis');
    expect(serialized).not.toContain('建议叮咚买菜');
    expect(serialized).not.toContain('建议美团优选');
    expect(serialized).not.toContain('建议钱大妈');
  });

  it('keeps concept teaching fact-free and lets revision cite only disclosed case facts', () => {
    expect(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE.questionTemplates['loop-must-know'].factScope).toBe(
      'none',
    );
    expect(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE.questionTemplates['loop-revision'].factScope).toBe(
      'disclosed',
    );
  });

  it('releases the convenience-bee analysis only after the learner commit', () => {
    const beforeCommit = retrieveCourseContext({
      courseId: 'business-model',
      nodeId: 'convenience-bee-loop',
      stage: 'commit',
    });
    const afterCommit = retrieveCourseContext({
      courseId: 'business-model',
      nodeId: 'convenience-bee-loop',
      stage: 'compare',
    });

    expect(beforeCommit.sections.every((section) => section.kind === 'learner_fact')).toBe(true);
    expect(afterCommit.sections.some((section) => section.kind === 'locked_analysis')).toBe(true);
    expect(
      afterCommit.sections.find((section) => section.kind === 'locked_analysis')?.sources,
    ).toEqual([
      expect.objectContaining({
        page: 6,
        contentHash: 'sha256:b5162cb5d933e7160d8910b4bce66f9d09de0be8f59c82e4b4f18161eee854e3',
      }),
    ]);
  });

  it('compiles the cases into the required baseline, commit, transfer and revision sequence', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE, {
      now: '2026-07-20T14:00:00.000Z',
      learnerId: 'learner-v5-001',
      sessionVariantId: 'business-model-learning-loop',
    });

    expect(project.uiPhase).toBe('workspace');
    expect(project.jiuxuange?.courseVersion).toBe('5.0.0-learning-loop-pilot');
    expect(project.jiuxuange?.orientation).toBeUndefined();
    expect(
      project.milestones
        .flatMap((milestone) => milestone.microtasks)
        .map((task) => task.jiuxuange?.learningNodeId),
    ).toEqual([
      'baseline_capture',
      'must_know_instruction',
      'bee_fact_observation',
      'bee_independent_commit',
      'bee_unlock_compare',
      'fresh_transfer',
      'judgment_revision',
      'evidence_feedback',
    ]);
  });

  it('registers V5 without replacing the V4 package', () => {
    expect(getCoursePackage('business-model', '5.0.0-learning-loop-pilot')).toBe(
      BUSINESS_MODEL_LEARNING_LOOP_PACKAGE,
    );
    expect(getCoursePackage('business-model', '4.0.0-learning-first-orientation').version).toBe(
      '4.0.0-learning-first-orientation',
    );
  });
});
