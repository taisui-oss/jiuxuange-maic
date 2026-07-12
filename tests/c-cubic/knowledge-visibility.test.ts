import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { JIUXUANGE_KNOWLEDGE_DOCUMENTS } from '@/lib/c-cubic/knowledge/catalog';
import { retrieveCourseContext } from '@/lib/c-cubic/knowledge/retrieve';

describe('Jiuxuange knowledge visibility', () => {
  it.each(['blind', 'commit'] as const)('never returns locked analysis during %s', (stage) => {
    const context = retrieveCourseContext({
      courseId: 'business-model',
      nodeId: 'six-elements',
      stage,
    });

    expect(context.sections.every((section) => section.kind === 'learner_fact')).toBe(true);
    expect(context.sections.map((section) => section.content).join('\n')).not.toContain('分析提示');
  });

  it.each(['unlock', 'compare'] as const)('releases locked analysis during %s', (stage) => {
    const context = retrieveCourseContext({
      courseId: 'business-model',
      nodeId: 'six-elements',
      stage,
    });

    expect(context.sections.some((section) => section.kind === 'locked_analysis')).toBe(true);
  });

  it('ships compact samples sourced only from the user local case PDFs', () => {
    const samples = JIUXUANGE_KNOWLEDGE_DOCUMENTS.filter((document) =>
      ['bianlifeng', 'dingdong-fresh'].includes(document.id),
    );
    const sections = samples.flatMap((document) => document.sections);
    const serialized = JSON.stringify(samples);

    expect(samples.map((document) => document.id)).toEqual(['bianlifeng', 'dingdong-fresh']);
    expect(samples.every((document) => document.sections.length <= 3)).toBe(true);
    expect(sections.every((section) => section.content.length <= 160)).toBe(true);
    expect(serialized).not.toMatch(/https?:\/\/|whitepaper|白皮书|sec\.gov/i);

    for (const document of samples) {
      for (const source of document.sections.flatMap((section) => section.sources)) {
        expect(source).toMatchObject({
          documentId: document.id,
          sourcePath: expect.stringMatching(
            /^\/Users\/sijia\/C立方\/商业模式学原理\/商业模式大课图书\/1\.案例库\/.+\.pdf$/,
          ),
          authority: document.authority,
          verificationStatus: 'verified',
          page: expect.any(Number),
        });
      }
    }
  });

  it('retrieves a verified concept section from the private Markdown textbook', () => {
    const context = retrieveCourseContext({
      courseId: 'business-model',
      nodeId: 'positioning',
      stage: 'blind',
    });

    expect(context.sections).toEqual([
      expect.objectContaining({
        kind: 'learner_fact',
        sources: [
          expect.objectContaining({
            sourcePath: expect.stringContaining('商业模式学原理.md'),
            headingPath: expect.arrayContaining(['第3章 商业模式六要素模型']),
          }),
        ],
      }),
    ]);
  });

  it('isolates each case context and releases only its own analysis', () => {
    const bee = retrieveCourseContext({
      courseId: 'business-model',
      nodeId: 'convenience-bee',
      stage: 'unlock',
    });
    const fresh = retrieveCourseContext({
      courseId: 'business-model',
      nodeId: 'fresh-grocery-comparison',
      stage: 'unlock',
    });

    expect(bee.sections.map((section) => section.documentId)).toEqual([
      'bianlifeng',
      'bianlifeng',
      'bianlifeng',
    ]);
    expect(fresh.sections.map((section) => section.documentId)).toEqual([
      'dingdong-fresh',
      'dingdong-fresh',
      'dingdong-fresh',
    ]);
  });
});
