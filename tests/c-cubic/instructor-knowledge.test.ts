import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { BUSINESS_MODEL_GUIDED_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v2';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';
import { buildJiuxuangeKnowledgeBlock } from '@/lib/pbl/v2/agents/instructor';

describe('Jiuxuange Instructor private knowledge context', () => {
  const project = createJiuxuangeProject(BUSINESS_MODEL_GUIDED_PACKAGE, {
    now: '2026-07-11T00:00:00.000Z',
  });

  it('injects concept context without exposing source paths to the learner', () => {
    const task = project.milestones[2].microtasks[0];
    const block = buildJiuxuangeKnowledgeBlock(project, task);

    expect(block).toContain('定位从交易主体');
    expect(block).toContain('来源定位：');
    expect(block).not.toContain('/Users/sijia/');
  });

  it('keeps author analysis locked before commit and releases it after commit', () => {
    const tasks = project.milestones[7].microtasks;
    const blind = buildJiuxuangeKnowledgeBlock(project, tasks[0]);
    const commit = buildJiuxuangeKnowledgeBlock(project, tasks[1]);
    const unlock = buildJiuxuangeKnowledgeBlock(project, tasks[2]);

    expect(blind).not.toContain('分析提示');
    expect(commit).not.toContain('分析提示');
    expect(unlock).toContain('分析提示');
    expect(unlock).toContain('不是唯一答案');
  });
});
