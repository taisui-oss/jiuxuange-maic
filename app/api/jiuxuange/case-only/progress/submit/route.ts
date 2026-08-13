import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  CaseOnlyIdentityError,
  resolveCaseOnlyActor,
} from '@/lib/server/jiuxuange-case-only/identity';
import { submitCaseOnlyScene } from '@/lib/server/jiuxuange-case-only/progress-repository';

export const dynamic = 'force-dynamic';

const submitSchema = z
  .object({
    caseId: z.string().min(1).max(160),
    contentVersion: z.string().startsWith('sha256:').length(71),
    progressVersion: z.number().int().nonnegative(),
    sceneId: z.string().min(1).max(200),
    answers: z.record(z.string(), z.union([z.string(), z.array(z.string()).max(20)])).optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const actor = await resolveCaseOnlyActor();
    const parsed = submitSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errorCode: 'INVALID_REQUEST', error: 'Invalid scene submission' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const result = await submitCaseOnlyScene({
      userId: actor.userId,
      idempotencyKey: request.headers.get('idempotency-key') ?? '',
      request: parsed.data,
    });
    return NextResponse.json(result.body, {
      status: result.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const identityFailure = error instanceof CaseOnlyIdentityError;
    return NextResponse.json(
      {
        success: false,
        errorCode: identityFailure ? 'UNAUTHORIZED' : 'SERVICE_UNAVAILABLE',
        error: identityFailure ? error.message : 'Scene submission is temporarily unavailable',
      },
      {
        status: identityFailure ? 401 : 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
