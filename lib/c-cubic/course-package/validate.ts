import type { CoursePackageReadiness, JiuxuangeCoursePackage } from './types';

export function validateCoursePackage(pkg: JiuxuangeCoursePackage): string[] {
  const errors: string[] = [];

  for (const [conceptId, concept] of Object.entries(pkg.concepts)) {
    if (concept.sourceRefs.length === 0) {
      errors.push(`concept ${conceptId} requires a source reference`);
    }
    for (const sourceRef of concept.sourceRefs) {
      if (!sourceRef.documentId.trim() || !sourceRef.locator.trim()) {
        errors.push(`concept ${conceptId} requires a traceable source locator`);
      }
    }
  }

  for (const [caseId, item] of Object.entries(pkg.cases)) {
    for (const fact of item.facts) {
      if (!fact.sourceRef.documentId.trim()) {
        errors.push(`case ${caseId} fact ${fact.id} requires a source document`);
      }
      if (!fact.sourceRef.locator.trim()) {
        errors.push(`case ${caseId} fact ${fact.id} requires a source locator`);
      }
      if (fact.sourceKind === 'coach_review' && fact.visibility === 'learner') {
        errors.push(`case ${caseId} fact ${fact.id} cannot expose coach_review to learners`);
      }
      if (
        item.mode === 'real_project' &&
        fact.visibility === 'learner' &&
        fact.verificationStatus !== 'verified'
      ) {
        errors.push(`case ${caseId} fact ${fact.id} must be verified before learner exposure`);
      }
      if (
        item.mode === 'real_project' &&
        fact.visibility === 'learner' &&
        fact.sourceKind !== 'primary_project'
      ) {
        errors.push(`case ${caseId} fact ${fact.id} must use a primary_project source`);
      }
      if (item.mode === 'synthetic_demo' && fact.sourceKind !== 'synthetic') {
        errors.push(`case ${caseId} fact ${fact.id} must use a synthetic source`);
      }
    }
  }

  for (const [questionId, question] of Object.entries(pkg.questionTemplates)) {
    if (!question.singleQuestion) {
      errors.push(`question ${questionId} must enforce singleQuestion`);
    }
  }

  return errors;
}

export function assessCoursePackageReadiness(
  pkg: JiuxuangeCoursePackage,
): CoursePackageReadiness {
  const structuralErrors = validateCoursePackage(pkg);
  const blockers = [...structuralErrors];
  const warnings: string[] = [];

  for (const [conceptId, concept] of Object.entries(pkg.concepts)) {
    if (concept.sourceRefs.some((source) => source.verificationStatus !== 'verified')) {
      blockers.push(`concept ${conceptId} requires verified course-owner source locators`);
    }
  }

  for (const [caseId, item] of Object.entries(pkg.cases)) {
    if (item.mode !== 'real_project') continue;

    const learnerFacts = item.facts.filter((fact) => fact.visibility === 'learner');
    const hasVerifiedPrimaryFacts =
      learnerFacts.length > 0 &&
      learnerFacts.every(
        (fact) =>
          fact.sourceKind === 'primary_project' && fact.verificationStatus === 'verified',
      );

    if (item.availability !== 'pilot' || !hasVerifiedPrimaryFacts) {
      blockers.push(
        `case ${caseId} requires verified primary project facts before real-pilot activation`,
      );
    }
  }

  if (!pkg.formalScoringEnabled) {
    warnings.push('formal scoring remains disabled until human calibration is sufficient');
  }

  const activeCaseIds = new Set(pkg.modules.flatMap((module) => module.caseIds));
  const hasRunnableDemo = Object.values(pkg.cases).some(
    (item) =>
      activeCaseIds.has(item.id) &&
      item.mode === 'synthetic_demo' &&
      item.availability === 'demo' &&
      item.facts.some((fact) => fact.visibility === 'learner'),
  );
  const canRunRealPilot = blockers.length === 0;

  return {
    canRunDemo: structuralErrors.length === 0 && hasRunnableDemo,
    canRunRealPilot,
    canPublishScores: canRunRealPilot && pkg.formalScoringEnabled,
    blockers: Array.from(new Set(blockers)),
    warnings,
  };
}
