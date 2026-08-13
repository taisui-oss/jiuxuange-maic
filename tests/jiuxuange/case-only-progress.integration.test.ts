import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import {
  closeCaseOnlyDatabaseForTests,
  getCaseOnlyDatabase,
} from '@/lib/server/jiuxuange-case-only/db/client';
import { listCaseOnlyLessons } from '@/lib/jiuxuange/case-only/catalog';
import { readCaseOnlyContent } from '@/lib/server/jiuxuange-case-only/content-repository';
import {
  getCaseOnlyCourseProgress,
  submitCaseOnlyScene,
} from '@/lib/server/jiuxuange-case-only/progress-repository';
import type { CaseOnlyAnswers, CaseOnlyProgressItem } from '@/lib/jiuxuange/case-only/types';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const FIRST_CASE_ID = 'breakfast-chain-six-elements-foundation';

function answersForScene(
  scene: NonNullable<
    Awaited<ReturnType<typeof readCaseOnlyContent>>
  >['classroom']['scenes'][number],
): CaseOnlyAnswers | undefined {
  if (scene.type !== 'quiz' || scene.content.type !== 'quiz') return undefined;
  return Object.fromEntries(
    scene.content.questions.map((question) => [
      question.id,
      question.type === 'short_answer' ? '已完成开放回答' : (question.answer ?? []),
    ]),
  );
}

async function resetTables(): Promise<void> {
  await getCaseOnlyDatabase().execute(sql`
    truncate table
      jiuxuange_case_only.progress_submissions,
      jiuxuange_case_only.case_progress,
      jiuxuange_case_only.users
    cascade
  `);
}

describe('case-only PostgreSQL progress', () => {
  beforeEach(resetTables);
  afterAll(closeCaseOnlyDatabaseForTests);

  it('creates stable versioned progress and keeps later cases locked', async () => {
    const progress = await getCaseOnlyCourseProgress(USER_ID);
    expect(progress.userId).toBe(USER_ID);
    expect(progress.cases).toHaveLength(5);
    expect(progress.cases[0]).toMatchObject({
      unlocked: true,
      progressVersion: 0,
      nextSceneIndex: 0,
      status: 'not_started',
    });
    expect(progress.cases[0].contentVersion).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(progress.cases.slice(1)).toEqual(
      expect.arrayContaining([expect.objectContaining({ unlocked: false, status: 'not_started' })]),
    );
    expect(progress.cases.slice(1).every((item) => !item.unlocked)).toBe(true);
  });

  it('replays one concurrent idempotent submission without advancing twice', async () => {
    const content = await readCaseOnlyContent(FIRST_CASE_ID);
    expect(content).not.toBeNull();
    const scene = content!.classroom.scenes[0];
    const request = {
      caseId: FIRST_CASE_ID,
      contentVersion: content!.contentVersion,
      progressVersion: 0,
      sceneId: scene.id,
    };

    const [left, right] = await Promise.all([
      submitCaseOnlyScene({ userId: USER_ID, idempotencyKey: 'same-request', request }),
      submitCaseOnlyScene({ userId: USER_ID, idempotencyKey: 'same-request', request }),
    ]);

    expect(left.status).toBe(200);
    expect(right.status).toBe(200);
    expect([left.body, right.body].filter((body) => body.success && body.replayed)).toHaveLength(1);
    const progress = await getCaseOnlyCourseProgress(USER_ID);
    expect(progress.cases[0]).toMatchObject({ progressVersion: 1, nextSceneIndex: 1 });
  });

  it('uses progress_version to reject distinct concurrent writes from the same version', async () => {
    const content = await readCaseOnlyContent(FIRST_CASE_ID);
    const scene = content!.classroom.scenes[0];
    const request = {
      caseId: FIRST_CASE_ID,
      contentVersion: content!.contentVersion,
      progressVersion: 0,
      sceneId: scene.id,
    };

    const results = await Promise.all([
      submitCaseOnlyScene({ userId: USER_ID, idempotencyKey: 'distinct-left', request }),
      submitCaseOnlyScene({ userId: USER_ID, idempotencyKey: 'distinct-right', request }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const conflict = results.find((result) => result.status === 409);
    expect(conflict?.body).toMatchObject({
      success: false,
      errorCode: 'PROGRESS_VERSION_CONFLICT',
    });
    const progress = await getCaseOnlyCourseProgress(USER_ID);
    expect(progress.cases[0]).toMatchObject({ progressVersion: 1, nextSceneIndex: 1 });
  });

  it('enforces every interaction and unlocks all five cases sequentially', async () => {
    const lessons = listCaseOnlyLessons();

    for (const [caseIndex, lesson] of lessons.entries()) {
      const before = await getCaseOnlyCourseProgress(USER_ID);
      expect(before.cases[caseIndex].unlocked, lesson.id).toBe(true);
      if (caseIndex + 1 < lessons.length) {
        expect(before.cases[caseIndex + 1].unlocked, lessons[caseIndex + 1].id).toBe(false);
      }

      const content = await readCaseOnlyContent(lesson.id);
      let current: CaseOnlyProgressItem = before.cases[caseIndex];
      for (const scene of content!.classroom.scenes) {
        if (scene.type === 'quiz' && scene.content.type === 'quiz') {
          const rejected = await submitCaseOnlyScene({
            userId: USER_ID,
            idempotencyKey: `wrong-${lesson.id}-${scene.id}`,
            request: {
              caseId: lesson.id,
              contentVersion: content!.contentVersion,
              progressVersion: current.progressVersion,
              sceneId: scene.id,
              answers: Object.fromEntries(
                scene.content.questions.map((question) => [question.id, 'invalid-answer']),
              ),
            },
          });
          expect(rejected.status, `${lesson.id}/${scene.id}`).toBe(422);
          expect(rejected.body).toMatchObject({
            success: false,
            errorCode: 'INTERACTION_INCOMPLETE',
            progress: { progressVersion: current.progressVersion },
          });
          if (!rejected.body.success) {
            expect(
              Object.keys(rejected.body.incorrectQuestionFeedback ?? {}).length,
            ).toBeGreaterThan(0);
          }
        }

        const result = await submitCaseOnlyScene({
          userId: USER_ID,
          idempotencyKey: `complete-${lesson.id}-${scene.id}`,
          request: {
            caseId: lesson.id,
            contentVersion: content!.contentVersion,
            progressVersion: current.progressVersion,
            sceneId: scene.id,
            answers: answersForScene(scene),
          },
        });
        expect(result.status, `${lesson.id}/${scene.id}`).toBe(200);
        expect(result.body.success, `${lesson.id}/${scene.id}`).toBe(true);
        if (result.body.success) current = result.body.progress;
      }

      expect(current).toMatchObject({
        status: 'completed',
        nextSceneIndex: content!.classroom.scenes.length,
        progressVersion: content!.classroom.scenes.length,
      });
      const after = await getCaseOnlyCourseProgress(USER_ID);
      expect(after.cases[caseIndex].status, lesson.id).toBe('completed');
      if (caseIndex + 1 < lessons.length) {
        expect(after.cases[caseIndex + 1]).toMatchObject({
          unlocked: true,
          progressVersion: 0,
        });
      }
    }

    const final = await getCaseOnlyCourseProgress(USER_ID);
    expect(final.cases).toHaveLength(5);
    expect(final.cases.every((item) => item.status === 'completed')).toBe(true);
  }, 30_000);
});
