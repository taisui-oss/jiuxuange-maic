export type JiuxuangeEvidenceSignal =
  | 'own_words'
  | 'distinction'
  | 'fact_ref'
  | 'causal_link'
  | 'boundary'
  | 'counterevidence'
  | 'judgment_revision';

export type JiuxuangeEvidenceStatus = 'autonomous' | 'hinted' | 'leaked-answer' | 'unsupported';

export type JiuxuangeHintLevel = 0 | 1 | 2 | 3 | 'none' | 'nudge' | 'scaffold' | 'answer';

import type { PBLProjectV2 } from '@/lib/pbl/v2/types';
import { getCoursePackage } from './course-package/registry';
import { setPendingTaskCompletion } from '@/lib/pbl/v2/operations/task-completion';

export interface JiuxuangeEvidenceFact {
  id: string;
  visibility: 'learner' | 'coach_only';
  verificationStatus: 'draft' | 'verified' | 'rejected';
}

export interface JiuxuangeEvidenceCandidate {
  signal: JiuxuangeEvidenceSignal;
  demonstrated: boolean;
  sourceMessageIds: string[];
  factIds: string[];
  hintLevel: JiuxuangeHintLevel;
  reason: string;
  answerLeaked?: boolean;
}

export interface JiuxuangeEvidenceResult {
  signal: JiuxuangeEvidenceSignal;
  status: JiuxuangeEvidenceStatus;
  sourceMessageIds: string[];
  factIds: string[];
  hintLevel: JiuxuangeHintLevel;
  reason: string;
  modelVersion: string;
  packageVersion: string;
}

export interface EvaluateJiuxuangeEvidenceInput {
  requiredSignals: JiuxuangeEvidenceSignal[];
  candidates: JiuxuangeEvidenceCandidate[];
  facts: JiuxuangeEvidenceFact[];
  sourceMessageIds: string[];
  modelVersion: string;
  packageVersion: string;
}

export interface JiuxuangeEvidenceDecision {
  satisfied: boolean;
  missingSignals: JiuxuangeEvidenceSignal[];
  results: JiuxuangeEvidenceResult[];
  sourceMessageIds: string[];
  factIds: string[];
  evidenceRefs: string[];
  modelVersion: string;
  packageVersion: string;
}

const FACT_REQUIRED_SIGNALS = new Set<JiuxuangeEvidenceSignal>(['fact_ref', 'causal_link']);

