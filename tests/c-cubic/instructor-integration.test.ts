import { describe, expect, it } from 'vitest';
import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test';
import { BUSINESS_MODEL_PILOT_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v1';
import { BUSINESS_MODEL_GUIDED_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v2';
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

function timeoutModel(): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doStream: async () => {
      throw new Error('Cannot connect to API: Connect Timeout Error');
    },
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

async function collectTurn(
  text: string,
  options: { userMessage?: string; hintLevel?: 0 | 1 | 2 | 3 } = {},
): Promise<{
  events: PBLSSEEvent[];
  project: ReturnType<typeof tensionProject>['project'];
  questionPrompt: string;
}> {
  const { project, tension } = tensionProject();
  const userMessage = options.userMessage ?? '我觉得是增长和续约的问题。';
  tension.jiuxuange!.hintLevel = options.hintLevel ?? 0;
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

  it('records scaffolded evidence as hinted instead of autonomous', async () => {
    const { events } = await collectTurn('把门店增长和续约下降放在一起，你看到了什么不一致？', {
      userMessage: '门店在增长但续约率下降，因为方向相反，所以这种增长未必健康。',
      hintLevel: 2,
    });
    const evidencePatch = events.find(
      (event): event is Extract<PBLSSEEvent, { type: 'project_patch' }> =>
        event.type === 'project_patch' && event.patch.kind === 'runtime_event',
    );
    if (!evidencePatch || evidencePatch.patch.kind !== 'runtime_event') {
      throw new Error('Expected evidence runtime event');
    }
    expect(evidencePatch.patch.event).toEqual(
      expect.objectContaining({
        hintLevel: 2,
        decision: expect.objectContaining({
          satisfied: true,
          results: expect.arrayContaining([expect.objectContaining({ status: 'hinted' })]),
        }),
      }),
    );
  });

  it('advances mandatory orientation and delivers the formal opening exactly on completion', async () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_GUIDED_PACKAGE, {
      now: '2026-07-11T00:00:00.000Z',
    });
    project.uiPhase = 'workspace';
    project.jiuxuange!.orientation = {
      phase: 'assessment_contract',
      problemDefined: true,
      baselineCaptured: true,
      goalConfirmed: true,
      assessmentUnderstood: false,
      evidenceMessageIds: ['problem', 'baseline', 'goal'],
      attachedDraftIds: ['draft-1'],
    };
    const activeTask = project.milestones[0].microtasks[0];
    project.threads[0].messages.push({
      id: 'assessment-contract-answer',
      roleType: 'user',
      content: '我会引用项目事实说明因果关系，也会主动寻找反例来检验自己的判断。',
      ts: '2026-07-11T00:00:01.000Z',
      microtaskId: activeTask.id,
    });

    const events: PBLSSEEvent[] = [];
    for await (const event of runInstructorTurn({
      project,
      userMessage: '我会引用项目事实说明因果关系，也会主动寻找反例来检验自己的判断。',
      phase: 'instructing',
      languageModel: textModel('模型不应该决定这段开场。') as never,
    })) {
      events.push(event);
    }

    const orientationPatch = events.find(
      (event): event is Extract<PBLSSEEvent, { type: 'project_patch' }> =>
        event.type === 'project_patch' &&
        event.patch.kind === 'runtime_event' &&
        event.patch.event.kind === 'jiuxuange_orientation_updated',
    );
    if (!orientationPatch || orientationPatch.patch.kind !== 'runtime_event') {
      throw new Error('Expected orientation update');
    }
    expect(orientationPatch.patch.event).toEqual(
      expect.objectContaining({
        kind: 'jiuxuange_orientation_updated',
        orientation: expect.objectContaining({
          phase: 'complete',
          assessmentUnderstood: true,
          formalOpeningDeliveredAt: expect.any(String),
        }),
      }),
    );

    const visible = events
      .filter((event): event is Extract<PBLSSEEvent, { type: 'token' }> => event.type === 'token')
      .map((event) => event.delta)
      .join('');
    expect(visible).toContain('好，我们现在正式开始商业模式大课。');
    expect(visible).toContain(activeTask.jiuxuange!.questionPrompt);
    expect(visible.match(/正式开始商业模式大课/g)).toHaveLength(1);
    expect(visible.match(/[?？]/g)).toHaveLength(1);
  });

  it('continues the orientation locally when the model times out without repeating the question', async () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_GUIDED_PACKAGE, {
      now: '2026-07-11T00:00:00.000Z',
    });
    project.uiPhase = 'workspace';
    project.jiuxuange!.orientation = {
      phase: 'baseline',
      problemDefined: true,
      baselineCaptured: false,
      goalConfirmed: false,
      assessmentUnderstood: false,
      evidenceMessageIds: ['problem'],
      attachedDraftIds: ['draft-1'],
    };
    const activeTask = project.milestones[0].microtasks[0];
    project.threads[0].messages.push({
      id: 'short-baseline-answer',
      roleType: 'user',
      content: '能赚钱',
      ts: '2026-07-11T00:00:01.000Z',
      microtaskId: activeTask.id,
    });

    const events: PBLSSEEvent[] = [];
    for await (const event of runInstructorTurn({
      project,
      userMessage: '能赚钱',
      phase: 'instructing',
      languageModel: timeoutModel() as never,
    })) {
      events.push(event);
    }

    expect(events.some((event) => event.type === 'error')).toBe(false);
    const messagePatch = events.find(
      (event): event is Extract<PBLSSEEvent, { type: 'project_patch' }> =>
        event.type === 'project_patch' && event.patch.kind === 'message',
    );
    if (!messagePatch || messagePatch.patch.kind !== 'message') {
      throw new Error('Expected local fallback message');
    }
    expect(messagePatch.patch.message.content).toContain('赚钱是结果');
    expect(messagePatch.patch.message.content).not.toContain('不看教材的话');
    expect(project.jiuxuange!.orientation?.phase).toBe('baseline');
  });

  it('uses the last learner message when recovering an interrupted orientation turn', async () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_GUIDED_PACKAGE, {
      now: '2026-07-11T00:00:00.000Z',
    });
    project.uiPhase = 'workspace';
    project.jiuxuange!.orientation = {
      phase: 'baseline',
      problemDefined: true,
      baselineCaptured: false,
      goalConfirmed: false,
      assessmentUnderstood: false,
      evidenceMessageIds: ['problem'],
      attachedDraftIds: ['draft-1'],
    };
    const activeTask = project.milestones[0].microtasks[0];
    project.threads[0].messages.push(
      {
        id: 'baseline-question',
        agentId: 'jiuxuange-professor',
        roleType: 'instructor',
        content: '不看教材的话，你现在会怎样判断一家企业的商业模式是否成立？',
        ts: '2026-07-11T00:00:01.000Z',
        microtaskId: activeTask.id,
      },
      {
        id: 'repeat-complaint',
        roleType: 'user',
        content: '你问过这个问题了',
        ts: '2026-07-11T00:00:02.000Z',
        microtaskId: activeTask.id,
      },
    );

    const events: PBLSSEEvent[] = [];
    for await (const event of runInstructorTurn({
      project,
      userMessage: '',
      phase: 'greeting',
      languageModel: timeoutModel() as never,
    })) {
      events.push(event);
    }

    const visible = events
      .filter((event): event is Extract<PBLSSEEvent, { type: 'token' }> => event.type === 'token')
      .map((event) => event.delta)
      .join('');
    expect(events.some((event) => event.type === 'error')).toBe(false);
    expect(visible).toContain('你说得对');
    expect(visible).toContain('换个问法');
    expect(visible).not.toContain('不看教材的话');
  });
});
