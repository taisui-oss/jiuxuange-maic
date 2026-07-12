import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  retrieveCourseContext,
  type JiuxuangeKnowledgeDocument,
} from '@/lib/c-cubic/knowledge/retrieve';

const SOURCE = {
  documentId: 'verified-source',
  sourcePath: '/Users/sijia/C立方/教材/verified-source.pdf',
  title: 'Verified source',
  authority: 'primary' as const,
  verificationStatus: 'verified' as const,
  page: 7,
};

const documents: JiuxuangeKnowledgeDocument[] = [
  {
    id: 'z-extension',
    courseId: 'business-model',
    title: 'Extension',
    authority: 'extension',
    sections: [
      {
        id: 'shared-fact',
        nodeIds: ['six-elements'],
        order: 1,
        kind: 'learner_fact',
        content: 'extension version',
        sources: [SOURCE],
      },
      {
        id: 'extension-only',
        nodeIds: ['six-elements'],
        order: 2,
        kind: 'learner_fact',
        content: 'extension-only fact',
        sources: [SOURCE],
      },
    ],
  },
  {
    id: 'b-course-override',
    courseId: 'business-model',
    title: 'Course override',
    authority: 'course_override',
    sections: [
      {
        id: 'shared-fact',
        nodeIds: ['six-elements'],
        order: 1,
        kind: 'learner_fact',
        content: 'course override version',
        sources: [SOURCE],
      },
    ],
  },
  {
    id: 'a-primary',
    courseId: 'business-model',
    title: 'Primary',
    authority: 'primary',
    sections: [
      {
        id: 'shared-fact',
        nodeIds: ['six-elements'],
        order: 2,
        kind: 'learner_fact',
        content: 'primary version',
        sources: [SOURCE],
      },
      {
        id: 'primary-first',
        nodeIds: ['six-elements'],
        order: 1,
        kind: 'learner_fact',
        content: 'primary first fact',
        sources: [SOURCE],
      },
    ],
  },
];

describe('Jiuxuange course-context retrieval', () => {
  it('resolves duplicate section ids by primary > course_override > extension', () => {
    const context = retrieveCourseContext(
      { courseId: 'business-model', nodeId: 'six-elements', stage: 'blind' },
      documents,
    );

    expect(context.sections.map((section) => section.content)).toEqual([
      'primary first fact',
      'primary version',
      'extension-only fact',
    ]);
    expect(context.sections.find((section) => section.id === 'shared-fact')).toMatchObject({
      documentId: 'a-primary',
      authority: 'primary',
    });
  });

  it('returns the same context regardless of the document input order', () => {
    const input = { courseId: 'business-model', nodeId: 'six-elements', stage: 'blind' } as const;

    expect(retrieveCourseContext(input, documents)).toEqual(
      retrieveCourseContext(input, [...documents].reverse()),
    );
  });

  it('returns no sections for a node outside the requested course', () => {
    expect(
      retrieveCourseContext(
        { courseId: 'other-course', nodeId: 'six-elements', stage: 'blind' },
        documents,
      ).sections,
    ).toEqual([]);
  });
});
