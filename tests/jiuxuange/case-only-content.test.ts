import { describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { listCaseOnlyLessons } from '@/lib/jiuxuange/case-only/catalog';
import {
  readCaseOnlyContent,
  toLearnerCaseOnlyContent,
} from '@/lib/server/jiuxuange-case-only/content-repository';

describe('case-only content repository', () => {
  it('uses only complete pre-generated OpenMAIC case packages', async () => {
    const lessons = listCaseOnlyLessons();
    expect(lessons.map((lesson) => lesson.id)).toEqual([
      'breakfast-chain-six-elements-foundation',
      'convenience-bee',
      'fresh-grocery-comparison',
      'shein-system-capabilities',
      'florasis-business-model',
    ]);

    for (const lesson of lessons) {
      const content = await readCaseOnlyContent(lesson.id);
      expect(content?.classroom.id).toBe(lesson.classroomId);
      expect(content?.classroom.generationComplete).toBe(true);
      expect(content?.classroom.scenes).toHaveLength(10);
      expect(content?.classroom.scenes.map((scene) => scene.order)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ]);
      expect(content?.contentVersion).toMatch(/^sha256:[a-f0-9]{64}$/);

      const quizScenes = content!.classroom.scenes.filter(
        (scene) => scene.type === 'quiz' && scene.content.type === 'quiz',
      );
      const questions = quizScenes.flatMap((scene) =>
        scene.content.type === 'quiz' ? scene.content.questions : [],
      );
      expect(quizScenes.length).toBeGreaterThanOrEqual(1);
      expect(questions).toHaveLength(5);
      for (const question of questions) {
        if (question.type === 'short_answer') continue;
        expect(question.answer?.length, question.id).toBeGreaterThan(0);
        expect(question.analysis?.trim(), question.id).toBeTruthy();
      }
    }
  });

  it('does not expose reviewed-out or unknown content', async () => {
    expect(await readCaseOnlyContent('freight-platform-ecosystem')).toBeNull();
    expect(await readCaseOnlyContent('smart-auto-comparison')).toBeNull();
    expect(await readCaseOnlyContent('unknown-case')).toBeNull();
  });

  it('removes answers, grading prompts, and explanations from learner content', async () => {
    for (const lesson of listCaseOnlyLessons()) {
      const content = await readCaseOnlyContent(lesson.id);
      const learnerJson = JSON.stringify(toLearnerCaseOnlyContent(content!));
      expect(learnerJson).not.toContain('"answer":');
      expect(learnerJson).not.toContain('"hasAnswer":');
      expect(learnerJson).not.toContain('"analysis":');
      expect(learnerJson).not.toContain('"commentPrompt":');
    }
  });

  it('keeps a complete internal coach answer key outside learner routes', async () => {
    const answerKey = await fs.readFile(
      path.join(
        process.cwd(),
        'documentation',
        'jiuxuange',
        'case-only-v1',
        'coach',
        'CASE_ANSWER_KEY.md',
      ),
      'utf8',
    );
    for (const title of ['社区早餐连锁', '便利蜂', '生鲜零售', 'SHEIN', '花西子']) {
      expect(answerKey).toContain(`## ${title}`);
    }
    expect(answerKey).toContain('pending_named_sme_review');
  });
});
