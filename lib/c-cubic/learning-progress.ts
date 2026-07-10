import { db, type LearningEvaluationRecord, type CourseProgressRecord } from '@/lib/utils/database';
import {
  C_CUBIC_BUSINESS_MODEL_COURSE_ID,
  type CubicLearningStep,
  getModuleCompletionPercent,
} from './business-model-course';

export interface ModuleProgressSnapshot {
  moduleId: string;
  startedSteps: CubicLearningStep[];
  completedSteps: CubicLearningStep[];
  percent: number;
  lastClassroomId?: string;
  updatedAt: number;
}

function normalizeSteps(steps: string[] | undefined): CubicLearningStep[] {
  return (steps ?? []).filter(
    (step): step is CubicLearningStep => step === 'concept' || step === 'case',
  );
}

export async function ensureBusinessModelLearningPath() {
  const now = Date.now();
  const existing = await db.learningPaths.get(C_CUBIC_BUSINESS_MODEL_COURSE_ID);
  if (existing) return existing;

  const record = {
    id: C_CUBIC_BUSINESS_MODEL_COURSE_ID,
    courseId: C_CUBIC_BUSINESS_MODEL_COURSE_ID,
    title: '商业模式大课 Phase 1 学练路径',
    activeModuleId: 'bm-foundation',
    activeStep: 'concept',
    createdAt: now,
    updatedAt: now,
  };
  await db.learningPaths.put(record);
  return record;
}

export async function listBusinessModelProgress(): Promise<ModuleProgressSnapshot[]> {
  await ensureBusinessModelLearningPath();
  const records = await db.courseProgress
    .where('courseId')
    .equals(C_CUBIC_BUSINESS_MODEL_COURSE_ID)
    .toArray();

  return records.map((record) => ({
    moduleId: record.moduleId,
    startedSteps: normalizeSteps(record.startedSteps),
    completedSteps: normalizeSteps(record.completedSteps),
    percent: getModuleCompletionPercent(normalizeSteps(record.completedSteps)),
    lastClassroomId: record.lastClassroomId,
    updatedAt: record.updatedAt,
  }));
}

export async function markBusinessModelStepStarted(input: {
  moduleId: string;
  step: CubicLearningStep;
  classroomId?: string;
}): Promise<CourseProgressRecord> {
  await ensureBusinessModelLearningPath();
  const id = `${C_CUBIC_BUSINESS_MODEL_COURSE_ID}:${input.moduleId}`;
  const now = Date.now();
  const existing = await db.courseProgress.get(id);
  const startedSteps = new Set<CubicLearningStep>(normalizeSteps(existing?.startedSteps));
  startedSteps.add(input.step);

  const next: CourseProgressRecord = {
    id,
    courseId: C_CUBIC_BUSINESS_MODEL_COURSE_ID,
    moduleId: input.moduleId,
    startedSteps: Array.from(startedSteps),
    completedSteps: normalizeSteps(existing?.completedSteps),
    lastClassroomId: input.classroomId ?? existing?.lastClassroomId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.courseProgress.put(next);
  return next;
}

export async function recordLearningEvaluation(
  input: Omit<LearningEvaluationRecord, 'id' | 'courseId' | 'createdAt'> & {
    id?: string;
    createdAt?: number;
  },
): Promise<LearningEvaluationRecord> {
  const createdAt = input.createdAt ?? Date.now();
  const record: LearningEvaluationRecord = {
    ...input,
    id: input.id ?? `${C_CUBIC_BUSINESS_MODEL_COURSE_ID}:${input.moduleId}:${createdAt}`,
    courseId: C_CUBIC_BUSINESS_MODEL_COURSE_ID,
    createdAt,
  };
  await db.learningEvaluations.put(record);
  return record;
}
