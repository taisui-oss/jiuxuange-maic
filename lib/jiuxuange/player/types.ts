import type { PersistedClassroomData } from '@/lib/server/classroom-storage';

export const JIUXUANGE_PLAYER_VERSION = '1.0.0-rc.1';
export const OPENMAIC_COMPATIBILITY_VERSION = '0.3.0';
export const MAIC_COURSE_PACKAGE_FORMAT_VERSION = 2;

export interface PlayerPackageFile {
  path: string;
  mediaType: string;
  size: number;
  sha256: string;
}

export interface PlayerPackageLesson {
  id: string;
  courseId: string;
  title: string;
  summary: string;
  sequence: number;
  unlockAfterCaseId?: string;
}

export interface PlayerAgentDescriptor {
  id: string;
  name: string;
  role: string;
  persona: string;
  avatar?: string;
  color?: string;
  priority?: number;
}

export interface MaicCoursePackageManifestV2 {
  packageFormatVersion: 2;
  artifactType: 'runtime';
  packageId: string;
  playerVersion: string;
  minimumRuntimeVersion: string;
  sourceClassroomId: string;
  sourceVersion: string;
  contentVersion: string;
  reviewStatus: 'pilot' | 'published';
  createdAt: string;
  lesson: PlayerPackageLesson;
  agents: PlayerAgentDescriptor[];
  entrypoint: 'course/classroom.json';
  files: PlayerPackageFile[];
}

export interface LoadedPlayerPackage {
  manifest: MaicCoursePackageManifestV2;
  classroom: PersistedClassroomData;
}

export type PlayerProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface PlayerProgressSnapshot {
  packageId: string;
  caseId: string;
  contentVersion: string;
  progressVersion: number;
  nextSceneIndex: number;
  totalScenes: number;
  status: PlayerProgressStatus;
}

export interface PlayerLaunchTicketRequest {
  userId: string;
  packageId: string;
  returnTo?: string;
}

export interface PlayerSessionActor {
  userId: string;
  packageId?: string;
  preview: boolean;
}
