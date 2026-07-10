import { describe, expect, it } from 'vitest';

import {
  C_CUBIC_BUSINESS_MODEL_COURSE_ID,
  C_CUBIC_BUSINESS_MODEL_MODULES,
  getAvailableClassroomRefs,
  getModuleCompletionPercent,
} from '@/lib/c-cubic/business-model-course';

describe('C Cubic business model Phase 1 course path', () => {
  it('locks the first phase to a seven-module business-model learning path', () => {
    expect(C_CUBIC_BUSINESS_MODEL_COURSE_ID).toBe('c-cubic-business-model-phase1');
    expect(C_CUBIC_BUSINESS_MODEL_MODULES).toHaveLength(7);
    expect(C_CUBIC_BUSINESS_MODEL_MODULES.map((module) => module.code)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
    ]);
    expect(C_CUBIC_BUSINESS_MODEL_MODULES.map((module) => module.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('exposes only classroom refs that are actually backed by preset classrooms', () => {
    expect(getAvailableClassroomRefs()).toEqual([
      expect.objectContaining({
        moduleId: 'bm-six-elements',
        step: 'concept',
        classroomId: '2bgkxp8v_H',
      }),
      expect.objectContaining({
        moduleId: 'bm-six-elements',
        step: 'case',
        classroomId: 'ds9xotYKD7',
      }),
    ]);
  });

  it('keeps progress based on completed concept/case steps, not visible scores', () => {
    expect(getModuleCompletionPercent()).toBe(0);
    expect(getModuleCompletionPercent(['concept'])).toBe(50);
    expect(getModuleCompletionPercent(['concept', 'case'])).toBe(100);
    expect(getModuleCompletionPercent(['concept', 'concept'])).toBe(50);
  });
});
