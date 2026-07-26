import type { JiuxuangeLearningNodeId } from './course-package/types';
import { getCoursePackage } from './course-package/registry';
import type { JiuxuangeEvidenceDecision } from './evidence';
import type {
  JiuxuangeDisclosureRecord,
  JiuxuangeJudgmentRevision,
  JiuxuangeLearnerClaim,
  JiuxuangeLearnerClaimType,
  JiuxuangeLearningFeedback,
  JiuxuangeLearningLoopState,
  JiuxuangeLearningSupportStatus,
} from './learning-loop-types';
import type { PBLProjectV2, PBLRuntimeEvent } from '@/lib/pbl/v2/types';

export function createJiuxuangeLearningLoopState(): JiuxuangeLearningLoopState {
  return {
    version: 'learning-loop-state.v1',
    claims: [],
    disclosures: [],
    revisions: [],
  };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function currentNode(project: PBLProjectV2): {
  nodeId: JiuxuangeLearningNodeId;
  microtaskId: string;
  milestoneId: string;
  hintLevel: 0 | 1 | 2 | 3;
  questionTemplateId: string;
  caseId?: string;
} | null {
  const milestone = project.milestones.find((item) => item.status === 'active');
  const microtask = milestone?.microtasks.find((item) => item.status === 'in_progress');
  const nodeId = microtask?.jiuxuange?.learningNodeId;
  if (!milestone || !microtask?.jiuxuange || !nodeId) return null;
  return {
    nodeId,
    microtaskId: microtask.id,
    milestoneId: milestone.id,
    hintLevel: microtask.jiuxuange.hintLevel ?? 0,
    questionTemplateId: microtask.jiuxuange.questionTemplateId,
    caseId: microtask.jiuxuange.caseId,
  };
}

const UNKNOWN_RESPONSE = /^(?:不知道|不清楚|不会|没想法|不确定|无法判断|说不上来)[。.!！?？\s]*$/u;

function supportStatus(
  decision: JiuxuangeEvidenceDecision,
  message: string,
  hintLevel: 0 | 1 | 2 | 3,
  assisted: boolean,
): JiuxuangeLearningSupportStatus {
  if (assisted) return 'assisted';
  if (decision.results.some((result) => result.status === 'leaked-answer')) {
    return 'leaked-answer';
  }
  if (UNKNOWN_RESPONSE.test(message.trim())) return hintLevel > 0 ? 'assisted' : 'unsupported';
  if (decision.satisfied) {
    return decision.results.some((result) => result.status === 'hinted') ? 'hinted' : 'autonomous';
  }
  return hintLevel > 0 ? 'assisted' : 'unsupported';
}

function claimTypeForNode(nodeId: JiuxuangeLearningNodeId): JiuxuangeLearnerClaimType | null {
  switch (nodeId) {
    case 'baseline_capture':
      return 'baseline';
    case 'bee_fact_observation':
      return 'fact_observation';
    case 'bee_independent_commit':
      return 'case_commit';
    case 'bee_unlock_compare':
      return 'comparison';
    case 'fresh_transfer':
      return 'transfer';
    default:
      return null;
  }
}

function allDecisionFactIds(decision: JiuxuangeEvidenceDecision): string[] {
  return unique(decision.results.flatMap((result) => result.factIds));
}

function appendRuntimeEvent(project: PBLProjectV2, event: PBLRuntimeEvent): boolean {
  project.runtimeEvents ??= [];
  if (project.runtimeEvents.some((candidate) => candidate.id === event.id)) return false;
  project.runtimeEvents.push(event);
  return true;
}

function ensureFactsDisclosure(
  project: PBLProjectV2,
  state: JiuxuangeLearningLoopState,
  node: NonNullable<ReturnType<typeof currentNode>>,
  sourceMessageId: string,
  now: string,
): JiuxuangeDisclosureRecord | null {
  if (node.nodeId !== 'bee_fact_observation' && node.nodeId !== 'fresh_transfer') return null;
  if (!node.caseId || !project.jiuxuange) return null;
  const id = `disclosure_${node.nodeId}_facts`;
  const existing = state.disclosures.find((item) => item.id === id);
  if (existing) return null;
  const pkg = getCoursePackage(project.jiuxuange.courseId, project.jiuxuange.courseVersion);
  const selectedCase = pkg.cases[node.caseId];
  if (!selectedCase) return null;
  const disclosure: JiuxuangeDisclosureRecord = {
    id,
    nodeId: node.nodeId,
    caseId: node.caseId,
    phase: 'facts',
    factIds: selectedCase.facts
      .filter((fact) => fact.visibility === 'learner' && fact.verificationStatus === 'verified')
      .map((fact) => fact.id),
    sectionIds: [],
    sourceMessageId,
    createdAt: now,
  };
  state.disclosures.push(disclosure);
  return disclosure;
}

function ensureAnalysisDisclosure(
  project: PBLProjectV2,
  state: JiuxuangeLearningLoopState,
  node: NonNullable<ReturnType<typeof currentNode>>,
  sourceMessageId: string,
  now: string,
): JiuxuangeDisclosureRecord | null {
  if (node.nodeId !== 'bee_unlock_compare' || !node.caseId || !project.jiuxuange) return null;
  const commit = state.claims.find((item) => item.claimType === 'case_commit');
  if (!commit) return null;
  const id = `disclosure_${node.nodeId}_analysis`;
  if (state.disclosures.some((item) => item.id === id)) return null;
  const pkg = getCoursePackage(project.jiuxuange.courseId, project.jiuxuange.courseVersion);
  const question = pkg.questionTemplates[node.questionTemplateId];
  const disclosure: JiuxuangeDisclosureRecord = {
    id,
    nodeId: node.nodeId,
    caseId: node.caseId,
    phase: 'analysis',
    factIds: [],
    sectionIds: [...(question.learningFragmentIds ?? [])],
    sourceMessageId,
    unlockedByClaimId: commit.id,
    createdAt: now,
  };
  state.disclosures.push(disclosure);
  return disclosure;
}

function revisionReason(message: string): string {
  const match = message.match(/(?:因为|依据(?:是|为)?|理由(?:是|为)?)[：:]?\s*(.+)$/u);
  return match?.[1]?.trim() || message.trim();
}

export interface RecordJiuxuangeLearningLoopTurnOptions {
  sourceMessageId: string;
  message: string;
  now: string;
  assisted?: boolean;
}

export interface RecordJiuxuangeLearningLoopTurnResult {
  claim?: JiuxuangeLearnerClaim;
  revision?: JiuxuangeJudgmentRevision;
  disclosures: JiuxuangeDisclosureRecord[];
  events: PBLRuntimeEvent[];
}

export function recordJiuxuangeLearningLoopTurn(
  project: PBLProjectV2,
  decision: JiuxuangeEvidenceDecision,
  options: RecordJiuxuangeLearningLoopTurnOptions,
): RecordJiuxuangeLearningLoopTurnResult {
  const state = project.jiuxuange?.learningLoop;
  const node = currentNode(project);
  if (!state || !node || !options.message.trim()) return { disclosures: [], events: [] };
  if (
    state.claims.some((item) => item.sourceMessageId === options.sourceMessageId) ||
    state.revisions.some((item) => item.sourceMessageId === options.sourceMessageId)
  ) {
    return { disclosures: [], events: [] };
  }

  const events: PBLRuntimeEvent[] = [];
  const disclosures = [
    ensureFactsDisclosure(project, state, node, options.sourceMessageId, options.now),
    ensureAnalysisDisclosure(project, state, node, options.sourceMessageId, options.now),
  ].filter((item): item is JiuxuangeDisclosureRecord => Boolean(item));
  for (const disclosure of disclosures) {
    const event: PBLRuntimeEvent = {
      id: `runtime_${disclosure.id}`,
      kind: 'jiuxuange_disclosure_recorded',
      actorType: 'system',
      ts: options.now,
      microtaskId: node.microtaskId,
      milestoneId: node.milestoneId,
      disclosure: structuredClone(disclosure),
    };
    if (appendRuntimeEvent(project, event)) events.push(event);
  }

  const status = supportStatus(
    decision,
    options.message,
    node.hintLevel,
    options.assisted === true,
  );
  const factIds = allDecisionFactIds(decision);
  const claimType = claimTypeForNode(node.nodeId);
  let claim: JiuxuangeLearnerClaim | undefined;
  if (claimType) {
    claim = {
      id: `claim_${node.nodeId}_${options.sourceMessageId}`,
      claimType,
      nodeId: node.nodeId,
      sourceMessageId: options.sourceMessageId,
      text: options.message.trim(),
      factIds,
      hintLevel: node.hintLevel,
      supportStatus: status,
      immutable: true,
      createdAt: options.now,
    };
    state.claims.push(claim);
    const event: PBLRuntimeEvent = {
      id: `runtime_${claim.id}`,
      kind: 'jiuxuange_claim_recorded',
      actorType: 'system',
      ts: options.now,
      microtaskId: node.microtaskId,
      milestoneId: node.milestoneId,
      claim: structuredClone(claim),
    };
    if (appendRuntimeEvent(project, event)) events.push(event);
  }

  let revision: JiuxuangeJudgmentRevision | undefined;
  if (node.nodeId === 'judgment_revision') {
    const before = state.claims.find((item) => item.claimType === 'baseline');
    if (before) {
      revision = {
        id: `revision_${options.sourceMessageId}`,
        nodeId: 'judgment_revision',
        sourceMessageId: options.sourceMessageId,
        beforeClaimId: before.id,
        afterText: options.message.trim(),
        reason: revisionReason(options.message),
        factIds,
        hintLevel: node.hintLevel,
        supportStatus: status,
        createdAt: options.now,
      };
      state.revisions.push(revision);
      const event: PBLRuntimeEvent = {
        id: `runtime_${revision.id}`,
        kind: 'jiuxuange_judgment_revision_recorded',
        actorType: 'system',
        ts: options.now,
        microtaskId: node.microtaskId,
        milestoneId: node.milestoneId,
        revision: structuredClone(revision),
      };
      if (appendRuntimeEvent(project, event)) events.push(event);
    }
  }

  return { claim, revision, disclosures, events };
}

function claimRefs(claim: JiuxuangeLearnerClaim): string[] {
  return unique([claim.sourceMessageId, ...claim.factIds]);
}

export function buildJiuxuangeLearningLoopFeedback(
  project: PBLProjectV2,
  now: string,
): JiuxuangeLearningFeedback {
  const state = project.jiuxuange?.learningLoop;
  if (!state) throw new Error('Learning-loop feedback requires V5 learning state');
  const baseline = state.claims.find((item) => item.claimType === 'baseline');
  const commit = state.claims.find((item) => item.claimType === 'case_commit');
  const transfer = state.claims.find((item) => item.claimType === 'transfer');
  const revision = state.revisions.at(-1);
  const complete = Boolean(baseline && commit && transfer && revision);
  const autonomousTransfer = transfer?.supportStatus === 'autonomous';
  const evidencedRevision = Boolean(
    revision &&
    revision.factIds.length > 0 &&
    (revision.supportStatus === 'autonomous' || revision.supportStatus === 'hinted'),
  );
  const outcome: JiuxuangeLearningFeedback['outcome'] = !complete
    ? 'C'
    : autonomousTransfer && evidencedRevision
      ? 'A'
      : 'B';
  const statements: JiuxuangeLearningFeedback['statements'] = [];
  if (baseline) {
    statements.push({
      id: 'feedback-baseline',
      text: `课程开始前，你留下的判断是：“${baseline.text}”。`,
      evidenceRefs: claimRefs(baseline),
    });
  }
  if (commit) {
    const unknownCommit = UNKNOWN_RESPONSE.test(commit.text.trim());
    const demonstratedCommit =
      !unknownCommit &&
      commit.factIds.length > 0 &&
      (commit.supportStatus === 'autonomous' || commit.supportStatus === 'hinted');
    const commitText = demonstratedCommit
      ? `在便利蜂案例中，你${commit.supportStatus === 'autonomous' ? '独立' : '在提示后'}形成了判断：“${commit.text}”。`
      : unknownCommit
        ? `在便利蜂案例中，你在支架帮助下进行了尝试，但本轮尚未形成可复述的判断。你的原回答是：“${commit.text}”。`
        : `在便利蜂案例中，你在支架帮助下尝试形成判断：“${commit.text}”。本轮尚未形成可验证的案例判断。`;
    statements.push({
      id: 'feedback-bee-commit',
      text: commitText,
      evidenceRefs: claimRefs(commit),
    });
  }
  if (transfer) {
    const unknownTransfer = UNKNOWN_RESPONSE.test(transfer.text.trim());
    const demonstratedTransfer =
      !unknownTransfer &&
      transfer.factIds.length > 0 &&
      (transfer.supportStatus === 'autonomous' || transfer.supportStatus === 'hinted');
    const transferText = demonstratedTransfer
      ? `你在新情境中${transfer.supportStatus === 'autonomous' ? '独立' : '在提示后'}完成了事实到关系结果的迁移。你的回答是：“${transfer.text}”。`
      : unknownTransfer
        ? `你在新情境中借助支架进行了尝试，但本轮尚未形成可复述的迁移判断。你的原回答是：“${transfer.text}”。`
        : `你在新情境中借助支架进行了迁移尝试，本轮尚未形成可验证的迁移判断。你的回答是：“${transfer.text}”。`;
    statements.push({
      id: 'feedback-transfer',
      text: transferText,
      evidenceRefs: claimRefs(transfer),
    });
  }
  if (revision) {
    const unknownRevision = UNKNOWN_RESPONSE.test(revision.afterText.trim());
    const revisionText =
      evidencedRevision && !unknownRevision
        ? `你对最初判断做出的修正是：“${revision.afterText}”。`
        : unknownRevision
          ? `你在支架帮助下尝试修正最初判断，但本轮尚未形成可验证的修正。你的原回答是：“${revision.afterText}”。`
          : `你尝试修正最初判断：“${revision.afterText}”。本轮尚未形成可验证的修正。`;
    statements.push({
      id: 'feedback-revision',
      text: revisionText,
      evidenceRefs: unique([revision.sourceMessageId, revision.beforeClaimId, ...revision.factIds]),
    });
  }
  if (statements.length === 0) {
    throw new Error('Learning-loop feedback requires at least one learner evidence reference');
  }
  return {
    id: `feedback_${project.jiuxuange?.courseVersion ?? 'unknown'}_${now}`,
    outcome,
    statements,
    suggestions: [
      autonomousTransfer
        ? '下一次观察真实项目时，继续同时核对决策权、履约关系和成本结果。'
        : '下一次先选两条项目事实，独立写出“关系变化可能导致什么结果”。',
    ],
    evidenceVersion: `${project.jiuxuange?.factPackHash ?? 'unknown'}:${state.claims.length}:${state.revisions.length}`,
    generatedAt: now,
  };
}

export function ensureJiuxuangeLearningLoopFeedback(
  project: PBLProjectV2,
  now: string,
): { feedback: JiuxuangeLearningFeedback; event?: PBLRuntimeEvent } {
  const state = project.jiuxuange?.learningLoop;
  if (!state) throw new Error('Learning-loop feedback requires V5 learning state');
  const feedback = buildJiuxuangeLearningLoopFeedback(project, now);
  if (state.feedback?.evidenceVersion === feedback.evidenceVersion) {
    return { feedback: state.feedback };
  }
  state.feedback = feedback;
  const event: PBLRuntimeEvent = {
    id: `runtime_feedback_${feedback.evidenceVersion.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    kind: 'jiuxuange_feedback_generated',
    actorType: 'system',
    ts: now,
    feedback: structuredClone(feedback),
  };
  if (!appendRuntimeEvent(project, event)) return { feedback };
  return { feedback, event };
}

export function formatJiuxuangeLearningLoopFeedback(feedback: JiuxuangeLearningFeedback): string {
  return [
    '这是你本轮的学习回顾：',
    ...feedback.statements.map((statement) => `- ${statement.text}`),
    '',
    `下一步建议：${feedback.suggestions.join('；')}`,
  ].join('\n');
}

export type JiuxuangeResolvedLearningEvidence =
  | {
      kind: 'source_message';
      ref: string;
      text: string;
      nodeId?: JiuxuangeLearningNodeId;
    }
  | {
      kind: 'claim';
      ref: string;
      text: string;
      sourceMessageId: string;
      nodeId: JiuxuangeLearningNodeId;
    }
  | {
      kind: 'case_fact';
      ref: string;
      text: string;
      sourceTitle: string;
      sourceLocator: string;
    };

export function resolveJiuxuangeLearningEvidenceRef(
  project: PBLProjectV2,
  ref: string,
): JiuxuangeResolvedLearningEvidence | null {
  const state = project.jiuxuange?.learningLoop;
  if (!state) return null;
  const liveMessage = project.threads
    .flatMap((thread) => thread.messages)
    .find((message) => message.id === ref);
  if (liveMessage) {
    return { kind: 'source_message', ref, text: liveMessage.content };
  }
  const sourceClaim = state.claims.find((claim) => claim.sourceMessageId === ref);
  if (sourceClaim) {
    return {
      kind: 'source_message',
      ref,
      text: sourceClaim.text,
      nodeId: sourceClaim.nodeId,
    };
  }
  const sourceRevision = state.revisions.find((revision) => revision.sourceMessageId === ref);
  if (sourceRevision) {
    return {
      kind: 'source_message',
      ref,
      text: sourceRevision.afterText,
      nodeId: sourceRevision.nodeId,
    };
  }
  const claim = state.claims.find((candidate) => candidate.id === ref);
  if (claim) {
    return {
      kind: 'claim',
      ref,
      text: claim.text,
      sourceMessageId: claim.sourceMessageId,
      nodeId: claim.nodeId,
    };
  }
  const metadata = project.jiuxuange;
  if (!metadata) return null;
  const fact = Object.values(getCoursePackage(metadata.courseId, metadata.courseVersion).cases)
    .flatMap((selectedCase) => selectedCase.facts)
    .find((candidate) => candidate.id === ref);
  if (!fact) return null;
  return {
    kind: 'case_fact',
    ref,
    text: fact.text,
    sourceTitle: fact.sourceRef.title,
    sourceLocator: fact.sourceRef.locator,
  };
}