const STATUS_PRIORITY: Readonly<Record<JiuxuangeEvidenceStatus, number>> = {
  autonomous: 0,
  hinted: 1,
  'leaked-answer': 2,
  unsupported: 3,
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function resultFromCandidate(
  input: EvaluateJiuxuangeEvidenceInput,
  candidate: JiuxuangeEvidenceCandidate,
): JiuxuangeEvidenceResult {
  const base = {
    signal: candidate.signal,
    sourceMessageIds: unique(candidate.sourceMessageIds),
    factIds: unique(candidate.factIds),
    hintLevel: candidate.hintLevel,
    modelVersion: input.modelVersion,
    packageVersion: input.packageVersion,
  };

  if (!candidate.demonstrated) {
    return {
      ...base,
      status: 'unsupported',
      reason: `candidate did not demonstrate ${candidate.signal}`,
    };
  }
  if (base.sourceMessageIds.length === 0) {
    return { ...base, status: 'unsupported', reason: 'candidate requires a source message' };
  }

  const availableMessages = new Set(input.sourceMessageIds);
  const unavailableMessage = base.sourceMessageIds.find((id) => !availableMessages.has(id));
  if (unavailableMessage) {
    return {
      ...base,
      status: 'unsupported',
      reason: `source message ${unavailableMessage} is unavailable`,
    };
  }

  if (FACT_REQUIRED_SIGNALS.has(candidate.signal) && base.factIds.length === 0) {
    return {
      ...base,
      status: 'unsupported',
      reason: `${candidate.signal} requires a verified learner-visible fact`,
    };
  }

  const factsById = new Map(input.facts.map((fact) => [fact.id, fact]));
  for (const factId of base.factIds) {
    const fact = factsById.get(factId);
    if (!fact) {
      return { ...base, status: 'unsupported', reason: `fact ${factId} is unavailable` };
    }
    if (fact.visibility !== 'learner' || fact.verificationStatus !== 'verified') {
      return {
        ...base,
        status: 'unsupported',
        reason: `fact ${factId} is not a verified learner-visible fact`,
      };
    }
  }

  if (candidate.answerLeaked || candidate.hintLevel === 'answer' || candidate.hintLevel === 3) {
    return { ...base, status: 'leaked-answer', reason: candidate.reason };
  }
  if (candidate.hintLevel !== 'none' && candidate.hintLevel !== 0) {
    return { ...base, status: 'hinted', reason: candidate.reason };
  }
  return { ...base, status: 'autonomous', reason: candidate.reason };
}

function unsupportedMissingResult(
  input: EvaluateJiuxuangeEvidenceInput,
  signal: JiuxuangeEvidenceSignal,
): JiuxuangeEvidenceResult {
  return {
    signal,
    status: 'unsupported',
    sourceMessageIds: [],
    factIds: [],
    hintLevel: 'none',
    reason: `no evidence candidate for ${signal}`,
    modelVersion: input.modelVersion,
    packageVersion: input.packageVersion,
  };
}

export function evaluateJiuxuangeEvidenceCandidate(
  input: Omit<EvaluateJiuxuangeEvidenceInput, 'requiredSignals' | 'candidates'>,
  candidate: JiuxuangeEvidenceCandidate,
): JiuxuangeEvidenceResult {
  return resultFromCandidate(
    { ...input, requiredSignals: [candidate.signal], candidates: [candidate] },
    candidate,
  );
}

export function evaluateJiuxuangeEvidence(
  input: EvaluateJiuxuangeEvidenceInput,
): JiuxuangeEvidenceDecision {
  const requiredSignals = [...new Set(input.requiredSignals)];
  const results = requiredSignals.map((signal) => {
    const candidates = input.candidates
      .filter((candidate) => candidate.signal === signal)
      .map((candidate) => resultFromCandidate(input, candidate))
      .sort((left, right) => STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status]);
    return candidates[0] ?? unsupportedMissingResult(input, signal);
  });
  const accepted = results.filter(
    (result) => result.status === 'autonomous' || result.status === 'hinted',
  );
  const missingSignals = results
    .filter((result) => result.status === 'leaked-answer' || result.status === 'unsupported')
    .map((result) => result.signal);
  const sourceMessageIds = unique(accepted.flatMap((result) => result.sourceMessageIds));
  const factIds = unique(accepted.flatMap((result) => result.factIds));

  return {
    satisfied: missingSignals.length === 0,
    missingSignals,
    results,
    sourceMessageIds,
    factIds,
    evidenceRefs: factIds,
    modelVersion: input.modelVersion,
    packageVersion: input.packageVersion,
  };
}

export interface EvaluateJiuxuangeLearnerMessageInput {
  project: PBLProjectV2;
  messageId: string;
  message: string;
  hintLevel: JiuxuangeHintLevel;
  modelVersion: string;
}

function learnerSignalPresent(
  signal: JiuxuangeEvidenceSignal,
  message: string,
  factIds: string[],
): boolean {
  switch (signal) {
    case 'own_words':
      return message.replace(/\s/gu, '').length >= 24;
    case 'distinction':
      return /(?:不是|而不是|区别|不同于|并非)/u.test(message);
    case 'fact_ref':
      return factIds.length > 0;
    case 'causal_link':
      return factIds.length > 0 && /(?:因为|所以|因此|导致|说明|意味着|使得)/u.test(message);
    case 'boundary':
      return /(?:前提|边界|只有在|当.+时|除非)/u.test(message);
    case 'counterevidence':
      return /(?:推翻|反证|除非|如果.+(?:没有|并未|不再|相反))/u.test(message);
    case 'judgment_revision':
      return /(?:原先|之前|刚开始).*(?:现在|修正|改为|调整)|(?:修正|改为|调整).*(?:因为|依据|事实)/u.test(
        message,
      );
  }
}

function characterBigrams(text: string): Set<string> {
  const normalized = text.replace(/[^\p{L}\p{N}]/gu, '');
  const grams = new Set<string>();
  for (let index = 0; index < normalized.length - 1; index += 1) {
    grams.add(normalized.slice(index, index + 2));
  }
  return grams;
}

function messageReferencesFact(
  message: string,
  fact: JiuxuangeEvidenceFact & { text?: string },
  visibleOrdinal?: number,
): boolean {
  if (message.includes(fact.id) || message.includes(`[${fact.id}]`)) return true;
  if (
    visibleOrdinal !== undefined &&
    new RegExp(
      `(?:第\\s*${visibleOrdinal}\\s*条(?:事实)?|事实\\s*${visibleOrdinal}(?:\\s*号)?)`,
      'u',
    ).test(message)
  ) {
    return true;
  }
  if (!fact.text) return false;
  const messageGrams = characterBigrams(message);
  const factGrams = characterBigrams(fact.text);
  const requiredOverlap = Math.min(5, Math.max(3, Math.ceil(factGrams.size * 0.25)));
  let overlap = 0;
  for (const gram of factGrams) {
    if (messageGrams.has(gram)) overlap += 1;
    if (overlap >= requiredOverlap) return true;
  }
  return false;
}

