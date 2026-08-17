import { NextResponse } from 'next/server';
import { resolvePlayerActor } from '@/lib/server/jiuxuange-player/identity';
import { getAccessiblePlayerContent } from '@/lib/server/jiuxuange-player/access';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ packageId: string }> },
) {
  const { packageId } = await params;
  const actor = await resolvePlayerActor();
  const access = await getAccessiblePlayerContent(actor, packageId);
  if (!access) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ success: true, progress: access.progress });
}
