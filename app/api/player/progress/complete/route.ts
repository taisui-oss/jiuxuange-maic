import { NextResponse } from 'next/server';
import { canAccessPlayerPackage, resolvePlayerActor } from '@/lib/server/jiuxuange-player/identity';
import { submitCaseOnlyScene } from '@/lib/server/jiuxuange-case-only/progress-repository';

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
  const body = (await request.json()) as {
    packageId?: string;
    contentVersion?: string;
    progressVersion?: number;
    sceneId?: string;
  };
  if (
    !body.packageId ||
    !body.contentVersion ||
    !Number.isInteger(body.progressVersion) ||
    !body.sceneId
  ) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_REQUEST', error: 'Invalid progress request' },
      { status: 400 },
    );
  }
  const actor = await resolvePlayerActor();
  if (!canAccessPlayerPackage(actor, body.packageId)) {
    return new NextResponse(null, { status: 404 });
  }
  const result = await submitCaseOnlyScene({
    userId: actor.userId,
    idempotencyKey,
    bypassUnlock: actor.preview,
    request: {
      caseId: body.packageId,
      contentVersion: body.contentVersion,
      progressVersion: body.progressVersion!,
      sceneId: body.sceneId,
    },
  });
  return NextResponse.json(result.body, { status: result.status });
}
