export type JiuxuangeEvidenceSignal =
  | 'own_words'
  | 'distinction'
  | 'fact_ref'
  | 'causal_link'
  | 'boundary'
  | 'counterevidence';

export type JiuxuangeEvidenceStatus = 'autonomous' | 'hinted' | 'leaked-answer' | 'unsupported';

export type JiuxuangeHintLevel = 0 | 1 | 2 | 3 | 'none' | 'nudge' | 'scaffold' | 'answer';

import type { PBLProjectV2 } from '@/lib/pbl/v2/types';
import { getCoursePackage } from './course-package/registry';

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
): boolean {
  if (message.includes(fact.id) || message.includes(`[${fact.id}]`)) return true;
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
  const selectedCase = coursePackage.cases[microtask.jiuxuange.caseId ?? metadata.caseId];
  if (!selectedCase) throw new Error(`Unknown Jiuxuange case: ${metadata.caseId}`);

  const facts = selectedCase.facts.filter(
    (fact) => fact.visibility === 'learner' && fact.verificationStatus === 'verified',
  );
  const factIds = facts
    .filter((fact) => messageReferencesFact(input.message, fact))
    .map((fact) => fact.id);
  const requiredSignals = microtask.jiuxuange.evidenceRuleIds.flatMap(
    (ruleId) => coursePackage.evidenceRules[ruleId]?.requiredSignals ?? [],
  );
  const candidates = [...new Set(requiredSignals)].map((signal) => ({
    signal,
    demonstrated: learnerSignalPresent(signal, input.message, factIds),
    sourceMessageIds: [input.messageId],
    factIds: signal === 'fact_ref' || signal === 'causal_link' ? factIds : [],
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
