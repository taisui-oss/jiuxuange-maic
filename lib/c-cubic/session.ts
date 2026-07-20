import { nanoid } from 'nanoid';
import { db, type LearningPathRecord, type SceneRecord } from '@/lib/utils/database';
import { loadStageData } from '@/lib/utils/stage-storage';
import { hasStartedProject } from '@/lib/pbl/v2/operations/progress';
import { BUSINESS_MODEL_PILOT_PACKAGE } from './course-package/business-model-v1';
import type { JiuxuangeCoursePackage } from './course-package/types';
import type { JiuxuangeCaseFact } from './course-package/types';
import { createJiuxuangeStage } from './project-factory';
import { attachHomeOrientation } from './orientation';
import type { HomeOrientationDraft } from './home-orientation';
import { nextOrientationQuestion } from './orientation';

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
  homeOrientationDraft?: HomeOrientationDraft;
  projectFacts?: JiuxuangeCaseFact[];
}

export interface CreateNewBusinessModelAttemptOptions
  extends Omit<GetBusinessModelSessionOptions, 'projectId'> {
  attemptIdFactory?: () => string;
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
    (metadata.sessionVariantId ?? metadata.caseId) === ref.projectId
  );
}

function sessionProjectId(pkg: JiuxuangeCoursePackage, requested?: string): string {
  if (requested) return requested;
  if (pkg.entryMode === 'learning-loop') return 'business-model-learning-loop';
  if (pkg.journey) return 'six-level-pbl';
  if (/^2(?:\.|$)/.test(pkg.version)) return 'guided-course';
  const firstCaseId = pkg.modules.find((module) => module.caseIds.length > 0)?.caseIds[0];
  if (!firstCaseId) throw new Error('Course package has no session project id');
  return firstCaseId;
}

function attachHomeDraftToScene(
  scene: { content: SceneRecord['content']; updatedAt?: number },
  draft: HomeOrientationDraft | undefined,
  now: string,
): boolean {
  if (!draft || draft.status !== 'resolved' || scene.content.type !== 'pbl') return false;
  const project = scene.content.projectV2;
  const jiuxuange = project?.jiuxuange;
  const orientation = jiuxuange?.orientation;
  if (!project || !jiuxuange || !orientation) return false;
  const thread = project.threads.find((candidate) => candidate.agentId === 'jiuxuange-professor');
  if (!thread) return false;

  const messages = draft.initialMessages.map((message, index) => ({
    id: `${draft.id}:${index + 1}`,
    ...(message.role === 'professor' ? { agentId: 'jiuxuange-professor' as const } : {}),
    roleType: message.role === 'professor' ? ('instructor' as const) : ('user' as const),
    content: message.content,
    ts: index === 2 ? (draft.resolvedAt ?? now) : draft.createdAt,
  }));
  const result = attachHomeOrientation({
    state: orientation,
    draftId: draft.id,
    messages,
    existingMessageIds: thread.messages.map((message) => message.id),
    now,
  });
  if (
    result.messages.length === 0 &&
    result.state.attachedDraftIds.length === orientation.attachedDraftIds.length
  ) {
    return false;
  }
  thread.messages.push(...result.messages);
  jiuxuange.orientation = result.state;
  if (jiuxuange.courseVersion === '3.0.0-six-level-pbl') {
    const learnerMessages = messages.filter((message) => message.roleType === 'user');
    const existingDraftIds = new Set(
      (jiuxuange.projectFactDrafts ?? []).map((item) => item.id),
    );
    const drafts = learnerMessages
      .map((message) => ({
        id: `project-fact-draft:${message.id}`,
        text: message.content,
        sourceMessageId: message.id,
        capturedAt: message.ts,
      }))
      .filter((item) => !existingDraftIds.has(item.id));
    if (drafts.length > 0) {
      jiuxuange.projectFactDrafts = [
        ...(jiuxuange.projectFactDrafts ?? []),
        ...drafts,
      ];
      if (jiuxuange.projectFactStatus !== 'verified') {
        jiuxuange.projectFactStatus = 'pending_verification';
      }
    }
  }
  project.updatedAt = now;
  scene.updatedAt = Date.parse(now);
  return true;
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
    (project.jiuxuange.sessionVariantId ?? project.jiuxuange.caseId) !== ref.projectId
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
    activeQuestion:
      project.jiuxuange.orientation && project.jiuxuange.orientation.phase !== 'complete'
        ? (nextOrientationQuestion(project.jiuxuange.orientation) ??
          task?.jiuxuange?.questionPrompt)
        : task?.jiuxuange?.questionPrompt,
  };
}

