export type JiuxuangeEvidenceSignal =
  | 'own_words'
  | 'distinction'
  | 'fact_ref'
  | 'causal_link'
  | 'boundary'
  | 'counterevidence';

export type JiuxuangeEvidenceStatus = 'autonomous' | 'hinted' | 'leaked-answer' | 'unsupported';

export type JiuxuangeHintLevel = 0 | 1 | 2 | 3 | 'none' | 'nudge' | 'scaffold' | 'answer';

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
