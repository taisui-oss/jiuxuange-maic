import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { BUSINESS_MODEL_CASE_LESSONS } from '@/lib/jiuxuange/course-catalog/business-model';
import { getDefaultAgents } from '@/lib/orchestration/registry/store';
import { buildRuntimeCoursePackageV2 } from '@/lib/server/jiuxuange-player/course-package-v2';
import type { PersistedClassroomData } from '@/lib/server/classroom-storage';
import type { PlayerAgentDescriptor } from '@/lib/jiuxuange/player/types';

async function main() {
  const root = process.cwd();
  const classroomDirectory = path.join(root, 'content', 'jiuxuange', 'classrooms');
  const packageDirectory = path.join(root, 'content', 'jiuxuange', 'player-packages');
  const defaultAgents: PlayerAgentDescriptor[] = getDefaultAgents().map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    persona: agent.persona ?? '',
  }));

  await fs.mkdir(packageDirectory, { recursive: true });

  const index: Array<{
    packageId: string;
    file: string;
    contentVersion: string;
    sourceVersion: string;
    scenes: number;
  }> = [];

  for (const lesson of BUSINESS_MODEL_CASE_LESSONS.filter(
    (candidate) => candidate.classroomId && candidate.releaseStatus !== 'in_review',
  )) {
    const classroomPath = path.join(classroomDirectory, `${lesson.classroomId}.json`);
    const raw = await fs.readFile(classroomPath, 'utf8');
    const classroom = JSON.parse(raw) as PersistedClassroomData;
    const sourceVersion = `sha256:${createHash('sha256').update(raw).digest('hex')}`;
    const built = await buildRuntimeCoursePackageV2({
      lesson: { ...lesson, classroomId: lesson.classroomId! },
      classroom,
      sourceVersion,
      defaultAgents,
    });
    const filename = `${lesson.id}.maic-course.zip`;
    await fs.writeFile(path.join(packageDirectory, filename), built.zip);
    index.push({
      packageId: lesson.id,
      file: filename,
      contentVersion: built.manifest.contentVersion,
      sourceVersion,
      scenes: classroom.scenes.length,
    });
  }

  await fs.writeFile(
    path.join(packageDirectory, 'index.json'),
    `${JSON.stringify({ formatVersion: 2, packages: index }, null, 2)}\n`,
    'utf8',
  );

  console.log(`Built ${index.length} MAIC Course Package V2 files in ${packageDirectory}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
