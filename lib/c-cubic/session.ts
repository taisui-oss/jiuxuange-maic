import { nanoid } from 'nanoid';
import { db, type LearningPathRecord, type SceneRecord } from '@/lib/utils/database';
import { loadStageData } from '@/lib/utils/stage-storage';
import { hasStartedProject } from '@/lib/pbl/v2/operations/progress';
import { BUSINESS_MODEL_PILOT_PACKAGE } from './course-package/business-model-v1';
import type { JiuxuangeCoursePackage } from './course-package/types';
import { createJiuxuangeStage } from './project-factory';

const LOCAL_LEARNER_ID_KEY = 'jiuxuangeLocalLearnerId';

export interface LearningSessionKey {
  learnerId: string;
  courseId: 'business-model';
  projectId: string;
  packageVersion: string;
}

export interface LearningSessionRef extends LearningSessionKey {
  stageId: string;
  sceneId: string;
}

export interface BusinessModelResumeState {
  status: 'not_started' | 'in_progress' | 'completed' | 'unavailable';
  stageId?: string;
  sceneId?: string;
  summary?: string;
  activeQuestion?: string;
}

export interface GetBusinessModelSessionOptions {
  learnerId?: string;
  projectId?: string;
  coursePackage?: JiuxuangeCoursePackage;
  now?: Date;
  stageIdFactory?: () => string;
}

export function courseSessionId(key: LearningSessionKey): string {
  return JSON.stringify([key.learnerId, key.courseId, key.projectId, key.packageVersion]);
}

export function getOrCreateLocalLearnerId(): string {
  if (typeof window === 'undefined') {
    throw new Error('Local Jiuxuange learner identity is available only in the browser');
  }
  const existing = window.localStorage.getItem(LOCAL_LEARNER_ID_KEY);
  if (existing) return existing;
  const created = `local_${nanoid(12)}`;
  window.localStorage.setItem(LOCAL_LEARNER_ID_KEY, created);
  return created;
}

function refFromRecord(record: LearningPathRecord): LearningSessionRef | null {
  if (
    !record.learnerId ||
    !record.projectId ||
    !record.packageVersion ||
    !record.stageId ||
    !record.sceneId
  ) {
    return null;
  }
  return {
    learnerId: record.learnerId,
    courseId: 'business-model',
    projectId: record.projectId,
    packageVersion: record.packageVersion,
    stageId: record.stageId,
    sceneId: record.sceneId,
  };
}

function sceneMatchesRef(scene: SceneRecord | undefined, ref: LearningSessionRef): boolean {
  if (!scene || scene.content.type !== 'pbl' || !scene.content.projectV2?.jiuxuange) return false;
  const metadata = scene.content.projectV2.jiuxuange;
  return (
    metadata.courseId === ref.courseId &&
    metadata.courseVersion === ref.packageVersion &&
    metadata.caseId === ref.projectId
  );
}

export async function deriveBusinessModelResumeState(
  ref: LearningSessionRef | null,
): Promise<BusinessModelResumeState> {
  if (!ref) return { status: 'not_started' };
  const data = await loadStageData(ref.stageId);
  const scene = data?.scenes.find((candidate) => candidate.id === ref.sceneId);
  if (!scene || scene.content.type !== 'pbl' || !scene.content.projectV2) {
    return { status: 'unavailable', stageId: ref.stageId, sceneId: ref.sceneId };
  }
  const project = scene.content.projectV2;
  if (
    project.jiuxuange?.courseId !== ref.courseId ||
    project.jiuxuange.courseVersion !== ref.packageVersion ||
    project.jiuxuange.caseId !== ref.projectId
  ) {
    return { status: 'unavailable', stageId: ref.stageId, sceneId: ref.sceneId };
  }

  const milestone = project.milestones.find((item) => item.status === 'active');
  const task = milestone?.microtasks.find((item) => item.status === 'in_progress');
  const messages = project.threads.flatMap((thread) => thread.messages);
  const lastAgentMessage = messages
    .filter((message) => message.roleType !== 'user')
    .sort((left, right) => left.ts.localeCompare(right.ts))
    .at(-1);

  return {
    status:
      project.status === 'completed'
        ? 'completed'
        : hasStartedProject(project)
          ? 'in_progress'
          : 'not_started',
    stageId: ref.stageId,
    sceneId: ref.sceneId,
    summary: lastAgentMessage?.content.slice(0, 120),
    activeQuestion: task?.jiuxuange?.questionPrompt,
  };
}

export async function loadBusinessModelResumeState(
  options: Pick<GetBusinessModelSessionOptions, 'learnerId' | 'projectId' | 'coursePackage'> = {},
): Promise<BusinessModelResumeState> {
  const pkg = options.coursePackage ?? BUSINESS_MODEL_PILOT_PACKAGE;
  const key: LearningSessionKey = {
    learnerId: options.learnerId ?? getOrCreateLocalLearnerId(),
    courseId: pkg.id,
    projectId: options.projectId ?? pkg.modules[0].caseIds[0],
    packageVersion: pkg.version,
  };
  const record = await db.learningPaths.get(courseSessionId(key));
  return deriveBusinessModelResumeState(record ? refFromRecord(record) : null);
}

export async function getOrCreateBusinessModelSession(
  options: GetBusinessModelSessionOptions = {},
): Promise<LearningSessionRef> {
  const pkg = options.coursePackage ?? BUSINESS_MODEL_PILOT_PACKAGE;
  const now = options.now ?? new Date();
  const key: LearningSessionKey = {
    learnerId: options.learnerId ?? getOrCreateLocalLearnerId(),
    courseId: pkg.id,
    projectId: options.projectId ?? pkg.modules[0].caseIds[0],
    packageVersion: pkg.version,
  };
  const id = courseSessionId(key);

  return db.transaction('rw', db.learningPaths, db.stages, db.scenes, async () => {
    const existing = await db.learningPaths.get(id);
    const existingRef = existing ? refFromRecord(existing) : null;
    if (existingRef) {
      const [stage, scene] = await Promise.all([
        db.stages.get(existingRef.stageId),
        db.scenes.get(existingRef.sceneId),
      ]);
      if (stage && sceneMatchesRef(scene, existingRef)) return existingRef;
    }

    const stageId = options.stageIdFactory?.() ?? nanoid(10);
    const sceneId = `${stageId}-pbl`;
    const data = createJiuxuangeStage(pkg, {
      now: now.toISOString(),
      stageId,
      sceneId,
      startModuleId: pkg.modules[0].id,
      caseId: key.projectId,
    });
    await db.stages.put({
      ...data.stage,
      currentSceneId: sceneId,
    });
    await db.scenes.bulkPut(
      data.scenes.map((scene) => ({
        ...scene,
        stageId,
        createdAt: scene.createdAt ?? now.getTime(),
        updatedAt: scene.updatedAt ?? now.getTime(),
      })),
    );
    await db.learningPaths.put({
      id,
      courseId: key.courseId,
      title: pkg.title,
      activeModuleId: pkg.modules[0].id,
      learnerId: key.learnerId,
      projectId: key.projectId,
      packageVersion: key.packageVersion,
      stageId,
      sceneId,
      createdAt: existing?.createdAt ?? now.getTime(),
      updatedAt: now.getTime(),
    });

    return { ...key, stageId, sceneId };
  });
}
