export interface LearnerFeedbackObservations {
  evidenceGrounding: string;
  conceptAccuracy: string;
  causalLogic: string;
  counterevidence: string;
  transfer: string;
}

export interface BuildLearnerFeedbackReportInput {
  observations: LearnerFeedbackObservations;
  nextStep: string;
}

export interface LearnerFeedbackReport {
  observations: LearnerFeedbackObservations;
  nextStep: string;
}

export function buildLearnerFeedbackReport(
  input: BuildLearnerFeedbackReportInput,
): LearnerFeedbackReport {
  return {
    observations: {
      evidenceGrounding: input.observations.evidenceGrounding,
      conceptAccuracy: input.observations.conceptAccuracy,
      causalLogic: input.observations.causalLogic,
      counterevidence: input.observations.counterevidence,
      transfer: input.observations.transfer,
    },
    nextStep: input.nextStep,
  };
}
