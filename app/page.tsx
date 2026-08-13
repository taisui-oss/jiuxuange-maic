import { redirect } from 'next/navigation';
import { isCaseOnlyModeEnabled } from '@/lib/jiuxuange/case-only/route-policy';

export default async function Page() {
  if (isCaseOnlyModeEnabled()) redirect('/case-only');
  const { default: OpenMaicHomePage } = await import('@/components/openmaic-home-page');
  return <OpenMaicHomePage />;
}
