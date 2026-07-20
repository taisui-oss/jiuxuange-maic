import { describe, expect, it } from 'vitest';
import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test';

import { BUSINESS_MODEL_LEARNING_LOOP_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v5';
import type { JiuxuangeLearningNodeId } from '@/lib/c-cubic/course-package/types';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';
import { runInstructorTurn } from '@/lib/pbl/v2/agents/instructor';
import type { PBLSSEEvent } from '@/lib/pbl/v2/api/sse';
import type { PBLProjectV2 } from '@/lib/pbl/v2/types';

type DoStreamConfig = NonNullable<
  NonNullable<ConstructorParameters<typeof MockLanguageModelV3>[0]>['doStream']
>;
type StreamResult = Extract<DoStreamConfig, { stream: unknown }>;
type StreamPart = StreamResult['stream'] extends ReadableStream<infer P> ? P : never;

const USAGE = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
};

function textModel(text: string): MockLanguageModelV3 {
  const parts: StreamPart[] = [
    { type: 'stream-start', warnings: [] },
    { type: 'text-start', id: 'text-1' },
    { type: 'text-delta', id: 'text-1', delta: text },
    { type: 'text-end', id: 'text-1' },
    { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE },
  ];
  return new MockLanguageModelV3({
    doStream: async () => ({ stream: convertArrayToReadableStream(parts) }),
  });
}

function timeoutModel(): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doStream: async () => {
      throw new Error('Cannot connect to API: Connect Timeout Error');
    },
  });
}

function projectAt(nodeId: JiuxuangeLearningNodeId): PBLProjectV2 {
  const project = createJiuxuangeProject(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE, {
    now: '2026-07-20T15:00:00.000Z',
    learnerId: 'learner-v5-instructor',
    sessionVariantId: 'business-model-learning-loop',
  });
  for (const milestone of project.milestones) {
    const target = milestone.microtasks.find((task) => task.jiuxuange?.learningNodeId === nodeId);
    milestone.status = target ? 'active' : 'locked';
    const targetIndex = target ? milestone.microtasks.indexOf(target) : -1;
    for (const [index, task] of milestone.microtasks.entries()) {
      task.status = task === target ? 'in_progress' : index < targetIndex ? 'completed' : 'todo';
    }
  }
  return project;
}

async function runLearnerTurn(
  project: PBLProjectV2,
  messageId: string,
  message: string,
  model: MockLanguageModelV3,
): Promise<PBLSSEEvent[]> {
  const milestone = project.milestones.find((item) => item.status === 'active');
  const task = milestone?.microtasks.find((item) => item.status === 'in_progress');
  if (!task) throw new Error('Missing active learning task');
  project.threads[0].messages.push({
    id: messageId,
    roleType: 'user',
    content: message,
    ts: '2026-07-20T15:01:00.000Z',
    microtaskId: task.id,
  });
  const events: PBLSSEEvent[] = [];
  for await (const event of runInstructorTurn({
    project,
    userMessage: message,
    phase: 'instructing',
    languageModel: model as never,
  })) {
    events.push(event);
  }
  return events;
}

function visibleText(events: PBLSSEEvent[]): string {
  return events
    .filter((event): event is Extract<PBLSSEEvent, { type: 'token' }> => event.type === 'token')
    .map((event) => event.delta)
    .join('');
}

describe('Jiuxuange V5 Instructor learning loop', () => {
  it('opens the learning loop with the canonical question and no submission instruction', async () => {
    const project = projectAt('baseline_capture');
    const events: PBLSSEEvent[] = [];
    for await (const event of runInstructorTurn({
      project,
      userMessage: '',
      phase: 'setup',
      languageModel: textModel('请在侧栏提交你的判断。') as never,
    })) {
      events.push(event);
    }

    expect(visibleText(events)).toBe(
      BUSINESS_MODEL_LEARNING_LOOP_PACKAGE.questionTemplates['loop-baseline'].prompt,
    );
    expect(visibleText(events)).not.toMatch(/(?:提交|侧栏)/u);
  });

  it('teaches after an unknown answer, records assisted progress, and does not claim mastery', async () => {
    const project = projectAt('must_know_instruction');
    const events = await runLearnerTurn(project, 'msg-unknown-foundation', '不知道', timeoutModel());

    expect(events.some((event) => event.type === 'error')).toBe(false);
    expect(visibleText(events)).toContain('商业模式不等于产品');
    expect(visibleText(events)).toContain('辅助理解');
    expect(visibleText(events)).toContain('点击「继续学习」');
    expect(visibleText(events)).not.toContain('点击「完成」');
    expect(project.pendingTaskCompletion).toMatchObject({
      reason: 'jiuxuange_assisted_learning_loop',
    });
    expect(
      events.some(
        (event) =>
          event.type === 'project_patch' && event.patch.kind === 'pending_task_completion',
      ),
    ).toBe(true);
    expect(
      project.runtimeEvents?.some(
        (event) =>
          event.kind === 'jiuxuange_assisted_progress' &&
          event.sourceMessageId === 'msg-unknown-foundation',
      ),
    ).toBe(true);
    expect(project.jiuxuange?.learningLoop?.claims).toEqual([]);
  });

  it('records an independent convenience-bee judgment against the original message and facts', async () => {
    const project = projectAt('bee_independent_commit');
    const answer = '第3条事实说明订货决策从店长转给中央系统，因此门店经验差异可能缩小。';
    const events = await runLearnerTurn(
      project,
      'msg-bee-independent-commit',
      answer,
      textModel('我来替你总结答案。'),
    );

    expect(project.jiuxuange?.learningLoop?.claims).toContainEqual(
      expect.objectContaining({
        claimType: 'case_commit',
        sourceMessageId: 'msg-bee-independent-commit',
        text: answer,
        factIds: ['bee-loop-f3'],
        supportStatus: 'autonomous',
        immutable: true,
      }),
    );
    expect(
      events.some(
        (event) =>
          event.type === 'project_patch' &&
          event.patch.kind === 'runtime_event' &&
          event.patch.event.kind === 'jiuxuange_claim_recorded',
      ),
    ).toBe(true);
    expect(project.pendingTaskCompletion).toMatchObject({
      reason: 'jiuxuange_evidence_gate_satisfied',
    });
  });
});
