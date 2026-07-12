import { describe, expect, it } from 'vitest';
import {
  advanceOrientationFromMessage,
  shouldPromptOrientation,
  attachHomeOrientation,
  createOrientationState,
  nextOrientationQuestion,
} from '@/lib/c-cubic/orientation';

describe('Jiuxuange orientation state', () => {
  it('requests the next orientation question when the attached home exchange ends with the learner', () => {
    const state = {
      ...createOrientationState(),
      phase: 'baseline' as const,
      problemDefined: true,
    };
    expect(
      shouldPromptOrientation(state, [
        { roleType: 'user' },
        { roleType: 'instructor' },
        { roleType: 'user' },
      ]),
    ).toBe(true);
    expect(shouldPromptOrientation(state, [{ roleType: 'user' }, { roleType: 'instructor' }])).toBe(
      false,
    );
  });
  const now = '2026-07-11T08:00:00.000Z';
  const homeMessages = [
    {
      id: 'home-user-1',
      roleType: 'user' as const,
      content: '加盟店增长很快，但续约率持续下降。',
      ts: now,
    },
    {
      id: 'home-professor-1',
      agentId: 'jiuxuange-professor' as const,
      roleType: 'instructor' as const,
      content: '你最终需要形成什么判断？',
      ts: now,
    },
    {
      id: 'home-user-2',
      roleType: 'user' as const,
      content: '我要判断是收费方式问题，还是总部创造的价值不足。',
      ts: now,
    },
  ];

  it('attaches the three-message home orientation once and enters baseline collection', () => {
    const first = attachHomeOrientation({
      state: createOrientationState(),
      draftId: 'orientation-1',
      messages: homeMessages,
      existingMessageIds: [],
      now,
    });
    const second = attachHomeOrientation({
      state: first.state,
      draftId: 'orientation-1',
      messages: homeMessages,
      existingMessageIds: first.messages.map((message) => message.id),
      now: '2026-07-11T08:01:00.000Z',
    });

    expect(first.draftId).toBe('orientation-1');
    expect(first.messages).toHaveLength(3);
    expect(first.state).toMatchObject({
      phase: 'baseline',
      problemDefined: true,
      baselineCaptured: false,
      goalConfirmed: false,
      assessmentUnderstood: false,
    });
    expect(first.state.formalOpeningDeliveredAt).toBeUndefined();
    expect(second.messages).toEqual([]);
    expect(second.state).toEqual(first.state);
  });

  it('asks for each remaining orientation evidence in order', () => {
    let state = attachHomeOrientation({
      state: createOrientationState(),
      draftId: 'orientation-1',
      messages: homeMessages,
      existingMessageIds: [],
      now,
    }).state;

    expect(nextOrientationQuestion(state)).toContain('不看教材');
    state = advanceOrientationFromMessage(state, {
      id: 'baseline-message',
      content: '我能说出一些概念，但还不能用事实判断商业模式是否成立。',
      now,
    });
    expect(nextOrientationQuestion(state)).toContain('完成这门课后');

    state = advanceOrientationFromMessage(state, {
      id: 'goal-message',
      content: '我希望能独立写出一个有事实依据、也能接受反证检验的商业模式判断。',
      now,
    });
    expect(nextOrientationQuestion(state)).toContain('事实、推理和反证');

    state = advanceOrientationFromMessage(state, {
      id: 'contract-message',
      content: '我同意用课程中的事实、推理和反证来展示自己的学习成果。',
      now,
    });
    expect(state).toMatchObject({
      phase: 'complete',
      problemDefined: true,
      baselineCaptured: true,
      goalConfirmed: true,
      assessmentUnderstood: true,
      completedAt: now,
    });
    expect(state.evidenceMessageIds).toContain('baseline-message');
    expect(nextOrientationQuestion(state)).toBeNull();
  });

  it('does not advance blank or short formulaic replies', () => {
    const state = attachHomeOrientation({
      state: createOrientationState(),
      draftId: 'orientation-1',
      messages: homeMessages,
      existingMessageIds: [],
      now,
    }).state;

    expect(advanceOrientationFromMessage(state, { id: 'blank', content: '   ', now })).toEqual(
      state,
    );
    expect(advanceOrientationFromMessage(state, { id: 'formula', content: '好的', now })).toEqual(
      state,
    );
  });

  it('does not complete until the assessment contract has evidence', () => {
    let state = attachHomeOrientation({
      state: createOrientationState(),
      draftId: 'orientation-1',
      messages: homeMessages,
      existingMessageIds: [],
      now,
    }).state;
    state = advanceOrientationFromMessage(state, {
      id: 'baseline-message',
      content: '我知道商业模式有几个组成部分，但不知道如何判断它们是否相互支撑。',
      now,
    });
    state = advanceOrientationFromMessage(state, {
      id: 'goal-message',
      content: '我希望能在案例中用事实说明自己的判断，并说出什么情况会推翻它。',
      now,
    });

    expect(state.phase).toBe('assessment_contract');
    expect(state.completedAt).toBeUndefined();
    expect(advanceOrientationFromMessage(state, { id: 'yes', content: '同意', now })).toEqual(
      state,
    );
  });
});
