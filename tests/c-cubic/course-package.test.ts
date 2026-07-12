import { describe, expect, it } from 'vitest';
import { BUSINESS_MODEL_PILOT_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v1';
import { BUSINESS_MODEL_GUIDED_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v2';
import { getCoursePackage } from '@/lib/c-cubic/course-package/registry';
import {
  assessCoursePackageReadiness,
  validateCoursePackage,
} from '@/lib/c-cubic/course-package/validate';

describe('business model pilot course package', () => {
  it('ships a separate guided-course package with formal scoring disabled', () => {
    expect(BUSINESS_MODEL_GUIDED_PACKAGE.version).toBe('2.0.0-guided-course');
    expect(BUSINESS_MODEL_GUIDED_PACKAGE.releaseStatus).toBe('full');
    expect(BUSINESS_MODEL_GUIDED_PACKAGE.formalScoringEnabled).toBe(false);
    expect(validateCoursePackage(BUSINESS_MODEL_GUIDED_PACKAGE)).toEqual([]);
    expect(getCoursePackage('business-model', '2.0.0-guided-course')).toBe(
      BUSINESS_MODEL_GUIDED_PACKAGE,
    );
    expect(BUSINESS_MODEL_GUIDED_PACKAGE.modules.map((module) => module.id)).toEqual([
      'transaction-principle',
      'six-elements-overview',
      'positioning',
      'business-system',
      'key-resources-capabilities',
      'profit-model',
      'cash-flow-enterprise-value',
      'case-convenience-bee',
      'case-fresh-grocery',
      'personal-assessment',
    ]);
    expect(Object.keys(BUSINESS_MODEL_GUIDED_PACKAGE.cases)).toEqual(
      expect.arrayContaining(['convenience-bee', 'fresh-grocery-comparison']),
    );
  });

  it('ships only the B module and keeps formal scoring disabled', () => {
    expect(BUSINESS_MODEL_PILOT_PACKAGE.modules.map((module) => module.code)).toEqual(['B']);
    expect(BUSINESS_MODEL_PILOT_PACKAGE.releaseStatus).toBe('pilot_b_only');
    expect(BUSINESS_MODEL_PILOT_PACKAGE.formalScoringEnabled).toBe(false);
    expect(validateCoursePackage(BUSINESS_MODEL_PILOT_PACKAGE)).toEqual([]);
  });

  it('can run a synthetic demo without claiming real-pilot readiness', () => {
    const readiness = assessCoursePackageReadiness(BUSINESS_MODEL_PILOT_PACKAGE);

    expect(readiness.canRunDemo).toBe(true);
    expect(readiness.canRunRealPilot).toBe(false);
    expect(readiness.canPublishScores).toBe(false);
    expect(readiness.blockers).toContain(
      'case guan-yu-nan requires verified primary project facts before real-pilot activation',
    );
  });

  it('keeps coach review conclusions out of learner-visible facts', () => {
    const reviewFacts = BUSINESS_MODEL_PILOT_PACKAGE.cases['guan-yu-nan'].facts.filter(
      (fact) => fact.sourceKind === 'coach_review',
    );

    expect(reviewFacts.length).toBeGreaterThan(0);
    expect(reviewFacts.every((fact) => fact.visibility === 'coach_only')).toBe(true);
  });

  it('rejects a learner-visible coach conclusion', () => {
    const broken = structuredClone(BUSINESS_MODEL_PILOT_PACKAGE);
    const reviewFact = broken.cases['guan-yu-nan'].facts.find(
      (fact) => fact.sourceKind === 'coach_review',
    );
    expect(reviewFact).toBeDefined();
    reviewFact!.visibility = 'learner';

    expect(validateCoursePackage(broken)).toContain(
      'case guan-yu-nan fact coach-judgement-1 cannot expose coach_review to learners',
    );
  });

  it('rejects unverified learner-visible facts in a real project', () => {
    const broken = structuredClone(BUSINESS_MODEL_PILOT_PACKAGE);
    const fact = broken.cases['guan-yu-nan'].facts.find(
      (candidate) => candidate.sourceKind === 'primary_project',
    );
    expect(fact).toBeDefined();
    fact!.visibility = 'learner';
    fact!.verificationStatus = 'draft';

    expect(validateCoursePackage(broken)).toContain(
      'case guan-yu-nan fact project-fact-1 must be verified before learner exposure',
    );
  });

  it('requires traceable source locators and single-question templates', () => {
    const broken = structuredClone(BUSINESS_MODEL_PILOT_PACKAGE);
    broken.cases.demo_chain_franchise.facts[0].sourceRef.locator = '';
    broken.questionTemplates.ground_fact.singleQuestion = false;

    expect(validateCoursePackage(broken)).toEqual(
      expect.arrayContaining([
        'case demo_chain_franchise fact demo-f1 requires a source locator',
        'question ground_fact must enforce singleQuestion',
      ]),
    );
  });

  it('rejects a question template whose text contains multiple learner-facing questions', () => {
    const broken = structuredClone(BUSINESS_MODEL_PILOT_PACKAGE);
    broken.questionTemplates.ground_fact.prompt = '你引用了哪条事实？它说明了什么？';

    expect(validateCoursePackage(broken)).toContain(
      'question ground_fact prompt must contain exactly one learner-facing question',
    );
  });

  it('rejects dangling module references before project creation', () => {
    const broken = structuredClone(BUSINESS_MODEL_PILOT_PACKAGE);
    broken.modules[0].conceptIds.push('missing-concept');
    broken.modules[0].caseIds.push('missing-case');
    broken.modules[0].questionTemplateIds.push('missing-question');
    broken.modules[0].evidenceRuleIds.push('missing-rule');

    expect(validateCoursePackage(broken)).toEqual(
      expect.arrayContaining([
        'module six-elements references unknown concept missing-concept',
        'module six-elements references unknown case missing-case',
        'module six-elements references unknown question missing-question',
        'module six-elements references unknown evidence rule missing-rule',
      ]),
    );
  });

  it('rejects duplicate module order and a case chain that skips commit', () => {
    const broken = structuredClone(BUSINESS_MODEL_GUIDED_PACKAGE);
    broken.modules[1].order = broken.modules[0].order;
    broken.modules[7].questionTemplateIds = ['bee-blind', 'bee-unlock', 'bee-compare'];

    expect(validateCoursePackage(broken)).toEqual(
      expect.arrayContaining([
        'course modules require unique order values',
        'case module case-convenience-bee must follow blind -> commit -> unlock -> compare',
      ]),
    );
  });
});
