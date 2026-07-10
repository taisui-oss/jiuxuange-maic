import type { Stage } from '@/lib/types/stage';
import { makeScene } from '@/lib/types/stage';
import { projectV2ToLegacyProjectConfig } from '@/lib/pbl/v2/compat';
import type { JiuxuangeMicrotaskMetadata, PBLProjectV2 } from '@/lib/pbl/v2/types';
import type {
  JiuxuangeCase,
  JiuxuangeCoursePackage,
  JiuxuangeQuestionPhase,
} from './course-package/types';
import { validateCoursePackage } from './course-package/validate';
import type { StageStoreData } from '@/lib/utils/stage-storage';
import { getJiuxuangeRoleProfiles } from './agent-prompts';

export interface CreateJiuxuangeProjectOptions {
  now: string;
  startModuleId?: string;
  caseId?: string;
}

export interface CreateJiuxuangeStageOptions extends CreateJiuxuangeProjectOptions {
  stageId?: string;
  sceneId?: string;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function stableCoursePackageHash(pkg: JiuxuangeCoursePackage): string {
  let hash = 0x811c9dc5;
  for (const char of stableJson(pkg)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function roleForPhase(phase: JiuxuangeQuestionPhase): JiuxuangeMicrotaskMetadata['preferredRole'] {
  if (phase === 'ground') return 'professor';
  if (phase === 'apply' || phase === 'compare' || phase === 'test') return 'senior';
  if (phase === 'tension' || phase === 'judge') return 'mystery';
  return 'growth-feedback';
}

function requireRunnableCase(pkg: JiuxuangeCoursePackage, caseId: string): JiuxuangeCase {
  const selectedCase = pkg.cases[caseId];
  if (!selectedCase) throw new Error(`Unknown Jiuxuange case: ${caseId}`);
  if (selectedCase.mode === 'real_project' && selectedCase.availability !== 'pilot') {
    throw new Error(`Case ${caseId} is not ready for a real pilot`);
  }
  return selectedCase;
}

function factDocument(selectedCase: JiuxuangeCase): string {
  const facts = selectedCase.facts.filter((fact) => fact.visibility === 'learner');
  return [
    `# ${selectedCase.title}事实包`,
    '',
    ...facts.map((fact) =>
      [
        `## ${fact.id}`,
        fact.text,
        `来源：${fact.sourceRef.title} · ${fact.sourceRef.locator}`,
      ].join('\n\n'),
    ),
  ].join('\n\n');
}

function learnerFactSummary(selectedCase: JiuxuangeCase): string {
  return selectedCase.facts
    .filter((fact) => fact.visibility === 'learner')
    .map((fact) => `[${fact.id}] ${fact.text}`)
    .join('\n');
}

export function createJiuxuangeProject(
  inputPackage: JiuxuangeCoursePackage,
  options: CreateJiuxuangeProjectOptions,
): PBLProjectV2 {
  const pkg = structuredClone(inputPackage);
  const errors = validateCoursePackage(pkg);
  if (errors.length > 0) throw new Error(`Invalid Jiuxuange course package: ${errors.join('; ')}`);

  const modules = options.startModuleId
    ? pkg.modules.filter((module) => module.id === options.startModuleId)
    : pkg.modules.slice(0, 1);
  if (modules.length === 0) {
    throw new Error(`Unknown Jiuxuange module: ${options.startModuleId}`);
  }

  const defaultCaseId = modules[0].caseIds[0];
  const caseId = options.caseId ?? defaultCaseId;
  const selectedCase = requireRunnableCase(pkg, caseId);
  const milestones = modules.map((module, moduleIndex) => ({
    id: `jgx-milestone-${module.id}`,
    title: '当前学习任务',
    description: `${module.learningObjective}\n\n当前案例事实：\n${learnerFactSummary(selectedCase)}`,
    status: moduleIndex === 0 ? ('active' as const) : ('locked' as const),
    order: moduleIndex,
    microtasks: module.questionTemplateIds.map((questionTemplateId, taskIndex) => {
      const question = pkg.questionTemplates[questionTemplateId];
      return {
        id: `jgx-task-${module.id}-${questionTemplateId}`,
        title: taskIndex === 0 ? '从事实开始' : '继续往下追问',
        status: moduleIndex === 0 && taskIndex === 0 ? ('in_progress' as const) : ('todo' as const),
        assignee: 'user' as const,
        hints: [],
        order: taskIndex,
        jiuxuange: {
          phase: question.phase,
          questionTemplateId,
          questionPrompt: question.prompt,
          evidenceRuleIds: question.evidenceRuleIds,
          preferredRole: roleForPhase(question.phase),
          hintLevel: 0 as const,
        },
      };
    }),
    documents: [
      {
        id: `jgx-facts-${selectedCase.id}`,
        title: '案例观察卡',
        content: factDocument(selectedCase),
        docType: 'reference' as const,
      },
    ],
    briefing: '我们会从一条可核对的事实开始，慢慢形成你自己的判断。',
    completionCriteria: '学员已引用案例事实形成因果判断，并给出可推翻该判断的条件。',
    debrief: '你已经把概念、项目事实和一项可反证的判断连了起来。',
  }));

  return {
    uiPhase: 'hero',
    title: pkg.title,
    description: '通过概念、案例与反证形成可验证的商业模式判断。',
    learningObjective: modules[0].learningObjective,
    gains: ['说清概念边界', '引用事实形成判断', '用反证条件检查判断'],
    proficiency: 'beginner',
    language: 'zh-CN',
    languageDirective: '使用简体中文；课程专有名词保持课程包定义。',
    tags: ['jiuxuange', 'business-model', 'pilot-b'],
    status: 'active',
    roles: getJiuxuangeRoleProfiles(),
    milestones,
    submissions: [],
    evaluations: [],
    threads: [{ agentId: 'jiuxuange-professor', messages: [] }],
    engagementEvents: [],
    runtimeEvents: [],
    createdAt: options.now,
    updatedAt: options.now,
    jiuxuange: {
      courseId: pkg.id,
      courseVersion: pkg.version,
      moduleId: modules[0].id,
      curriculumOrder: modules[0].order,
      releaseStatus: pkg.releaseStatus,
      factPackHash: stableCoursePackageHash(pkg),
      caseId,
      runtimeMode: selectedCase.mode === 'synthetic_demo' ? 'demo' : 'real_pilot',
      formalScoringEnabled: pkg.formalScoringEnabled,
    },
  };
}

export function createJiuxuangeStage(
  pkg: JiuxuangeCoursePackage,
  options: CreateJiuxuangeStageOptions,
): StageStoreData {
  const project = createJiuxuangeProject(pkg, options);
  const timestamp = Date.parse(options.now);
  const stageId = options.stageId ?? `jgx-business-model-${timestamp}`;
  const sceneId = options.sceneId ?? `${stageId}-pbl`;
  const stage: Stage = {
    id: stageId,
    name: pkg.title,
    description: '九轩阁统一对话学习',
    style: 'interactive',
    languageDirective: project.languageDirective,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const scene = makeScene(
    {
      id: sceneId,
      stageId,
      title: pkg.title,
      order: 0,
      actions: [],
    },
    {
      type: 'pbl',
      projectConfig: projectV2ToLegacyProjectConfig(project),
      projectV2: project,
    },
  );

  return { stage, scenes: [scene], currentSceneId: sceneId, chats: [] };
}
