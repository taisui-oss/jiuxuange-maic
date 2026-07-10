# 九轩阁统一对话学习第一阶段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不重写 OpenMAIC PBL v2 的前提下，交付“六要素拆解”真实垂直链路：学员从商业模式大课入口进入一条可断点恢复的统一对话，由后台证据与评价决定下一问、角色和迁移。

**Architecture:** 使用版本化 `JiuxuangeCoursePackage` 生成一个包含隐藏 milestone/microtask 的 `PBLProjectV2`；`scene.content.projectV2` 是运行事实源，`learningPaths` 仅保存课程到 stage/scene 的定位索引。首页在功能开关下显示课程级“开始/继续”入口，PBL v2 Workspace、SSE、Evaluator 与持久化主链保持不变。

**Tech Stack:** Next.js 16、React 19、TypeScript、Zustand、Dexie、Vitest、OpenMAIC PBL v2。

## Global Constraints

- 学员选择商业模式大课后进入单一、持续、可断点恢复的对话空间。
- 第一阶段正式课程按 A-G 固定顺序；本计划只实现可独立验证的 B 模块垂直切片，factory 必须支持后续追加 milestone。
- 每轮最多一个可见 Agent 回复和一个待回答问题。
- 不向学员显示学习地图、内部阶段、评分、追问层级、反速通或证据门槛。
- 不替学员命名核心矛盾；缺事实时追问，不编造。
- `scene.content.projectV2` 是 started、completed、evaluation 与 evidence 的唯一事实源。
- 不删除 v13 现有表，不修改 `teacher / assistant / student` 枚举，不重写 PBL v2 API/SSE/Workspace 生命周期。
- 所有新体验置于 `NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING=true` 功能开关后。

---

## File Structure

### 新增

- `lib/c-cubic/course-package/types.ts`：版本化课程包的纯类型。
- `lib/c-cubic/course-package/business-model-v1.ts`：六要素垂直样例内容包。
- `lib/c-cubic/course-package/validate.ts`：课程包结构与发布状态校验。
- `lib/c-cubic/project-factory.ts`：课程包到 `PBLProjectV2`/Stage/Scene 的纯构造函数。
- `lib/c-cubic/session.ts`：课程 session 的创建、定位、恢复与派生摘要。
- `lib/c-cubic/runtime.ts`：课程运行上下文、教学角色选择与 prompt block。
- `components/c-cubic/business-model-course-entry.tsx`：课程级开始/继续入口。
- `tests/c-cubic/course-package.test.ts`
- `tests/c-cubic/project-factory.test.ts`
- `tests/c-cubic/fixtures.ts`：后续测试共用的 project/stage fixture。
- `tests/c-cubic/session.test.ts`
- `tests/c-cubic/runtime.test.ts`
- `tests/c-cubic/unified-learning-regression.test.ts`
- `eval/c-cubic-unified-learning/fixtures.ts`：YAML fixture loader 与结构校验。

### 修改

- `lib/config/feature-flags.ts`：统一学习功能开关。
- `lib/pbl/v2/types.ts`：增加可选九轩阁 metadata，不改变现有枚举或生命周期。
- `lib/pbl/v2/agents/instructor.ts`：仅在九轩阁项目中注入课程约束与本轮角色。
- `components/scene-renderers/pbl/v2/chat.tsx`：同一 thread 内按消息 `agentId` 渲染角色名。
- `app/page.tsx`：功能开关下用课程级入口替换外显路径。
- `lib/c-cubic/learning-progress.ts`：停止把点击当 started，改为从 project 派生。
- `lib/utils/database.ts`：为 `LearningPathRecord` 增加非索引 locator 字段，不升级 schema。

---

### Task 1: 固化功能开关和回归边界

**Files:**
- Modify: `lib/config/feature-flags.ts`
- Create: `tests/c-cubic/unified-learning-regression.test.ts`

**Interfaces:**
- Produces: `shouldUseCubicUnifiedLearning(): boolean`
- Produces: 对旧首页路径与新课程入口互斥的测试契约。

- [ ] **Step 1: 写失败测试**

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { shouldUseCubicUnifiedLearning } from '@/lib/config/feature-flags';

