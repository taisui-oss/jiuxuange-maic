import { describe, expect, it } from 'vitest';

import { BUSINESS_MODEL_SINGLE_COURSE_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v4';
import {
  applyJiuxuangeLearningFirstPreludeProgress,
  evaluateJiuxuangeLearnerMessage,
} from '@/lib/c-cubic/evidence';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';
import { normalizeJiuxuangeReply } from '@/lib/c-cubic/runtime';

describe('learning-first prelude progression', () => {
  it('records an assisted step and opens continuation for an uncertain answer', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_SINGLE_COURSE_PACKAGE, {
      now: '2026-07-20T00:00:00.000Z',
    });
    const decision = evaluateJiuxuangeLearnerMessage({
      project,
      messageId: 'msg-unknown',
      message: '不知道',
      hintLevel: 0,
      modelVersion: 'test-model',
    });

    expect(decision.satisfied).toBe(false);
    expect(
      applyJiuxuangeLearningFirstPreludeProgress(project, decision, {
        sourceMessageId: 'msg-unknown',
        message: '不知道',
        now: '2026-07-20T00:01:00.000Z',
      }),
    ).toBe(true);
    expect(project.pendingTaskCompletion?.reason).toBe('jiuxuange_assisted_learning');
    expect(project.runtimeEvents?.at(-1)).toMatchObject({
      kind: 'jiuxuange_assisted_progress',
      sourceMessageId: 'msg-unknown',
    });
  });

  it('uses deterministic teaching content when the model output is empty', () => {
    const answer = normalizeJiuxuangeReply(
      '',
      '你会怎样区分产品和商业模式？',
      '商业模式不等于企业卖什么。',
    );
    expect(answer).toBe(
      '商业模式不等于企业卖什么。\n\n你会怎样区分产品和商业模式？',
    );
  });
});
