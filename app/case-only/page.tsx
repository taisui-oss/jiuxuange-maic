import { CaseOnlyHome } from '@/components/jiuxuange/case-only/case-only-home';
import { listCaseOnlyLessons } from '@/lib/jiuxuange/case-only/catalog';
import { resolveCaseOnlyActor } from '@/lib/server/jiuxuange-case-only/identity';
import { getCaseOnlyCourseProgress } from '@/lib/server/jiuxuange-case-only/progress-repository';

export const dynamic = 'force-dynamic';

export default async function CaseOnlyHomePage() {
  const actor = resolveCaseOnlyActor();
  const progress = await getCaseOnlyCourseProgress(actor.userId);
  return <CaseOnlyHome lessons={listCaseOnlyLessons()} progress={progress} />;
}
