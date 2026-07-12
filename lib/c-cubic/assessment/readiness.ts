export const ASSESSMENT_REQUIRED_ACTIVITIES = [
  'orientation',
  'concept-chain',
  'case-convenience-bee',
  'case-fresh-grocery',
] as const;

export type AssessmentRequiredActivity = (typeof ASSESSMENT_REQUIRED_ACTIVITIES)[number];

export interface AssessmentReadinessInput {
  completedActivities: readonly AssessmentRequiredActivity[];
}

export interface AssessmentReadiness {
  ready: boolean;
  missingActivities: AssessmentRequiredActivity[];
}

export function assessAssessmentReadiness(input: AssessmentReadinessInput): AssessmentReadiness {
  const completed = new Set(input.completedActivities);
  const missingActivities = ASSESSMENT_REQUIRED_ACTIVITIES.filter(
    (activity) => !completed.has(activity),
  );

  return {
    ready: missingActivities.length === 0,
    missingActivities,
  };
}
