import { promises as fs } from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';
import { getCaseOnlyLesson } from '@/lib/jiuxuange/case-only/catalog';
import { getDefaultAgents } from '@/lib/orchestration/registry/store';
import type { PersistedClassroomData } from '@/lib/server/classroom-storage';
import {
  buildRuntimeCoursePackageV2,
  loadRuntimeCoursePackageV2,
  sha256,
} from '@/lib/server/jiuxuange-player/course-package-v2';

async function fixture() {
  const lesson = getCaseOnlyLesson('breakfast-chain-six-elements-foundation');
  if (!lesson) throw new Error('Fixture lesson is missing');
  const raw = await fs.readFile(
    path.join(process.cwd(), 'content', 'jiuxuange', 'classrooms', `${lesson.classroomId}.json`),
    'utf8',
  );
  return {
    lesson,
    classroom: JSON.parse(raw) as PersistedClassroomData,
    sourceVersion: sha256(raw),
    defaultAgents: getDefaultAgents().map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      persona: agent.persona ?? '',
    })),
  };
}

describe('MAIC Course Package V2', () => {
  test('builds a deterministic, answer-free five-case-compatible package', async () => {
    const input = await fixture();
    const first = await buildRuntimeCoursePackageV2(input);
    const second = await buildRuntimeCoursePackageV2(input);
    expect(first.zip.equals(second.zip)).toBe(true);

    const loaded = await loadRuntimeCoursePackageV2(first.zip);
    expect(loaded.manifest.packageFormatVersion).toBe(2);
    expect(loaded.manifest.minimumRuntimeVersion).toBe('0.3.0');
    expect(loaded.classroom.scenes).toHaveLength(10);
    expect(loaded.manifest.agents.map((agent) => agent.id)).toEqual([
      'default-1',
      'default-2',
      'default-3',
      'default-4',
    ]);
    expect(loaded.classroom.scenes.map((scene) => scene.actions)).toEqual(
      input.classroom.scenes.map((scene) => scene.actions),
    );
    const learnerJson = JSON.stringify(loaded.classroom);
    expect(learnerJson).not.toMatch(/"answer"\s*:/);
    expect(learnerJson).not.toMatch(/"commentPrompt"\s*:/);
    expect(learnerJson).not.toMatch(/https?:\/\//);
  });

  test('rejects a classroom that still depends on an external resource', async () => {
    const input = await fixture();
    const classroom = structuredClone(input.classroom);
    const firstSlide = classroom.scenes.find(
      (scene) => scene.type === 'slide' && scene.content.type === 'slide',
    );
    if (!firstSlide || firstSlide.content.type !== 'slide') throw new Error('Slide fixture missing');
    firstSlide.content.canvas.elements.push({
      id: 'external-image',
      type: 'image',
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      src: 'https://example.com/not-portable.png',
      rotate: 0,
    });
    await expect(buildRuntimeCoursePackageV2({ ...input, classroom })).rejects.toThrow(
      /external resources/,
    );
  });

  test('rejects tampered package bytes', async () => {
    const built = await buildRuntimeCoursePackageV2(await fixture());
    const tampered = Buffer.from(built.zip);
    tampered[Math.floor(tampered.length / 2)] ^= 0xff;
    await expect(loadRuntimeCoursePackageV2(tampered)).rejects.toThrow();
  });
});
