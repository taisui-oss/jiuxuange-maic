import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

interface ReplayMessage {
  seq: number;
  actor: 'agent' | 'learner';
  role?: 'professor' | 'senior' | 'mystery' | 'growth-feedback';
  text: string;
}

interface LearningDepthReplay {
  id: string;
  version: number;
  source: string;
  classroomId: string;
  coursePackageVersion: string;
  promptSourceVersion: string;
  codeRevision: string;
  modelVersion: string;
  captureBoundary: string;
  messages: ReplayMessage[];
  observedFailures: string[];
  expectedBehavior: { must: string[]; mustNot: string[] };
}

function loadReplay(): LearningDepthReplay {
  const path = resolve(
    __dirname,
    '..',
    '..',
    '..',
    'eval',
    'jiuxuange-learning-partner',
    'scenarios',
    'learning-depth-replay.v1.json',
  );
  return JSON.parse(readFileSync(path, 'utf-8')) as LearningDepthReplay;
}

describe('Jiuxuange observed learning-depth replay', () => {
  const replay = loadReplay();

  it('freezes the complete visible 26-message transcript', () => {
    expect(replay.id).toBe('v5-real-replay-shallow-completion-001');
    expect(replay.source).toBe('local_observed_replay');
    expect(replay.captureBoundary).toContain('without_internal_event_ids_or_timestamps');
    expect(replay.messages).toHaveLength(26);
    expect(replay.messages.map((message) => message.seq)).toEqual(
      Array.from({ length: 26 }, (_, index) => index + 1),
    );
    expect(replay.messages.filter((message) => message.actor === 'agent')).toHaveLength(18);
    expect(replay.messages.filter((message) => message.actor === 'learner')).toHaveLength(8);
  });

  it('freezes the visible role distribution', () => {
    const roleCounts = replay.messages
      .filter((message): message is ReplayMessage & { role: NonNullable<ReplayMessage['role']> } =>
        Boolean(message.role),
      )
      .reduce<Record<string, number>>((counts, message) => {
        counts[message.role] = (counts[message.role] ?? 0) + 1;
        return counts;
      }, {});

    expect(roleCounts).toEqual({
      professor: 7,
      mystery: 3,
      senior: 4,
      'growth-feedback': 4,
    });
  });

  it('keeps the observed semantic failures as future regression requirements', () => {
    expect(replay.observedFailures).toEqual(
      expect.arrayContaining([
        'node_role_contract_drift',
        'unknown_described_as_formed_judgment',
        'one_word_answer_described_as_completed_transfer',
        'unknown_described_as_judgment_revision',
      ]),
    );
    expect(replay.expectedBehavior.must).toEqual(
      expect.arrayContaining([
        '反馈区分尝试、已讲授和已表现',
        '不知道不得描述为形成判断',
        '无事实短词不得描述为完成迁移',
        '不知道不得描述为完成判断修正',
      ]),
    );
  });

  it('records the exact misleading feedback without treating it as the expected result', () => {
    const feedback = replay.messages.find((message) => message.seq === 24)?.text ?? '';
    expect(feedback).toContain('支架支持下形成了判断：“不知道”');
    expect(feedback).toContain('借助支架完成了迁移');
    expect(feedback).toContain('做出的修正是：“不知道”');
    expect(replay.expectedBehavior.mustNot).toContain('用流程完成替代学习动作完成');
  });
});
