export type PortalContext = 'course' | 'free_learning' | 'assessment';

export interface CourseVersion {
  id: string;
  courseId: string;
  version: string;
  title: string;
  summary: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
}

export interface CourseEnrollment {
  id: string;
  learnerId: string;
  classId: string;
  courseVersionId: string;
  status: 'active' | 'completed' | 'revoked';
}

export interface LearningSession {
  id: string;
  learnerId: string;
  courseVersionId: string;
  kind: 'official_course' | 'free_learning';
  stageId?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'read_only';
  updatedAt: string;
}

export interface GroupMembership {
  id: string;
  learnerId: string;
  groupId: string;
  classId: string;
  status: 'active' | 'inactive';
}

export interface ProjectFact {
  id: string;
  text: string;
  sourceLabel: string;
}

export interface ProjectCardContextField {
  id: string;
  label: string;
  value: string;
  status: 'draft' | 'owner_confirmed' | 'unknown';
  disclosure: 'allow' | 'mask';
}

export interface ProjectCardContextSection {
  id: string;
  title: string;
  summary: string;
  fields: ProjectCardContextField[];
}

export interface ProjectCardMaterial {
  id: string;
  title: string;
  materialType: 'project_assignment' | 'business_profile' | 'operating_data' | 'other';
  pageCount?: number;
  uploadedAt: string;
  parseStatus: 'parsed' | 'pending' | 'failed';
  disclosure: 'allow' | 'mask';
  safeSummary: string;
}

export interface ProjectCardVersion {
  id: string;
  groupId: string;
  projectId: string;
  version: string;
  title: string;
  facts: ProjectFact[];
  contextSections?: ProjectCardContextSection[];
  materials?: ProjectCardMaterial[];
  informationAsOf?: string;
  ownerConfirmationStatus?: 'pending' | 'confirmed';
  frozenAt: string;
}

export interface AssessmentQuestion {
  id: string;
  title?: string;
  questionType?:
    | 'fact_diagnosis'
    | 'hypothesis_evaluation'
    | 'option_comparison'
    | 'causal_reasoning'
    | 'judgment_revision';
  prompt: string;
  learningObjectiveIds?: string[];
  courseConceptIds?: string[];
  scenarioFactIds?: string[];
  introducedHypothesis?: string;
  introducedNewInformation?: string;
  minimumFactReferences?: number;
  rubricDimensionIds?: Array<
    | 'concept_application'
    | 'project_specificity'
    | 'fact_hypothesis_distinction'
    | 'causal_logic'
    | 'options_tradeoffs'
    | 'validation_awareness'
  >;
  required: true;
}

export interface AssessmentAssignment {
  id: string;
  title: string;
  groupId: string;
  projectId: string;
  projectCardVersionId: string;
  questionVersion: string;
  questions: AssessmentQuestion[];
  promptVersion: string;
  rubricVersion: string;
  status: 'draft' | 'published' | 'closed';
  publishedAt?: string;
}

export interface AssessmentFeedback {
  kind: 'directional' | 'final';
  body: string;
  changedQuestionIds: string[];
  evidenceAnswerIds: string[];
}

export interface AssessmentAttempt {
  id: string;
  assessmentSessionId: string;
  learnerId: string;
  attemptNumber: 1 | 2;
  answers: Record<string, string>;
  submittedAt: string;
  feedback: AssessmentFeedback;
}

export interface AssessmentSession {
  id: string;
  learnerId: string;
  assignmentId: string;
  projectId: string;
  projectCardVersionId: string;
  questionVersion: string;
  questions: AssessmentQuestion[];
  status: 'draft' | 'revision' | 'locked';
  draftAnswers: Record<string, string>;
  attemptIds: string[];
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  learnerId: string;
  context: PortalContext;
  eventType: 'active_heartbeat';
  occurredAt: string;
  creditedSeconds: number;
  visible: boolean;
  secondsSinceInteraction: number;
}

export interface JiuxuangePortalState {
  schemaVersion: 1;
  courseVersions: CourseVersion[];
  courseEnrollments: CourseEnrollment[];
  learningSessions: LearningSession[];
  groupMemberships: GroupMembership[];
  projectCardVersions: ProjectCardVersion[];
  assessmentAssignments: AssessmentAssignment[];
  assessmentSessions: AssessmentSession[];
  assessmentAttempts: AssessmentAttempt[];
  activityEvents: ActivityEvent[];
}

export interface LearnerPortalView {
  learnerId: string;
  courses: Array<{
    enrollmentId: string;
    courseVersionId: string;
    title: string;
    summary: string;
    version: string;
    sessionStatus: LearningSession['status'];
    stageId?: string;
  }>;
  assessments: Array<{
    assignmentId: string;
    title: string;
    projectId: string;
    projectCardVersionId: string;
    projectTitle: string;
    projectCardVersion: string;
    status: 'available' | 'in_progress' | 'locked';
    attemptsUsed: number;
  }>;
  activeSeconds: Record<PortalContext, number>;
}
