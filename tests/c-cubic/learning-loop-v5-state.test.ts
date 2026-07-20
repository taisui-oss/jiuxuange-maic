import { describe, expect, it } from 'vitest';

import { BUSINESS_MODEL_LEARNING_LOOP_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v5';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';
import type { JiuxuangeEvidenceDecision } from '@/lib/c-cubic/evidence';
import {
  buildJiuxuangeLearningLoopFeedback,
  recordJiuxuangeLearningLoopTurn,
} from '@/lib/c-cubic/learning-loop';
import type { JiuxuangeLearningNodeId } from '@/lib/c-cubic/course-package/types';
import type { PBLProjectV2 } from '@/lib/pbl/v2/types';

function project(): PBLProjectV2 {
  return createJiuxuangeProject(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE, {
    now: '2026-07-20T14:00:00.000Z',
    learnerId: 'learner-v5-state',
    sessionVariantId: 'business-model-learning-loop',
  });
}

function activateNode(value: PBLProjectV2, nodeId: JiuxuangeLearningNodeId): void {
  for (const milestone of value.milestones) {
    const target = milestone.microtasks.find((task) => task.jiuxuange?.learningNodeId === nodeId);
    milestone.status = target ? 'active' : 'locked';
    for (const task of milestone.microtasks) {
      task.status = task === target ? 'in_progress' : 'todo';
    }
  }
}

function decision(
  status: 'autonomous' | 'hinted' | 'leaked-answer' | 'unsupported',
  factIds: string[] = [],
): JiuxuangeEvidenceDecision {
  return {
    satisfied: status === 'autonomous' || status === 'hinted',
    missingSignals: status === 'autonomous' || status === 'hinted' ? [] : ['own_words'],
    results: [
      {
        signal: 'own_words',
        status,
        sourceMessageIds: ['source-message'],
        factIds,
        hintLevel: status === 'autonomous' ? 0 : 1,
        reason: 'fixture decision',
        modelVersion: 'fixture-model',
        packageVersion: '5.0.0-learning-loop-pilot',
      },
    ],
    sourceMessageIds: ['source-message'],
    factIds,
    evidenceRefs: factIds,
    modelVersion: 'fixture-model',
    packageVersion: '5.0.0-learning-loop-pilot',
  };
}

describe('Jiuxuange V5 learning-loop state', () => {
  it('records an unknown baseline once without treating it as mastery', () => {
    const value = project();
    const first = recordJiuxuangeLearningLoopTurn(value, decision('unsupported'), {
      sourceMessageId: 'msg-baseline',
      message: '不知道',
      now: '2026-07-20T14:01:00.000Z',
    });
    const repeated = recordJiuxuangeLearningLoopTurn(value, decision('unsupported'), {
      sourceMessageId: 'msg-baseline',
      message: '不知道',
      now: '2026-07-20T14:01:01.000Z',
    });

    expect(first.claim?.claimType).toBe('baseline');
    expect(first.claim?.supportStatus).toBe('unsupported');
    expect(value.jiuxuange?.learningLoop?.claims).toHaveLength(1);
    expect(repeated.events).toEqual([]);
  });

  it('freezes the convenience-bee commit and unlocks analysis only after it exists', () => {
    const value = project();
    activateNode(value, 'bee_unlock_compare');

    const premature = recordJiuxuangeLearningLoopTurn(value, decision('autonomous'), {
      sourceMessageId: 'msg-compare-early',
      message: '课程解释补充了我的判断。',
      now: '2026-07-20T14:02:00.000Z',
    });
    expect(premature.disclosures).toEqual([]);

    activateNode(value, 'bee_independent_commit');
    const commit = recordJiuxuangeLearningLoopTurn(
      value,
      decision('autonomous', ['bee-loop-f3']),
      {
        sourceMessageId: 'msg-bee-commit',
        message: 'bee-loop-f3说明订货决策从店长转给中央系统，因此可能减少经验差异。',
        now: '2026-07-20T14:03:00.000Z',
      },
    );
    activateNode(value, 'bee_unlock_compare');
    const compare = recordJiuxuangeLearningLoopTurn(value, decision('hinted'), {
      sourceMessageId: 'msg-bee-compare',
      message: '我补充了信息流与执行分工的关系。',
      now: '2026-07-20T14:04:00.000Z',
    });

    expect(commit.claim?.immutable).toBe(true);
    expect(compare.disclosures[0]).toMatchObject({
      caseId: 'convenience-bee-loop',
      phase: 'analysis',
      unlockedByClaimId: commit.claim?.id,
    });
    expect(value.jiuxuange?.learningLoop?.claims.find((item) => item.id === commit.claim?.id)?.text)
      .toBe(commit.claim?.text);
  });

  it('classifies an assisted transfer as B rather than autonomous learning', () => {
    const value = project();
    activateNode(value, 'baseline_capture');
    recordJiuxuangeLearningLoopTurn(value, decision('unsupported'), {
      sourceMessageId: 'msg-b',
      message: '我原来主要看产品销量。',
      now: '2026-07-20T14:01:00.000Z',
    });
    activateNode(value, 'bee_independent_commit');
    recordJiuxuangeLearningLoopTurn(value, decision('hinted', ['bee-loop-f3']), {
      sourceMessageId: 'msg-c',
      message: '在提示下，我看到中央订货会改变门店分工。',
      now: '2026-07-20T14:02:00.000Z',
    });
    activateNode(value, 'fresh_transfer');
    recordJiuxuangeLearningLoopTurn(
      value,
      decision('unsupported', ['fresh-transfer-f1', 'fresh-transfer-f6']),
      {
        sourceMessageId: 'msg-t',
        message: '不知道',
        now: '2026-07-20T14:03:00.000Z',
        assisted: true,
      },
    );
    activateNode(value, 'judgment_revision');
    recordJiuxuangeLearningLoopTurn(value, decision('hinted', ['fresh-transfer-f6']), {
      sourceMessageId: 'msg-r',
      message: '我原来只看销量，现在会看履约关系，因为费用率事实不同。',
      now: '2026-07-20T14:04:00.000Z',
    });

    const feedback = buildJiuxuangeLearningLoopFeedback(value, '2026-07-20T14:05:00.000Z');
    expect(feedback.outcome).toBe('B');
    expect(feedback.statements.some((item) => item.text.includes('支架'))).toBe(true);
    expect(feedback.statements.every((item) => item.evidenceRefs.length > 0)).toBe(true);
    expect(JSON.stringify(feedback)).not.toMatch(/(?:分数|得分|score)/iu);
  });

  it('classifies autonomous transfer plus evidenced revision as A', () => {
    const value = project();
    activateNode(value, 'baseline_capture');
    recordJiuxuangeLearningLoopTurn(value, decision('autonomous'), {
      sourceMessageId: 'msg-a-baseline',
      message: '销量不等于商业模式成立，还要看参与者关系。',
      now: '2026-07-20T14:01:00.000Z',
    });
    activateNode(value, 'bee_independent_commit');
    recordJiuxuangeLearningLoopTurn(value, decision('autonomous', ['bee-loop-f3']), {
      sourceMessageId: 'msg-a-commit',
      message: 'bee-loop-f3说明订货权转到中央系统，因此执行差异可能缩小。',
      now: '2026-07-20T14:02:00.000Z',
    });
    activateNode(value, 'fresh_transfer');
    recordJiuxuangeLearningLoopTurn(
      value,
      decision('autonomous', ['fresh-transfer-f1', 'fresh-transfer-f6']),
      {
        sourceMessageId: 'msg-a-transfer',
        message: 'fresh-transfer-f1和fresh-transfer-f6说明自提关系减少末端配送，因此履约费用率更低。',
        now: '2026-07-20T14:03:00.000Z',
      },
    );
    activateNode(value, 'judgment_revision');
    recordJiuxuangeLearningLoopTurn(
      value,
      decision('autonomous', ['fresh-transfer-f6']),
      {
        sourceMessageId: 'msg-a-revision',
        message: '我原来主要看销量，现在会同时看决策权与履约关系，因为fresh-transfer-f6显示费用结构不同。',
        now: '2026-07-20T14:04:00.000Z',
      },
    );

    const feedback = buildJiuxuangeLearningLoopFeedback(value, '2026-07-20T14:05:00.000Z');
    expect(feedback.outcome).toBe('A');
    expect(feedback.statements.flatMap((item) => item.evidenceRefs)).toContain('msg-a-transfer');
    expect(feedback.statements.flatMap((item) => item.evidenceRefs)).toContain(
      'fresh-transfer-f6',
    );
  });
});
