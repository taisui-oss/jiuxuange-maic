import { describe, expect, it } from 'vitest';
import {
  evaluateJiuxuangeEvidence,
  type JiuxuangeEvidenceCandidate,
  type JiuxuangeEvidenceFact,
  type JiuxuangeEvidenceSignal,
} from '@/lib/c-cubic/evidence';

const MODEL_VERSION = 'evidence-model-2026-07-11';
const PACKAGE_VERSION = '1.0.0-pilot-b';
const ALL_SIGNALS: JiuxuangeEvidenceSignal[] = [
  'own_words',
  'distinction',
  'fact_ref',
  'causal_link',
  'boundary',
  'counterevidence',
];

const FACTS: JiuxuangeEvidenceFact[] = [
  {
    id: 'demo-f1',
    visibility: 'learner',
    verificationStatus: 'verified',
  },
  {
    id: 'coach-f1',
    visibility: 'coach_only',
    verificationStatus: 'verified',
  },
  {
    id: 'draft-f1',
    visibility: 'learner',
    verificationStatus: 'draft',
  },
];

function candidate(
  signal: JiuxuangeEvidenceSignal,
  overrides: Partial<JiuxuangeEvidenceCandidate> = {},
): JiuxuangeEvidenceCandidate {
  return {
    signal,
    demonstrated: true,
    sourceMessageIds: ['learner-message-1'],
    factIds: signal === 'fact_ref' || signal === 'causal_link' ? ['demo-f1'] : [],
    hintLevel: 'none',
    reason: `${signal} is present in the learner message`,
    ...overrides,
  };
}

describe('Jiuxuange deterministic evidence evaluation', () => {
  it('evaluates all six signals as autonomous with complete provenance', () => {
    const decision = evaluateJiuxuangeEvidence({
      requiredSignals: ALL_SIGNALS,
      candidates: ALL_SIGNALS.map((signal) => candidate(signal)),
      facts: FACTS,
      sourceMessageIds: ['learner-message-1'],
      modelVersion: MODEL_VERSION,
      packageVersion: PACKAGE_VERSION,
    });

    expect(decision.satisfied).toBe(true);
    expect(decision.missingSignals).toEqual([]);
    expect(decision.results.map((result) => result.signal)).toEqual(ALL_SIGNALS);
    expect(decision.results.every((result) => result.status === 'autonomous')).toBe(true);
    expect(decision.results[2]).toEqual({
      signal: 'fact_ref',
      status: 'autonomous',
      sourceMessageIds: ['learner-message-1'],
      factIds: ['demo-f1'],
      hintLevel: 'none',
      reason: 'fact_ref is present in the learner message',
      modelVersion: MODEL_VERSION,
      packageVersion: PACKAGE_VERSION,
    });
  });

  it('distinguishes hinted evidence without losing provenance', () => {
    const decision = evaluateJiuxuangeEvidence({
      requiredSignals: ['distinction'],
      candidates: [candidate('distinction', { hintLevel: 'scaffold' })],
      facts: FACTS,
      sourceMessageIds: ['learner-message-1'],
      modelVersion: MODEL_VERSION,
      packageVersion: PACKAGE_VERSION,
    });

    expect(decision.satisfied).toBe(true);
    expect(decision.results[0]).toEqual(
      expect.objectContaining({
        status: 'hinted',
        hintLevel: 'scaffold',
        sourceMessageIds: ['learner-message-1'],
      }),
    );
  });

  it('marks an answer-level hint as leaked-answer and refuses transition', () => {
    const decision = evaluateJiuxuangeEvidence({
      requiredSignals: ['counterevidence'],
      candidates: [candidate('counterevidence', { hintLevel: 'answer' })],
      facts: FACTS,
      sourceMessageIds: ['learner-message-1'],
      modelVersion: MODEL_VERSION,
      packageVersion: PACKAGE_VERSION,
    });

    expect(decision.satisfied).toBe(false);
    expect(decision.missingSignals).toEqual(['counterevidence']);
    expect(decision.results[0].status).toBe('leaked-answer');
  });

  it.each([
    {
      label: 'an unregistered source message',
      overrides: { sourceMessageIds: ['missing-message'] },
      reason: 'source message missing-message is unavailable',
    },
    {
      label: 'a non-demonstrated candidate',
      overrides: { demonstrated: false },
      reason: 'candidate did not demonstrate fact_ref',
    },
    {
      label: 'an unknown fact',
      overrides: { factIds: ['missing-fact'] },
      reason: 'fact missing-fact is unavailable',
    },
    {
      label: 'an unverified learner fact',
      overrides: { factIds: ['draft-f1'] },
      reason: 'fact draft-f1 is not a verified learner-visible fact',
    },
    {
      label: 'a verified coach-only fact',
      overrides: { factIds: ['coach-f1'] },
      reason: 'fact coach-f1 is not a verified learner-visible fact',
    },
  ])('marks $label as unsupported', ({ overrides, reason }) => {
    const decision = evaluateJiuxuangeEvidence({
      requiredSignals: ['fact_ref'],
      candidates: [candidate('fact_ref', overrides as Partial<JiuxuangeEvidenceCandidate>)],
      facts: FACTS,
      sourceMessageIds: ['learner-message-1'],
      modelVersion: MODEL_VERSION,
      packageVersion: PACKAGE_VERSION,
    });

    expect(decision.satisfied).toBe(false);
    expect(decision.results[0]).toEqual(
      expect.objectContaining({
        status: 'unsupported',
        reason,
        modelVersion: MODEL_VERSION,
        packageVersion: PACKAGE_VERSION,
      }),
    );
  });

  it('requires an allowed fact reference for fact_ref and causal_link', () => {
    const decision = evaluateJiuxuangeEvidence({
      requiredSignals: ['fact_ref', 'causal_link'],
      candidates: [
        candidate('fact_ref', { factIds: [] }),
        candidate('causal_link', { factIds: [] }),
      ],
      facts: FACTS,
      sourceMessageIds: ['learner-message-1'],
      modelVersion: MODEL_VERSION,
      packageVersion: PACKAGE_VERSION,
    });

    expect(decision.satisfied).toBe(false);
    expect(decision.missingSignals).toEqual(['fact_ref', 'causal_link']);
    expect(decision.results.map((result) => result.status)).toEqual(['unsupported', 'unsupported']);
  });
});
