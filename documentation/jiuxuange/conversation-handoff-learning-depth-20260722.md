# 九轩阁 MAIC 学习深度重构交接书

交接日期：2026-07-22

用途：开启新的 Codex 项目对话后先读本文，再继续九轩阁商业模式大课；不得从头猜测，也不得把设计愿景当成已实现能力。

状态：当前事实、未提交改动、验证结果和下一任务的冻结快照。

## 0. 新对话强制阅读顺序

1. `/Users/sijia/Documents/C 立方/docs/codex-experience-playbook.md`
2. 本交接书 `documentation/jiuxuange/conversation-handoff-learning-depth-20260722.md`
3. `documentation/jiuxuange/README.md`
4. `documentation/jiuxuange/learning-loop-v5.1-transcript--9HjnSKv4w-20260722.md`
5. `documentation/jiuxuange/agent-design-runtime-audit-20260722.md`
6. `documentation/jiuxuange/learning-depth-gap-review-20260722.md`
7. `documentation/jiuxuange/decision-log.md`
8. `documentation/jiuxuange/test-and-release-baseline.md`

[KNOWN, HIGH] `conversation-handoff-learning-loop-20260720.md` 是历史交接书。它记录了 V5 开发前状态，其中多项“未实现”后来已经实现，不得再作为当前事实入口。

## 1. 当前一句话结论

[KNOWN, HIGH] 九轩阁 MAIC 已经跑通商业模式大课 V5.1 的基本操作和状态闭环，但尚未跑通可证明的深度学习闭环。

[KNOWN, HIGH] 当前产品能完成：进入同一课程会话、保存初始判断、短讲授、便利蜂案例、生鲜迁移、判断修正、非分数反馈、刷新恢复和开始新一轮。

[KNOWN, HIGH] 真实完成态回放显示：关键学习动作尚未形成时，系统仍能走完全流程，并曾把“不知道”描述为形成判断或完成修正，把“物流”描述为完成迁移。

[INFERRED, HIGH] 下一阶段的核心目标不是增加课程节点，而是让每个节点真正发生“识别缺口 → 教学补偿 → 学员再表现 → 证据忠实反馈”。

## 2. 已确认的产品本体

- [KNOWN, HIGH] 一门课是一条长期、可断点恢复的统一学习会话。
- [KNOWN, HIGH] 首页课程入口和课程工作台属于同一会话，不是两个聊天产品。
- [KNOWN, HIGH] 学员不手动选择模块；进度由 PBL milestone/microtask 和证据状态推导。
- [KNOWN, HIGH] 四个 Agent 共用同一项目状态和 Instructor 链路，是教学动作的人格视图。
- [KNOWN, HIGH] LLM 负责表达候选教学动作；代码、事实披露和证据门决定状态迁移。
- [KNOWN, HIGH] 案例采用 `blind → commit → unlock → compare`，提交前不得读取作者锁定分析。
- [KNOWN, HIGH] “不知道”不能卡死课程，但也不能冒充自主掌握。
- [KNOWN, HIGH] 正式数字评分、有效十小时、服务端身份、管理员后台和人工金标准仍未完成。

## 3. 当前学习闭环

```text
进入同一课程会话
→ 保存教学前初始判断
→ 必知必会短讲授
→ 便利蜂事实观察
→ 学员独立判断尝试
→ 解锁课程解释并比较
→ 生鲜零售新情境迁移
→ 修正判断
→ 生成非分数反馈
→ 退出并恢复同一会话
```

[KNOWN, HIGH] 上述流程在代码、固定模拟回放和本机浏览器中可以完成。

[INFERRED, HIGH] “可以完成”只代表流程闭环；学习闭环至少还要求学员能引用事实、表达关系变化，并在新情境复用同一判断结构。

## 4. 版本进度

| 版本 | 已实现 | 当前判断 |
|---|---|---|
| Phase 1 | 九轩阁品牌、四角色、OpenMAIC PBL v2 主链保留 | 历史基础 |
| V3 | 六关地图作为状态投影、真实项目主线设计 | 结构资产，非当前学习主链 |
| V4 | 学习优先的单课导学；不知道不阻塞 | 已实现历史版本，可通过开关回退 |
| V5 | 初始判断、短讲授、便利蜂、生鲜迁移、修正与反馈 | L0 可运行 |
| V5.1 | 首页正式课程入口、开始新一轮、回看上次 | 基本操作流程已由用户确认 |
| V5.1 深度回放 | 26 条真实可见消息冻结、Agent 审计、反馈真实性修正 | 本轮未提交工作树；尚未部署到 `8792` |

