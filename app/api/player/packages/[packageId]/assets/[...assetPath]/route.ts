import { NextResponse } from 'next/server';
import { resolvePlayerActor } from '@/lib/server/jiuxuange-player/identity';
import { getAccessiblePlayerContent } from '@/lib/server/jiuxuange-player/access';
import { readPlayerPackageFile } from '@/lib/server/jiuxuange-player/package-repository';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ packageId: string; assetPath: string[] }> },
) {
  const { packageId, assetPath } = await params;
  const actor = await resolvePlayerActor();
  const access = await getAccessiblePlayerContent(actor, packageId);
  if (!access) return new NextResponse(null, { status: 404 });
  const file = await readPlayerPackageFile(packageId, assetPath.join('/'));
  if (!file) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(file.bytes).buffer, {
    headers: {
      'Content-Type': file.mediaType,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
