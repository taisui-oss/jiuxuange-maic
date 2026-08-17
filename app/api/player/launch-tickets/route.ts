import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { isStableUserId } from '@/lib/jiuxuange/case-only/preview-identity';
import { readPlayerPackage } from '@/lib/server/jiuxuange-player/package-repository';
import { createPlayerLaunchTicket } from '@/lib/server/jiuxuange-player/session-repository';
import { getAccessibleCaseOnlyContent } from '@/lib/server/jiuxuange-case-only/progress-repository';

function authorized(request: Request): boolean {
  const expected = process.env.JIUXUANGE_PLAYER_LAUNCH_SECRET;
  const supplied = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!expected || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorized(request)) return new NextResponse(null, { status: 403 });
  const body = (await request.json()) as {
    userId?: string;
    packageId?: string;
    returnTo?: string;
  };
  if (!isStableUserId(body.userId) || !body.packageId) {
    return NextResponse.json({ success: false, error: 'Invalid launch request' }, { status: 400 });
  }
  if (!(await readPlayerPackage(body.packageId))) return new NextResponse(null, { status: 404 });
  if (!(await getAccessibleCaseOnlyContent(body.userId, body.packageId))) {
    return new NextResponse(null, { status: 403 });
  }
  const result = await createPlayerLaunchTicket({
    userId: body.userId,
    packageId: body.packageId,
    returnTo: body.returnTo,
  });
  return NextResponse.json({ success: true, ...result });
}
