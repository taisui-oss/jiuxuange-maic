import type { JiuxuangeCoursePackage } from './course-package/types';
import type { PBLProjectV2, PBLRuntimeEvent } from '@/lib/pbl/v2/types';
import { getCurrentJiuxuangeMicrotask } from './runtime';

function fingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function eventId(prefix: string, now: string, fingerprintValue: string): string {
  return `${prefix}_${Date.parse(now).toString(16)}_${fingerprintValue}`;
}

export function retryJiuxuangeTask(
  project: PBLProjectV2,
  coursePackage: JiuxuangeCoursePackage,
  options: { now: string },
): { hintLevel: 1 | 2 | 3; question: string; questionFingerprint: string } {
  const task = getCurrentJiuxuangeMicrotask(project);
  if (!task?.jiuxuange) throw new Error('Jiuxuange retry requires an active learning task');
  const metadata = task.jiuxuange;
  const templateId = metadata.questionTemplateId;
  if (!templateId) throw new Error('Jiuxuange retry requires a question template');
  const template = coursePackage.questionTemplates[templateId];
  if (!template) throw new Error(`Unknown Jiuxuange question ${templateId}`);

  const currentHint = metadata.hintLevel ?? 0;
  const hintLevel = Math.min(3, currentHint + 1) as 1 | 2 | 3;
  const scaffold = template.scaffolds?.find((item) => item.hintLevel === hintLevel);
  const question = scaffold?.prompt ?? template.prompt;
  const questionFingerprint = fingerprint(
    `${coursePackage.version}:${template.id}:${hintLevel}:${question}`,
  );

  metadata.hintLevel = hintLevel;
  metadata.questionPrompt = question;
  metadata.questionFingerprint = questionFingerprint;
  const delivered = metadata.deliveredQuestionFingerprints ?? [];
  if (!delivered.includes(questionFingerprint)) delivered.push(questionFingerprint);
  metadata.deliveredQuestionFingerprints = delivered;

  const base = {
    actorType: 'system' as const,
    ts: options.now,
    microtaskId: task.id,
    milestoneId: project.milestones.find((milestone) =>
      milestone.microtasks.some((candidate) => candidate.id === task.id),
    )?.id,
  };
  const retryEvent: PBLRuntimeEvent = {
    ...base,
    id: eventId('runtime_retry', options.now, questionFingerprint),
    kind: 'jiuxuange_retry_requested',
    hintLevel,
    questionFingerprint,
  };
  const deliveredEvent: PBLRuntimeEvent = {
    ...base,
    id: eventId('runtime_question', options.now, questionFingerprint),
    kind: 'jiuxuange_question_delivered',
    hintLevel,
    questionFingerprint,
    question,
    packageVersion: coursePackage.version,
  };
  project.runtimeEvents ??= [];
  project.runtimeEvents.push(retryEvent, deliveredEvent);
  project.updatedAt = options.now;

  return { hintLevel, question, questionFingerprint };
}
