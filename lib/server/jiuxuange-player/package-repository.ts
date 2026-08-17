import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import type { LoadedPlayerPackage } from '@/lib/jiuxuange/player/types';
import { loadRuntimeCoursePackageV2 } from './course-package-v2';

const PACKAGE_DIRECTORY = path.join(
  process.cwd(),
  'content',
  'jiuxuange',
  'player-packages',
);
const PACKAGE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,127}$/;

interface CachedPackage {
  mtimeMs: number;
  value: LoadedPlayerPackage;
  buffer: Buffer;
}

const cache = new Map<string, CachedPackage>();

function packagePath(packageId: string): string {
  if (!PACKAGE_ID_PATTERN.test(packageId)) throw new Error('Invalid player package id');
  return path.join(PACKAGE_DIRECTORY, `${packageId}.maic-course.zip`);
}

export async function readPlayerPackage(packageId: string): Promise<LoadedPlayerPackage | null> {
  const filePath = packagePath(packageId);
  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }

  const existing = cache.get(packageId);
  if (existing?.mtimeMs === stat.mtimeMs) return existing.value;
  const buffer = await fs.readFile(filePath);
  const value = await loadRuntimeCoursePackageV2(buffer);
  if (value.manifest.packageId !== packageId) {
    throw new Error('Player package id does not match manifest');
  }
  cache.set(packageId, { mtimeMs: stat.mtimeMs, value, buffer });
  return value;
}

export async function readPlayerPackageFile(
  packageId: string,
  filePath: string,
): Promise<{ bytes: Uint8Array; mediaType: string } | null> {
  const loaded = await readPlayerPackage(packageId);
  if (!loaded) return null;
  const descriptor = loaded.manifest.files.find((file) => file.path === filePath);
  if (!descriptor) return null;
  const cached = cache.get(packageId);
  if (!cached) return null;
  const zip = await JSZip.loadAsync(cached.buffer, { checkCRC32: true });
  const entry = zip.file(filePath);
  if (!entry) return null;
  return { bytes: await entry.async('uint8array'), mediaType: descriptor.mediaType };
}

export function clearPlayerPackageCache(): void {
  cache.clear();
}
