import { describe, expect, it } from 'vitest';
import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test';
import { NextRequest } from 'next/server';

import { POST as updateTask } from '@/app/api/pbl/v2/task/update/route';
import { BUSINESS_MODEL_LEARNING_LOOP_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v5';
import type { JiuxuangeLearningNodeId } from '@/lib/c-cubic/course-package/types';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';
import {
  formatJiuxuangeLearningLoopFeedback,
  resolveJiuxuangeLearningEvidenceRef,
} from '@/lib/c-cubic/learning-loop';
import { retryJiuxuangeTask } from '@/lib/c-cubic/retry';
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

function textModel(): MockLanguageModelV3 {
  const parts: StreamPart[] = [
    { type: 'stream-start', warnings: [] },
    { type: 'text-start', id: 'text-1' },
    { type: 'text-delta', id: 'text-1', delta: '继续完成当前学习动作。' },
    { type: 'text-end', id: 'text-1' },
    { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE },
  ];
  return new MockLanguageModelV3({
    doStream: async () => ({ stream: convertArrayToReadableStream(parts) }),
  });
}

const NODE_SEQUENCE: JiuxuangeLearningNodeId[] = [
  'baseline_capture',
  'must_know_instruction',
  'bee_fact_observation',
  'bee_independent_commit',
  'bee_unlock_compare',
  'fresh_transfer',
  'judgment_revision',
  'evidence_feedback',
];

const AUTONOMOUS_ANSWERS: Record<JiuxuangeLearningNodeId, string> = {
  baseline_capture: '产品卖得好只说明当前交易结果，还不能说明参与者关系和成本风险能持续。',
  must_know_instruction:
    '产品回答卖什么，而商业模式不是产品清单，它还要回答谁参与、怎样协作以及价值如何持续分配。',
  bee_fact_observation: 'bee-loop-f2说明中央系统负责决策，而门店员工主要负责执行。',
  bee_independent_commit:
    'bee-loop-f3说明订货决策从店长转给中央系统，因此门店之间的经验差异可能缩小。',
  bee_unlock_compare:
    '我原先只看到软件提效，课程解释补充了信息采集、算法决策与门店执行之间的关系重组。',
  fresh_transfer:
    'fresh-transfer-f1和fresh-transfer-f6说明社区自提减少最后一公里送货关系，因此履约费用率可能低于前置仓。',
  judgment_revision:
    '我原先主要看产品销量，现在会同时检查决策权、履约关系与成本结果，因为fresh-transfer-f6显示不同关系对应不同费用结构。',
  evidence_feedback: '下一次我会先核对谁掌握关键决策权，以及成本和风险最终由谁承担。',
};

const SCAFFOLDED_ANSWERS: Record<JiuxuangeLearningNodeId, string> = {
  ...AUTONOMOUS_ANSWERS,
  baseline_capture: '我原来主要看产品能不能赚钱。',
  must_know_instruction: '不知道',
  bee_fact_observation: 'bee-loop-f2说明中央系统在决定，店员在执行。',
  bee_independent_commit:
    'bee-loop-f3说明订货权转给中央系统，因此门店执行差异可能减少。',
  fresh_transfer:
    'fresh-transfer-f1和fresh-transfer-f6说明社区自提减少配送，因此履约费用率可能更低。',
  judgment_revision:
    '我原先只看赚钱，现在会修正为同时看履约关系，因为fresh-transfer-f6显示费用结构不同。',
};

const UNKNOWN_ANSWERS = Object.fromEntries(
  NODE_SEQUENCE.map((nodeId) => [
    nodeId,
    nodeId === 'evidence_feedback' ? '下一次先看事实' : '不知道',
  ]),
) as Record<JiuxuangeLearningNodeId, string>;

function activeNode(project: PBLProjectV2): JiuxuangeLearningNodeId | undefined {
  return project.milestones
    .find((milestone) => milestone.status === 'active')
    ?.microtasks.find((task) => task.status === 'in_progress')
    ?.jiuxuange?.learningNodeId;
}

async function runTurn(
  project: PBLProjectV2,
  phase: 'setup' | 'instructing',
  userMessage = '',
  sourceMessageId?: string,
): Promise<PBLSSEEvent[]> {
  const milestone = project.milestones.find((item) => item.status === 'active');
  const task = milestone?.microtasks.find((item) => item.status === 'in_progress');
  if (!task) throw new Error('Missing active replay task');
  if (phase === 'instructing' && sourceMessageId) {
    project.threads[0].messages.push({
      id: sourceMessageId,
      roleType: 'user',
      content: userMessage,
      ts: `2026-07-20T17:${String(project.threads[0].messages.length).padStart(2, '0')}:00.000Z`,
      microtaskId: task.id,
    });
  }
  const events: PBLSSEEvent[] = [];
  for await (const event of runInstructorTurn({
    project,
    userMessage,
    phase,
    languageModel: textModel() as never,
  })) {
    events.push(event);
  }
  return events;
}

function visible(events: PBLSSEEvent[]): string {
  return events
    .filter((event): event is Extract<PBLSSEEvent, { type: 'token' }> => event.type === 'token')
    .map((event) => event.delta)
    .join('');
}

async function completeCurrentTask(project: PBLProjectV2): Promise<PBLProjectV2> {
  const response = await updateTask(
    new NextRequest('http://localhost/api/pbl/v2/task/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, action: 'complete_pending_task' }),
    }),
  );
  const json = (await response.json()) as { success: boolean; project?: PBLProjectV2; error?: string };
  if (!response.ok || !json.project) throw new Error(json.error ?? 'Task completion failed');
  return json.project;
}

