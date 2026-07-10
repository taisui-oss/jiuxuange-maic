import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

function readDatabaseSource(): string {
  return readFileSync(resolve(__dirname, '..', '..', 'lib/utils/database.ts'), 'utf-8');
}

describe('C Cubic learning database schema', () => {
  it('adds versioned local tables for learning path, progress, and evaluations', () => {
    const source = readDatabaseSource();

    expect(source).toContain('const _DATABASE_VERSION = 13');
    expect(source).toContain('learningPaths!: EntityTable<LearningPathRecord');
    expect(source).toContain('courseProgress!: EntityTable<CourseProgressRecord');
    expect(source).toContain('learningEvaluations!: EntityTable<LearningEvaluationRecord');
    expect(source).toContain('this.version(13).stores');
    expect(source).toContain("learningPaths: 'id, courseId, updatedAt'");
    expect(source).toContain(
      "courseProgress: 'id, courseId, moduleId, updatedAt, lastClassroomId, [courseId+moduleId]'",
    );
    expect(source).toContain(
      "'id, courseId, moduleId, classroomId, sceneId, createdAt, [courseId+moduleId]'",
    );
  });

  it('includes learning records in backup, restore, stats, and classroom cleanup paths', () => {
    const databaseSource = readDatabaseSource();
    const stageStorageSource = readFileSync(
      resolve(__dirname, '..', '..', 'lib/utils/stage-storage.ts'),
      'utf-8',
    );

    for (const table of ['learningPaths', 'courseProgress', 'learningEvaluations']) {
      expect(databaseSource).toContain(`${table}: await db.${table}.toArray()`);
      expect(databaseSource).toContain(
        `if (data.${table}) await db.${table}.bulkPut(data.${table})`,
      );
      expect(databaseSource).toContain(`${table}: await db.${table}.count()`);
    }

    expect(databaseSource).toContain(
      "db.learningEvaluations.where('classroomId').equals(stageId).delete()",
    );
    expect(stageStorageSource).toContain(
      "db.learningEvaluations.where('classroomId').equals(stageId).delete()",
    );
  });
});