export async function loadBusinessModelResumeState(
  options: Pick<GetBusinessModelSessionOptions, 'learnerId' | 'projectId' | 'coursePackage'> = {},
): Promise<BusinessModelResumeState> {
  const pkg = options.coursePackage ?? BUSINESS_MODEL_PILOT_PACKAGE;
  const learnerId = options.learnerId ?? getOrCreateLocalLearnerId();
  const baseProjectId = sessionProjectId(pkg, options.projectId);
  const key: LearningSessionKey = {
    learnerId,
    courseId: pkg.id,
    projectId: baseProjectId,
    packageVersion: pkg.version,
  };
  const record = options.projectId
    ? await db.learningPaths.get(courseSessionId(key))
    : (
        await db.learningPaths
          .filter(
            (candidate) =>
              candidate.learnerId === learnerId &&
              candidate.courseId === pkg.id &&
              candidate.packageVersion === pkg.version &&
              (candidate.projectId === baseProjectId ||
                candidate.projectId?.startsWith(`${baseProjectId}:attempt:`) === true),
          )
          .toArray()
      ).sort(
        (left, right) =>
          right.updatedAt - left.updatedAt || right.createdAt - left.createdAt,
      )[0];
  return deriveBusinessModelResumeState(record ? refFromRecord(record) : null);
}

export async function createNewBusinessModelAttempt(
  options: CreateNewBusinessModelAttemptOptions = {},
): Promise<LearningSessionRef> {
  const pkg = options.coursePackage ?? BUSINESS_MODEL_PILOT_PACKAGE;
  if (pkg.entryMode !== 'learning-loop') {
    throw new Error('Only the learning-loop course supports starting a new round');
  }
  const attemptId = options.attemptIdFactory?.() ?? nanoid(10);
  const projectId = `${sessionProjectId(pkg)}:attempt:${attemptId}`;
  const { attemptIdFactory: _attemptIdFactory, ...sessionOptions } = options;
  return getOrCreateBusinessModelSession({
    ...sessionOptions,
    coursePackage: pkg,
    projectId,
  });
}

export async function getOrCreateBusinessModelSession(
  options: GetBusinessModelSessionOptions = {},
): Promise<LearningSessionRef> {
  const pkg = options.coursePackage ?? BUSINESS_MODEL_PILOT_PACKAGE;
  const now = options.now ?? new Date();
  const key: LearningSessionKey = {
    learnerId: options.learnerId ?? getOrCreateLocalLearnerId(),
    courseId: pkg.id,
    projectId: sessionProjectId(pkg, options.projectId),
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
      if (stage && scene && sceneMatchesRef(scene, existingRef)) {
        let sceneChanged = attachHomeDraftToScene(
          scene,
          options.homeOrientationDraft,
          now.toISOString(),
        );
        if (
          pkg.journey &&
          scene.content.type === 'pbl' &&
          scene.content.projectV2?.uiPhase === 'hero' &&
          !hasStartedProject(scene.content.projectV2)
        ) {
          scene.content.projectV2.uiPhase = 'workspace';
          scene.content.projectV2.updatedAt = now.toISOString();
          scene.updatedAt = now.getTime();
          sceneChanged = true;
        }
        if (sceneChanged) {
          await db.scenes.put(scene);
        }
        return existingRef;
      }
    }

    const stageId = options.stageIdFactory?.() ?? nanoid(10);
    const sceneId = `${stageId}-pbl`;
    const data = createJiuxuangeStage(pkg, {
      now: now.toISOString(),
      stageId,
      sceneId,
      ...(pkg.cases[key.projectId]
        ? {
            startModuleId: pkg.modules[0].id,
            caseId: key.projectId,
            learnerId: key.learnerId,
            projectFacts: options.projectFacts,
          }
        : {
            sessionVariantId: key.projectId,
            learnerId: key.learnerId,
            projectFacts: options.projectFacts,
          }),
    });
    attachHomeDraftToScene(data.scenes[0], options.homeOrientationDraft, now.toISOString());
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
