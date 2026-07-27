import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { shouldUseJiuxuangeCourseHubV1 } from '@/lib/config/feature-flags';
import {
  BUSINESS_MODEL_CASE_LESSONS,
  BUSINESS_MODEL_PROJECT_PRACTICES,
  businessModelClassroomHref,
  isBusinessModelCaseUnlocked,
} from '@/lib/jiuxuange/course-catalog/business-model';

describe('Jiuxuange business-model course hub', () => {
  const previousFlag = process.env.NEXT_PUBLIC_JIUXUANGE_COURSE_HUB_V1;

  afterEach(() => {
    process.env.NEXT_PUBLIC_JIUXUANGE_COURSE_HUB_V1 = previousFlag;
  });

  it('is visible by default and supports an explicit rollback', () => {
    delete process.env.NEXT_PUBLIC_JIUXUANGE_COURSE_HUB_V1;
    expect(shouldUseJiuxuangeCourseHubV1()).toBe(true);

    process.env.NEXT_PUBLIC_JIUXUANGE_COURSE_HUB_V1 = 'false';
    expect(shouldUseJiuxuangeCourseHubV1()).toBe(false);
  });

  it('starts with a stable native coffee case and unlocks cases in sequence', () => {
    const [coffee, convenienceBee, freshGrocery] = BUSINESS_MODEL_CASE_LESSONS;
    expect(coffee).toEqual(
      expect.objectContaining({
        id: 'coffee-six-elements-foundation',
        classroomId: 'jxg-bm-mainline-six-elements-coffee-v1',
        sequence: 1,
      }),
    );
    expect(businessModelClassroomHref(coffee.classroomId!)).toBe(
      '/classroom/jxg-bm-mainline-six-elements-coffee-v1?returnTo=%2Fcourses%2Fbusiness-model&completion=all-correct',
    );
    expect(isBusinessModelCaseUnlocked(coffee, new Set())).toBe(true);
    expect(isBusinessModelCaseUnlocked(convenienceBee, new Set())).toBe(false);
    expect(
      isBusinessModelCaseUnlocked(
        convenienceBee,
        new Set(['jxg-bm-mainline-six-elements-coffee-v1']),
      ),
    ).toBe(true);
    expect(
      isBusinessModelCaseUnlocked(
        freshGrocery,
        new Set(['jxg-bm-mainline-six-elements-coffee-v1']),
      ),
    ).toBe(false);
    expect(
      isBusinessModelCaseUnlocked(freshGrocery, new Set(['jxg-bm-case-convenience-bee-v1'])),
    ).toBe(true);
  });

  it('shows one seven-case path without pretending incomplete cases are published', () => {
    expect(BUSINESS_MODEL_CASE_LESSONS).toHaveLength(7);
    expect(
      BUSINESS_MODEL_CASE_LESSONS.filter((lesson) => lesson.releaseStatus === 'pilot').map(
        (lesson) => lesson.id,
      ),
    ).toEqual(['coffee-six-elements-foundation', 'convenience-bee']);
    expect(BUSINESS_MODEL_CASE_LESSONS[1]).toEqual(
      expect.objectContaining({
        classroomId: 'jxg-bm-case-convenience-bee-v1',
        unlockAfterCaseId: 'coffee-six-elements-foundation',
      }),
    );
    expect(BUSINESS_MODEL_CASE_LESSONS[2]).toEqual(
      expect.objectContaining({
        id: 'fresh-grocery-comparison',
        unlockAfterCaseId: 'convenience-bee',
        releaseStatus: 'in_review',
      }),
    );
    expect(
      BUSINESS_MODEL_CASE_LESSONS.every((lesson) => lesson.format === 'native_multi_round'),
    ).toBe(true);

    const coveredLevels = new Set(BUSINESS_MODEL_CASE_LESSONS.flatMap((lesson) => lesson.focus));
    expect(coveredLevels).toEqual(
      new Set([
        'positioning',
        'business-system',
        'key-resources-capabilities',
        'profit-model',
        'cash-flow-structure',
        'enterprise-value',
      ]),
    );
  });

  it('keeps project practice separate from official teaching cases', () => {
    expect(BUSINESS_MODEL_PROJECT_PRACTICES).toEqual([
      expect.objectContaining({
        id: 'mckess-central-kitchen',
        status: 'draft',
        href: '/courses/business-model/projects/mckess',
      }),
    ]);
    expect(
      BUSINESS_MODEL_CASE_LESSONS.some((lesson) => lesson.id === 'mckess-central-kitchen'),
    ).toBe(false);
  });

  it('routes the formal course through the native catalog while preserving the old entry only as rollback', () => {
    const homeSource = readFileSync('app/page.tsx', 'utf8');
    const portalSource = readFileSync('components/jiuxuange/learning-portal.tsx', 'utf8');
    const entrySource = readFileSync(
      'components/jiuxuange/business-model-course-hub-entry.tsx',
      'utf8',
    );
    const hubSource = readFileSync('app/courses/business-model/page.tsx', 'utf8');
    const nativeCatalogSource = readFileSync(
      'components/jiuxuange/business-model-native-course-catalog.tsx',
      'utf8',
    );

    expect(homeSource).toContain('{dualEntryV1 && businessModelMode && unifiedLearning && (');
    expect(portalSource).toContain('<BusinessModelCourseHubEntry');
    expect(portalSource).toContain('<BusinessModelCourseEntry');
    expect(portalSource).toContain('shouldUseJiuxuangeCourseHubV1');
    expect(entrySource).toContain("router.push('/courses/business-model')");
    expect(entrySource).not.toContain('disabled={loading}');
    expect(entrySource).not.toContain('loadBusinessModelResumeState');
    expect(entrySource).not.toContain('上次聊到');
    expect(hubSource).toContain('<BusinessModelNativeCourseCatalog');
    expect(hubSource).not.toContain('<BusinessModelCourseEntry');
    expect(nativeCatalogSource).toContain('案例学习路径');
    expect(nativeCatalogSource).toContain('多轮 OpenMAIC 原生课堂');
    expect(nativeCatalogSource).toContain('多轮原生课堂');
    expect(nativeCatalogSource).toContain('进入案例课堂');
    expect(nativeCatalogSource).toContain('完成上一案例后开放');
    expect(hubSource).toContain('项目练习');
  });

  it('ships both pilot classrooms as server-loadable native classroom assets', () => {
    for (const [id, expectedSceneCount] of [
      ['jxg-bm-mainline-six-elements-coffee-v1', 9],
      ['jxg-bm-case-convenience-bee-v1', 10],
    ] as const) {
      const classroom = JSON.parse(
        readFileSync(`content/jiuxuange/classrooms/${id}.json`, 'utf8'),
      ) as {
        id: string;
        generationComplete: boolean;
        stage: { id: string };
        scenes: Array<{ stageId: string }>;
      };

      expect(classroom.id).toBe(id);
      expect(classroom.stage.id).toBe(id);
      expect(classroom.generationComplete).toBe(true);
      expect(classroom.scenes).toHaveLength(expectedSceneCount);
      expect(classroom.scenes.every((scene) => scene.stageId === id)).toBe(true);
    }
  });

  it('keeps the draft project-card detail page local-only by default', () => {
    const source = readFileSync('app/courses/business-model/projects/mckess/page.tsx', 'utf8');

    expect(source).toContain('isLoopbackHost');
    expect(source).toContain('JIUXUANGE_ENABLE_DRAFT_PROJECT_CARDS');
    expect(source).toContain('notFound()');
    expect(source).toContain('麦客思个人项目测评');
    expect(source).toContain('MCKESS_ASSESSMENT_ASSIGNMENT_ID');
    expect(source).toContain('当前开放项目卡查看和同项目个人测评');
  });

  it('freezes the visible course-hub contract as a versioned replay suite', () => {
    const fixture = JSON.parse(
      readFileSync(
        'eval/jiuxuange-learning-partner/scenarios/business-model-course-hub.v2.json',
        'utf8',
      ),
    ) as {
      suiteId: string;
      version: number;
      scenarios: Array<{ id: string }>;
    };

    expect(fixture.suiteId).toBe('jiuxuange-business-model-course-hub');
    expect(fixture.version).toBe(2);
    expect(fixture.scenarios.map((scenario) => scenario.id)).toEqual([
      'course-hub-home-visibility-001',
      'course-hub-sequential-case-path-002',
      'course-hub-project-card-boundary-001',
      'course-hub-project-assessment-binding-002',
      'course-hub-rollback-001',
      'course-hub-standalone-assets-001',
    ]);
  });
});
