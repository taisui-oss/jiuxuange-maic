import 'server-only';

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { getCaseOnlyLesson, type CaseOnlyLesson } from '@/lib/jiuxuange/case-only/catalog';
import type { PersistedClassroomData } from '@/lib/server/classroom-storage';

export interface CaseOnlyContentPackage {
  lesson: CaseOnlyLesson;
  contentVersion: string;
  classroom: PersistedClassroomData;
}

const PUBLISHED_CLASSROOMS_DIRECTORY = path.join(
  process.cwd(),
  'content',
  'jiuxuange',
  'classrooms',
);

function assertClassroomMatchesLesson(
  lesson: CaseOnlyLesson,
  classroom: PersistedClassroomData,
): void {
  if (classroom.id !== lesson.classroomId || classroom.stage.id !== lesson.classroomId) {
    throw new Error(`Case content identity mismatch for ${lesson.id}`);
  }
  if (!classroom.generationComplete || classroom.scenes.length === 0) {
    throw new Error(`Case content is not complete for ${lesson.id}`);
  }
  const orderedScenes = [...classroom.scenes].sort((left, right) => left.order - right.order);
  if (orderedScenes.some((scene, index) => scene.order !== index + 1)) {
    throw new Error(`Case content scene order is invalid for ${lesson.id}`);
  }
}

export async function readCaseOnlyContent(caseId: string): Promise<CaseOnlyContentPackage | null> {
  const lesson = getCaseOnlyLesson(caseId);
  if (!lesson) return null;

  const filePath = path.join(PUBLISHED_CLASSROOMS_DIRECTORY, `${lesson.classroomId}.json`);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }

  const classroom = JSON.parse(raw) as PersistedClassroomData;
  assertClassroomMatchesLesson(lesson, classroom);
  const contentVersion = `sha256:${createHash('sha256').update(raw).digest('hex')}`;

  return {
    lesson,
    contentVersion,
    classroom: {
      ...classroom,
      scenes: [...classroom.scenes].sort((left, right) => left.order - right.order),
    },
  };
}
