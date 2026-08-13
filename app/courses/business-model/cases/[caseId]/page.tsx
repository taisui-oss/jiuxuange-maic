import { notFound } from 'next/navigation';
import { LightweightCasePlayer } from '@/components/jiuxuange/case-only/lightweight-case-player';
import { isGateOneLessonAvailable } from '@/lib/jiuxuange/case-only/catalog';
import { readCaseOnlyContent } from '@/lib/server/jiuxuange-case-only/content-repository';

export default async function CaseOnlyPlayerPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const content = await readCaseOnlyContent(caseId);
  if (!content || !isGateOneLessonAvailable(content.lesson)) notFound();
  return <LightweightCasePlayer content={content} />;
}