## 5. 2026-07-22 真实回放

### 5.1 数据边界

| 字段 | 值 |
|---|---|
| 课堂 ID | `-9HjnSKv4w` |
| 可见消息 | 26 条 |
| Agent 消息 | 18 条 |
| 学员消息 | 8 条 |
| 教授/学长/神秘角色/成长反馈官 | 7 / 4 / 3 / 4 |
| 代码基线 | `dfc0fd5ee1b70fc84fb308a38f333d9b85f69380` |
| 课程包 | `5.0.0-learning-loop-pilot` |
| Prompt 版本 | `2026-07-11.v1` |
| 模型版本 | `unknown` |

[KNOWN, HIGH] 逐字稿包含页面中完整可见对话，但不包含消息 ID、时间戳、当时的案例观察卡正文和内部事件账本。

[KNOWN, HIGH] 现有课堂 ZIP 导出会内联媒体，诊断导出尝试超时，不能替代轻量、授权的学习事件导出。

### 5.2 已观察失败

1. [KNOWN, HIGH] 核心概念短讲重复三次。
2. [KNOWN, HIGH] 通用“辅助理解”降级语重复四次，没有区分缺事实、缺关系还是缺结果。
3. [KNOWN, HIGH] N3-N6 的实际角色与冻结节点合同不一致。
4. [KNOWN, HIGH] “不知道”曾被写成“形成了判断”。
5. [KNOWN, HIGH] “物流”曾被写成“完成了迁移”。
6. [KNOWN, HIGH] “不知道”曾被写成“做出的修正”。

## 6. 本轮已经完成的改动

### 6.1 文档与测试资产

- `learning-loop-v5.1-transcript--9HjnSKv4w-20260722.md`：完整可见逐字稿。
- `agent-design-runtime-audit-20260722.md`：四角色设计、运行时链路和角色漂移。
- `learning-depth-gap-review-20260722.md`：学习深度根因和下一闭环。
- `eval/jiuxuange-learning-partner/scenarios/learning-depth-replay.v1.json`：机器可复跑真实失败样本。
- `tests/eval/jiuxuange-learning-partner/learning-depth-replay.test.ts`：样本结构和计数回归。

### 6.2 代码修正

[KNOWN, HIGH] `lib/c-cubic/learning-loop.ts` 已修正非分数反馈语言：

- “不知道”不再描述为形成判断。
- 无事实支撑的短回答不再描述为完成迁移。
- “不知道”不再描述为完成判断修正。
- `attempted/assisted` 与 `demonstrated` 在可见反馈中初步分开。

[KNOWN, HIGH] `tests/c-cubic/learning-loop-v5-state.test.ts` 已增加真实浅层回答回归断言。

[KNOWN, HIGH] 这项修正只解决反馈真实性，没有解决重复讲授、节点专属教学补偿和角色漂移。

## 7. 当前 Git 与运行状态

| 字段 | 当前值 |
|---|---|
| 工作区 | `/Users/sijia/Documents/C 立方/OpenMAIC/.worktrees/jiuxuange-unified-learning` |
| 分支 | `fix/20260721-timeout-and-perf` |
| HEAD | `dfc0fd5` |
| 工作树 | 有未提交改动；包含本轮文档、回放样本、测试和反馈修正 |
| 本地服务 | `127.0.0.1:8792`，PID `36868` 在交接时监听 |
| 当前服务代码 | 可能仍为本轮修改前的旧构建 |
| 数据位置 | 浏览器 IndexedDB，数据库 `MAIC-Database` |
| 运行时真相 | `scene.content.projectV2` |

[KNOWN, HIGH] 不得丢弃、重置或覆盖当前未提交改动。

[KNOWN, HIGH] 历史课堂已保存的 Agent 消息不会因反馈生成器修改而自动改写。

[INFERRED, HIGH] 新对话若要验证新反馈，必须先确认当前服务使用的新构建，再创建新学习轮次；不能用旧完成态消息判断修正是否生效。

