export type JiuxuangeKnowledgeAuthority = 'primary' | 'course_override' | 'extension';

export type JiuxuangeKnowledgeSectionKind = 'learner_fact' | 'locked_analysis';

export type JiuxuangeKnowledgeStage = 'blind' | 'commit' | 'unlock' | 'compare';

export type JiuxuangeKnowledgeVerificationStatus = 'verified' | 'pending';

interface JiuxuangeKnowledgeSourceBase {
  documentId: string;
  sourcePath: string;
  title: string;
  authority: JiuxuangeKnowledgeAuthority;
  verificationStatus: JiuxuangeKnowledgeVerificationStatus;
}

export type JiuxuangeKnowledgeSource = JiuxuangeKnowledgeSourceBase &
  ({ page: number; headingPath?: never } | { headingPath: string[]; page?: never });

export interface JiuxuangeKnowledgeSection {
  id: string;
  nodeIds: string[];
  order: number;
  kind: JiuxuangeKnowledgeSectionKind;
  /** Curated instructional note, never a source document's full text. */
  content: string;
  sources: JiuxuangeKnowledgeSource[];
}

export interface JiuxuangeKnowledgeDocument {
  id: string;
  courseId: string;
  title: string;
  authority: JiuxuangeKnowledgeAuthority;
  sections: JiuxuangeKnowledgeSection[];
}

export interface RetrieveCourseContextInput {
  courseId: string;
  nodeId: string;
  stage: JiuxuangeKnowledgeStage;
}

export interface JiuxuangeRetrievedKnowledgeSection extends JiuxuangeKnowledgeSection {
  documentId: string;
  documentTitle: string;
  authority: JiuxuangeKnowledgeAuthority;
}

export interface JiuxuangeCourseContext {
  courseId: string;
  nodeId: string;
  stage: JiuxuangeKnowledgeStage;
  sections: JiuxuangeRetrievedKnowledgeSection[];
}
