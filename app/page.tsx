import { redirect } from 'next/navigation';
import { isCaseOnlyModeEnabled } from '@/lib/jiuxuange/case-only/route-policy';
import { isPlayerModeEnabled } from '@/lib/jiuxuange/player/route-policy';

export default async function Page() {
  if (isCaseOnlyModeEnabled()) redirect('/case-only');
  if (isPlayerModeEnabled()) redirect('/player');
  const { default: OpenMaicHomePage } = await import('@/components/openmaic-home-page');
  return <OpenMaicHomePage />;
}
