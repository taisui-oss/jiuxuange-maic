import { NextResponse } from 'next/server';
import { canAccessPlayerPackage, resolvePlayerActor } from '@/lib/server/jiuxuange-player/identity';
import { getAccessibleCaseOnlyContent } from '@/lib/server/jiuxuange-case-only/progress-repository';
import { readPlayerPackageFile } from '@/lib/server/jiuxuange-player/package-repository';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ packageId: string; assetPath: string[] }> },
) {
  const { packageId, assetPath } = await params;
  const actor = await resolvePlayerActor();
  if (!canAccessPlayerPackage(actor, packageId)) return new NextResponse(null, { status: 404 });
  const access = await getAccessibleCaseOnlyContent(actor.userId, packageId);
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
