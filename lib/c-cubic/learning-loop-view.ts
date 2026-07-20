import { getCoursePackage } from './course-package/registry';
import type { PBLProjectV2 } from '@/lib/pbl/v2/types';

export interface JiuxuangeLearningFactCard {
  caseId: string;
  title: string;
  facts: Array<{
    id: string;
    text: string;
    sourceLabel: string;
  }>;
}

export function deriveJiuxuangeLearningFactCard(
  project: PBLProjectV2,
): JiuxuangeLearningFactCard | null {
  const metadata = project.jiuxuange;
  if (!metadata || metadata.entryMode !== 'learning-loop') return null;
  const milestone = project.milestones.find((item) => item.status === 'active');
  const microtask = milestone?.microtasks.find((item) => item.status === 'in_progress');
  const caseId = microtask?.jiuxuange?.caseId;
  if (!caseId) return null;

  const coursePackage = getCoursePackage(metadata.courseId, metadata.courseVersion);
  const selectedCase = coursePackage.cases[caseId];
  if (!selectedCase) return null;
  const facts = selectedCase.facts
    .filter(
      (fact) => fact.visibility === 'learner' && fact.verificationStatus === 'verified',
    )
    .map((fact) => ({
      id: fact.id,
      text: fact.text,
      sourceLabel: `${fact.sourceRef.title} · ${fact.sourceRef.locator}`,
    }));
  if (facts.length === 0) return null;
  return { caseId, title: selectedCase.title, facts };
}
