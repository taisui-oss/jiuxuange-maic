import { createHash } from 'crypto';
import JSZip from 'jszip';
import type { CaseOnlyLesson } from '@/lib/jiuxuange/case-only/catalog';
import type { PersistedClassroomData } from '@/lib/server/classroom-storage';
import {
  JIUXUANGE_PLAYER_VERSION,
  MAIC_COURSE_PACKAGE_FORMAT_VERSION,
  OPENMAIC_COMPATIBILITY_VERSION,
  type LoadedPlayerPackage,
  type MaicCoursePackageManifestV2,
  type PlayerAgentDescriptor,
  type PlayerPackageFile,
} from '@/lib/jiuxuange/player/types';

const CLASSROOM_PATH = 'course/classroom.json';
const URL_PATTERN = /https?:\/\//i;

export function stableJson(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (!input || typeof input !== 'object') return input;
    if (seen.has(input)) throw new Error('Course package data contains a circular reference');
    seen.add(input);
    const record = input as Record<string, unknown>;
    const normalized = Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, normalize(record[key])]),
    );
    seen.delete(input);
    return normalized;
  };
  return JSON.stringify(normalize(value));
}

export function sha256(value: string | Uint8Array): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export function stripLearnerAnswers(classroom: PersistedClassroomData): PersistedClassroomData {
  return {
    ...classroom,
    scenes: classroom.scenes.map((scene) => {
      if (scene.type !== 'quiz' || scene.content.type !== 'quiz') return scene;
      return {
        ...scene,
        content: {
          ...scene.content,
          questions: scene.content.questions.map((question) => {
            const {
              answer: _answer,
              analysis: _analysis,
              commentPrompt: _commentPrompt,
              hasAnswer: _hasAnswer,
              ...learnerQuestion
            } = question;
            return learnerQuestion;
          }),
        },
      };
    }),
  };
}

function findExternalResourceReferences(classroom: PersistedClassroomData): string[] {
  const found = new Set<string>();
  const visit = (value: unknown, key?: string) => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key));
      return;
    }
    if (value && typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([childKey, child]) =>
        visit(child, childKey),
      );
      return;
    }
    if (typeof value !== 'string' || !URL_PATTERN.test(value)) return;
    if (key === 'html' || ['src', 'href', 'url', 'audioUrl', 'artifactRef'].includes(key ?? '')) {
      found.add(value.length > 240 ? `${value.slice(0, 237)}...` : value);
    }
  };
  visit(classroom);
  return [...found];
}

function assertLearnerPackageSafe(classroom: PersistedClassroomData): void {
  for (const scene of classroom.scenes) {
    if (scene.type !== 'quiz' || scene.content.type !== 'quiz') continue;
    for (const question of scene.content.questions) {
      if ('answer' in question || 'analysis' in question || 'commentPrompt' in question) {
        throw new Error(`Learner package leaks answer data in ${scene.id}/${question.id}`);
      }
    }
  }
  const externalReferences = findExternalResourceReferences(classroom);
  if (externalReferences.length > 0) {
    throw new Error(
      `Course package contains external resources: ${externalReferences.slice(0, 3).join(', ')}`,
    );
  }
}

function assertClassroomIdentity(
  lesson: CaseOnlyLesson,
  classroom: PersistedClassroomData,
): void {
  if (classroom.id !== lesson.classroomId || classroom.stage.id !== lesson.classroomId) {
    throw new Error(`Course package identity mismatch for ${lesson.id}`);
  }
  if (!classroom.generationComplete || classroom.scenes.length === 0) {
    throw new Error(`Course package is incomplete for ${lesson.id}`);
  }
  const ordered = [...classroom.scenes].sort((left, right) => left.order - right.order);
  if (ordered.some((scene, index) => scene.order !== index + 1)) {
    throw new Error(`Course package scene order is invalid for ${lesson.id}`);
  }
}

function resolveAgents(
  classroom: PersistedClassroomData,
  defaultAgents: PlayerAgentDescriptor[],
): PlayerAgentDescriptor[] {
  const configured = classroom.stage.generatedAgentConfigs ?? [];
  if (configured.length > 0) {
    return configured.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      persona: agent.persona,
      avatar: agent.avatar,
      color: agent.color,
      priority: agent.priority,
    }));
  }
  const selected = new Set(classroom.stage.agentIds ?? []);
  return defaultAgents.filter((agent) => selected.size === 0 || selected.has(agent.id));
}

