import { NextResponse } from 'next/server';
import { canAccessPlayerPackage, resolvePlayerActor } from '@/lib/server/jiuxuange-player/identity';
import { getAccessibleCaseOnlyContent } from '@/lib/server/jiuxuange-case-only/progress-repository';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ packageId: string }> },
) {
  const { packageId } = await params;
  const actor = await resolvePlayerActor();
  if (!canAccessPlayerPackage(actor, packageId)) return new NextResponse(null, { status: 404 });
  const access = await getAccessibleCaseOnlyContent(actor.userId, packageId);
  if (!access) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ success: true, progress: access.progress });
}
