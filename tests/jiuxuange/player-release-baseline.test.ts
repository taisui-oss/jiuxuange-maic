import { promises as fs } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  JIUXUANGE_PLAYER_VERSION,
  MAIC_COURSE_PACKAGE_FORMAT_VERSION,
  OPENMAIC_COMPATIBILITY_VERSION,
} from '@/lib/jiuxuange/player/types';
import { loadRuntimeCoursePackageV2 } from '@/lib/server/jiuxuange-player/course-package-v2';

interface PackageBaseline {
  packageId: string;
  contentVersion: string;
  sourceVersion: string;
  scenes: number;
  requiredQuestions: number;
}

interface AcceptanceBaseline {
  schemaVersion: number;
  candidate: {
    playerVersion: string;
    openMaicCompatibility: string;
    packageFormatVersion: number;
    sourceBaselineCommit: string;
    recordedAt: string;
  };
  packages: PackageBaseline[];
  acceptance: {
    deterministicCourseEquivalence: string;
    serverAuthoritativeProgression: string;
    desktopRendering: string;
    mobileRendering: string;
    liveAgentProvider: string;
    genericOpenMaicImport: string;
    productionRelease: string;
    visualComparison: {
      changedPixelRatio: number;
      maximumChangedPixelRatio: number;
      passed: boolean;
    };
    targetedTests: { command: string; files: number; tests: number; exitCode: number };
    fullTests: { command: string; files: number; tests: number; exitCode: number };
    productionBuild: { status: string; exitCode: number };
    localManifestLoad: {
      requests: number;
      concurrency: number;
      httpErrors: number;
      p95Milliseconds: number;
      maximumP95Milliseconds: number;
      passed: boolean;
    };
    testHarness: {
      databaseFileParallelism: boolean;
      reason: string;
    };
  };
  evidenceFiles: string[];
}

interface PackageIndex {
  formatVersion: number;
  packages: Array<{
    packageId: string;
    file: string;
    contentVersion: string;
    sourceVersion: string;
    scenes: number;
  }>;
}

const root = process.cwd();
const fixturePath = path.join(
  root,
  'tests',
  'jiuxuange',
  'fixtures',
  'player-v1-acceptance-baseline.json',
);
const packageRoot = path.join(root, 'content', 'jiuxuange', 'player-packages');

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

function countRequiredQuestions(
  classroom: Awaited<ReturnType<typeof loadRuntimeCoursePackageV2>>['classroom'],
) {
  return classroom.scenes.reduce((total, scene) => {
    if (scene.type !== 'quiz' || scene.content.type !== 'quiz') return total;
    return total + scene.content.questions.length;
  }, 0);
}

describe('Jiuxuange Player V1 release baseline', () => {
  test('locks the runtime and five reviewed course packages to the accepted versions', async () => {
    const baseline = await readJson<AcceptanceBaseline>(fixturePath);
    const index = await readJson<PackageIndex>(path.join(packageRoot, 'index.json'));

    expect(baseline.schemaVersion).toBe(1);
    expect(baseline.candidate).toMatchObject({
      playerVersion: JIUXUANGE_PLAYER_VERSION,
      openMaicCompatibility: OPENMAIC_COMPATIBILITY_VERSION,
      packageFormatVersion: MAIC_COURSE_PACKAGE_FORMAT_VERSION,
    });
    expect(baseline.candidate.sourceBaselineCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(index.formatVersion).toBe(baseline.candidate.packageFormatVersion);
    expect(index.packages).toHaveLength(5);
    expect(index.packages.map((entry) => entry.packageId)).toEqual(
      baseline.packages.map((entry) => entry.packageId),
    );

    for (const [position, expected] of baseline.packages.entries()) {
      const descriptor = index.packages[position];
      expect(descriptor).toMatchObject({
        packageId: expected.packageId,
        contentVersion: expected.contentVersion,
        sourceVersion: expected.sourceVersion,
        scenes: expected.scenes,
      });

      const loaded = await loadRuntimeCoursePackageV2(
        await fs.readFile(path.join(packageRoot, descriptor.file)),
      );
      expect(loaded.manifest).toMatchObject({
        packageId: expected.packageId,
        contentVersion: expected.contentVersion,
        sourceVersion: expected.sourceVersion,
        packageFormatVersion: baseline.candidate.packageFormatVersion,
        minimumRuntimeVersion: baseline.candidate.openMaicCompatibility,
      });
      expect(loaded.manifest.lesson.sequence).toBe(position + 1);
      expect(loaded.classroom.scenes).toHaveLength(expected.scenes);
      expect(countRequiredQuestions(loaded.classroom)).toBe(expected.requiredQuestions);
    }
  });

  test('keeps the acceptance evidence and its explicit release boundaries', async () => {
    const baseline = await readJson<AcceptanceBaseline>(fixturePath);
    const { acceptance } = baseline;

    expect(acceptance).toMatchObject({
      deterministicCourseEquivalence: 'passed',
      serverAuthoritativeProgression: 'passed',
      desktopRendering: 'passed',
      mobileRendering: 'passed',
      liveAgentProvider: 'conditional',
      genericOpenMaicImport: 'blocked',
      productionRelease: 'not_executed',
    });
    expect(acceptance.visualComparison.passed).toBe(true);
    expect(acceptance.visualComparison.changedPixelRatio).toBeLessThan(
      acceptance.visualComparison.maximumChangedPixelRatio,
    );
    expect(acceptance.targetedTests.exitCode).toBe(0);
    expect(acceptance.targetedTests).toMatchObject({ files: 14, tests: 40 });
    expect(acceptance.fullTests.exitCode).toBe(0);
    expect(acceptance.fullTests).toMatchObject({ files: 321, tests: 2330 });
    expect(acceptance.productionBuild).toEqual({ status: 'passed', exitCode: 0 });
    expect(acceptance.localManifestLoad.passed).toBe(true);
    expect(acceptance.localManifestLoad.httpErrors).toBe(0);
    expect(acceptance.localManifestLoad.p95Milliseconds).toBeLessThan(
      acceptance.localManifestLoad.maximumP95Milliseconds,
    );
    expect(acceptance.testHarness.databaseFileParallelism).toBe(false);
    expect(acceptance.testHarness.reason).toMatch(/shared test tables/);

    for (const evidenceFile of baseline.evidenceFiles) {
      const stats = await fs.stat(path.join(root, evidenceFile));
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    }
  });
});