export async function buildRuntimeCoursePackageV2(input: {
  lesson: CaseOnlyLesson;
  classroom: PersistedClassroomData;
  sourceVersion: string;
  defaultAgents: PlayerAgentDescriptor[];
}): Promise<{ manifest: MaicCoursePackageManifestV2; zip: Buffer }> {
  assertClassroomIdentity(input.lesson, input.classroom);
  const classroom = stripLearnerAnswers({
    ...input.classroom,
    scenes: [...input.classroom.scenes].sort((left, right) => left.order - right.order),
  });
  assertLearnerPackageSafe(classroom);

  const classroomJson = stableJson(classroom);
  const contentVersion = sha256(classroomJson);
  const classroomFile: PlayerPackageFile = {
    path: CLASSROOM_PATH,
    mediaType: 'application/json',
    size: Buffer.byteLength(classroomJson),
    sha256: sha256(classroomJson),
  };
  const manifest: MaicCoursePackageManifestV2 = {
    packageFormatVersion: MAIC_COURSE_PACKAGE_FORMAT_VERSION,
    artifactType: 'runtime',
    packageId: input.lesson.id,
    playerVersion: JIUXUANGE_PLAYER_VERSION,
    minimumRuntimeVersion: OPENMAIC_COMPATIBILITY_VERSION,
    sourceClassroomId: input.classroom.id,
    sourceVersion: input.sourceVersion,
    contentVersion,
    reviewStatus: input.lesson.releaseStatus === 'published' ? 'published' : 'pilot',
    createdAt: new Date(0).toISOString(),
    lesson: {
      id: input.lesson.id,
      courseId: 'business-model',
      title: input.lesson.title,
      summary: input.lesson.summary,
      sequence: input.lesson.sequence,
      unlockAfterCaseId: input.lesson.unlockAfterCaseId,
    },
    agents: resolveAgents(classroom, input.defaultAgents),
    entrypoint: CLASSROOM_PATH,
    files: [classroomFile],
  };

  const zip = new JSZip();
  const fixedDate = new Date(0);
  zip.file('manifest.json', stableJson(manifest), { date: fixedDate });
  zip.file(CLASSROOM_PATH, classroomJson, { date: fixedDate });
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    platform: 'UNIX',
  });
  return { manifest, zip: buffer };
}

function assertManifest(value: unknown): asserts value is MaicCoursePackageManifestV2 {
  const manifest = value as Partial<MaicCoursePackageManifestV2> | null;
  if (
    !manifest ||
    manifest.packageFormatVersion !== MAIC_COURSE_PACKAGE_FORMAT_VERSION ||
    manifest.artifactType !== 'runtime' ||
    !manifest.packageId ||
    !manifest.contentVersion ||
    manifest.entrypoint !== CLASSROOM_PATH ||
    !Array.isArray(manifest.files)
  ) {
    throw new Error('Invalid MAIC Course Package V2 manifest');
  }
  if (manifest.minimumRuntimeVersion !== OPENMAIC_COMPATIBILITY_VERSION) {
    throw new Error(`Unsupported OpenMAIC runtime: ${manifest.minimumRuntimeVersion}`);
  }
}

export async function loadRuntimeCoursePackageV2(buffer: Uint8Array): Promise<LoadedPlayerPackage> {
  const zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) throw new Error('Course package manifest is missing');
  const manifest = JSON.parse(await manifestEntry.async('text')) as unknown;
  assertManifest(manifest);

  for (const file of manifest.files) {
    if (file.path.includes('..') || file.path.startsWith('/')) {
      throw new Error(`Unsafe course package path: ${file.path}`);
    }
    const entry = zip.file(file.path);
    if (!entry) throw new Error(`Course package file is missing: ${file.path}`);
    const bytes = await entry.async('uint8array');
    if (bytes.byteLength !== file.size || sha256(bytes) !== file.sha256) {
      throw new Error(`Course package checksum mismatch: ${file.path}`);
    }
  }

  const classroomEntry = zip.file(manifest.entrypoint);
  if (!classroomEntry) throw new Error('Course package classroom is missing');
  const classroomText = (await classroomEntry.async('text')).trimEnd();
  if (sha256(classroomText) !== manifest.contentVersion) {
    throw new Error('Course package content_version mismatch');
  }
  const classroom = JSON.parse(classroomText) as PersistedClassroomData;
  assertLearnerPackageSafe(classroom);
  if (classroom.id !== manifest.sourceClassroomId) {
    throw new Error('Course package classroom identity mismatch');
  }
  return { manifest, classroom };
}
