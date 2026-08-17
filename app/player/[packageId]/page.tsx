import { notFound } from 'next/navigation';
import { NativePlayerRuntime } from '@/components/jiuxuange/player/native-player-runtime';
import { PlayerProviders } from '@/components/jiuxuange/player/player-providers';
import { resolvePlayerActor } from '@/lib/server/jiuxuange-player/identity';
import { getAccessiblePlayerContent } from '@/lib/server/jiuxuange-player/access';
import { readPlayerPackage } from '@/lib/server/jiuxuange-player/package-repository';
import { toPublicPlayerPackage } from '@/lib/server/jiuxuange-player/public-package';

export const dynamic = 'force-dynamic';

export default async function PlayerPackagePage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId } = await params;
  const actor = await resolvePlayerActor();
  const [loaded, access] = await Promise.all([
    readPlayerPackage(packageId),
    getAccessiblePlayerContent(actor, packageId),
  ]);
  if (!loaded || !access) notFound();
  if (loaded.manifest.contentVersion !== access.progress.contentVersion) {
    throw new Error('Player package and progress content versions do not match');
  }

  return (
    <PlayerProviders>
      <NativePlayerRuntime loaded={toPublicPlayerPackage(loaded)} progress={access.progress} />
    </PlayerProviders>
  );
}
