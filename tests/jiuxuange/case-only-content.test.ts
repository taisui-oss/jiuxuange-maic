import { describe, expect, it } from 'vitest';
import { listCaseOnlyLessons } from '@/lib/jiuxuange/case-only/catalog';
import { readCaseOnlyContent } from '@/lib/server/jiuxuange-case-only/content-repository';

describe('case-only content repository', () => {
  it('uses only complete pre-generated OpenMAIC case packages', async () => {
    const lessons = listCaseOnlyLessons();
    expect(lessons.map((lesson) => lesson.id)).toEqual([
      'breakfast-chain-six-elements-foundation',
      'convenience-bee',
    ]);

    for (const lesson of lessons) {
      const content = await readCaseOnlyContent(lesson.id);
      expect(content?.classroom.id).toBe(lesson.classroomId);
      expect(content?.classroom.generationComplete).toBe(true);
      expect(content?.classroom.scenes.length).toBeGreaterThan(1);
      expect(content?.contentVersion).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
  });

  it('does not expose reviewed-out or unknown content', async () => {
    expect(await readCaseOnlyContent('fresh-grocery-comparison')).toBeNull();
    expect(await readCaseOnlyContent('unknown-case')).toBeNull();
  });
});