export function evaluateJiuxuangeLearnerMessage(
  input: EvaluateJiuxuangeLearnerMessageInput,
): JiuxuangeEvidenceDecision {
  const metadata = input.project.jiuxuange;
  if (!metadata) throw new Error('Jiuxuange evidence evaluation requires course metadata');

  const milestone = input.project.milestones.find((item) => item.status === 'active');
  const microtask = milestone?.microtasks.find((item) => item.status === 'in_progress');
  if (!microtask?.jiuxuange)
    throw new Error('Jiuxuange evidence evaluation requires an active task');

  const coursePackage = getCoursePackage(metadata.courseId, metadata.courseVersion);
  const selectedCase = microtask.jiuxuange.caseId
    ? coursePackage.cases[microtask.jiuxuange.caseId]
    : coursePackage.cases[metadata.caseId];
  const sourceFacts =
    microtask.jiuxuange.factScope === 'project'
      ? (metadata.projectFacts ?? [])
      : microtask.jiuxuange.factScope === 'disclosed'
        ? Object.values(coursePackage.cases)
            .flatMap((item) => item.facts)
            .filter((fact) =>
              (metadata.learningLoop?.disclosures ?? []).some((disclosure) =>
                disclosure.factIds.includes(fact.id),
              ),
            )
      : microtask.jiuxuange.factScope === 'none'
        ? []
        : (selectedCase?.facts ?? []);
  const facts = sourceFacts.filter(
    (fact) => fact.visibility === 'learner' && fact.verificationStatus === 'verified',
  );
  const allowVisibleOrdinal = microtask.jiuxuange.factScope === 'case';
  const factIds = facts
    .filter((fact, index) =>
      messageReferencesFact(
        input.message,
        fact,
        allowVisibleOrdinal ? index + 1 : undefined,
      ),
    )
    .map((fact) => fact.id);
  const requiredSignals = microtask.jiuxuange.evidenceRuleIds.flatMap(
    (ruleId) => coursePackage.evidenceRules[ruleId]?.requiredSignals ?? [],
  );
  const candidates = [...new Set(requiredSignals)].map((signal) => ({
    signal,
    demonstrated: learnerSignalPresent(signal, input.message, factIds),
    sourceMessageIds: [input.messageId],
    factIds:
      signal === 'fact_ref' || signal === 'causal_link' || signal === 'judgment_revision'
        ? factIds
        : [],
    hintLevel: input.hintLevel,
    reason: `${signal} was evaluated from learner message ${input.messageId}`,
  }));

  return evaluateJiuxuangeEvidence({
    requiredSignals,
    candidates,
    facts,
    sourceMessageIds: [input.messageId],
    modelVersion: input.modelVersion,
    packageVersion: metadata.courseVersion,
  });
}

export function applyJiuxuangeEvidenceGate(
  project: PBLProjectV2,
  decision: JiuxuangeEvidenceDecision,
  options: { sourceMessageId: string; message: string; now: string },
): boolean {
  if (!decision.satisfied) return false;
  const milestone = project.milestones.find((item) => item.status === 'active');
  const microtask = milestone?.microtasks.find((item) => item.status === 'in_progress');
  if (!milestone || !microtask?.jiuxuange) return false;

  const signature = `${project.jiuxuange?.courseVersion ?? 'unknown'}:${microtask.id}:${decision.results
    .map((result) => `${result.signal}:${result.status}`)
    .join('|')}`;
  setPendingTaskCompletion(project, {
    microtaskId: microtask.id,
    milestoneId: milestone.id,
    reason: 'jiuxuange_evidence_gate_satisfied',
    assessment: {
      resolution: `Evidence gate satisfied by ${options.sourceMessageId}`,
      performance: decision.results.map((result) => `${result.signal}:${result.status}`).join(', '),
    },
    evidence: {
      path: 'concept_unlocked',
      signature,
      label: microtask.title,
      note: decision.results.map((result) => result.reason).join('; '),
    },
  });

  if (microtask.jiuxuange.phase === 'reflect') {
    project.runtimeEvents ??= [];
    project.runtimeEvents.push({
      id: `runtime_reflection_${Date.parse(options.now).toString(16)}_${microtask.id}`,
      kind: 'jiuxuange_level_reflected',
      actorType: 'system',
      ts: options.now,
      microtaskId: microtask.id,
      milestoneId: milestone.id,
      sourceMessageId: options.sourceMessageId,
      revisedClaim: options.message,
      reason: decision.results.map((result) => result.reason).join('; '),
      factIds: decision.factIds,
      hintLevel: microtask.jiuxuange.hintLevel ?? 0,
    });
  }
  return true;
}