async function replayLearner(options: {
  learnerId: string;
  answers: Record<JiuxuangeLearningNodeId, string>;
  retryCounts?: Partial<Record<JiuxuangeLearningNodeId, number>>;
}): Promise<{ project: PBLProjectV2; setupTextByNode: Map<string, string> }> {
  let project = createJiuxuangeProject(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE, {
    now: '2026-07-20T17:00:00.000Z',
    learnerId: options.learnerId,
    sessionVariantId: 'business-model-learning-loop',
  });
  const setupTextByNode = new Map<string, string>();

  for (const expectedNode of NODE_SEQUENCE) {
    expect(activeNode(project)).toBe(expectedNode);
    const setupEvents = await runTurn(project, 'setup');
    setupTextByNode.set(expectedNode, visible(setupEvents));

    const retryCount = options.retryCounts?.[expectedNode] ?? 0;
    for (let attempt = 0; attempt < retryCount; attempt += 1) {
      retryJiuxuangeTask(project, BUSINESS_MODEL_LEARNING_LOOP_PACKAGE, {
        now: `2026-07-20T17:30:0${attempt}.000Z`,
      });
    }

    const sourceMessageId = `${options.learnerId}:${expectedNode}`;
    await runTurn(
      project,
      'instructing',
      options.answers[expectedNode],
      sourceMessageId,
    );
    expect(project.pendingTaskCompletion?.microtaskId).toBeTruthy();
    project = await completeCurrentTask(project);

    if (expectedNode === 'bee_independent_commit') {
      const resumed = JSON.parse(JSON.stringify(project)) as PBLProjectV2;
      expect(activeNode(resumed)).toBe('bee_unlock_compare');
      expect(resumed.jiuxuange?.learningLoop?.claims.some(
        (claim) => claim.sourceMessageId === sourceMessageId,
      )).toBe(true);
      project = resumed;
    }
  }
  return { project, setupTextByNode };
}

function expectFeedbackTraceable(project: PBLProjectV2): void {
  const state = project.jiuxuange?.learningLoop;
  const feedback = state?.feedback;
  if (!state || !feedback) throw new Error('Missing learning-loop feedback');
  for (const statement of feedback.statements) {
    const resolved = statement.evidenceRefs.map((ref) =>
      resolveJiuxuangeLearningEvidenceRef(project, ref),
    );
    expect(resolved.every(Boolean), JSON.stringify({ statement, resolved })).toBe(true);
    expect(resolved.some((item) => item?.kind === 'source_message')).toBe(true);
  }
  expect(formatJiuxuangeLearningLoopFeedback(feedback)).not.toMatch(/(?:分数|得分|score)/iu);
}

describe('Jiuxuange V5 fixed learner replays', () => {
  it('completes the autonomous A path with teaching, transfer, revision and traceable feedback', async () => {
    const { project, setupTextByNode } = await replayLearner({
      learnerId: 'replay-autonomous',
      answers: AUTONOMOUS_ANSWERS,
    });

    expect(project.status).toBe('completed');
    expect(setupTextByNode.get('must_know_instruction')).toContain('商业模式不等于产品');
    expect(setupTextByNode.get('bee_unlock_compare')).toContain('你的原判断已经冻结');
    expect(setupTextByNode.get('evidence_feedback')).toContain('这是你本轮的学习回顾');
    expect(project.jiuxuange?.learningLoop?.feedback?.outcome).toBe('A');
    expectFeedbackTraceable(project);
  });

  it('completes a scaffolded path as B and preserves retry/hint provenance', async () => {
    const { project } = await replayLearner({
      learnerId: 'replay-scaffolded',
      answers: SCAFFOLDED_ANSWERS,
      retryCounts: {
        bee_fact_observation: 1,
        bee_independent_commit: 1,
        fresh_transfer: 2,
        judgment_revision: 1,
      },
    });

    expect(project.status).toBe('completed');
    expect(project.jiuxuange?.learningLoop?.feedback?.outcome).toBe('B');
    expect(
      project.runtimeEvents?.filter((event) => event.kind === 'jiuxuange_retry_requested'),
    ).toHaveLength(5);
    expect(
      project.jiuxuange?.learningLoop?.claims.some((claim) => claim.supportStatus === 'hinted'),
    ).toBe(true);
    expectFeedbackTraceable(project);
  });

  it('lets repeated unknown answers finish the path without claiming autonomous mastery', async () => {
    const { project } = await replayLearner({
      learnerId: 'replay-unknown',
      answers: UNKNOWN_ANSWERS,
    });

    expect(project.status).toBe('completed');
    expect(project.jiuxuange?.learningLoop?.feedback?.outcome).toBe('B');
    expect(
      project.jiuxuange?.learningLoop?.claims.every(
        (claim) => claim.supportStatus !== 'autonomous' && claim.supportStatus !== 'hinted',
      ),
    ).toBe(true);
    expect(project.runtimeEvents?.some((event) => event.kind === 'jiuxuange_assisted_progress'))
      .toBe(true);
    expectFeedbackTraceable(project);
  });
});
