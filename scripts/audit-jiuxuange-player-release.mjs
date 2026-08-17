import { promises as fs } from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const root = process.cwd();
const packageRoot = path.join(root, 'content', 'jiuxuange', 'player-packages');
const standalonePackageRoot = path.join(
  root,
  '.next',
  'standalone',
  'content',
  'jiuxuange',
  'player-packages',
);
const index = JSON.parse(await fs.readFile(path.join(packageRoot, 'index.json'), 'utf8'));
const failures = [];
const auditedPackages = [];

if (index.formatVersion !== 2 || !Array.isArray(index.packages) || index.packages.length !== 5) {
  failures.push('Player package index must contain exactly five V2 packages');
}

for (const descriptor of index.packages ?? []) {
  const packagePath = path.join(packageRoot, descriptor.file);
  const standalonePath = path.join(standalonePackageRoot, descriptor.file);
  const bytes = await fs.readFile(packagePath);
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  const manifest = JSON.parse(await zip.file('manifest.json').async('text'));
  const classroomText = await zip.file(manifest.entrypoint).async('text');

  if (/"(?:answer|analysis|commentPrompt)"\s*:/.test(classroomText)) {
    failures.push(`${descriptor.packageId}: learner package exposes grading data`);
  }
  if (/https?:\/\//i.test(classroomText)) {
    failures.push(`${descriptor.packageId}: learner package contains an external URL`);
  }
  if (manifest.contentVersion !== descriptor.contentVersion) {
    failures.push(`${descriptor.packageId}: package index content version mismatch`);
  }
  try {
    await fs.access(standalonePath);
  } catch {
    failures.push(`${descriptor.packageId}: package is missing from standalone output`);
  }

  auditedPackages.push({
    packageId: descriptor.packageId,
    scenes: descriptor.scenes,
    bytes: bytes.byteLength,
    contentVersion: descriptor.contentVersion,
  });
}

const staticRoot = path.join(root, '.next', 'static');
const privatePromptMarkers = ['不暴露内部评分维度', '你是九轩阁商业模式大课里的'];

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(resolved)));
    else files.push(resolved);
  }
  return files;
}

for (const file of await walk(staticRoot)) {
  if (!/\.(?:js|json|map)$/.test(file)) continue;
  const content = await fs.readFile(file, 'utf8');
  for (const marker of privatePromptMarkers) {
    if (content.includes(marker)) failures.push(`Client asset leaks private Agent prompt: ${file}`);
  }
}

const result = {
  playerVersion: '1.0.0-rc.1',
  packageFormatVersion: 2,
  auditedPackages,
  promptMarkersChecked: privatePromptMarkers.length,
  failures,
  passed: failures.length === 0,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.passed) process.exit(1);
