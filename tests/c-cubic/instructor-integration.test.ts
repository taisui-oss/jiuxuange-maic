import { describe, expect, it } from 'vitest';
import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test';
import { BUSINESS_MODEL_PILOT_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v1';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';
import { runInstructorTurn } from '@/lib/pbl/v2/agents/instructor';
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

function textModel(text: string): MockLanguageModelV3 {
  const parts: StreamPart[] = [
    { type: 'stream-start', warnings: [] },
    { type: 'text-start', id: 'text-1' },
    { type: 'text-delta', id: 'text-1', delta: text },
    { type: 'text-end', id: 'text-1' },
    {
      type: 'finish',
      finishReason: { unified: 'stop', raw: 'stop' },
      usage: USAGE,
    },
  ];
  return new MockLanguageModelV3({
    doStream: async () => ({ stream: convertArrayToReadableStream(parts) }),
  });
}

function tensionProject() {
  const project = createJiuxuangeProject(BUSINESS_MODEL_PILOT_PACKAGE, {
    now: '2026-07-11T00:00:00.000Z',
    caseId: 'demo_chain_franchise',
  });
  const tasks = project.milestones[0].microtasks;
  const tension = tasks.find((task) => task.jiuxuange?.phase === 'tension');
  if (!tension) throw new Error('Missing tension task');
  const tensionIndex = tasks.findIndex((task) => task.id === tension.id);
  for (const [index, task] of tasks.entries()) {
    task.status =
      index < tensionIndex ? 'completed' : task.id === tension.id ? 'in_progress' : 'todo';
  }
  project.uiPhase = 'workspace';
  return { project, tension };
}

async function collectTurn(text: string): Promise<{
  events: PBLSSEEvent[];
  project: ReturnType<typeof tensionProject>['project'];
  questionPrompt: string;
}> {
  const { project, tension } = tensionProject();
  const userMessage = '我觉得是增长和续约的问题。';
  project.threads[0].messages.push({
    id: 'msg_local_canonical',
    roleType: 'user',
    content: userMessage,
    ts: '2026-07-11T00:00:01.000Z',
    microtaskId: tension.id,
  });
  const events: PBLSSEEvent[] = [];
  for await (const event of runInstructorTurn({
    project,
    userMessage,
    phase: 'instructing',
    languageModel: textModel(text) as never,
  })) {
    events.push(event);
  }
  return { events, project, questionPrompt: tension.jiuxuange!.questionPrompt };
}

describe('Jiuxuange instructor runtime integration', () => {
  it('commits the phase-selected role into the one shared thread', async () => {
    const { events } = await collectTurn('把两条事实放在一起，你看到了什么？');
    const messagePatch = events.find(
      (event): event is Extract<PBLSSEEvent, { type: 'project_patch' }> =>
        event.type === 'project_patch' && event.patch.kind === 'message',
    );
    if (!messagePatch || messagePatch.patch.kind !== 'message') {
      throw new Error('Expected committed message');
    }
    expect(messagePatch.patch.message.agentId).toBe('jiuxuange-mystery');
  });

  it('does not duplicate the optimistic learner message on the server copy', async () => {
    const { project, events } = await collectTurn('这条判断对应哪条事实？');
    const learnerMessages = project.threads[0].messages.filter(
      (message) => message.roleType === 'user',
    );
    expect(learnerMessages.map((message) => message.id)).toEqual(['msg_local_canonical']);
    const evidencePatch = events.find(
      (event): event is Extract<PBLSSEEvent, { type: 'project_patch' }> =>
        event.type === 'project_patch' && event.patch.kind === 'runtime_event',
    );
    expect(evidencePatch?.patch).toEqual(
      expect.objectContaining({
        kind: 'runtime_event',
        event: expect.objectContaining({
          kind: 'jiuxuange_evidence_evaluated',
          sourceMessageId: 'msg_local_canonical',
        }),
      }),
    );
  });

  it('buffers unsafe streaming output and falls back to the canonical single question', async () => {
    const { events, questionPrompt } = await collectTurn('你先看增长吗？再看续约吗？');
    const visibleTokens = events
      .filter((event): event is Extract<PBLSSEEvent, { type: 'token' }> => event.type === 'token')
      .map((event) => event.delta)
      .join('');
    const messagePatch = events.find(
      (event): event is Extract<PBLSSEEvent, { type: 'project_patch' }> =>
        event.type === 'project_patch' && event.patch.kind === 'message',
    );
    if (!messagePatch || messagePatch.patch.kind !== 'message') {
      throw new Error('Expected committed message');
    }

    expect(visibleTokens).toBe(questionPrompt);
    expect(messagePatch.patch.message.content).toBe(questionPrompt);
    expect(visibleTokens.match(/[?？]/g)).toHaveLength(1);
  });
});
