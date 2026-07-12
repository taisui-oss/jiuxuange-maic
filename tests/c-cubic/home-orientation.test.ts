import { describe, expect, it } from 'vitest';
import {
  applyProfessorQuestion,
  completeHomeOrientation,
  createHomeOrientationDraft,
  normalizeHomeOrientationQuestion,
} from '@/lib/c-cubic/home-orientation';

describe('Jiuxuange home orientation', () => {
  it('keeps exactly one professor question', () => {
    expect(normalizeHomeOrientationQuestion('你现在最想解决什么？还有哪些事实？')).toBe(
      '你现在最想通过这次学习解决哪个具体判断？',
    );
    expect(normalizeHomeOrientationQuestion('你最终需要做出什么决定？')).toBe(
      '你最终需要做出什么决定？',
    );
  });

  it('moves through one home exchange without losing the original problem', () => {
    const draft = createHomeOrientationDraft({
      id: 'orientation-1',
      learnerId: 'learner-1',
      message: '我的加盟门店增长很快，但续约越来越差。',
      now: '2026-07-11T00:00:00.000Z',
    });
    const questioned = applyProfessorQuestion(draft, '你希望通过这次学习最终做出什么决定？');
    const completed = completeHomeOrientation(
      questioned,
      '我要判断问题来自加盟收费方式，还是总部给加盟商创造的价值不足。',
      '2026-07-11T00:01:00.000Z',
    );

    expect(completed.status).toBe('resolved');
    expect(completed.recommendedCourseId).toBe('business-model');
    expect(completed.initialMessages.map((message) => message.content)).toEqual([
      '我的加盟门店增长很快，但续约越来越差。',
      '你希望通过这次学习最终做出什么决定？',
      '我要判断问题来自加盟收费方式，还是总部给加盟商创造的价值不足。',
    ]);
  });

  it('refuses to complete without a substantive learner reply', () => {
    const draft = applyProfessorQuestion(
      createHomeOrientationDraft({
        id: 'orientation-2',
        learnerId: 'learner-1',
        message: '我想学商业模式。',
        now: '2026-07-11T00:00:00.000Z',
      }),
      '你想用这门课解决哪个具体问题？',
    );

    expect(() => completeHomeOrientation(draft, '不知道', '2026-07-11T00:01:00.000Z')).toThrow(
      'substantive',
    );
  });
});
