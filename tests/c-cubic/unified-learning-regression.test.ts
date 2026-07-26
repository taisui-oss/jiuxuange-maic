import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  shouldUseCubicBusinessModelMode,
  shouldUseCubicGuidedCourseV2,
  shouldUseCubicLearningLoopV5,
  shouldUseCubicUnifiedLearning,
} from '@/lib/config/feature-flags';

describe('C Cubic unified learning flag', () => {
  const previous = process.env.NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING;
  const previousGuided = process.env.NEXT_PUBLIC_C_CUBIC_GUIDED_COURSE_V2;
  const previousBusinessModelMode = process.env.NEXT_PUBLIC_C_CUBIC_BUSINESS_MODEL_MODE;
  const previousLearningLoopV5 = process.env.NEXT_PUBLIC_C_CUBIC_LEARNING_LOOP_V5;

  afterEach(() => {
    process.env.NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING = previous;
    process.env.NEXT_PUBLIC_C_CUBIC_GUIDED_COURSE_V2 = previousGuided;
    process.env.NEXT_PUBLIC_C_CUBIC_BUSINESS_MODEL_MODE = previousBusinessModelMode;
    process.env.NEXT_PUBLIC_C_CUBIC_LEARNING_LOOP_V5 = previousLearningLoopV5;
  });

  it('keeps every business-model surface off unless the product mode is explicitly enabled', () => {
    delete process.env.NEXT_PUBLIC_C_CUBIC_BUSINESS_MODEL_MODE;
    expect(shouldUseCubicBusinessModelMode()).toBe(false);

    process.env.NEXT_PUBLIC_C_CUBIC_BUSINESS_MODEL_MODE = '1';
    expect(shouldUseCubicBusinessModelMode()).toBe(false);

    process.env.NEXT_PUBLIC_C_CUBIC_BUSINESS_MODEL_MODE = 'true';
    expect(shouldUseCubicBusinessModelMode()).toBe(true);
  });

  it('keeps the guided course V2 isolated behind an exact true flag', () => {
    delete process.env.NEXT_PUBLIC_C_CUBIC_GUIDED_COURSE_V2;
    expect(shouldUseCubicGuidedCourseV2()).toBe(false);

    process.env.NEXT_PUBLIC_C_CUBIC_GUIDED_COURSE_V2 = '1';
    expect(shouldUseCubicGuidedCourseV2()).toBe(false);

    process.env.NEXT_PUBLIC_C_CUBIC_GUIDED_COURSE_V2 = 'true';
    expect(shouldUseCubicGuidedCourseV2()).toBe(true);
  });

  it('is disabled unless explicitly enabled', () => {
    delete process.env.NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING;
    expect(shouldUseCubicUnifiedLearning()).toBe(false);
  });

  it('is enabled only by the literal true value', () => {
    process.env.NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING = '1';
    expect(shouldUseCubicUnifiedLearning()).toBe(false);

    process.env.NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING = 'true';
    expect(shouldUseCubicUnifiedLearning()).toBe(true);
  });

  it('keeps the V5 learning loop behind its own exact true flag', () => {
    delete process.env.NEXT_PUBLIC_C_CUBIC_LEARNING_LOOP_V5;
    expect(shouldUseCubicLearningLoopV5()).toBe(false);

    process.env.NEXT_PUBLIC_C_CUBIC_LEARNING_LOOP_V5 = '1';
    expect(shouldUseCubicLearningLoopV5()).toBe(false);

    process.env.NEXT_PUBLIC_C_CUBIC_LEARNING_LOOP_V5 = 'true';
    expect(shouldUseCubicLearningLoopV5()).toBe(true);
  });

  it('renders one course entry instead of the seven-module map behind the flag', () => {
    const source = readFileSync('app/page.tsx', 'utf8');
    expect(source).toContain('shouldUseCubicUnifiedLearning');
    expect(source).toContain('shouldUseCubicBusinessModelMode');
    expect(source).toContain('<BusinessModelCourseEntry');
    expect(source).toContain('businessModelMode && unifiedLearning');
    expect(source).toContain('<BusinessModelLearningPath />');
    expect(source).toContain('businessModelMode &&');
    expect(source).toContain('BUSINESS_MODEL_LEARNING_LOOP_PACKAGE');
    expect(source).toContain('shouldUseCubicLearningLoopV5');
    expect(source.indexOf('business-model-primary-entry')).toBeLessThan(
      source.indexOf('unified-home-input'),
    );
  });

  it('separates starting a new learning round from reviewing the previous record', () => {
    const source = readFileSync('components/c-cubic/business-model-course-entry.tsx', 'utf8');
    expect(source).toContain('createNewBusinessModelAttempt');
    expect(source).toContain('开始新一轮');
    expect(source).toContain('回看上次');
  });

  it('routes the guided V2 homepage through one orientation component', () => {
    const source = readFileSync('app/page.tsx', 'utf8');
    expect(source).toContain('shouldUseCubicGuidedCourseV2');
    expect(source).toContain('<HomeOrientationEntry');
    expect(source).toContain(
      '!dualEntryV1 && (guidedCourseV2 || sixLevelJourney) ?',
    );
  });

  it('keeps the dual-entry portal behind an independent rollback flag', () => {
    const source = readFileSync('app/page.tsx', 'utf8');
    const flags = readFileSync('lib/config/feature-flags.ts', 'utf8');

    expect(source).toContain('shouldUseJiuxuangeDualEntryV1');
    expect(source).toContain('<JiuxuangeLearningPortal');
    expect(source).toContain('!dualEntryV1 && businessModelMode');
    expect(flags).toContain('NEXT_PUBLIC_JIUXUANGE_DUAL_ENTRY_V1');
  });
});