## 8. 关键代码索引

| 责任 | 文件 |
|---|---|
| 首页和课程入口 | `app/page.tsx`、`components/c-cubic/business-model-course-entry.tsx` |
| V5 课程包 | `lib/c-cubic/course-package/business-model-v5.ts` |
| 课程包类型 | `lib/c-cubic/course-package/types.ts` |
| 会话定位与恢复 | `lib/c-cubic/session.ts` |
| 教学导演与角色选择 | `lib/c-cubic/runtime.ts` |
| 四角色 Prompt | `lib/c-cubic/agent-prompts.ts` |
| 证据判定与辅助推进 | `lib/c-cubic/evidence.ts` |
| Claim、Revision、Feedback | `lib/c-cubic/learning-loop.ts` |
| Instructor 输出与降级 | `lib/pbl/v2/agents/instructor.ts` |
| 工作台 | `components/scene-renderers/pbl-renderer.tsx` |
| 课堂导出 | `lib/export/use-export-classroom.ts`、`components/stage/header-controls.tsx` |

## 9. Agent 合同与当前漂移

| 节点 | 冻结角色 | 当前实际角色 | 状态 |
|---|---|---|---|
| N1 初始判断 | 教授 | 教授 | 一致 |
| N2 必知必会 | 教授 | 教授 | 一致 |
| N3 便利蜂事实观察 | 学长 | 教授 | 漂移 |
| N4 便利蜂独立判断 | 学长 | 神秘角色 | 漂移 |
| N5 解锁解释并比较 | 教授 | 学长 | 漂移 |
| N6 生鲜迁移 | 神秘角色 | 学长 | 漂移 |
| N7 判断修正 | 成长反馈官 | 成长反馈官 | 一致 |
| N8 最终反馈 | 成长反馈官 | 成长反馈官 | 一致 |

[KNOWN, HIGH] 漂移来源是 `lib/c-cubic/runtime.ts` 通过全局 `ROLE_BY_PHASE` 反推角色，而冻结合同把角色责任定义在具体节点上。

[INFERRED, HIGH] 下一版应让课程节点显式拥有 `agentRole`，或正式重写冻结合同；不能继续维持两份相互冲突的真相。

## 10. 当前最关键 P0

### P0-1 节点专属教学补偿

[KNOWN, HIGH] 当前弱回答可能只收到“没关系，我们先把这一点讲清楚”，随后流程继续，但并没有发生具体讲授。

[INFERRED, HIGH] 每个关键节点需要自己的最小补偿：指出缺口、给 60-120 字微讲授、再给一个低摩擦补全问题；连续不知道后可以推进，但反馈必须写“本轮未形成”。

### P0-2 角色合同一致

[KNOWN, HIGH] N3-N6 角色运行与合同不一致。

[INFERRED, HIGH] 角色应由学习节点拥有，不应只由通用 phase 映射。

### P0-3 三态结果语义

[INFERRED, HIGH] 数据和反馈需要稳定区分：`attempted` 尝试过、`taught` 已接受教学、`demonstrated` 已表现出目标动作。

[KNOWN, HIGH] 当前 `assisted` 同时承载“系统讲过”和“学员在支架下做出来”两种语义，仍不够精确。

### P0-4 授权诊断导出

[KNOWN, HIGH] 当前没有轻量方式一次导出消息、事实披露、Claim、Revision、Prompt/课程/模型版本和运行事件。

[INFERRED, HIGH] 该能力应属于教练或管理员，不应在学员端泄露内部评分与证据规则。

## 11. 下一条可验证开发闭环

```text
读取真实失败回放
→ 锁定 N3-N7 每个节点的角色
→ 为弱回答配置节点专属微讲授与一级补全问题
→ 不重复整段原讲授
→ 连续不知道时记录 attempted/taught，不生成 demonstrated
→ 最终反馈忠于原始回答
→ 用真实回放与三类模拟学员复跑
→ 新课堂浏览器验收
```

### 完成标准

