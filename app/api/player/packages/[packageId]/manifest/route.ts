import { NextResponse } from 'next/server';
import { readPlayerPackage } from '@/lib/server/jiuxuange-player/package-repository';
import { canAccessPlayerPackage, resolvePlayerActor } from '@/lib/server/jiuxuange-player/identity';
import { toPublicPlayerManifest } from '@/lib/server/jiuxuange-player/public-package';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ packageId: string }> },
) {
  const { packageId } = await params;
  const actor = await resolvePlayerActor();
  if (!canAccessPlayerPackage(actor, packageId)) return new NextResponse(null, { status: 404 });
  const loaded = await readPlayerPackage(packageId);
  if (!loaded) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ success: true, manifest: toPublicPlayerManifest(loaded.manifest) });
}
