import type { CoursePackageReadiness, JiuxuangeCoursePackage } from './types';
import { countLearnerFacingQuestions } from '../runtime';

export function validateCoursePackage(pkg: JiuxuangeCoursePackage): string[] {
  const errors: string[] = [];

  const moduleIds = pkg.modules.map((module) => module.id);
  const moduleOrders = pkg.modules.map((module) => module.order);
  const moduleCodes = pkg.modules.map((module) => module.code);
  if (new Set(moduleIds).size !== moduleIds.length)
    errors.push('course modules require unique ids');
  if (new Set(moduleOrders).size !== moduleOrders.length) {
    errors.push('course modules require unique order values');
  }
  if (new Set(moduleCodes).size !== moduleCodes.length) {
    errors.push('course modules require unique code values');
  }

  if (pkg.journey) {
    const expectedLevelIds = [
      'positioning',
      'business-system',
      'key-resources-capabilities',
      'profit-model',
      'cash-flow-structure',
      'enterprise-value',
    ];
    if (pkg.journey.levels.length !== expectedLevelIds.length) {
      errors.push('course journey requires exactly six visible levels');
    }
    if (pkg.journey.levels.map((level) => level.id).join(',') !== expectedLevelIds.join(',')) {
      errors.push('course journey visible levels require the canonical six-element order');
    }
    const referencedModuleIds = [
      ...pkg.journey.preludeModuleIds,
      ...pkg.journey.levels.flatMap((level) => level.moduleIds),
      ...pkg.journey.postludeModuleIds,
    ];
    for (const moduleId of referencedModuleIds) {
      if (!moduleIds.includes(moduleId)) {
        errors.push(`course journey references unknown module ${moduleId}`);
      }
    }
    for (const level of pkg.journey.levels) {
      if (level.calibrationCaseId && !pkg.cases[level.calibrationCaseId]) {
        errors.push(
          `course journey level ${level.id} references unknown case ${level.calibrationCaseId}`,
        );
      }
    }
  }

  for (const courseModule of pkg.modules) {
    for (const conceptId of courseModule.conceptIds) {
      if (!pkg.concepts[conceptId]) {
        errors.push(`module ${courseModule.id} references unknown concept ${conceptId}`);
      }
    }
    for (const caseId of courseModule.caseIds) {
      if (!pkg.cases[caseId]) {
        errors.push(`module ${courseModule.id} references unknown case ${caseId}`);
      }
    }
    for (const questionId of courseModule.questionTemplateIds) {
      if (!pkg.questionTemplates[questionId]) {
        errors.push(`module ${courseModule.id} references unknown question ${questionId}`);
      }
    }
    for (const ruleId of courseModule.evidenceRuleIds) {
      if (!pkg.evidenceRules[ruleId]) {
        errors.push(`module ${courseModule.id} references unknown evidence rule ${ruleId}`);
      }
    }
  }

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
      if (item.mode === 'curated_case' && fact.sourceKind !== 'course_case') {
        errors.push(`case ${caseId} fact ${fact.id} must use a course_case source`);
      }
    }
  }

  for (const [questionId, question] of Object.entries(pkg.questionTemplates)) {
    if (!question.singleQuestion) {
      errors.push(`question ${questionId} must enforce singleQuestion`);
    }
    if (countLearnerFacingQuestions(question.prompt) !== 1) {
      errors.push(`question ${questionId} prompt must contain exactly one learner-facing question`);
    }
    for (const ruleId of question.evidenceRuleIds) {
      if (!pkg.evidenceRules[ruleId]) {
        errors.push(`question ${questionId} references unknown evidence rule ${ruleId}`);
      }
    }
    for (const conceptId of question.conceptIds) {
      if (!pkg.concepts[conceptId]) {
        errors.push(`question ${questionId} references unknown concept ${conceptId}`);
      }
    }
    if (question.caseId && !pkg.cases[question.caseId]) {
      errors.push(`question ${questionId} references unknown case ${question.caseId}`);
    }
    if (question.scaffolds) {
      if (question.scaffolds.map((item) => item.hintLevel).join(',') !== '1,2,3') {
        errors.push(`question ${questionId} scaffolds require hint levels 1, 2 and 3`);
      }
      for (const scaffold of question.scaffolds) {
        if (countLearnerFacingQuestions(scaffold.prompt) !== 1) {
          errors.push(
            `question ${questionId} scaffold ${scaffold.hintLevel} must contain one question`,
          );
        }
      }
    }
  }

  for (const courseModule of pkg.modules.filter((module) => module.caseIds.length > 0)) {
    const phases = courseModule.questionTemplateIds.map(
      (questionId) => pkg.questionTemplates[questionId]?.casePhase,
    );
    if (!phases.some(Boolean)) continue;
    const expectedPhases =
      pkg.entryMode === 'learning-loop' && courseModule.id === 'case-convenience-bee-loop'
        ? 'blind -> commit -> compare'
        : 'blind -> commit -> unlock -> compare';
    if (phases.join(' -> ') !== expectedPhases) {
      errors.push(
        `case module ${courseModule.id} must follow ${expectedPhases}`,
      );
    }
  }

  return errors;
}

export function assessCoursePackageReadiness(pkg: JiuxuangeCoursePackage): CoursePackageReadiness {
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
        (fact) => fact.sourceKind === 'primary_project' && fact.verificationStatus === 'verified',
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

  const activeCaseIds = new Set(pkg.modules.flatMap((courseModule) => courseModule.caseIds));
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
