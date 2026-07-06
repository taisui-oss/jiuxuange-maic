import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

function readRepoFile(path: string): string {
  return readFileSync(resolve(__dirname, '..', '..', path), 'utf-8');
}

describe('Jiuxuange agent generation prompt guards', () => {
  it('keeps the role schema while steering generated agents toward Jiuxuange roles', () => {
    const route = readRepoFile('app/api/generate/agent-profiles/route.ts');
    const server = readRepoFile('lib/server/classroom-generation.ts');

    for (const source of [route, server]) {
      expect(source).toContain('Exactly 1 agent must have role "teacher"');
      expect(source).toContain('教授');
      expect(source).toContain('学长');
      expect(source).toContain('神秘角色');
      expect(source).toContain('成长反馈官');
      expect(source).toContain('不要生成“显眼包、好奇宝宝、笔记员、思考者”');
    }
  });
});
