import { describe, expect, it } from 'vitest';
import {
  advanceOrientationFromMessage,
  shouldPromptOrientation,
  attachHomeOrientation,
  createOrientationState,
  nextOrientationQuestion,
} from '@/lib/c-cubic/orientation';

describe('Jiuxuange orientation state', () => {
  it('starts direct course entry with a concrete problem question and records the answer', () => {
    const state = createOrientationState();

    expect(nextOrientationQuestion(state)).toBe(
      '先带着一个真实问题开始：你现在最想通过这门课解决哪个具体的商业判断？',
    );

    const next = advanceOrientationFromMessage(state, {
      id: 'direct-entry-problem',
      content: '我想判断现有美容院渠道是否还能支撑转型。',
      now: '2026-07-20T00:00:00.000Z',
    });

    expect(next).toMatchObject({ phase: 'baseline', problemDefined: true });
    expect(next.evidenceMessageIds).toContain('direct-entry-problem');
  });

  it('keeps uncertainty in the current phase and changes from repetition to scaffolding', () => {
    const state = createOrientationState();
    const uncertain = advanceOrientationFromMessage(state, {
      id: 'uncertain',
      content: '我不知道要判断什么，你需要引导我。',
      now: '2026-07-20T00:00:00.000Z',
    });

    expect(uncertain).toEqual(state);
    expect(nextOrientationQuestion(state, '我不知道要判断什么，你需要引导我。')).toContain(
      '最困扰你的',
    );
  });

  it('recovers an incomplete orientation after the legacy empty-output fallback', () => {
    const state = {
      ...createOrientationState(),
      phase: 'goal' as const,
      problemDefined: true,
      baselineCaptured: true,
    };

    expect(
      shouldPromptOrientation(state, [
        { roleType: 'user', content: '我不知道要判断，你需要引导我。' },
        {
          roleType: 'instructor',
          content:
            '刚才的回复没有完整生成。我们先留在「概念理解」：请用自己的话说明你目前的判断依据。',
        },
      ]),
    ).toBe(true);
  });

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

  it('repairs a persisted repeated question after the learner already complained', () => {
    const state = {
      ...createOrientationState(),
      phase: 'baseline' as const,
      problemDefined: true,
    };
    const repeated = '不看教材的话，你现在会怎样判断一家企业的商业模式是否成立？';

    expect(
      shouldPromptOrientation(state, [
        { roleType: 'instructor', content: repeated },
        { roleType: 'user', content: '你问过这个问题了' },
        { roleType: 'instructor', content: repeated },
      ]),
    ).toBe(true);
    expect(
      shouldPromptOrientation(state, [
        { roleType: 'user', content: '你问过这个问题了' },
        {
          roleType: 'instructor',
          content: '你说得对，我换个问法：什么事实会让你改变判断？',
        },
      ]),
    ).toBe(false);
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

  it('deepens a short profit-only baseline answer instead of repeating the same question', () => {
    const state = {
      ...createOrientationState(),
      phase: 'baseline' as const,
      problemDefined: true,
    };

    const followUp = nextOrientationQuestion(state, '能赚钱');

    expect(followUp).toContain('赚钱是结果');
    expect(followUp).toContain('事实');
    expect(followUp).not.toBe('不看教材的话，你现在会怎样判断一家企业的商业模式是否成立？');
    expect(followUp?.match(/[?？]/g)).toHaveLength(1);
  });

  it('acknowledges a repeated-question complaint and changes the angle', () => {
    const state = {
      ...createOrientationState(),
      phase: 'baseline' as const,
      problemDefined: true,
    };

    const followUp = nextOrientationQuestion(state, '你问过这个问题了');

    expect(followUp).toContain('你说得对');
    expect(followUp).toContain('换个问法');
    expect(followUp?.match(/[?？]/g)).toHaveLength(1);
  });

  it('scaffolds repeated uncertainty with a different goal question each time', () => {
    const state = {
      ...createOrientationState(),
      phase: 'goal' as const,
      problemDefined: true,
      baselineCaptured: true,
    };

    const first = nextOrientationQuestion(state, '不知道', 1);
    const second = nextOrientationQuestion(state, '不知道', 2);

    expect(first).toContain('你家的项目');
    expect(first).toContain('继续原有客户与渠道');
    expect(second).toContain('临时目标');
    expect(second).toContain('比较两条转型路径');
    expect(second).not.toBe(first);
    expect(first?.match(/[?？]/g)).toHaveLength(1);
    expect(second?.match(/[?？]/g)).toHaveLength(1);
  });

  it('repairs a persisted duplicate after repeated uncertainty', () => {
    const state = {
      ...createOrientationState(),
      phase: 'goal' as const,
      problemDefined: true,
      baselineCaptured: true,
    };
    const repeated = '把目标再落具体一点：课程结束后，你希望能独立完成哪个商业判断？';

    expect(
      shouldPromptOrientation(state, [
        { roleType: 'instructor', content: repeated },
        { roleType: 'user', content: '不知道' },
        { roleType: 'instructor', content: repeated },
      ]),
    ).toBe(true);
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
