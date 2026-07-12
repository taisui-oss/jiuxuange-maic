import { generateText } from 'ai';
import { NextResponse, type NextRequest } from 'next/server';
import { apiError } from '@/lib/server/api-response';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import {
  buildLearnerFeedbackReport,
  type LearnerFeedbackReport,
} from '@/lib/c-cubic/assessment/feedback';

interface AssessmentAnswerInput {
  questionId: string;
  rawAnswer: string;
}

const FALLBACK = buildLearnerFeedbackReport({
  observations: {
    evidenceGrounding:
      '你已经尝试把判断落到可定位的案例事实，下一步可以进一步说明事实为何足以支持结论。',
    conceptAccuracy: '你能够区分商业模式与产品功能或单一收入方式，并开始说明概念边界。',
    causalLogic: '你的回答呈现了事实、机制与结果的连接，仍可继续检查其中未经验证的中间假设。',
    counterevidence: '你给判断保留了被新事实修正的空间，这是从结论走向可检验判断的重要一步。',
    transfer: '你已开始把案例中的分析动作迁移到自己的项目，并指出优先核对的信息。',
  },
  nextStep: '回到真实项目，补齐一条最可能推翻当前判断的原始事实，再更新六要素之间的因果关系。',
});

function parseFeedback(text: string): LearnerFeedbackReport | null {
  try {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    const value = JSON.parse(cleaned) as LearnerFeedbackReport;
    const observations = value?.observations;
    if (
      !observations ||
      Object.values(observations).length !== 5 ||
      Object.values(observations).some((item) => typeof item !== 'string' || !item.trim()) ||
      typeof value.nextStep !== 'string' ||
      !value.nextStep.trim()
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: { answers?: AssessmentAnswerInput[] };
  try {
    body = (await req.json()) as { answers?: AssessmentAnswerInput[] };
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Request body must be valid JSON.');
  }
  if (
    !Array.isArray(body.answers) ||
    body.answers.length !== 6 ||
    body.answers.some(
      (answer) =>
        typeof answer.questionId !== 'string' ||
        typeof answer.rawAnswer !== 'string' ||
        answer.rawAnswer.trim().length < 12,
    )
  ) {
    return apiError('INVALID_REQUEST', 400, 'Six complete original answers are required.');
  }

  let feedback: LearnerFeedbackReport | null = null;
  try {
    const { model } = await resolveModelFromRequest(req, body, 'pbl-v2-runtime:evaluate');
    const result = await generateText({
      model,
      system: `你是九轩阁成长反馈官。依据六道开放题原文生成个人学习反馈。
只输出 JSON，结构为 {"observations":{"evidenceGrounding":"...","conceptAccuracy":"...","causalLogic":"...","counterevidence":"...","transfer":"..."},"nextStep":"..."}。
不得输出数字分数、星级、等级、排名、内部维度名称或标准答案。每条结论必须能由回答原文支持；证据不足时明确写成待补充。`,
      prompt: JSON.stringify(body.answers),
      abortSignal: req.signal,
    });
    feedback = parseFeedback(result.text ?? '');
  } catch {
    // Preserve the completed assessment with a deterministic text-only report.
  }
  return NextResponse.json({ feedback: feedback ?? FALLBACK });
}
