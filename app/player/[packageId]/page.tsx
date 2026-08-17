import { notFound } from 'next/navigation';
import { NativePlayerRuntime } from '@/components/jiuxuange/player/native-player-runtime';
import { PlayerProviders } from '@/components/jiuxuange/player/player-providers';
import { getAccessibleCaseOnlyContent } from '@/lib/server/jiuxuange-case-only/progress-repository';
import { canAccessPlayerPackage, resolvePlayerActor } from '@/lib/server/jiuxuange-player/identity';
import { readPlayerPackage } from '@/lib/server/jiuxuange-player/package-repository';

export const dynamic = 'force-dynamic';

export default async function PlayerPackagePage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId } = await params;
  const actor = await resolvePlayerActor();
  if (!canAccessPlayerPackage(actor, packageId)) notFound();
  const [loaded, access] = await Promise.all([
    readPlayerPackage(packageId),
    getAccessibleCaseOnlyContent(actor.userId, packageId),
  ]);
  if (!loaded || !access) notFound();
  if (loaded.manifest.contentVersion !== access.progress.contentVersion) {
    throw new Error('Player package and progress content versions do not match');
  }

  return (
    <PlayerProviders>
      <NativePlayerRuntime loaded={loaded} progress={access.progress} />
    </PlayerProviders>
  );
}
