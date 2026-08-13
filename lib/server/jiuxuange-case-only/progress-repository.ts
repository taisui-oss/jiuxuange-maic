import 'server-only';

import { createHash } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { CASE_ONLY_COURSE_ID } from '@/lib/jiuxuange/case-only/catalog';
import { gradeCaseOnlyQuiz } from '@/lib/jiuxuange/case-only/grading';
import type {
  CaseOnlyContentPackage,
  CaseOnlyCourseProgress,
  CaseOnlyProgressItem,
  CaseOnlySubmitBody,
  CaseOnlySubmitFailure,
  CaseOnlySubmitHttpResult,
  CaseOnlySubmitRequest,
} from '@/lib/jiuxuange/case-only/types';
import { getCaseOnlyDatabase } from './db/client';
import { caseOnlyUsers, caseProgress, progressSubmissions } from './db/schema';
import { readAllCaseOnlyContent, readCaseOnlyContent } from './content-repository';

type ProgressRow = typeof caseProgress.$inferSelect;

function asIso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function toProgressItem(
  content: CaseOnlyContentPackage,
  row: ProgressRow | null,
  unlocked: boolean,
): CaseOnlyProgressItem {
  return {
    caseId: content.lesson.id,
    contentVersion: content.contentVersion,
    progressVersion: row?.progressVersion ?? 0,
    nextSceneIndex: row?.nextSceneIndex ?? 0,
    totalScenes: content.classroom.scenes.length,
    status: (row?.status as CaseOnlyProgressItem['status'] | undefined) ?? 'not_started',
    unlocked,
    startedAt: asIso(row?.startedAt ?? null),
    completedAt: asIso(row?.completedAt ?? null),
    updatedAt: asIso(row?.updatedAt ?? null),
  };
}

async function ensureActiveUser(userId: string): Promise<void> {
  const db = getCaseOnlyDatabase();
  await db.insert(caseOnlyUsers).values({ id: userId }).onConflictDoNothing();
  const [user] = await db
    .select({ status: caseOnlyUsers.status })
    .from(caseOnlyUsers)
    .where(eq(caseOnlyUsers.id, userId));
  if (!user || user.status !== 'active') throw new Error('Case-only user is not active');
}

async function ensureProgressRow(
  userId: string,
  content: CaseOnlyContentPackage,
): Promise<ProgressRow> {
  const db = getCaseOnlyDatabase();
  const key = {
    userId,
    courseId: CASE_ONLY_COURSE_ID,
    caseId: content.lesson.id,
    contentVersion: content.contentVersion,
  };
  await db
    .insert(caseProgress)
    .values({
      ...key,
      totalScenes: content.classroom.scenes.length,
    })
    .onConflictDoNothing();
  const [row] = await db
    .select()
    .from(caseProgress)
    .where(
      and(
        eq(caseProgress.userId, key.userId),
        eq(caseProgress.courseId, key.courseId),
        eq(caseProgress.caseId, key.caseId),
        eq(caseProgress.contentVersion, key.contentVersion),
      ),
    );
  if (!row) throw new Error('Failed to create case progress');
  return row;
}

export async function getCaseOnlyCourseProgress(userId: string): Promise<CaseOnlyCourseProgress> {
  const contents = await readAllCaseOnlyContent();
  await ensureActiveUser(userId);
  const db = getCaseOnlyDatabase();
  const rows = await db
    .select()
    .from(caseProgress)
    .where(and(eq(caseProgress.userId, userId), eq(caseProgress.courseId, CASE_ONLY_COURSE_ID)));
  const byIdentity = new Map<string, ProgressRow>(
    rows.map((row) => [`${row.caseId}\u0000${row.contentVersion}`, row] as const),
  );

  const items: CaseOnlyProgressItem[] = [];
  let unlocked = true;
  for (const content of contents) {
    const identity = `${content.lesson.id}\u0000${content.contentVersion}`;
    let row = byIdentity.get(identity) ?? null;
    if (unlocked && !row) {
      row = await ensureProgressRow(userId, content);
      byIdentity.set(identity, row);
    }
    const item = toProgressItem(content, row, unlocked);
    items.push(item);
    unlocked = unlocked && item.status === 'completed';
  }

  return { userId, courseId: CASE_ONLY_COURSE_ID, cases: items };
}

