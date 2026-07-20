import type { PBLProjectV2 } from '@/lib/pbl/v2/types';

import type { JiuxuangeCoursePackage } from './course-package/types';
import { deriveJiuxuangeJourneyProgress } from './journey-progress';

export interface JiuxuangeLearningReview {
  levels: ReturnType<typeof deriveJiuxuangeJourneyProgress>['levels'];
  autonomousEvidenceCount: number;
  hintedEvidenceCount: number;
  revisions: Array<{
    levelTitle: string;
    revisedClaim: string;
    reason: string;
    hintLevel: number;
  }>;
  unresolvedSignals: string[];
}

export function buildJiuxuangeLearningReview(
  project: PBLProjectV2,
  coursePackage: JiuxuangeCoursePackage,
): JiuxuangeLearningReview {
  const progress = deriveJiuxuangeJourneyProgress(project, coursePackage);
  const milestoneTitles = new Map(project.milestones.map((item) => [item.id, item.title]));
  const evidenceEvents = (project.runtimeEvents ?? []).filter(
    (event) => event.kind === 'jiuxuange_evidence_evaluated',
  );
  const satisfiedResults = evidenceEvents.flatMap((event) =>
    event.decision.satisfied ? event.decision.results : [],
  );
  const unresolvedSignals = Array.from(
    new Set(evidenceEvents.flatMap((event) => event.decision.missingSignals)),
  );
  const revisions = (project.runtimeEvents ?? [])
    .filter((event) => event.kind === 'jiuxuange_level_reflected')
    .map((event) => ({
      levelTitle: milestoneTitles.get(event.milestoneId ?? '') ?? '阶段回顾',
      revisedClaim: event.revisedClaim,
      reason: event.reason,
      hintLevel: event.hintLevel,
    }));

  return {
    levels: progress.levels,
    autonomousEvidenceCount: satisfiedResults.filter((result) => result.status === 'autonomous')
      .length,
    hintedEvidenceCount: satisfiedResults.filter((result) => result.status === 'hinted').length,
    revisions,
    unresolvedSignals,
  };
}
