import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const standaloneRoot = resolve(root, '.next/standalone');
const staticSource = resolve(root, '.next/static');
const publicSource = resolve(root, 'public');
const classroomSource = resolve(root, 'content/jiuxuange/classrooms');

if (!existsSync(standaloneRoot) || !existsSync(staticSource)) {
  if (process.env.NETLIFY || process.env.VERCEL) {
    console.log('[standalone-assets] skipped for managed hosting build');
    process.exit(0);
  }

  throw new Error('Standalone output is incomplete. Run `next build` before staging assets.');
}

function replaceDirectory(source, target) {
  rmSync(target, { recursive: true, force: true });
  mkdirSync(resolve(target, '..'), { recursive: true });
  cpSync(source, target, { recursive: true });
}

replaceDirectory(staticSource, resolve(standaloneRoot, '.next/static'));

if (existsSync(publicSource)) {
  replaceDirectory(publicSource, resolve(standaloneRoot, 'public'));
}

if (existsSync(classroomSource)) {
  replaceDirectory(classroomSource, resolve(standaloneRoot, 'content/jiuxuange/classrooms'));
}

console.log('[standalone-assets] staged .next/static, public, and classroom assets');
