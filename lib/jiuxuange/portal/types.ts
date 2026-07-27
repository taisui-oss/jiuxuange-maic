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

export interface ProjectCardVersion {
  id: string;
  groupId: string;
  projectId: string;
  version: string;
  title: string;
  facts: ProjectFact[];
  frozenAt: string;
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
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