export async function getAccessibleCaseOnlyContent(
  userId: string,
  caseId: string,
): Promise<{ content: CaseOnlyContentPackage; progress: CaseOnlyProgressItem } | null> {
  const courseProgress = await getCaseOnlyCourseProgress(userId);
  const progress = courseProgress.cases.find((item) => item.caseId === caseId);
  if (!progress?.unlocked) return null;
  const content = await readCaseOnlyContent(caseId);
  return content ? { content, progress } : null;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function requestHash(request: CaseOnlySubmitRequest): string {
  return createHash('sha256').update(canonicalJson(request)).digest('hex');
}

function failure(
  errorCode: CaseOnlySubmitFailure['errorCode'],
  error: string,
  extra: Partial<CaseOnlySubmitFailure> = {},
): CaseOnlySubmitFailure {
  return { success: false, errorCode, error, ...extra };
}

export async function submitCaseOnlyScene(input: {
  userId: string;
  idempotencyKey: string;
  request: CaseOnlySubmitRequest;
}): Promise<CaseOnlySubmitHttpResult> {
  const { userId, idempotencyKey, request } = input;
  if (!idempotencyKey || idempotencyKey.length > 128) {
    return { status: 400, body: failure('INVALID_REQUEST', 'A valid Idempotency-Key is required') };
  }

  const access = await getAccessibleCaseOnlyContent(userId, request.caseId);
  if (!access) {
    return { status: 403, body: failure('CASE_LOCKED', 'Complete the previous case first') };
  }
  const { content } = access;
  if (request.contentVersion !== content.contentVersion) {
    return {
      status: 409,
      body: failure('CONTENT_VERSION_CONFLICT', 'The case content version has changed', {
        progress: access.progress,
      }),
    };
  }

  const hash = requestHash(request);
  const now = new Date();
  const db = getCaseOnlyDatabase();
  return db.transaction(async (tx) => {
    await tx.insert(caseOnlyUsers).values({ id: userId }).onConflictDoNothing();
    await tx
      .insert(caseProgress)
      .values({
        userId,
        courseId: CASE_ONLY_COURSE_ID,
        caseId: request.caseId,
        contentVersion: content.contentVersion,
        totalScenes: content.classroom.scenes.length,
      })
      .onConflictDoNothing();

    // Serialize every submission for this learner and case before taking the
    // idempotency reservation. The submission row references this progress row,
    // so reversing this order can deadlock concurrent requests on PostgreSQL.
    const [lockedRow] = await tx
      .select()
      .from(caseProgress)
      .where(
        and(
          eq(caseProgress.userId, userId),
          eq(caseProgress.courseId, CASE_ONLY_COURSE_ID),
          eq(caseProgress.caseId, request.caseId),
          eq(caseProgress.contentVersion, content.contentVersion),
        ),
      )
      .for('update');
    if (!lockedRow) throw new Error('Case progress disappeared during submission');

    const [reservation] = await tx
      .insert(progressSubmissions)
      .values({
        userId,
        courseId: CASE_ONLY_COURSE_ID,
        caseId: request.caseId,
        contentVersion: content.contentVersion,
        idempotencyKey,
        requestHash: hash,
        expectedProgressVersion: request.progressVersion,
        sceneId: request.sceneId,
      })
      .onConflictDoNothing()
      .returning({ idempotencyKey: progressSubmissions.idempotencyKey });

    if (!reservation) {
      const [existing] = await tx
        .select()
        .from(progressSubmissions)
        .where(
          and(
            eq(progressSubmissions.userId, userId),
            eq(progressSubmissions.courseId, CASE_ONLY_COURSE_ID),
            eq(progressSubmissions.idempotencyKey, idempotencyKey),
          ),
        );
      if (
        !existing ||
        existing.requestHash !== hash ||
        !existing.responseBody ||
        !existing.responseStatus
      ) {
        return {
          status: 409,
          body: failure('IDEMPOTENCY_CONFLICT', 'Idempotency key was reused with another request'),
        };
      }
      const body = existing.responseBody.success
        ? { ...existing.responseBody, replayed: true }
        : existing.responseBody;
      return { status: existing.responseStatus, body };
    }

    const finalize = async (
      status: number,
      body: CaseOnlySubmitBody,
    ): Promise<CaseOnlySubmitHttpResult> => {
      await tx
        .update(progressSubmissions)
        .set({
          responseStatus: status,
          responseBody: body,
          completedAt: now,
        })
        .where(
          and(
            eq(progressSubmissions.userId, userId),
            eq(progressSubmissions.courseId, CASE_ONLY_COURSE_ID),
            eq(progressSubmissions.caseId, request.caseId),
            eq(progressSubmissions.contentVersion, content.contentVersion),
            eq(progressSubmissions.idempotencyKey, idempotencyKey),
          ),
        );
      return { status, body };
    };

    const currentProgress = toProgressItem(content, lockedRow, true);
    if (request.progressVersion !== lockedRow.progressVersion) {
      return finalize(
        409,
        failure(
          'PROGRESS_VERSION_CONFLICT',
          'Progress changed before this submission was applied',
          { progress: currentProgress },
        ),
      );
    }

    const scene = content.classroom.scenes[lockedRow.nextSceneIndex];
    if (!scene || scene.id !== request.sceneId) {
      return finalize(
        409,
        failure('SCENE_CONFLICT', 'The submitted scene is not the current server scene', {
          progress: currentProgress,
        }),
      );
    }

    if (scene.type === 'quiz' && scene.content.type === 'quiz') {
      const grade = gradeCaseOnlyQuiz(scene.content.questions, request.answers ?? {});
      if (!grade.passed) {
        const incorrectQuestionFeedback = Object.fromEntries(
          scene.content.questions
            .filter((question) => grade.incorrectQuestionIds.includes(question.id))
            .map((question) => [
              question.id,
              question.analysis ?? '请回到本轮案例事实与六要素因果关系重新判断。',
            ]),
        );
        return finalize(
          422,
          failure(
            'INTERACTION_INCOMPLETE',
            'Required interaction is incomplete or contains incorrect answers',
            {
              progress: currentProgress,
              incorrectQuestionIds: grade.incorrectQuestionIds,
              incorrectQuestionFeedback,
            },
          ),
        );
      }
    } else if (scene.type !== 'slide' || scene.content.type !== 'slide') {
      return finalize(400, failure('INVALID_REQUEST', 'Unsupported case scene type'));
    }

    const nextSceneIndex = lockedRow.nextSceneIndex + 1;
    const completed = nextSceneIndex === content.classroom.scenes.length;
    const [updated] = await tx
      .update(caseProgress)
      .set({
        nextSceneIndex,
        progressVersion: lockedRow.progressVersion + 1,
        status: completed ? 'completed' : 'in_progress',
        startedAt: lockedRow.startedAt ?? now,
        completedAt: completed ? now : null,
        updatedAt: now,
      })
      .where(
        and(
          eq(caseProgress.userId, userId),
          eq(caseProgress.courseId, CASE_ONLY_COURSE_ID),
          eq(caseProgress.caseId, request.caseId),
          eq(caseProgress.contentVersion, content.contentVersion),
          eq(caseProgress.progressVersion, lockedRow.progressVersion),
        ),
      )
      .returning();
    if (!updated) throw new Error('Optimistic progress update failed while holding the row lock');

    return finalize(200, {
      success: true,
      replayed: false,
      progress: toProgressItem(content, updated, true),
    });
  });
}
