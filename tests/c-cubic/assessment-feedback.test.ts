import { describe, expect, it } from 'vitest';

import { buildLearnerFeedbackReport } from '@/lib/c-cubic/assessment';

describe('Jiuxuange learner assessment feedback', () => {
  it('returns only textual observations and one next-step suggestion', () => {
    const report = buildLearnerFeedbackReport({
      observations: {
        evidenceGrounding: '你引用了可定位的案例消息，来源也写清楚了。',
        conceptAccuracy: '你区分了商业模式与单一产品功能。',
        causalLogic: '你把复购变化与增长判断连成了因果链。',
        counterevidence: '还需要说明什么事实会推翻当前判断。',
        transfer: '你已经把问题带回自己的项目。',
      },
      nextStep: '为自己的项目补一条可定位事实，再重写反证条件。',
    });

    expect(report).toEqual({
      observations: {
        evidenceGrounding: '你引用了可定位的案例消息，来源也写清楚了。',
        conceptAccuracy: '你区分了商业模式与单一产品功能。',
        causalLogic: '你把复购变化与增长判断连成了因果链。',
        counterevidence: '还需要说明什么事实会推翻当前判断。',
        transfer: '你已经把问题带回自己的项目。',
      },
      nextStep: '为自己的项目补一条可定位事实，再重写反证条件。',
    });
    expect(JSON.stringify(report)).not.toMatch(/score|grade|level|dimension|分数|等级/u);
    expect(
      Object.values(report.observations).every((observation) => typeof observation === 'string'),
    ).toBe(true);
  });
});
