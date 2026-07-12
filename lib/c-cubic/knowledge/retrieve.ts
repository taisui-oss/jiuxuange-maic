import 'server-only';

import { JIUXUANGE_KNOWLEDGE_DOCUMENTS } from './catalog';
import type {
  JiuxuangeCourseContext,
  JiuxuangeKnowledgeAuthority,
  JiuxuangeKnowledgeDocument,
  JiuxuangeKnowledgeStage,
  JiuxuangeRetrievedKnowledgeSection,
  RetrieveCourseContextInput,
} from './types';

export type {
  JiuxuangeCourseContext,
  JiuxuangeKnowledgeAuthority,
  JiuxuangeKnowledgeDocument,
  JiuxuangeKnowledgeSection,
  JiuxuangeKnowledgeSectionKind,
  JiuxuangeKnowledgeSource,
  JiuxuangeKnowledgeStage,
  JiuxuangeKnowledgeVerificationStatus,
  JiuxuangeRetrievedKnowledgeSection,
  RetrieveCourseContextInput,
} from './types';

const AUTHORITY_RANK: Readonly<Record<JiuxuangeKnowledgeAuthority, number>> = {
  primary: 0,
  course_override: 1,
  extension: 2,
};

function allowsLockedAnalysis(stage: JiuxuangeKnowledgeStage): boolean {
  return stage === 'unlock' || stage === 'compare';
}

function compareSections(
  left: JiuxuangeRetrievedKnowledgeSection,
  right: JiuxuangeRetrievedKnowledgeSection,
): number {
  return (
    AUTHORITY_RANK[left.authority] - AUTHORITY_RANK[right.authority] ||
    left.documentId.localeCompare(right.documentId) ||
    left.order - right.order ||
    left.id.localeCompare(right.id)
  );
}

export function retrieveCourseContext(
  input: RetrieveCourseContextInput,
  documents: readonly JiuxuangeKnowledgeDocument[] = JIUXUANGE_KNOWLEDGE_DOCUMENTS,
): JiuxuangeCourseContext {
  const candidates = documents
    .filter((document) => document.courseId === input.courseId)
    .flatMap((document) =>
      document.sections
        .filter((section) => section.nodeIds.includes(input.nodeId))
        .map<JiuxuangeRetrievedKnowledgeSection>((section) => ({
          ...section,
          documentId: document.id,
          documentTitle: document.title,
          authority: document.authority,
        })),
    )
    .sort(compareSections);

  const resolvedBySectionId = new Map<string, JiuxuangeRetrievedKnowledgeSection>();
  for (const candidate of candidates) {
    if (!resolvedBySectionId.has(candidate.id)) resolvedBySectionId.set(candidate.id, candidate);
  }

  const sections = [...resolvedBySectionId.values()].filter(
    (section) => section.kind === 'learner_fact' || allowsLockedAnalysis(input.stage),
  );

  return {
    courseId: input.courseId,
    nodeId: input.nodeId,
    stage: input.stage,
    sections,
  };
}
