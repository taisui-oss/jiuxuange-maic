import { promises as fs } from 'fs';
import path from 'path';
import { createDemoPortalState } from '@/lib/jiuxuange/portal/domain';
import { migrateJiuxuangePortalState } from '@/lib/jiuxuange/portal/migrations';
import type { JiuxuangePortalState } from '@/lib/jiuxuange/portal/types';
import { writeJsonFileAtomic } from '@/lib/server/classroom-storage';

let writeQueue = Promise.resolve();

function dataFilePath() {
  const dataDir =
    process.env.JIUXUANGE_PORTAL_DATA_DIR ?? path.join(process.cwd(), 'data', 'jiuxuange-portal');
  return path.join(dataDir, 'portal-state.v1.json');
}

function isPortalState(value: unknown): value is JiuxuangePortalState {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as JiuxuangePortalState).schemaVersion === 1 &&
    Array.isArray((value as JiuxuangePortalState).assessmentAssignments)
  );
}

export async function readPortalState(): Promise<JiuxuangePortalState> {
  try {
    const content = await fs.readFile(dataFilePath(), 'utf8');
    const parsed = JSON.parse(content) as unknown;
    if (!isPortalState(parsed)) throw new Error('Unsupported Jiuxuange portal data schema.');
    return migrateJiuxuangePortalState(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return createDemoPortalState();
  }
}

export async function writePortalState(state: JiuxuangePortalState) {
  await writeJsonFileAtomic(dataFilePath(), state);
}

export async function updatePortalState<T>(
  update: (state: JiuxuangePortalState) => T | Promise<T>,
): Promise<T> {
  let result!: T;
  const operation = writeQueue.then(async () => {
    const state = await readPortalState();
    result = await update(state);
    await writePortalState(state);
  });
  writeQueue = operation.catch(() => undefined);
  await operation;
  return result;
}
