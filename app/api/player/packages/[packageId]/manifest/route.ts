import { NextResponse } from 'next/server';
import { readPlayerPackage } from '@/lib/server/jiuxuange-player/package-repository';
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
  const loaded = await readPlayerPackage(packageId);
  if (!loaded) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ success: true, manifest: loaded.manifest });
}
