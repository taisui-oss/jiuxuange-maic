import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  shouldUseCubicGuidedCourseV2,
  shouldUseCubicUnifiedLearning,
} from '@/lib/config/feature-flags';

describe('C Cubic unified learning flag', () => {
  const previous = process.env.NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING;
  const previousGuided = process.env.NEXT_PUBLIC_C_CUBIC_GUIDED_COURSE_V2;

  afterEach(() => {
    process.env.NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING = previous;
    process.env.NEXT_PUBLIC_C_CUBIC_GUIDED_COURSE_V2 = previousGuided;
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

  it('renders one course entry instead of the seven-module map behind the flag', () => {
    const source = readFileSync('app/page.tsx', 'utf8');
    expect(source).toContain('shouldUseCubicUnifiedLearning');
    expect(source).toContain('<BusinessModelCourseEntry');
    expect(source).toContain('unifiedLearning ?');
    expect(source).toContain('<BusinessModelLearningPath />');
  });

  it('routes the guided V2 homepage through one orientation component', () => {
    const source = readFileSync('app/page.tsx', 'utf8');
    expect(source).toContain('shouldUseCubicGuidedCourseV2');
    expect(source).toContain('<HomeOrientationEntry');
    expect(source).toContain('guidedCourseV2 ?');
  });
});
