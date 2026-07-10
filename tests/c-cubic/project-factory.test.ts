import { describe, expect, it } from 'vitest';
import { BUSINESS_MODEL_PILOT_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v1';
import {
  createJiuxuangeProject,
  createJiuxuangeStage,
  stableCoursePackageHash,
} from '@/lib/c-cubic/project-factory';

describe('Jiuxuange PBL project factory', () => {
  it('creates one authoritative B-module project with one active task', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_PILOT_PACKAGE, {
      now: '2026-07-11T00:00:00.000Z',
      startModuleId: 'six-elements',
      caseId: 'demo_chain_franchise',
    });

    expect(project.jiuxuange).toEqual(
      expect.objectContaining({
        courseId: 'business-model',
        courseVersion: '1.0.0-pilot-b',
        moduleId: 'six-elements',
        curriculumOrder: 2,
        caseId: 'demo_chain_franchise',
        runtimeMode: 'demo',
        formalScoringEnabled: false,
      }),
    );
    expect(project.milestones).toHaveLength(1);
    expect(project.milestones[0].status).toBe('active');
    expect(project.milestones[0].order).toBe(0);
    expect(project.milestones[0].description).toContain('[demo-f1]');
    expect(
      project.milestones[0].microtasks.filter((task) => task.status === 'in_progress'),
    ).toHaveLength(1);
    expect(project.roles.map((role) => role.name)).toEqual([
      '教授',
      '学长',
      '神秘角色',
      '成长反馈官',
    ]);
    expect(project.threads).toHaveLength(1);
    expect(project.threads[0].agentId).toBe('jiuxuange-professor');
    expect(project.evaluations).toEqual([]);
  });

  it('packages only learner-visible facts into the PBL reference document', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_PILOT_PACKAGE, {
      now: '2026-07-11T00:00:00.000Z',
      caseId: 'demo_chain_franchise',
    });
    const content = project.milestones[0].documents?.[0]?.content ?? '';

    expect(content).toContain('demo-f1');
    expect(content).toContain('门店数量持续增长');
    expect(content).not.toContain('coach-judgement-1');
  });

  it('refuses to activate an unverified real case', () => {
    expect(() =>
      createJiuxuangeProject(BUSINESS_MODEL_PILOT_PACKAGE, {
        now: '2026-07-11T00:00:00.000Z',
        caseId: 'guan-yu-nan',
      }),
    ).toThrow('Case guan-yu-nan is not ready for a real pilot');
  });

  it('uses a stable package fingerprint independent of object key order', () => {
    const reordered = structuredClone(BUSINESS_MODEL_PILOT_PACKAGE);
    reordered.questionTemplates = Object.fromEntries(
      Object.entries(reordered.questionTemplates).reverse(),
    );

    expect(stableCoursePackageHash(reordered)).toBe(
      stableCoursePackageHash(BUSINESS_MODEL_PILOT_PACKAGE),
    );
  });

  it('wraps the project in one persisted PBL scene', () => {
    const data = createJiuxuangeStage(BUSINESS_MODEL_PILOT_PACKAGE, {
      now: '2026-07-11T00:00:00.000Z',
      stageId: 'jiuxuange-session-test',
      sceneId: 'jiuxuange-scene-test',
      caseId: 'demo_chain_franchise',
    });

    expect(data.stage.id).toBe('jiuxuange-session-test');
    expect(data.currentSceneId).toBe('jiuxuange-scene-test');
    expect(data.scenes).toHaveLength(1);
    expect(data.scenes[0].content.type).toBe('pbl');
    if (data.scenes[0].content.type !== 'pbl') throw new Error('Expected a PBL scene');
    expect(data.scenes[0].content.projectV2?.jiuxuange?.courseId).toBe('business-model');
  });
});
