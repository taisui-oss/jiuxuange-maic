import type { JiuxuangeCoursePackage } from './types';
import { BUSINESS_MODEL_PILOT_PACKAGE } from './business-model-v1';
import { BUSINESS_MODEL_GUIDED_PACKAGE } from './business-model-v2';
import { BUSINESS_MODEL_SIX_LEVEL_PACKAGE } from './business-model-v3';
import { BUSINESS_MODEL_SINGLE_COURSE_PACKAGE } from './business-model-v4';
import { BUSINESS_MODEL_LEARNING_LOOP_PACKAGE } from './business-model-v5';

const COURSE_PACKAGES: readonly JiuxuangeCoursePackage[] = [
  BUSINESS_MODEL_PILOT_PACKAGE,
  BUSINESS_MODEL_GUIDED_PACKAGE,
  BUSINESS_MODEL_SIX_LEVEL_PACKAGE,
  BUSINESS_MODEL_SINGLE_COURSE_PACKAGE,
  BUSINESS_MODEL_LEARNING_LOOP_PACKAGE,
];

export function getCoursePackage(courseId: string, version: string): JiuxuangeCoursePackage {
  const coursePackage = COURSE_PACKAGES.find(
    (candidate) => candidate.id === courseId && candidate.version === version,
  );
  if (!coursePackage) {
    throw new Error(`Unknown Jiuxuange course package: ${courseId}@${version}`);
  }
  return coursePackage;
}