1. [INFERRED, HIGH] “不知道”后必须出现与当前节点相关的具体教学内容，不能只有通用安慰语。
2. [INFERRED, HIGH] 支架升级只增加必要信息，不重复整段讲授。
3. [INFERRED, HIGH] N3-N6 可见角色与冻结节点合同一致。
4. [INFERRED, HIGH] `v5-real-replay-shallow-completion-001` 的六项失败至少关闭反馈误述、通用补偿和角色漂移三类。
5. [INFERRED, HIGH] 任意推进都不能把 attempted/taught 写成 demonstrated。
6. [INFERRED, HIGH] 旧 V5/V5.1 会话仍可恢复，功能开关回退不删除数据。

## 12. 暂时不要做

- [INFERRED, HIGH] 不扩六道测评；当前学习过程本身尚未成立。
- [INFERRED, HIGH] 不继续增加案例数量；先把便利蜂与生鲜两个案例教深。
- [INFERRED, HIGH] 不只修改教授 Prompt；问题同时位于课程包、角色导演、Instructor 确定性输出和反馈语义。
- [INFERRED, HIGH] 不把四个 Agent 拆成四条线程。
- [INFERRED, HIGH] 不引入第二套进度表；继续以 `projectV2` 为运行时真相。
- [INFERRED, HIGH] 不宣称达到 L1 或真实学习增益。

## 13. 最近验证结果

`eval_run_id`: `jgx-v5.1-learning-depth-replay-20260722-01`

| 验证 | 结果 |
|---|---|
| V5 课程包、Instructor、回放、状态、视图与真实样本 | 6 文件、24 测试通过 |
| 精确 ESLint | 0 error、0 warning |
| TypeScript | 通过 |
| Prettier | 通过 |
| 发布判断 | `block`；学习补偿和角色漂移未关闭 |

定向回归命令：

```bash
pnpm test \
  tests/c-cubic/learning-loop-v5-course-package.test.ts \
  tests/c-cubic/learning-loop-v5-instructor.test.ts \
  tests/c-cubic/learning-loop-v5-replay.test.ts \
  tests/c-cubic/learning-loop-v5-state.test.ts \
  tests/c-cubic/learning-loop-v5-view.test.ts \
  tests/eval/jiuxuange-learning-partner/learning-depth-replay.test.ts --run
```

## 14. 新对话启动动作

新对话读取本文后，应先执行以下只读检查：

1. `git status --short --branch`
2. `git log -1 --oneline --decorate`
3. 检查 `8792` 当前服务和构建来源。
4. 读取真实回放 JSON 和三份 2026-07-22 文档。
5. 复跑 6 文件、24 测试。
6. 明确报告：哪些是已实现、哪些只是设计、哪些修改尚未部署。

## 15. 新对话启动提示词

```text
继续九轩阁 MAIC 商业模式大课的学习深度重构。不要从头开始，不要先扩页面、加案例或泛化 Prompt。

第一步必须读取：
- /Users/sijia/Documents/C 立方/docs/codex-experience-playbook.md
- documentation/jiuxuange/conversation-handoff-learning-depth-20260722.md
- documentation/jiuxuange/learning-loop-v5.1-transcript--9HjnSKv4w-20260722.md
- documentation/jiuxuange/agent-design-runtime-audit-20260722.md
- documentation/jiuxuange/learning-depth-gap-review-20260722.md
- documentation/jiuxuange/decision-log.md
- documentation/jiuxuange/test-and-release-baseline.md

先检查当前分支、未提交改动和 8792 服务构建来源，保留所有现有改动。

当前目标是完成下一条可验证闭环：弱回答后的节点专属教学补偿、N3-N6 角色合同一致、attempted/taught/demonstrated 结果语义清晰，并让真实失败回放进入固定回归。

不得把流程完成写成学习完成；不得把设计愿景写成已实现。每次修改同步更新交接书、决策日志和测试基线。
```

## 16. 最没有把握与最大遗漏

- [INFERRED, HIGH] 最没有把握的是节点专属微讲授的内容质量：当前没有课程教授对 N3-N7 的“合格讲授、过度提示、直接泄露”三类金标准标注。
- [KNOWN, HIGH] 当前最大的工程遗漏是没有授权诊断导出，导致可见对话与内部证据链不能一次性对齐。
- [INFERRED, HIGH] 当前最大的产品遗漏是还没有一名外部真实学员在人工观察下完成修复后的整条闭环。
