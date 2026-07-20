import type {
  RealmEvidencePackage,
  RealmEvidenceReadiness,
  RealmEvidenceSample,
  RealmEvidenceSampleKind,
} from './types';

const SELF_POSITIONING_KINDS: ReadonlyArray<{
  kind: RealmEvidenceSampleKind;
  label: string;
}> = [
  { kind: 'unfamiliar_problem', label: '陌生领域求解样本' },
  { kind: 'familiar_domain', label: '熟悉领域驱动样本' },
  { kind: 'multi_turn_iteration', label: '多轮迭代任务样本' },
];

const DRAGON_GATE_KINDS: ReadonlyArray<{
  kind: RealmEvidenceSampleKind;
  label: string;
}> = [
  { kind: 'thinking_process', label: '完整思考过程' },
  { kind: 'prompt_iteration', label: 'Prompt 迭代日志' },
  { kind: 'collaboration_statement', label: '协作模式陈述' },
  { kind: 'whiteboard_rebuild', label: '白纸重建记录' },
];

function validDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function threeMonthsBefore(now: Date): Date {
  const boundary = new Date(now);
  boundary.setUTCMonth(boundary.getUTCMonth() - 3);
  return boundary;
}

function requireKinds(
  samples: readonly RealmEvidenceSample[],
  required: ReadonlyArray<{ kind: RealmEvidenceSampleKind; label: string }>,
  missing: string[],
): void {
  for (const item of required) {
    if (!samples.some((sample) => sample.kind === item.kind)) {
      missing.push(`缺少${item.label}。`);
    }
  }
}

function validateSharedSampleFields(
  samples: readonly RealmEvidenceSample[],
  missing: string[],
): void {
  const ids = new Set<string>();
  for (const sample of samples) {
    if (!sample.id.trim()) missing.push('存在缺少 id 的证据样本。');
    if (ids.has(sample.id)) missing.push(`证据样本 id 重复：${sample.id}。`);
    ids.add(sample.id);
    if (!sample.background.trim()) missing.push(`样本 ${sample.id} 缺少任务背景。`);
    if (sample.transcript.trim().length < 40) {
      missing.push(`样本 ${sample.id} 缺少可评定的完整对话原文。`);
    }
    if (sample.edited) missing.push(`样本 ${sample.id} 必须提供未经删改的原始记录。`);
  }
}

function duplicateTranscriptRedFlags(samples: readonly RealmEvidenceSample[]): string[] {
  const seen = new Map<string, string>();
  const redFlags: string[] = [];
  for (const sample of samples) {
    const normalized = sample.transcript.trim().replace(/\s+/g, ' ');
    const prior = seen.get(normalized);
    if (prior) redFlags.push(`样本 ${prior} 与 ${sample.id} 的对话内容重复。`);
    else seen.set(normalized, sample.id);
  }
  return redFlags;
}

export function assessRealmEvidenceReadiness(
  evidence: RealmEvidencePackage,
  nowIso = new Date().toISOString(),
): RealmEvidenceReadiness {
  const missing: string[] = [];
  const warnings: string[] = [];
  const now = validDate(nowIso) ?? new Date();
  const samples = Array.isArray(evidence.samples) ? evidence.samples : [];

  validateSharedSampleFields(samples, missing);

  if (evidence.scenario === 'self_positioning') {
    if (samples.length < 3 || samples.length > 5) {
      missing.push('自评定位需要 3–5 段真实 AI 对话记录。');
    }
    requireKinds(samples, SELF_POSITIONING_KINDS, missing);
    const boundary = threeMonthsBefore(now);
    for (const sample of samples) {
      const capturedAt = validDate(sample.capturedAt);
      if (!capturedAt || capturedAt < boundary || capturedAt > now) {
        missing.push(`样本 ${sample.id} 必须是近 3 个月内的对话。`);
      }
      if (sample.source !== 'raw_export') {
        missing.push(`样本 ${sample.id} 需要原始导出，手工粘贴不足以支持正式评定。`);
      }
    }
  } else if (evidence.scenario === 'dragon_gate_review') {
    requireKinds(samples, DRAGON_GATE_KINDS, missing);
  } else if (evidence.scenario === 'realm_drop_diagnosis') {
    if (!samples.some((sample) => sample.kind === 'prior_review')) {
      missing.push('缺少龙门初审报告或评审结果。');
    }
    if (!samples.some((sample) => sample.kind !== 'prior_review')) {
      missing.push('缺少论道原始材料。');
    }
  } else {
    missing.push('未知的境界评定场景。');
  }

  const redFlags = duplicateTranscriptRedFlags(samples);
  if (redFlags.length > 0) warnings.push('发现需要人工核查的样本重复。');

  return {
    ready: missing.length === 0,
    maxConfidence: missing.length > 0 ? 'low' : warnings.length > 0 ? 'medium' : 'high',
    missing: [...new Set(missing)],
    warnings,
    redFlags,
  };
}
