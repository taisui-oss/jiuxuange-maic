import type { JiuxuangeCoursePackage } from './types';
import { BUSINESS_MODEL_PILOT_PACKAGE } from './business-model-v1';
import { BUSINESS_MODEL_GUIDED_PACKAGE } from './business-model-v2';

const COURSE_PACKAGES: readonly JiuxuangeCoursePackage[] = [
  BUSINESS_MODEL_PILOT_PACKAGE,
  BUSINESS_MODEL_GUIDED_PACKAGE,
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
