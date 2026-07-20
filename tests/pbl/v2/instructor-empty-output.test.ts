/**
 * Instructor — empty-output fallback keeps a silent turn learnable.
 *
 * The reviewer flagged that suppressing the empty-output error on ANY tool call
 * was too broad: a turn that only called an internal bookkeeping tool, with no
 * acknowledgment text, left the learner with NOTHING — no chat bubble, no
 * error, no retry. The page just sat there.
 *
 * Fix under test (flow level): a genuinely silent turn commits a deterministic
 * continuation instead of blaming the learner or leaving dead air.
 *
 * Note on ordering: the client aborts the whole SSE stream on the first `error`
 * frame (assertNotStreamError). Emitting the empty error before a later patch
 * would drop that patch on the client, so it is emitted after project patches.
 */
import { describe, expect, it } from 'vitest';
import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test';

import { runInstructorTurn } from '@/lib/pbl/v2/agents/instructor';
import { BUSINESS_MODEL_SIX_LEVEL_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v3';
import { BUSINESS_MODEL_SINGLE_COURSE_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v4';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';
import type { PBLProjectV2 } from '@/lib/pbl/v2/types';
import type { PBLSSEEvent } from '@/lib/pbl/v2/api/sse';

type DoStreamConfig = NonNullable<
  NonNullable<ConstructorParameters<typeof MockLanguageModelV3>[0]>['doStream']
>;
type StreamResult = Extract<DoStreamConfig, { stream: unknown }>;
type StreamPart = StreamResult['stream'] extends ReadableStream<infer P> ? P : never;

const USAGE = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
};
const FINISH_TOOLS = {
  type: 'finish' as const,
  finishReason: { unified: 'tool-calls' as const, raw: 'tool-calls' },
  usage: USAGE,
};

function toolCallStep(toolName: string, input: Record<string, unknown>): StreamPart[] {
  return [
    { type: 'stream-start', warnings: [] },
    { type: 'tool-call', toolCallId: `tc-${toolName}`, toolName, input: JSON.stringify(input) },
    FINISH_TOOLS,
  ];
}

function scriptedModel(steps: StreamPart[][]): MockLanguageModelV3 {
  let i = 0;
  const fallback: StreamPart[] = [
    { type: 'stream-start', warnings: [] },
    { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE },
  ];
  return new MockLanguageModelV3({
    doStream: async () => ({ stream: convertArrayToReadableStream(steps[i++] ?? fallback) }),
  });
}

function makeProject(): PBLProjectV2 {
  const now = '2026-06-10T00:00:00.000Z';
  return {
    uiPhase: 'workspace',
    title: 'Build a HashMap Playground',
    description: 'A small interactive HashMap tool.',
    learningObjective: 'Learn HashMap operations by building a toy tool.',
    proficiency: 'intermediate',
    language: 'zh-CN',
    tags: ['hashmap'],
    status: 'active',
    roles: [{ id: 'role-i', type: 'instructor', name: 'Instructor' }],
    milestones: [
      {
        id: 'ms-1',
        title: 'Model the core HashMap behavior',
        order: 0,
        status: 'active',
        microtasks: [
          {
            id: 'mt-1',
            title: 'Implement lookup',
            description: 'Use a key to find the right bucket and return the value.',
            status: 'in_progress',
            assignee: 'user',
            hints: [],
            order: 0,
          },
        ],
        documents: [],
      },
    ],
    submissions: [],
    evaluations: [],
    threads: [{ agentId: 'role-i', messages: [] }],
    engagementEvents: [],
    createdAt: now,
    updatedAt: now,
  };
}

async function runTurn(model: MockLanguageModelV3, userMessage: string): Promise<PBLSSEEvent[]> {
  const events: PBLSSEEvent[] = [];
  for await (const ev of runInstructorTurn({
    project: makeProject(),
    userMessage,
    phase: 'instructing',
    languageModel: model as never,
  })) {
    events.push(ev);
  }
  return events;
}

function committedMessages(events: PBLSSEEvent[]): string[] {
  return events
    .filter(
      (e): e is Extract<PBLSSEEvent, { type: 'project_patch' }> =>
        e.type === 'project_patch' && e.patch.kind === 'message',
    )
    .map((e) => (e.patch as { message: { content: string } }).message.content);
}

function emptyOutputIndex(events: PBLSSEEvent[]): number {
  return events.findIndex(
    (e) => e.type === 'error' && (e as { code?: string }).code === 'EMPTY_LLM_OUTPUT',
  );
}

describe('Instructor — learnable fallback on a silent dead turn', () => {
  it('teaches and opens continuation instead of repeating the V4 question after “不知道”', async () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_SINGLE_COURSE_PACKAGE, {
      now: '2026-07-20T00:00:00.000Z',
    });
    const originalQuestion =
      project.milestones[0]?.microtasks[0]?.jiuxuange?.questionPrompt ?? '';
    const events: PBLSSEEvent[] = [];

    for await (const event of runInstructorTurn({
      project,
      userMessage: '不知道',
      phase: 'instructing',
      languageModel: scriptedModel([]) as never,
    })) {
      events.push(event);
    }

    const messages = committedMessages(events);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('商业模式不等于');
    expect(messages[0]).toContain('点击「完成」继续学习');
    expect(messages[0]).not.toContain(originalQuestion);
    expect(project.pendingTaskCompletion?.reason).toBe('jiuxuange_assisted_learning');
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'project_patch',
        patch: expect.objectContaining({ kind: 'pending_task_completion' }),
      }),
    );
  });

  it('uses the current orientation question when Jiuxuange receives an empty model response', async () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_SIX_LEVEL_PACKAGE, {
      now: '2026-07-20T00:00:00.000Z',
    });
    project.jiuxuange!.orientation = {
      ...project.jiuxuange!.orientation!,
      phase: 'goal',
      problemDefined: true,
      baselineCaptured: true,
    };
    const events: PBLSSEEvent[] = [];

    for await (const event of runInstructorTurn({
      project,
      userMessage: '不知道',
      phase: 'instructing',
      languageModel: scriptedModel([]) as never,
    })) {
      events.push(event);
    }

    expect(committedMessages(events)).toEqual([
      '不知道也可以。就你家的项目，你更想先学会判断“继续原有客户与渠道”，还是“换一种客户与交易方式”？',
    ]);
  });

  it('commits a task-grounded continuation when record_observation ran and the model wrote no text', async () => {
    // record_observation is internal bookkeeping. No text, no scenario
    // auto-completion, no difficulty ack → previously the `toolCalled` guard
    // swallowed the error and the learner saw nothing.
    const events = await runTurn(
      scriptedModel([
        toolCallStep('record_observation', {
          kind: 'question',
          signature: 'lookup_question',
          label: 'lookup question',
        }),
      ]),
      '这里为什么要先算 hash？',
    );

    expect(emptyOutputIndex(events)).toBe(-1);
    expect(committedMessages(events)).toEqual([
      '刚才的回复没有完整生成。我们先留在「Implement lookup」：请用自己的话说明你目前的判断依据。',
    ]);
  });

  it('commits the fallback after observation patches so the client keeps both state and visible guidance', async () => {
    const events = await runTurn(
      scriptedModel([
        toolCallStep('record_observation', {
          kind: 'question',
          signature: 'lookup_question',
          label: 'lookup question',
        }),
      ]),
      '这里为什么要先算 hash？',
    );

    const messagePatchIdx = events.findIndex(
      (event) => event.type === 'project_patch' && event.patch.kind === 'message',
    );
    const observationPatchIdx = events.findIndex(
      (event) => event.type === 'project_patch' && event.patch.kind === 'engagement_event',
    );
    expect(messagePatchIdx).toBeGreaterThan(observationPatchIdx);
  });

  it('also commits a continuation on a totally silent turn', async () => {
    const events = await runTurn(scriptedModel([]), '在吗');
    expect(emptyOutputIndex(events)).toBe(-1);
    expect(committedMessages(events)).toHaveLength(1);
  });
});
