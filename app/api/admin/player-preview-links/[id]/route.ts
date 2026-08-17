import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { revokePlayerPreviewLink } from '@/lib/server/jiuxuange-player/session-repository';

function authorized(request: Request): boolean {
  const expected = process.env.JIUXUANGE_PLAYER_ADMIN_SECRET;
  const supplied = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!expected || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authorized(request)) return new NextResponse(null, { status: 403 });
  const revoked = await revokePlayerPreviewLink((await params).id);
  return revoked ? new NextResponse(null, { status: 204 }) : new NextResponse(null, { status: 404 });
}
