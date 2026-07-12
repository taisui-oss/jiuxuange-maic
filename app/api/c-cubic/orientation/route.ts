import { NextResponse, type NextRequest } from 'next/server';
import { generateText } from 'ai';
import { apiError } from '@/lib/server/api-response';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import { normalizeHomeOrientationQuestion } from '@/lib/c-cubic/home-orientation';
import { JIUXUANGE_SHARED_AGENT_RULES } from '@/lib/c-cubic/agent-prompts';

interface OrientationRequest {
  message: string;
}

const SYSTEM_PROMPT = `${JIUXUANGE_SHARED_AGENT_RULES}

你现在只负责九轩阁首页的一轮学习导学。学员会描述一个真实问题。
请只提出一个简短问题，用来明确他最终需要形成的判断、决定或行动对象。
不要讲授概念，不要分析案例，不要给答案，不要介绍课程结构。只输出一个问题。`;

export async function POST(req: NextRequest) {
  let body: OrientationRequest;
  try {
    body = (await req.json()) as OrientationRequest;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Request body must be valid JSON.');
  }

  if (typeof body.message !== 'string' || !body.message.trim()) {
    return apiError('MISSING_REQUIRED_FIELD', 400, '`message` is required.');
  }

  let question = '';
  try {
    const { model } = await resolveModelFromRequest(req, body, 'pbl-v2-runtime:instructor');
    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: body.message.trim(),
      abortSignal: req.signal,
    });
    question = result.text ?? '';
  } catch {
    // The deterministic fallback keeps the required home exchange usable when
    // the configured model is temporarily unavailable.
  }

  return NextResponse.json({
    question: normalizeHomeOrientationQuestion(question),
    recommendedCourseId: 'business-model',
  });
}