export function applyJiuxuangeLearningFirstPreludeProgress(
  project: PBLProjectV2,
  decision: JiuxuangeEvidenceDecision,
  options: { sourceMessageId: string; message: string; now: string },
): boolean {
  if (
    decision.satisfied ||
    project.jiuxuange?.entryMode !== 'learning-first' ||
    !options.message.trim()
  ) {
    return false;
  }
  const milestone = project.milestones.find((item) => item.status === 'active');
  const microtask = milestone?.microtasks.find((item) => item.status === 'in_progress');
  if (!milestone || !microtask?.jiuxuange || milestone.id !== 'jgx-milestone-course-foundations') {
    return false;
  }

  setPendingTaskCompletion(project, {
    microtaskId: microtask.id,
    milestoneId: milestone.id,
    reason: 'jiuxuange_assisted_learning',
    assessment: {
      resolution: `Assisted learning recorded from ${options.sourceMessageId}`,
      performance: 'The learner received the authored teaching fragment before continuing.',
    },
    evidence: {
      path: 'concept_unlocked',
      signature: `${project.jiuxuange.courseVersion}:${microtask.id}:assisted`,
      label: microtask.title,
      note: 'Assisted progress is retained separately and is not autonomous evidence.',
    },
  });

  project.runtimeEvents ??= [];
  const exists = project.runtimeEvents.some(
    (event) =>
      event.kind === 'jiuxuange_assisted_progress' &&
      event.sourceMessageId === options.sourceMessageId,
  );
  if (!exists) {
    project.runtimeEvents.push({
      id: `runtime_assisted_${Date.parse(options.now).toString(16)}_${microtask.id}`,
      kind: 'jiuxuange_assisted_progress',
      actorType: 'system',
      ts: options.now,
      microtaskId: microtask.id,
      milestoneId: milestone.id,
      sourceMessageId: options.sourceMessageId,
      reason: 'The prelude teaches before checking; an unsupported answer must not block learning.',
      packageVersion: project.jiuxuange.courseVersion,
    });
  }
  return true;
}

export function applyJiuxuangeLearningLoopProgress(
  project: PBLProjectV2,
  decision: JiuxuangeEvidenceDecision,
  options: { sourceMessageId: string; message: string; now: string },
): boolean {
  if (
    project.jiuxuange?.entryMode !== 'learning-loop' ||
    decision.satisfied ||
    !options.message.trim()
  ) {
    return false;
  }
  const milestone = project.milestones.find((item) => item.status === 'active');
  const microtask = milestone?.microtasks.find((item) => item.status === 'in_progress');
  if (!milestone || !microtask?.jiuxuange?.learningNodeId) return false;

  setPendingTaskCompletion(project, {
    microtaskId: microtask.id,
    milestoneId: milestone.id,
    reason: 'jiuxuange_assisted_learning_loop',
    assessment: {
      resolution: `Assisted learning recorded from ${options.sourceMessageId}`,
      performance: 'The learner completed the learning action with support; no autonomous mastery is claimed.',
    },
    evidence: {
      path: 'concept_unlocked',
      signature: `${project.jiuxuange.courseVersion}:${microtask.id}:assisted`,
      label: microtask.title,
      note: 'Progress permission is separate from mastery evidence.',
    },
  });

  project.runtimeEvents ??= [];
  const exists = project.runtimeEvents.some(
    (event) =>
      event.kind === 'jiuxuange_assisted_progress' &&
      event.sourceMessageId === options.sourceMessageId,
  );
  if (!exists) {
    project.runtimeEvents.push({
      id: `runtime_loop_assisted_${options.sourceMessageId}`,
      kind: 'jiuxuange_assisted_progress',
      actorType: 'system',
      ts: options.now,
      microtaskId: microtask.id,
      milestoneId: milestone.id,
      sourceMessageId: options.sourceMessageId,
      reason: 'The learner may continue after a non-empty attempt, but the result is not autonomous evidence.',
      packageVersion: project.jiuxuange.courseVersion,
    });
  }
  return true;
}
