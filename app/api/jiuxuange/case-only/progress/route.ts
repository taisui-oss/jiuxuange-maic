import { NextResponse } from 'next/server';
import {
  CaseOnlyIdentityError,
  resolveCaseOnlyActor,
} from '@/lib/server/jiuxuange-case-only/identity';
import { getCaseOnlyCourseProgress } from '@/lib/server/jiuxuange-case-only/progress-repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const actor = resolveCaseOnlyActor();
    const progress = await getCaseOnlyCourseProgress(actor.userId);
    return NextResponse.json(
      { success: true, progress },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const identityFailure = error instanceof CaseOnlyIdentityError;
    return NextResponse.json(
      {
        success: false,
        errorCode: identityFailure ? 'UNAUTHORIZED' : 'SERVICE_UNAVAILABLE',
        error: identityFailure ? error.message : 'Case progress is temporarily unavailable',
      },
      {
        status: identityFailure ? 401 : 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
