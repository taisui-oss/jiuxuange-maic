import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/utils/database';
import { deleteStageData, loadStageData, saveStageData } from '@/lib/utils/stage-storage';
import {
  courseSessionId,
  deriveBusinessModelResumeState,
  getOrCreateBusinessModelSession,
  type LearningSessionRef,
} from '@/lib/c-cubic/session';
import { BUSINESS_MODEL_PILOT_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v1';
import { BUSINESS_MODEL_GUIDED_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v2';

const BASE = {
  learnerId: 'learner-a',
  courseId: 'business-model' as const,
  projectId: 'demo_chain_franchise',
  packageVersion: '1.0.0-pilot-b',
};

beforeEach(async () => {
  await db.transaction(
    'rw',
    db.learningPaths,
    db.courseProgress,
    db.stages,
    db.scenes,
    async () => {
      await db.learningPaths.clear();
      await db.courseProgress.clear();
      await db.stages.clear();
      await db.scenes.clear();
    },
  );
});

describe('business model unified session', () => {
  it('builds an unambiguous composite locator without using the nickname', () => {
    expect(courseSessionId(BASE)).toBe(
      '["learner-a","business-model","demo_chain_franchise","1.0.0-pilot-b"]',
    );
  });

  it('reuses the same stage for the same learner, course, project and version', async () => {
    const first = await getOrCreateBusinessModelSession({
      ...BASE,
      now: new Date('2026-07-11T00:00:00.000Z'),
      stageIdFactory: () => 'stage-first',
    });
    const second = await getOrCreateBusinessModelSession({
      ...BASE,
      now: new Date('2026-07-11T00:01:00.000Z'),
      stageIdFactory: () => 'stage-should-not-be-created',
    });

    expect(second).toEqual(first);
    expect(await db.stages.count()).toBe(1);
  });

  it('attaches the resolved home exchange once to the V2 course session', async () => {
    const coursePackage = {
      ...structuredClone(BUSINESS_MODEL_PILOT_PACKAGE),
      version: '2.0.0-guided-course',
    };
    const homeOrientationDraft = {
      id: 'orientation-1',
      learnerId: BASE.learnerId,
      status: 'resolved' as const,
      recommendedCourseId: 'business-model' as const,
      createdAt: '2026-07-11T00:00:00.000Z',
      resolvedAt: '2026-07-11T00:01:00.000Z',
      initialMessages: [
        { role: 'learner' as const, content: '加盟店增长很快，但续约率持续下降。' },
        { role: 'professor' as const, content: '你最终需要形成什么判断？' },
        { role: 'learner' as const, content: '我要判断是收费方式问题，还是总部价值不足。' },
      ],
    };

    const ref = await getOrCreateBusinessModelSession({
      ...BASE,
      coursePackage,
      homeOrientationDraft,
      stageIdFactory: () => 'stage-oriented',
    });
    await getOrCreateBusinessModelSession({
      ...BASE,
      coursePackage,
      homeOrientationDraft,
      stageIdFactory: () => 'stage-duplicate',
    });

    const data = await loadStageData(ref.stageId);
    const scene = data?.scenes.find((candidate) => candidate.id === ref.sceneId);
    if (!scene || scene.content.type !== 'pbl' || !scene.content.projectV2) {
      throw new Error('Expected Jiuxuange PBL scene');
    }
    expect(scene.content.projectV2.threads[0].messages).toHaveLength(3);
    expect(scene.content.projectV2.jiuxuange?.orientation).toMatchObject({
      phase: 'baseline',
      problemDefined: true,
      attachedDraftIds: ['orientation-1'],
    });
    expect(
      scene.content.projectV2.jiuxuange?.orientation?.formalOpeningDeliveredAt,
    ).toBeUndefined();
  });

  it('reuses one full guided-course session instead of keying it by the first module case', async () => {
    const first = await getOrCreateBusinessModelSession({
      learnerId: 'guided-learner',
      coursePackage: BUSINESS_MODEL_GUIDED_PACKAGE,
      stageIdFactory: () => 'guided-stage',
    });
    const second = await getOrCreateBusinessModelSession({
      learnerId: 'guided-learner',
      coursePackage: BUSINESS_MODEL_GUIDED_PACKAGE,
      stageIdFactory: () => 'duplicate-stage',
    });
    const data = await loadStageData(first.stageId);
    const scene = data?.scenes.find((candidate) => candidate.id === first.sceneId);
    if (!scene || scene.content.type !== 'pbl' || !scene.content.projectV2) {
      throw new Error('Expected guided PBL scene');
    }

    expect(second).toEqual(first);
    expect(first.projectId).toBe('guided-course');
    expect(scene.content.projectV2.milestones).toHaveLength(10);
    expect(scene.content.projectV2.jiuxuange?.sessionVariantId).toBe('guided-course');
  });

  it('separates learners and package versions', async () => {
    const first = await getOrCreateBusinessModelSession({
      ...BASE,
      stageIdFactory: () => 'stage-a',
    });
    const otherLearner = await getOrCreateBusinessModelSession({
      ...BASE,
      learnerId: 'learner-b',
      stageIdFactory: () => 'stage-b',
    });
    const otherVersion = await getOrCreateBusinessModelSession({
      learnerId: BASE.learnerId,
      projectId: BASE.projectId,
      coursePackage: { ...structuredClone(BUSINESS_MODEL_PILOT_PACKAGE), version: '1.0.1-pilot-b' },
      stageIdFactory: () => 'stage-c',
    });

    expect(new Set([first.stageId, otherLearner.stageId, otherVersion.stageId]).size).toBe(3);
  });

  it('derives resume state and next question from projectV2, not courseProgress', async () => {
    const ref = await getOrCreateBusinessModelSession({
      ...BASE,
      stageIdFactory: () => 'stage-progress',
    });
    const data = await loadStageData(ref.stageId);
    expect(data).not.toBeNull();
    const scene = data!.scenes.find((candidate) => candidate.id === ref.sceneId);
    expect(scene?.content.type).toBe('pbl');
    if (!scene || scene.content.type !== 'pbl' || !scene.content.projectV2) {
      throw new Error('Expected Jiuxuange PBL scene');
    }
    scene.content.projectV2.uiPhase = 'workspace';
    scene.content.projectV2.threads[0].messages.push({
      id: 'learner-1',
      roleType: 'user',
      content: '我先从续约率开始看。',
      ts: '2026-07-11T00:00:01.000Z',
    });
    scene.content.projectV2.threads[0].messages.push({
      id: 'professor-1',
      agentId: 'jiuxuange-professor',
      roleType: 'instructor',
      content: '这条判断对应事实包里的哪条观察？',
      ts: '2026-07-11T00:00:02.000Z',
    });
    await saveStageData(data!.stage.id, data!);
    await db.courseProgress.put({
      id: 'legacy-progress',
      courseId: 'business-model',
      moduleId: 'six-elements',
      startedSteps: [],
      completedSteps: ['case'],
      createdAt: 1,
      updatedAt: 1,
    });

    const state = await deriveBusinessModelResumeState(ref);
    expect(state.status).toBe('in_progress');
    expect(state.activeQuestion).toBe('你刚才的判断对应事实包里的哪条观察？');
    expect(state.summary).toContain('这条判断');
  });

  it('reports unavailable when the locator no longer points to its PBL scene', async () => {
    const ref: LearningSessionRef = {
      ...BASE,
      stageId: 'missing-stage',
      sceneId: 'missing-scene',
    };

    expect(await deriveBusinessModelResumeState(ref)).toEqual({
      status: 'unavailable',
      stageId: 'missing-stage',
      sceneId: 'missing-scene',
    });
  });

  it('removes the course locator when its classroom is deleted', async () => {
    const ref = await getOrCreateBusinessModelSession({
      ...BASE,
      stageIdFactory: () => 'stage-delete',
    });
    expect(await db.learningPaths.get(courseSessionId(BASE))).toBeDefined();

    await deleteStageData(ref.stageId);

    expect(await db.learningPaths.get(courseSessionId(BASE))).toBeUndefined();
  });
});
