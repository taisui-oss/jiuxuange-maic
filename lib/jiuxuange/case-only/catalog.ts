import {
  BUSINESS_MODEL_CASE_LESSONS,
  type BusinessModelCaseLesson,
} from '@/lib/jiuxuange/course-catalog/business-model';

export const CASE_ONLY_COURSE_ID = 'business-model';
export const CASE_ONLY_COURSE_TITLE = '商业模式大课';

export interface CaseOnlyLesson extends BusinessModelCaseLesson {
  classroomId: string;
}

export function listCaseOnlyLessons(): CaseOnlyLesson[] {
  return BUSINESS_MODEL_CASE_LESSONS.filter(
    (lesson): lesson is CaseOnlyLesson =>
      Boolean(lesson.classroomId) && lesson.releaseStatus !== 'in_review',
  ).sort((left, right) => left.sequence - right.sequence);
}

export function getCaseOnlyLesson(caseId: string): CaseOnlyLesson | null {
  return listCaseOnlyLessons().find((lesson) => lesson.id === caseId) ?? null;
}

export function caseOnlyLessonHref(caseId: string): string {
  return `/courses/business-model/cases/${encodeURIComponent(caseId)}`;
}

export function isGateOneLessonAvailable(lesson: CaseOnlyLesson): boolean {
  return lesson.sequence === 1;
}
