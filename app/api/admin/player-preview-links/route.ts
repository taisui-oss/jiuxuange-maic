import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { readPlayerPackage } from '@/lib/server/jiuxuange-player/package-repository';
import { createPlayerPreviewLink } from '@/lib/server/jiuxuange-player/session-repository';

function authorized(request: Request): boolean {
  const expected = process.env.JIUXUANGE_PLAYER_ADMIN_SECRET;
  const supplied = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!expected || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorized(request)) return new NextResponse(null, { status: 403 });
  const body = (await request.json()) as {
    packageId?: string;
    createdBy?: string;
    maxUses?: number;
    expiresInSeconds?: number;
  };
  if (!body.packageId || !body.createdBy) {
    return NextResponse.json({ success: false, error: 'Invalid preview request' }, { status: 400 });
  }
  if (!(await readPlayerPackage(body.packageId))) return new NextResponse(null, { status: 404 });
  const result = await createPlayerPreviewLink({
    packageId: body.packageId,
    createdBy: body.createdBy,
    maxUses: body.maxUses,
    expiresInSeconds: body.expiresInSeconds,
  });
  return NextResponse.json({ success: true, ...result });
}