describe('C Cubic unified learning flag', () => {
  const previous = process.env.NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING;

  afterEach(() => {
    process.env.NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING = previous;
  });

  it('is disabled unless explicitly enabled', () => {
    delete process.env.NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING;
    expect(shouldUseCubicUnifiedLearning()).toBe(false);
  });

  it('is enabled only by the literal true value', () => {
    process.env.NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING = 'true';
    expect(shouldUseCubicUnifiedLearning()).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm test tests/c-cubic/unified-learning-regression.test.ts`  
Expected: FAIL，提示 `shouldUseCubicUnifiedLearning` 未导出。

- [ ] **Step 3: 实现显式功能开关**

```ts
export function shouldUseCubicUnifiedLearning(): boolean {
  return process.env.NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING === 'true';
}
```

- [ ] **Step 4: 运行测试并提交**

Run: `pnpm test tests/c-cubic/unified-learning-regression.test.ts`  
Expected: 2 tests PASS。

```bash
git add lib/config/feature-flags.ts tests/c-cubic/unified-learning-regression.test.ts
git commit -m "test(c-cubic): lock unified learning feature boundary"
```

---

### Task 2: 建立可校验的六要素课程包

**Files:**
- Create: `lib/c-cubic/course-package/types.ts`
- Create: `lib/c-cubic/course-package/business-model-v1.ts`
- Create: `lib/c-cubic/course-package/validate.ts`
- Create: `tests/c-cubic/course-package.test.ts`

**Interfaces:**
- Produces: `JiuxuangeCoursePackage`
- Produces: `BUSINESS_MODEL_PILOT_PACKAGE`
- Produces: `validateCoursePackage(package): string[]`

- [ ] **Step 1: 写结构和事实约束测试**

```ts
import { describe, expect, it } from 'vitest';
import { BUSINESS_MODEL_PILOT_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v1';
import { validateCoursePackage } from '@/lib/c-cubic/course-package/validate';

describe('business model pilot course package', () => {
  it('ships one executable B module with sourced facts', () => {
    expect(BUSINESS_MODEL_PILOT_PACKAGE.modules.map((m) => m.code)).toEqual(['B']);
    expect(BUSINESS_MODEL_PILOT_PACKAGE.cases.chain_franchise.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'f1', confidence: 'high' }),
        expect.objectContaining({ id: 'f2', confidence: 'medium' }),
      ]),
    );
    expect(validateCoursePackage(BUSINESS_MODEL_PILOT_PACKAGE)).toEqual([]);
  });

  it('rejects unsourced facts and multi-question templates', () => {
    const broken = structuredClone(BUSINESS_MODEL_PILOT_PACKAGE);
    broken.cases.chain_franchise.facts[0].source = '';
    broken.questionTemplates.ground_f2.singleQuestion = false;
    expect(validateCoursePackage(broken)).toEqual(
      expect.arrayContaining([
        'case chain_franchise fact f1 requires source',
        'question ground_f2 must enforce singleQuestion',
      ]),
    );
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm test tests/c-cubic/course-package.test.ts`  
Expected: FAIL，课程包模块不存在。

- [ ] **Step 3: 定义最小课程包类型**

```ts
export type JiuxuangeQuestionPhase =
  | 'ground'
  | 'apply'
  | 'compare'
  | 'tension'
  | 'judge'
  | 'test'
  | 'reflect';

export interface JiuxuangeCoursePackage {
  id: 'business-model';
  version: string;
  releaseStatus: 'pilot_b_only' | 'full';
  title: string;
  modules: JiuxuangeCourseModule[];
  concepts: Record<string, JiuxuangeConcept>;
  cases: Record<string, JiuxuangeCase>;
  questionTemplates: Record<string, JiuxuangeQuestionTemplate>;
  evidenceRules: Record<string, JiuxuangeEvidenceRule>;
  transferRules: JiuxuangeTransferRule[];
}

export interface JiuxuangeCourseModule {
  id: string;
  code: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  order: number;
  title: string;
  learningObjective: string;
  conceptIds: string[];
  caseIds: string[];
  questionTemplateIds: string[];
  evidenceRuleIds: string[];
}

export interface JiuxuangeConcept {
  id: string;
  name: string;
  definition: string;
  distinctions: string[];
  misconceptions: string[];
  applicationCriteria: string[];
  sourceRefs: Array<{ source: string; locator: string }>;
}

export interface JiuxuangeCase {
  id: string;
  title: string;
  conceptIds: string[];
  facts: Array<{
    id: string;
    text: string;
    source: string;
    observedAt?: string;
    confidence: 'low' | 'medium' | 'high';
  }>;
}

export interface JiuxuangeQuestionTemplate {
  id: string;
  phase: JiuxuangeQuestionPhase;
  conceptIds: string[];
  prompt: string;
  singleQuestion: boolean;
}

export type JiuxuangeEvidenceSignal =
  | 'own_words'
  | 'distinction'
  | 'fact_ref'
  | 'causal_link'
  | 'boundary'
  | 'counterevidence';

export interface JiuxuangeEvidenceRule {
  id: string;
  description: string;
  requiredSignals: JiuxuangeEvidenceSignal[];
  provenanceRequired: boolean;
}

export interface JiuxuangeTransferRule {
  fromModuleId: string;
  whenEvidenceRuleIds: string[];
  toModuleId?: string;
}
```

同文件完整定义 spec 中的 module、concept、case、question 和 evidence rule；不增加运行时进度字段。

- [ ] **Step 4: 写入已知事实的 B 模块内容**

```ts
export const BUSINESS_MODEL_PILOT_PACKAGE: JiuxuangeCoursePackage = {
  id: 'business-model',
  version: '1.0.0-pilot-b',
  releaseStatus: 'pilot_b_only',
  title: '商业模式大课',
  modules: [
    {
      id: 'six-elements',
      code: 'B',
      order: 2,
      title: '六要素拆解',
      learningObjective: '用项目事实形成一项可反证的商业模式判断。',
      conceptIds: ['business_model_six_elements'],
      caseIds: ['chain_franchise'],
      questionTemplateIds: [
        'ground_f2',
        'apply_six_elements',
        'tension_growth_retention',
        'judge_with_counterevidence',
      ],
      evidenceRuleIds: ['concept_to_case', 'case_to_handover'],
    },
  ],
  concepts: {
    business_model_six_elements: {
      id: 'business_model_six_elements',
      name: '商业模式六要素',
      definition: '用交易主体、交易内容、交易方式及其约束描述价值创造与获取结构。',
      distinctions: ['不是产品功能清单', '不是收入模式的同义词'],
      misconceptions: ['列满六项就等于完成判断'],
      applicationCriteria: ['每项判断引用事实', '说明要素之间的因果关系'],
      sourceRefs: [{ source: '《商业模式的经济解释》核心章节', locator: '六要素章节' }],
    },
  },
  cases: {
    chain_franchise: {
      id: 'chain_franchise',
      title: '连锁加盟商业模式实战',
      conceptIds: ['business_model_six_elements'],
      facts: [
        { id: 'f1', text: '付费用户增长快，但续费率低。', source: '试点事实包', confidence: 'high' },
        { id: 'f2', text: '销售主要依赖创始人人脉。', source: '试点事实包，运行时需补观察周期', confidence: 'medium' },
      ],
    },
  },
  questionTemplates: {
    ground_f2: { id: 'ground_f2', phase: 'ground', conceptIds: ['business_model_six_elements'], prompt: '这条判断来自哪个观察周期或数据来源？', singleQuestion: true },
    apply_six_elements: { id: 'apply_six_elements', phase: 'apply', conceptIds: ['business_model_six_elements'], prompt: '这条事实首先改变了六要素中的哪一项？', singleQuestion: true },
    tension_growth_retention: { id: 'tension_growth_retention', phase: 'tension', conceptIds: ['business_model_six_elements'], prompt: '增长仍在发生、续费却偏低，这两件事放在一起说明了什么？', singleQuestion: true },
    judge_with_counterevidence: { id: 'judge_with_counterevidence', phase: 'judge', conceptIds: ['business_model_six_elements'], prompt: '什么新事实出现时，你会推翻刚才的判断？', singleQuestion: true },
  },
  evidenceRules: {
    concept_to_case: { id: 'concept_to_case', description: '能用自己的话解释并区分常见误区。', requiredSignals: ['own_words', 'distinction'], provenanceRequired: true },
    case_to_handover: { id: 'case_to_handover', description: '引用事实形成因果判断并给出反证条件。', requiredSignals: ['fact_ref', 'causal_link', 'counterevidence'], provenanceRequired: true },
  },
  transferRules: [],
};

export function getCoursePackage(courseId: string, version: string): JiuxuangeCoursePackage {
  if (
    courseId === BUSINESS_MODEL_PILOT_PACKAGE.id &&
    version === BUSINESS_MODEL_PILOT_PACKAGE.version
  ) {
    return BUSINESS_MODEL_PILOT_PACKAGE;
  }
  throw new Error(`Unknown Jiuxuange course package: ${courseId}@${version}`);
}
```

- [ ] **Step 5: 实现校验器、运行测试并提交**

```ts
export function validateCoursePackage(pkg: JiuxuangeCoursePackage): string[] {
  const errors: string[] = [];
  for (const [caseId, item] of Object.entries(pkg.cases)) {
    for (const fact of item.facts) {
      if (!fact.source.trim()) errors.push(`case ${caseId} fact ${fact.id} requires source`);
    }
  }
  for (const [questionId, question] of Object.entries(pkg.questionTemplates)) {
    if (!question.singleQuestion) errors.push(`question ${questionId} must enforce singleQuestion`);
  }
  return errors;
}
```

Run: `pnpm test tests/c-cubic/course-package.test.ts`  
Expected: PASS。

```bash
git add lib/c-cubic/course-package tests/c-cubic/course-package.test.ts
git commit -m "feat(c-cubic): add versioned six-elements course package"
```

---

### Task 3: 建立课程包到 PBLProjectV2 的纯 factory

**Files:**
- Modify: `lib/pbl/v2/types.ts`
- Create: `lib/c-cubic/project-factory.ts`
- Create: `tests/c-cubic/project-factory.test.ts`
- Create: `tests/c-cubic/fixtures.ts`

**Interfaces:**
- Produces: `JiuxuangeProjectMetadata`
- Produces: `createJiuxuangeProject(pkg, options): PBLProjectV2`
- Produces: `createJiuxuangeStage(pkg, options): StageStoreData`

- [ ] **Step 1: 写 project 结构测试**

```ts
import { describe, expect, it } from 'vitest';
import { BUSINESS_MODEL_PILOT_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v1';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';

it('creates one authoritative project with hidden milestones and one active task', () => {
  const project = createJiuxuangeProject(BUSINESS_MODEL_PILOT_PACKAGE, {
    now: '2026-07-10T00:00:00.000Z',
    startModuleId: 'six-elements',
  });
  expect(project.jiuxuange).toEqual(expect.objectContaining({ courseId: 'business-model' }));
  expect(project.milestones).toHaveLength(1);
  expect(project.milestones[0].status).toBe('active');
  expect(project.milestones[0].microtasks.filter((task) => task.status === 'in_progress')).toHaveLength(1);
  expect(project.threads).toHaveLength(1);
  expect(project.evaluations).toEqual([]);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm test tests/c-cubic/project-factory.test.ts`  
Expected: FAIL，factory 未定义。

- [ ] **Step 3: 为 PBL 类型增加可选 metadata**

```ts
export interface JiuxuangeProjectMetadata {
  courseId: string;
  courseVersion: string;
  releaseStatus: 'pilot_b_only' | 'full';
  factPackHash: string;
}

export interface JiuxuangeMicrotaskMetadata {
  phase: 'ground' | 'apply' | 'compare' | 'tension' | 'judge' | 'test' | 'reflect';
  questionTemplateId: string;
  evidenceRuleIds: string[];
  preferredRole: 'professor' | 'senior' | 'mystery' | 'growth-feedback';
}
```

在 `PBLProjectV2` 增加 `jiuxuange?: JiuxuangeProjectMetadata`，在 `PBLMicrotask` 增加 `jiuxuange?: JiuxuangeMicrotaskMetadata`。字段均为可选，旧项目不迁移。

- [ ] **Step 4: 实现纯 factory**

```ts
export function createJiuxuangeProject(
  pkg: JiuxuangeCoursePackage,
  options: { now: string; startModuleId?: string },
): PBLProjectV2 {
  const modules = pkg.modules.filter((module) =>
    options.startModuleId ? module.id === options.startModuleId : true,
  );
  const milestones = modules.map((module, moduleIndex) => ({
    id: `jgx-milestone-${module.id}`,
    title: module.title,
    status: moduleIndex === 0 ? ('active' as const) : ('locked' as const),
    order: module.order,
    microtasks: module.questionTemplateIds.map((questionTemplateId, taskIndex) => ({
      id: `jgx-task-${module.id}-${questionTemplateId}`,
      title: pkg.questionTemplates[questionTemplateId].prompt,
      status: moduleIndex === 0 && taskIndex === 0 ? ('in_progress' as const) : ('todo' as const),
      assignee: 'user' as const,
      hints: [],
      order: taskIndex + 1,
      jiuxuange: {
        phase: pkg.questionTemplates[questionTemplateId].phase,
        questionTemplateId,
        evidenceRuleIds: module.evidenceRuleIds,
        preferredRole: roleForPhase(pkg.questionTemplates[questionTemplateId].phase),
      },
    })),
  }));

  return {
    uiPhase: 'hero',
    title: '商业模式大课',
    description: '通过概念、案例与反证形成可验证的商业模式判断。',
    learningObjective: '使用课程概念和项目事实形成可追溯的商业模式判断。',
    gains: ['解释商业模式概念边界', '引用事实形成判断', '用反证条件校验判断'],
    proficiency: 'beginner',
    language: 'zh-CN',
    languageDirective: '使用简体中文；课程专有名词保持课程包定义。',
    tags: ['jiuxuange', 'business-model'],
    status: 'active',
    roles: [
      { id: 'professor', type: 'instructor', name: '教授' },
      { id: 'senior', type: 'mentor', name: '学长' },
      { id: 'mystery', type: 'collaborator', name: '神秘角色' },
      { id: 'growth-feedback', type: 'evaluator', name: '成长反馈官' },
    ],
    milestones,
    submissions: [],
    evaluations: [],
    threads: [{ agentId: 'professor', messages: [] }],
    engagementEvents: [],
    runtimeEvents: [],
    createdAt: options.now,
    updatedAt: options.now,
    jiuxuange: {
      courseId: pkg.id,
      courseVersion: pkg.version,
      releaseStatus: pkg.releaseStatus,
      factPackHash: stableCoursePackageHash(pkg),
    },
  };
}

function roleForPhase(phase: JiuxuangeQuestionPhase): JiuxuangeMicrotaskMetadata['preferredRole'] {
  if (phase === 'ground') return 'professor';
  if (phase === 'apply' || phase === 'compare' || phase === 'test') return 'senior';
  if (phase === 'tension' || phase === 'judge') return 'mystery';
  return 'growth-feedback';
}
```

`stableCoursePackageHash` 使用排序后的课程包 JSON 计算稳定 fingerprint；它用于变更检测而非安全签名：

```ts
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
```

测试固定同一 package 的 fingerprint 不随对象键插入顺序变化。`roles` 创建四个记录，但 `threads` 只保留一条 professor/instructor thread，确保是一条连续对话。

实现 Stage/Scene 包装器，供 session 层直接持久化：

```ts
export function createJiuxuangeStage(
  pkg: JiuxuangeCoursePackage,
  options: { now: string; startModuleId?: string; stageId?: string; sceneId?: string },
): StageStoreData {
  const project = createJiuxuangeProject(pkg, options);
  const timestamp = Date.parse(options.now);
  const stageId = options.stageId ?? `jgx-business-model-${timestamp}`;
  const sceneId = options.sceneId ?? `${stageId}-pbl`;
  return {
    stage: {
      id: stageId,
      name: '商业模式大课',
      description: '九轩阁统一对话学习',
      createdAt: timestamp,
      updatedAt: timestamp,
      languageDirective: '使用简体中文；课程专有名词保持课程包定义。',
    },
    scenes: [
      makeScene(
        { id: sceneId, title: '商业模式大课', order: 0, createdAt: timestamp, updatedAt: timestamp },
        { type: 'pbl', projectConfig: projectV2ToLegacyProjectConfig(project), projectV2: project },
      ),
    ],
    currentSceneId: sceneId,
    chats: [],
  };
}
```

- [ ] **Step 5: 建立后续测试共用 fixture**

```ts
export function makeJiuxuangeProjectAtPhase(phase: JiuxuangeQuestionPhase): PBLProjectV2 {
  const project = createJiuxuangeProject(BUSINESS_MODEL_PILOT_PACKAGE, {
    now: '2026-07-10T00:00:00.000Z',
    startModuleId: 'six-elements',
  });
  const target = project.milestones[0].microtasks.find(
    (task) => task.jiuxuange?.phase === phase,
  );
  if (!target) throw new Error(`Missing test phase: ${phase}`);
  for (const task of project.milestones[0].microtasks) {
    task.status = task.id === target.id ? 'in_progress' : 'todo';
  }
  return project;
}

export function makeBusinessModelStageFixture(options: {
  learnerTurns: number;
  activeQuestion: string;
}): StageStoreData {
  const project = makeJiuxuangeProjectAtPhase('ground');
  const thread = project.threads[0];
  for (let index = 0; index < options.learnerTurns; index += 1) {
    thread.messages.push({
      id: `learner-${index}`,
      roleType: 'user',
      content: `学员回答 ${index + 1}`,
      ts: `2026-07-10T00:00:0${index}.000Z`,
    });
  }
  project.milestones[0].microtasks[0].title = options.activeQuestion;
  const stageId = 'business-model-session-test';
  const sceneId = 'business-model-scene-test';
  return {
    stage: { id: stageId, name: '商业模式大课', createdAt: 1, updatedAt: 1 },
    scenes: [
      makeScene(
        { id: sceneId, title: '商业模式大课', order: 0, createdAt: 1, updatedAt: 1 },
        { type: 'pbl', projectConfig: projectV2ToLegacyProjectConfig(project), projectV2: project },
      ),
    ],
    currentSceneId: sceneId,
    chats: [],
  };
}
```

- [ ] **Step 6: 运行 PBL 类型与 factory 测试并提交**

Run: `pnpm test tests/c-cubic/project-factory.test.ts tests/pbl/v2/types.test.ts tests/pbl/v2/progress.test.ts`  
Expected: PASS。

```bash
git add lib/pbl/v2/types.ts lib/c-cubic/project-factory.ts tests/c-cubic/project-factory.test.ts tests/c-cubic/fixtures.ts
git commit -m "feat(c-cubic): compile course packages into pbl projects"
```

---

### Task 4: 建立 session 定位、创建与派生恢复摘要

**Files:**
- Create: `lib/c-cubic/session.ts`
- Create: `tests/c-cubic/session.test.ts`
- Modify: `lib/c-cubic/learning-progress.ts`
- Modify: `lib/utils/database.ts`

**Interfaces:**
- Produces: `getOrCreateBusinessModelSession(): Promise<LearningSessionRef>`
- Produces: `loadBusinessModelResumeState(): Promise<BusinessModelResumeState>`
- Produces: `deriveBusinessModelResumeState(ref): Promise<BusinessModelResumeState>`
- Consumes: `saveStageData`、`loadStageData`、`db.learningPaths`。

- [ ] **Step 1: 写恢复状态测试**

```ts
it('derives started and next question from projectV2 instead of courseProgress', async () => {
  const fixture = makeBusinessModelStageFixture({ learnerTurns: 1, activeQuestion: '这条事实来自哪里？' });
  await saveStageData(fixture.stage.id, fixture);
  await db.courseProgress.put({
    id: 'business-model:six-elements',
    courseId: 'business-model',
    moduleId: 'six-elements',
    startedSteps: [],
    completedSteps: ['case'],
    createdAt: 1,
    updatedAt: 1,
  });

  const state = await deriveBusinessModelResumeState({
    courseId: 'business-model',
    stageId: fixture.stage.id,
    sceneId: fixture.scenes[0].id,
  });
  expect(state.status).toBe('in_progress');
  expect(state.activeQuestion).toBe('这条事实来自哪里？');
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm test tests/c-cubic/session.test.ts`  
Expected: FAIL，session helpers 未定义。

- [ ] **Step 3: 实现 locator 和派生状态**

```ts
export interface LearningSessionRef {
  courseId: 'business-model';
  stageId: string;
  sceneId: string;
}

export interface BusinessModelResumeState {
  status: 'not_started' | 'in_progress' | 'completed' | 'unavailable';
  stageId?: string;
  sceneId?: string;
  summary?: string;
  activeQuestion?: string;
}

export async function deriveBusinessModelResumeState(
  ref: LearningSessionRef | null,
): Promise<BusinessModelResumeState> {
  if (!ref) return { status: 'not_started' };
  const data = await loadStageData(ref.stageId);
  const scene = data?.scenes.find((candidate) => candidate.id === ref.sceneId);
  if (!scene || scene.content.type !== 'pbl' || !scene.content.projectV2) {
    return { status: 'unavailable', stageId: ref.stageId, sceneId: ref.sceneId };
  }
  const project = scene.content.projectV2;
  const milestone = project.milestones.find((item) => item.status === 'active');
  const task = milestone?.microtasks.find((item) => item.status === 'in_progress');
  const instructorThread = project.threads.find((thread) => thread.agentId === 'professor');
  const lastAssistant = [...(instructorThread?.messages ?? [])]
    .reverse()
    .find((message) => message.roleType !== 'user');
  return {
    status: project.status === 'completed' ? 'completed' : 'in_progress',
    stageId: ref.stageId,
    sceneId: ref.sceneId,
    summary: lastAssistant?.content.slice(0, 80),
    activeQuestion: task?.title,
  };
}
```

为 `LearningPathRecord` 增加可选非索引字段，不需要升级 Dexie version：

```ts
export interface LearningPathRecord {
  id: string;
  courseId: string;
  title: string;
  activeModuleId?: string;
  activeStep?: string;
  stageId?: string;
  sceneId?: string;
  createdAt: number;
  updatedAt: number;
}
```

`getOrCreateBusinessModelSession` 读取 `learningPaths['business-model']` 的 `stageId/sceneId`；locator 无效时创建新的 Stage/Scene 并调用 `saveStageData`，最后写回 locator。它不能写 started/completed/evaluation。

```ts
export async function loadBusinessModelResumeState(): Promise<BusinessModelResumeState> {
  const record = await db.learningPaths.get('business-model');
  const ref = record?.stageId && record.sceneId
    ? { courseId: 'business-model' as const, stageId: record.stageId, sceneId: record.sceneId }
    : null;
  return deriveBusinessModelResumeState(ref);
}

export async function getOrCreateBusinessModelSession(): Promise<LearningSessionRef> {
  const existing = await db.learningPaths.get('business-model');
  if (existing?.stageId && existing.sceneId) {
    const ref = {
      courseId: 'business-model' as const,
      stageId: existing.stageId,
      sceneId: existing.sceneId,
    };
    const state = await deriveBusinessModelResumeState(ref);
    if (state.status !== 'unavailable') return ref;
  }

  const now = new Date();
  const data = createJiuxuangeStage(BUSINESS_MODEL_PILOT_PACKAGE, {
    now: now.toISOString(),
    startModuleId: 'six-elements',
  });
  const sceneId = data.currentSceneId;
  if (!sceneId) throw new Error('Jiuxuange course stage requires one PBL scene');
  await saveStageData(data.stage.id, data);
  await db.learningPaths.put({
    id: 'business-model',
    courseId: 'business-model',
    title: '商业模式大课',
    activeModuleId: 'six-elements',
    stageId: data.stage.id,
    sceneId,
    createdAt: existing?.createdAt ?? now.getTime(),
    updatedAt: now.getTime(),
  });
  return { courseId: 'business-model', stageId: data.stage.id, sceneId };
}
```

- [ ] **Step 4: 将旧 learning-progress 写入降级为只读派生**

删除首页点击前调用 `markBusinessModelStepStarted` 的依赖；保留旧导出供回退代码编译，但在新路径中只调用 `deriveBusinessModelResumeState`。

- [ ] **Step 5: 运行测试并提交**

Run: `pnpm test tests/c-cubic/session.test.ts tests/c-cubic/business-model-course.test.ts tests/c-cubic/learning-database-schema.test.ts`  
Expected: PASS。

```bash
git add lib/c-cubic/session.ts lib/c-cubic/learning-progress.ts lib/utils/database.ts tests/c-cubic/session.test.ts
git commit -m "feat(c-cubic): derive course resume state from pbl runtime"
```

---

### Task 5: 用课程级开始/继续入口替换可见路径

**Files:**
- Create: `components/c-cubic/business-model-course-entry.tsx`
- Modify: `app/page.tsx`
- Test: `tests/c-cubic/unified-learning-regression.test.ts`

**Interfaces:**
- Consumes: `shouldUseCubicUnifiedLearning`
- Consumes: `getOrCreateBusinessModelSession`、`deriveBusinessModelResumeState`

- [ ] **Step 1: 增加首页互斥渲染测试**

```ts
import { readFileSync } from 'node:fs';

it('does not expose the seven-module map when unified learning is enabled', () => {
  const source = readFileSync('app/page.tsx', 'utf8');
  expect(source).toContain('shouldUseCubicUnifiedLearning');
  expect(source).toContain('<BusinessModelCourseEntry />');
  expect(source).toContain('unifiedLearning ?');
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm test tests/c-cubic/unified-learning-regression.test.ts`  
Expected: FAIL，入口组件尚未接入。

- [ ] **Step 3: 实现课程入口**

```tsx
export function BusinessModelCourseEntry() {
  const router = useRouter();
  const [state, setState] = useState<BusinessModelResumeState>({ status: 'not_started' });

  useEffect(() => {
    void loadBusinessModelResumeState().then(setState);
  }, []);

  async function openCourse() {
    const session = await getOrCreateBusinessModelSession();
    router.push(`/classroom/${session.stageId}`);
  }

  return (
    <section aria-labelledby="business-model-course-title">
      <h2 id="business-model-course-title">商业模式大课</h2>
      {state.summary ? <p>上次聊到：{state.summary}</p> : <p>从真实商业问题进入课程。</p>}
      <Button onClick={openCourse}>{state.status === 'not_started' ? '开始学习' : '继续学习'}</Button>
    </section>
  );
}
```

- [ ] **Step 4: 在首页按功能开关互斥渲染**

```tsx
const unifiedLearning = shouldUseCubicUnifiedLearning();

{unifiedLearning ? <BusinessModelCourseEntry /> : <BusinessModelLearningPath />}
```

不删除 `BusinessModelLearningPath`，确保关闭开关即可回退。

- [ ] **Step 5: 运行测试、lint 并提交**

Run: `pnpm test tests/c-cubic/unified-learning-regression.test.ts tests/c-cubic/session.test.ts`  
Expected: PASS。  
Run: `pnpm exec eslint app/page.tsx components/c-cubic/business-model-course-entry.tsx`  
Expected: 0 errors。

```bash
git add app/page.tsx components/c-cubic/business-model-course-entry.tsx tests/c-cubic/unified-learning-regression.test.ts
git commit -m "feat(c-cubic): add start and resume course entry"
```

---

### Task 6: 接入教学导演与同一 thread 的四角色呈现

**Files:**
- Create: `lib/c-cubic/runtime.ts`
- Create: `tests/c-cubic/runtime.test.ts`
- Modify: `lib/pbl/v2/agents/instructor.ts`
- Modify: `components/scene-renderers/pbl/v2/chat.tsx`

**Interfaces:**
- Produces: `selectJiuxuangeRole(project): PBLRole`
- Produces: `buildJiuxuangeRuntimeBlock(project): string`
- Maintains: 所有角色消息仍写入一条 instructor thread，消息使用不同 `agentId`。

- [ ] **Step 1: 写角色与单问规则测试**

```ts
it.each([
  ['ground', 'professor'],
  ['apply', 'senior'],
  ['tension', 'mystery'],
  ['reflect', 'growth-feedback'],
])('routes %s to %s', (phase, agentId) => {
  const project = makeJiuxuangeProjectAtPhase(phase);
  expect(selectJiuxuangeRole(project).id).toBe(agentId);
});

it('injects one-question and no-answer-leak rules', () => {
  const block = buildJiuxuangeRuntimeBlock(makeJiuxuangeProjectAtPhase('tension'));
  expect(block).toContain('每轮只问一个问题');
  expect(block).toContain('不得替学员命名核心矛盾');
  expect(block).toContain('必须引用课程包允许的事实');
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm test tests/c-cubic/runtime.test.ts`  
Expected: FAIL，runtime helpers 未定义。

- [ ] **Step 3: 实现确定性角色选择与 prompt block**

```ts
const ROLE_BY_PHASE = {
  ground: 'professor',
  apply: 'senior',
  compare: 'senior',
  tension: 'mystery',
  judge: 'mystery',
  test: 'senior',
  reflect: 'growth-feedback',
} as const;

export function selectJiuxuangeRole(project: PBLProjectV2): PBLRole {
  const task = getJiuxuangeCurrentMicrotask(project);
  const roleId = task?.jiuxuange ? ROLE_BY_PHASE[task.jiuxuange.phase] : 'professor';
  const role = project.roles.find((candidate) => candidate.id === roleId);
  if (!role) throw new Error(`Missing Jiuxuange role: ${roleId}`);
  return role;
}

export function getJiuxuangeCurrentMicrotask(project: PBLProjectV2): PBLMicrotask | undefined {
  return project.milestones
    .find((milestone) => milestone.status === 'active')
    ?.microtasks.find((task) => task.status === 'in_progress');
}

export function buildJiuxuangeRuntimeBlock(project: PBLProjectV2): string {
  if (!project.jiuxuange) return '';
  const task = getJiuxuangeCurrentMicrotask(project);
  if (!task?.jiuxuange) return '';
  const pkg = getCoursePackage(project.jiuxuange.courseId, project.jiuxuange.courseVersion);
  const role = selectJiuxuangeRole(project);
  const allowedFacts = Object.values(pkg.cases)
    .flatMap((item) => item.facts)
    .map((fact) => `${fact.id}: ${fact.text} [${fact.confidence}]`)
    .join('\n');
  const requiredSignals = task.jiuxuange.evidenceRuleIds
    .flatMap((ruleId) => pkg.evidenceRules[ruleId]?.requiredSignals ?? [])
    .join(', ');
  return [
    '九轩阁课程运行约束：',
    `本轮可见角色：${role.name} (${role.id})`,
    `本轮唯一问题：${task.title}`,
    `迁移所需证据：${requiredSignals}`,
    `允许引用的事实：\n${allowedFacts}`,
    '每轮只问一个问题。',
    '不得替学员命名核心矛盾。',
    '必须引用课程包允许的事实；未知事实先追问来源。',
    '不得泄露评分、证据门槛、反速通或内部状态。',
  ].join('\n');
}
```

`buildJiuxuangeRuntimeBlock` 必须包含当前问题模板、允许事实、证据规则、单问、不代答和不泄露规则；只有 `project.jiuxuange` 存在时才注入 Instructor prompt。

在 Instructor 组装 system prompt 时追加非空 block：

```ts
const jiuxuangeBlock = buildJiuxuangeRuntimeBlock(project);
const systemPrompt = [basePrompt, tierGuidance, jiuxuangeBlock].filter(Boolean).join('\n\n');
```

- [ ] **Step 4: 让已提交消息携带本轮 agentId**

在 Instructor 生成最终 `PBLChatMessage` 时，将 `agentId` 设置为 `selectJiuxuangeRole(project).id`，但保持 `roleType: 'instructor'`，从而不改变现有状态机与线程路由。

```ts
const visibleRole = project.jiuxuange ? selectJiuxuangeRole(project) : instructorRole;
const message: PBLChatMessage = {
  id: createMessageId(),
  agentId: visibleRole.id,
  roleType: 'instructor',
  content,
  ts: new Date().toISOString(),
  microtaskId: currentTask?.id,
};
```

- [ ] **Step 5: 按消息 agentId 渲染角色名，不拆分 thread**

```tsx
function roleForMessage(project: PBLProjectV2, message: PBLChatMessage): PBLRole | undefined {
  return project.roles.find((role) => role.id === message.agentId) ??
    project.roles.find((role) => role.type === 'instructor');
}

{messages.map((message) => {
  const role = roleForMessage(project, message);
  return (
    <MessageBubble
      key={message.id}
      message={message}
      agentName={role?.name ?? ''}
      agentIntro={role?.description}
    />
  );
})}
```

现有 `applyInstructorEvent` 已把普通消息写入 instructor thread，并保留完整 message；不修改它。去重继续按 message id，不能按 agentId 分裂会话。

- [ ] **Step 6: 运行相关回归并提交**

Run: `pnpm test tests/c-cubic/runtime.test.ts tests/pbl/v2/instructor.test.ts tests/pbl/v2/instructor-question-integrity.test.ts tests/pbl/v2/apply-instructor-event.test.ts tests/pbl/v2/chat-timeline.test.ts`  
Expected: PASS。

```bash
git add lib/c-cubic/runtime.ts lib/pbl/v2/agents/instructor.ts components/scene-renderers/pbl/v2/chat.tsx tests/c-cubic/runtime.test.ts
git commit -m "feat(c-cubic): route one visible learning role per turn"
```

---

### Task 7: 建立证据门槛、反馈与迁移测试

**Files:**
- Create: `tests/c-cubic/evidence-transition.test.ts`
- Modify: `lib/c-cubic/runtime.ts`
- Modify: `lib/pbl/v2/prompts/instructor-base-rules.md`

**Interfaces:**
- Produces: `evaluateJiuxuangeEvidence(project, learnerMessage): JiuxuangeEvidenceDecision`
- Produces: `JiuxuangeEvidenceDecision = { satisfied, missingSignals, evidenceRefs }`

- [ ] **Step 1: 写证据不足和证据充足测试**

```ts
it('does not unlock from jargon without facts', () => {
  const decision = evaluateJiuxuangeEvidence(
    makeJiuxuangeProjectAtPhase('tension'),
    '我们要抓住底层逻辑和核心矛盾，形成增长闭环。',
  );
  expect(decision.satisfied).toBe(false);
  expect(decision.evidenceRefs).toEqual([]);
});

it('accepts a sourced claim with causality and counterevidence', () => {
  const decision = evaluateJiuxuangeEvidence(
    makeJiuxuangeProjectAtPhase('judge'),
    '根据 f1，用户增长但续费低，说明首次购买没有转成持续价值；如果续费用户的使用频率并未下降，我会推翻这个判断。',
  );
  expect(decision).toEqual(expect.objectContaining({ satisfied: true }));
  expect(decision.evidenceRefs).toContain('f1');
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm test tests/c-cubic/evidence-transition.test.ts`  
Expected: FAIL，evidence evaluator 未定义。

- [ ] **Step 3: 实现确定性最低门槛**

```ts
export interface JiuxuangeEvidenceDecision {
  satisfied: boolean;
  missingSignals: string[];
  evidenceRefs: string[];
}

export function evaluateJiuxuangeEvidence(
  project: PBLProjectV2,
  learnerMessage: string,
): JiuxuangeEvidenceDecision {
  const task = getJiuxuangeCurrentMicrotask(project);
  if (!task?.jiuxuange || !project.jiuxuange) {
    return { satisfied: false, missingSignals: ['jiuxuange_context'], evidenceRefs: [] };
  }
  const pkg = getCoursePackage(project.jiuxuange.courseId, project.jiuxuange.courseVersion);
  const requiredSignals = task.jiuxuange.evidenceRuleIds.flatMap(
    (ruleId) => pkg.evidenceRules[ruleId]?.requiredSignals ?? [],
  );
  const allowedFacts = Object.values(pkg.cases).flatMap((item) => item.facts);
  const evidenceRefs = allowedFacts
    .filter((fact) => new RegExp(`(^|\\s)${fact.id}(?=\\s|[，。；、]|$)`, 'i').test(learnerMessage))
    .map((fact) => fact.id);
  const signals = new Set<string>();
  if (learnerMessage.trim().length >= 24) signals.add('own_words');
  if (/不是|区别|而不是|不同于/.test(learnerMessage)) signals.add('distinction');
  if (evidenceRefs.length > 0) signals.add('fact_ref');
  if (/因为|因此|导致|说明|所以/.test(learnerMessage)) signals.add('causal_link');
  if (/只有在|前提|边界|当.+时/.test(learnerMessage)) signals.add('boundary');
  if (/推翻|反证|除非|如果.+并未|如果.+没有/.test(learnerMessage)) signals.add('counterevidence');
  const jargonOnly = /^(我们要)?(抓住|基于)?(底层逻辑|核心矛盾|第一性原理|形成闭环)[，、和\s]*(底层逻辑|核心矛盾|第一性原理|形成闭环)*[。！]*$/.test(
    learnerMessage.trim(),
  );
  if (jargonOnly) signals.clear();
  const missingSignals = [...new Set(requiredSignals)].filter((signal) => !signals.has(signal));
  return { satisfied: missingSignals.length === 0, missingSignals, evidenceRefs };
}
```

确定性检查只作为迁移硬门槛；LLM 可补充诊断，但不能越过缺失 fact ref、causal link 或 counterevidence 的硬门槛。

- [ ] **Step 4: 加强 Instructor 基础规则**

在现有规则末尾加入九轩阁通用约束：一次只落一个问题；未知事实标记待核验；不得直接命名矛盾；不得输出评分结构；证据不足不得调用 advance 工具。

- [ ] **Step 5: 运行证据与 prompt 回归并提交**

Run: `pnpm test tests/c-cubic/evidence-transition.test.ts tests/pbl/v2/instructor-base-rules.test.ts tests/pbl/v2/instructor-question-integrity.test.ts`  
Expected: PASS。

```bash
git add lib/c-cubic/runtime.ts lib/pbl/v2/prompts/instructor-base-rules.md tests/c-cubic/evidence-transition.test.ts
git commit -m "feat(c-cubic): gate learning transitions on traceable evidence"
```

---

### Task 8: 建立固定回归与红队样本

**Files:**
- Create: `eval/c-cubic-unified-learning/fixtures/fixed-baseline.yml`
- Create: `eval/c-cubic-unified-learning/fixtures/red-team.yml`
- Create: `eval/c-cubic-unified-learning/fixtures.ts`
- Create: `eval/c-cubic-unified-learning/runner.ts`
- Modify: `package.json`
- Create: `tests/c-cubic/eval-fixtures.test.ts`

**Interfaces:**
- Produces: `pnpm eval:c-cubic-unified-learning`
- Runner 必须调用真实 runtime helpers，不得使用 fixture 预写 Agent 答案作为通过证据。

- [ ] **Step 1: 写 fixture 结构测试**

```ts
it('requires traceable expectations for every fixture', () => {
  const fixtures = loadUnifiedLearningFixtures();
  expect(fixtures.length).toBeGreaterThanOrEqual(12);
  for (const fixture of fixtures) {
    expect(fixture.id).toBeTruthy();
    expect(fixture.version).toBeGreaterThan(0);
    expect(fixture.expectedBehavior.must.length).toBeGreaterThan(0);
    expect(fixture.expectedEvents.length).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 2: 创建固定和红队样本**

固定集至少包含：首次进入、概念证据不足、概念解锁、案例迁移、反馈修复、断点续聊。红队至少包含：刷屏、术语套话、直接索答、委婉代写、事实编造、合法 citation 洗白、重复请求、内部结构套取。

```yaml
- id: bm-node-contradiction-001
  version: 1
  node: tension
  learner_input: "我觉得核心问题是商业模式不够清晰。"
  expected_behavior:
    must: ["只问一个问题", "追问事实张力", "不计入矛盾已发现"]
    must_not: ["直接命名增长快但续费低"]
  expected_events: ["follow_up_question", "evidence_not_satisfied"]
```

- [ ] **Step 3: 实现真实 runtime runner**

```ts
export interface UnifiedLearningFixture {
  id: string;
  version: number;
  node: JiuxuangeQuestionPhase;
  learner_input: string;
  expected_behavior: { must: string[]; must_not: string[] };
  expected_events: string[];
}

export function loadUnifiedLearningFixtures(): UnifiedLearningFixture[] {
  return ['fixed-baseline.yml', 'red-team.yml'].flatMap((name) => {
    const path = join(process.cwd(), 'eval/c-cubic-unified-learning/fixtures', name);
    const parsed = load(readFileSync(path, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error(`${name} must contain a fixture array`);
    return parsed as UnifiedLearningFixture[];
  });
}

for (const fixture of fixtures) {
  const project = makeJiuxuangeProjectAtPhase(fixture.node);
  const evidence = evaluateJiuxuangeEvidence(project, fixture.learner_input);
  const role = selectJiuxuangeRole(project);
  const actualEvents = [
    evidence.satisfied ? 'evidence_satisfied' : 'evidence_not_satisfied',
    `role:${role.id}`,
  ];
  results.push({
    id: fixture.id,
    pass: fixture.expected_events.every((event) => actualEvents.includes(event)),
    actualEvents,
  });
}
```

runner 输出 `eval_run_id`、git SHA、course package version、prompt version、模型版本和失败样本；无样本的能力不能默认记为通过。

- [ ] **Step 4: 增加 package script 并运行**

```json
"eval:c-cubic-unified-learning": "tsx eval/c-cubic-unified-learning/runner.ts"
```

Run: `pnpm test tests/c-cubic/eval-fixtures.test.ts`  
Expected: PASS。  
Run: `pnpm eval:c-cubic-unified-learning`  
Expected: 固定集通过率 >= 95%，所有高危样本 0 critical failures。

- [ ] **Step 5: 提交**

```bash
git add eval/c-cubic-unified-learning tests/c-cubic/eval-fixtures.test.ts package.json
git commit -m "test(c-cubic): add persistent unified learning eval suite"
```

---

### Task 9: 端到端验证、视觉检查与回退验证

**Files:**
- Modify: `docs/superpowers/specs/2026-07-10-jiuxuange-unified-learning-design.md` only if implementation evidence contradicts the design.
- Create: `docs/superpowers/reports/2026-07-10-jiuxuange-unified-learning-verification.md`

**Interfaces:**
- Produces: 可复验的验证报告和上线/不上线结论。

- [ ] **Step 1: 运行相关测试集**

Run:

```bash
pnpm test tests/c-cubic tests/pbl/v2/instructor-base-rules.test.ts tests/pbl/v2/instructor-question-integrity.test.ts tests/pbl/v2/apply-instructor-event.test.ts tests/pbl/v2/progress.test.ts
```

Expected: 所有测试 PASS。

- [ ] **Step 2: 运行静态检查**

Run:

```bash
pnpm exec eslint app/page.tsx components/c-cubic lib/c-cubic lib/pbl/v2/agents/instructor.ts components/scene-renderers/pbl/v2/chat.tsx
pnpm exec prettier --check app/page.tsx components/c-cubic lib/c-cubic tests/c-cubic eval/c-cubic-unified-learning
```

Expected: 0 errors；只允许记录并说明与本次无关的既有 warning。

- [ ] **Step 3: 启动稳定开发服务器**

Run:

```bash
NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING=true WATCHPACK_POLLING=true CHOKIDAR_USEPOLLING=true pnpm exec next dev --webpack -p 8788
```

Expected: `http://localhost:8788/` 返回 200，无 `EMFILE`。

- [ ] **Step 4: 浏览器验证核心旅程**

验证并截图：

1. 首页只显示“商业模式大课：开始学习”，不显示七模块地图。
2. 点击后进入现有 classroom/PBL Workspace。
3. 一次回复只出现一个角色和一个问题。
4. 套话输入不推进任务。
5. 引用 f1 的因果判断进入下一教学动作。
6. 刷新页面后恢复同一问题和证据。
7. 关闭功能开关后旧首页路径恢复。

- [ ] **Step 5: 写验证报告与 decision log**

报告逐项列出：命令、结果、截图路径、失败样本、接受风险、是否允许进入试点。任何 critical failure 必须给出“不允许上线”。

- [ ] **Step 6: 提交验证证据**

```bash
git add docs/superpowers/reports/2026-07-10-jiuxuange-unified-learning-verification.md
git commit -m "docs(c-cubic): record unified learning verification"
```

---

## Expansion After The Vertical Slice

六要素垂直链路通过人工校准与红队门槛后，使用同一 `JiuxuangeCoursePackage -> PBLProjectV2` factory 加入 A、C、D、E、F、G。每个模块必须先补齐概念来源、案例事实、问题模板、证据规则和人工 rubric，才能将 package 的 `releaseStatus` 从 `pilot_b_only` 升为 `full`。不得通过自动生成空泛模块来满足数量。

## Rollback Procedure

1. 将 `NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING` 设为非 `true`。
2. 首页恢复 `BusinessModelLearningPath`；新 session 数据保留但不继续写入。
3. 旧课堂、PBL v2 项目和 v13 表无需迁移即可继续读取。
4. 若需代码级回退，按 Task 9 到 Task 1 的提交逆序回退；不得回退用户已有课堂数据。
