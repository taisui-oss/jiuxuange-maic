import type { PersistedClassroomData } from '@/lib/server/classroom-storage';
import type { CaseOnlyLesson } from '@/lib/jiuxuange/case-only/catalog';

export interface CaseOnlyContentPackage {
  lesson: CaseOnlyLesson;
  contentVersion: string;
  classroom: PersistedClassroomData;
}

export type CaseProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface CaseOnlyProgressItem {
  caseId: string;
  contentVersion: string;
  progressVersion: number;
  nextSceneIndex: number;
  totalScenes: number;
  status: CaseProgressStatus;
  unlocked: boolean;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
}

export interface CaseOnlyCourseProgress {
  userId: string;
  courseId: string;
  cases: CaseOnlyProgressItem[];
}

export type CaseOnlyAnswers = Record<string, string | string[]>;

export interface CaseOnlySubmitRequest {
  caseId: string;
  contentVersion: string;
  progressVersion: number;
  sceneId: string;
  answers?: CaseOnlyAnswers;
}

export interface CaseOnlySubmitSuccess {
  success: true;
  replayed: boolean;
  progress: CaseOnlyProgressItem;
}

export interface CaseOnlySubmitFailure {
  success: false;
  errorCode:
    | 'CASE_LOCKED'
    | 'CONTENT_VERSION_CONFLICT'
    | 'IDEMPOTENCY_CONFLICT'
    | 'INTERACTION_INCOMPLETE'
    | 'INVALID_REQUEST'
    | 'PROGRESS_VERSION_CONFLICT'
    | 'SCENE_CONFLICT';
  error: string;
  progress?: CaseOnlyProgressItem;
  incorrectQuestionIds?: string[];
  incorrectQuestionFeedback?: Record<string, string>;
}

export type CaseOnlySubmitBody = CaseOnlySubmitSuccess | CaseOnlySubmitFailure;

export interface CaseOnlySubmitHttpResult {
  status: number;
  body: CaseOnlySubmitBody;
}
