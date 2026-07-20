import { generateText } from 'ai';
import { NextResponse, type NextRequest } from 'next/server';
import { apiError } from '@/lib/server/api-response';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import {
  assessRealmEvidenceReadiness,
  parseAndValidateRealmAssessment,
  type RealmAssessmentScenario,
  type RealmEvidencePackage,
  type RealmEvidenceSample,
  type RealmEvidenceSampleKind,
} from '@/lib/c-cubic/realm-assessor';
import { buildRealmAssessorPrompt } from '@/lib/c-cubic/realm-assessor/prompt';

const SCENARIOS = new Set<RealmAssessmentScenario>([
  'self_positioning',
  'dragon_gate_review',
  'realm_drop_diagnosis',
]);

const SAMPLE_KINDS = new Set<RealmEvidenceSampleKind>([
  'unfamiliar_problem',
  'familiar_domain',
  'multi_turn_iteration',
  'thinking_process',
  'prompt_iteration',
  'collaboration_statement',
  'whiteboard_rebuild',
  'prior_review',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSample(value: unknown): RealmEvidenceSample | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.kind !== 'string' ||
    !SAMPLE_KINDS.has(value.kind as RealmEvidenceSampleKind) ||
    typeof value.background !== 'string' ||
    typeof value.capturedAt !== 'string' ||
    typeof value.transcript !== 'string' ||
    (value.source !== 'raw_export' && value.source !== 'manual_paste') ||
    typeof value.redacted !== 'boolean' ||
    typeof value.edited !== 'boolean'
  ) {
    return null;
  }
  if (
    value.id.length > 160 ||
    value.background.length > 2_000 ||
    value.transcript.length > 200_000
  ) {
    return null;
  }
  return {
    id: value.id,
    kind: value.kind as RealmEvidenceSampleKind,
    background: value.background,
    capturedAt: value.capturedAt,
    transcript: value.transcript,
    source: value.source,
    redacted: value.redacted,
    edited: value.edited,
  };
}

function parseEvidencePackage(value: unknown): RealmEvidencePackage | null {
  if (!isRecord(value) || typeof value.scenario !== 'string') return null;
  if (!SCENARIOS.has(value.scenario as RealmAssessmentScenario)) return null;
  if (!Array.isArray(value.samples) || value.samples.length > 8) return null;
  const samples = value.samples.map(parseSample);
  if (samples.some((sample) => sample === null)) return null;
  if (value.learnerLabel !== undefined && typeof value.learnerLabel !== 'string') return null;
  if (typeof value.learnerLabel === 'string' && value.learnerLabel.length > 100) return null;
  return {
    scenario: value.scenario as RealmAssessmentScenario,
    learnerLabel: typeof value.learnerLabel === 'string' ? value.learnerLabel : undefined,
    samples: samples as RealmEvidenceSample[],
  };
}

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Request body must be valid JSON.');
  }

  const evidencePackage = parseEvidencePackage(rawBody);
  if (!evidencePackage) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'A valid realm-assessment evidence package is required.',
    );
  }

  const readiness = assessRealmEvidenceReadiness(evidencePackage);
  if (!readiness.ready) {
    return NextResponse.json({ status: 'insufficient_evidence', readiness });
  }

  const prompt = buildRealmAssessorPrompt(evidencePackage);
  let generatedText: string;
  try {
    const { model } = await resolveModelFromRequest(
      req,
      rawBody as Record<string, unknown>,
      'pbl-v2-runtime:evaluate',
    );
    const result = await generateText({
      model,
      system: prompt.system,
      prompt: prompt.prompt,
      abortSignal: req.signal,
      maxOutputTokens: 4_000,
    });
    generatedText = result.text ?? '';
  } catch {
    return NextResponse.json(
      {
        status: 'human_review_required',
        readiness,
        reason: '评定模型当前不可用，系统未生成替代等级。',
      },
      { status: 503 },
    );
  }

  const validation = parseAndValidateRealmAssessment(generatedText, evidencePackage);
  if (!validation.ok || !validation.report) {
    return NextResponse.json(
      {
        status: 'human_review_required',
        readiness,
        reason: '模型评定未通过原文引用回溯校验。',
        validationErrors: validation.errors,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    status: validation.report.status,
    readiness,
    report: validation.report,
  });
}
