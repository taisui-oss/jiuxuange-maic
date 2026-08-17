import { NextResponse } from 'next/server';
import { canAccessPlayerPackage, resolvePlayerActor } from '@/lib/server/jiuxuange-player/identity';
import { submitCaseOnlyScene } from '@/lib/server/jiuxuange-case-only/progress-repository';
import { getAccessiblePlayerContent } from '@/lib/server/jiuxuange-player/access';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ interactionId: string }> },
) {
  const { interactionId } = await params;
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
  const body = (await request.json()) as {
    packageId?: string;
    contentVersion?: string;
    progressVersion?: number;
    answers?: Record<string, string | string[]>;
  };
  if (
    !body.packageId ||
    !body.contentVersion ||
    !Number.isInteger(body.progressVersion) ||
    !body.answers
  ) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_REQUEST', error: 'Invalid interaction request' },
      { status: 400 },
    );
  }

  const actor = await resolvePlayerActor();
  if (!canAccessPlayerPackage(actor, body.packageId)) {
    return new NextResponse(null, { status: 404 });
  }
  const access = await getAccessiblePlayerContent(actor, body.packageId);
  if (!access) return new NextResponse(null, { status: 404 });
  const sourceScene = access.content.classroom.scenes.find((scene) => scene.id === interactionId);
  if (!sourceScene || sourceScene.type !== 'quiz' || sourceScene.content.type !== 'quiz') {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_REQUEST', error: 'Unknown player interaction' },
      { status: 400 },
    );
  }

  const result = await submitCaseOnlyScene({
    userId: actor.userId,
    idempotencyKey,
    bypassUnlock: actor.preview,
    request: {
      caseId: body.packageId,
      contentVersion: body.contentVersion,
      progressVersion: body.progressVersion!,
      sceneId: interactionId,
      answers: body.answers,
    },
  });
  const responseBody =
    result.status === 200 && result.body.success
      ? { ...result.body, incorrectQuestionIds: [] }
      : result.body;
  return NextResponse.json(responseBody, { status: result.status });
}
