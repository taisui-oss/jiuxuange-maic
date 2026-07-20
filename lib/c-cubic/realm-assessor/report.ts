import type {
  RealmAssessmentFinding,
  RealmAssessmentReport,
  RealmAssessmentValidation,
  RealmEvidencePackage,
} from './types';

function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseFinding(
  value: unknown,
  index: number,
  errors: string[],
): RealmAssessmentFinding | null {
  if (!isRecord(value)) {
    errors.push(`第 ${index + 1} 条判定不是有效对象。`);
    return null;
  }
  const outcome = value.outcome;
  if (outcome !== 'confirmed' && outcome !== 'triggered' && outcome !== 'not_found') {
    errors.push(`第 ${index + 1} 条判定的 outcome 无效。`);
    return null;
  }
  if (typeof value.criterionId !== 'string' || typeof value.reasoning !== 'string') {
    errors.push(`第 ${index + 1} 条判定缺少标准编号或理由。`);
    return null;
  }
  return {
    criterionId: value.criterionId,
    outcome,
    quote: typeof value.quote === 'string' ? value.quote : undefined,
    sampleId: typeof value.sampleId === 'string' ? value.sampleId : undefined,
    reasoning: value.reasoning,
  };
}

export function parseAndValidateRealmAssessment(
  rawText: string,
  evidence: RealmEvidencePackage,
): RealmAssessmentValidation {
  const errors: string[] = [];
  let value: unknown;
  try {
    value = JSON.parse(stripCodeFence(rawText));
  } catch {
    return { ok: false, errors: ['评定模型未返回有效 JSON。'] };
  }
  if (!isRecord(value)) return { ok: false, errors: ['评定结果不是有效对象。'] };

  if (value.scenario !== evidence.scenario) errors.push('评定结果与证据包场景不一致。');
  const status = value.status;
  if (
    status !== 'assessed' &&
    status !== 'human_review_required' &&
    status !== 'insufficient_evidence'
  ) {
    errors.push('评定状态无效。');
  }
  const confidence = value.confidence;
  if (confidence !== 'high' && confidence !== 'medium' && confidence !== 'low') {
    errors.push('置信度无效。');
  }
  if (status === 'assessed' && confidence === 'low') {
    errors.push('低置信度不得保留境界评定结论。');
  }

  const findingValues = Array.isArray(value.findings) ? value.findings : [];
  if (!Array.isArray(value.findings)) errors.push('评定结果缺少 findings 数组。');
  const findings = findingValues
    .map((finding, index) => parseFinding(finding, index, errors))
    .filter((finding): finding is RealmAssessmentFinding => finding !== null);
  const sampleById = new Map(evidence.samples.map((sample) => [sample.id, sample]));
  for (const finding of findings) {
    if (finding.outcome === 'not_found') continue;
    const quote = finding.quote?.trim();
    const sample = finding.sampleId ? sampleById.get(finding.sampleId) : undefined;
    if (!quote || !sample || !sample.transcript.includes(quote)) {
      errors.push(`判定 ${finding.criterionId} 的证据引用无法回溯到原始对话。`);
    }
  }

  const conclusionValue = value.conclusion;
  let conclusion: RealmAssessmentReport['conclusion'];
  if (conclusionValue !== undefined) {
    if (!isRecord(conclusionValue) || typeof conclusionValue.summary !== 'string') {
      errors.push('评定结论格式无效。');
    } else {
      const band = conclusionValue.abilityBand;
      if (
        band !== undefined &&
        (typeof band !== 'number' || !Number.isInteger(band) || band < 1 || band > 5)
      ) {
        errors.push('能力档位必须是 1–5。');
      }
      conclusion = {
        summary: conclusionValue.summary,
        abilityBand: band as 1 | 2 | 3 | 4 | 5 | undefined,
        realmRange:
          typeof conclusionValue.realmRange === 'string' ? conclusionValue.realmRange : undefined,
        recommendation:
          typeof conclusionValue.recommendation === 'string'
            ? conclusionValue.recommendation
            : undefined,
      };
    }
  }
  if (status === 'assessed' && !conclusion) errors.push('完成评定时必须有结论。');

  if (typeof value.bottleneck !== 'string') errors.push('评定结果缺少瓶颈说明。');
  if (!isStringArray(value.tasks) || value.tasks.length === 0)
    errors.push('评定结果缺少修行任务。');
  if (!isStringArray(value.redFlags)) errors.push('评定结果的红旗字段无效。');

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    report: {
      scenario: evidence.scenario,
      status: status as RealmAssessmentReport['status'],
      conclusion,
      confidence: confidence as RealmAssessmentReport['confidence'],
      findings,
      bottleneck: value.bottleneck as string,
      tasks: value.tasks as string[],
      redFlags: value.redFlags as string[],
    },
  };
}
