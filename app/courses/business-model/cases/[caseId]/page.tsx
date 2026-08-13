import { notFound } from 'next/navigation';
import { LightweightCasePlayer } from '@/components/jiuxuange/case-only/lightweight-case-player';
import { resolveCaseOnlyActor } from '@/lib/server/jiuxuange-case-only/identity';
import { getAccessibleCaseOnlyContent } from '@/lib/server/jiuxuange-case-only/progress-repository';

export const dynamic = 'force-dynamic';

export default async function CaseOnlyPlayerPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const actor = resolveCaseOnlyActor();
  const access = await getAccessibleCaseOnlyContent(actor.userId, caseId);
  if (!access) notFound();
  return <LightweightCasePlayer content={access.content} initialProgress={access.progress} />;
}
