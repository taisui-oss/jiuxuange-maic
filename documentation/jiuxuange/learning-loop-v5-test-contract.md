# 商业模式大课学习闭环 V5：固定测试合同

状态：**开发前基线，尚未运行**  
版本：`learning-loop-eval.v1`  
目标课程包：`5.0.0-learning-loop-pilot`

## 1. 测试对象

- [INFERRED, HIGH] 测试对象是“课程状态 + 内容披露 + 学员证据 + 恢复结果”，不是单次 Agent 文案。
- [INFERRED, HIGH] 旧样本不直接修改；调整预期时创建新 `version`，并保留旧运行结果。
- [INFERRED, HIGH] 每次运行必须绑定代码、Prompt、模型、rubric、课程包和案例事实版本。

```yaml
id: v5-autonomous-full-loop-001
version: 1
suite: fixed_baseline
course_package_version: 5.0.0-learning-loop-pilot
learner_profile: 能独立引用事实并形成因果判断
start_state:
  node: session_entry
  disclosure: []
input_sequence:
  - 一家店卖得好，不代表交易关系和成本结构可持续
  - 不只是产品，还要看谁交易、怎么交易和价值如何分配
  - 我注意到订货决策从门店经验转向总部数据
expected_visible:
  - 先采集基线，再进行短讲授
  - commit 前不显示便利蜂课程解释
expected_events:
  - baseline_captured
  - instruction_delivered
  - case_commit_recorded
must_not:
  - formal_score_generated
  - locked_analysis_disclosed_before_commit
expected_outcome: A
owner: 九轩阁产品组
source: synthetic_regression
```

## 2. 固定基准集

| ID | 验证能力 | 核心断言 |
|---|---|---|
| `v5-autonomous-full-loop-001` | 自主完整闭环 | 至少一条生鲜 transfer 为 autonomous；反馈可回到证据 |
| `v5-unknown-full-loop-001` | 不知道也能学习 | 不重复卡住；完成结果为 B；不得宣称掌握 |
| `v5-answer-seeking-001` | 防答案泄露 | commit 前无 locked analysis；索要答案不改变披露状态 |
| `v5-baseline-before-instruction-001` | 教学前测量 | baseline 事件时间早于 instruction；恢复不重复采集 |
| `v5-bee-commit-immutable-001` | 独立判断冻结 | 解锁后追加 revision，不覆盖 commit 原文 |
| `v5-locked-analysis-001` | 案例披露门 | 只有 commit/no_claim 后能读取当前解释片段 |
| `v5-transfer-different-case-001` | 新情境迁移 | 生鲜 facts 与便利蜂分析分离；回答必须引用新事实 |
| `v5-revision-trace-001` | 判断变化链 | before、after、reason 和 factIds 均可回放 |
| `v5-feedback-evidence-001` | 非分数反馈 | 每个事实性 statement 至少一个 evidenceRef；无数字分 |
| `v5-resume-each-node-001` | 断点恢复 | N1/N4/N5/N6/N8 恢复后节点、披露与证据一致 |
| `v5-duplicate-turn-001` | 幂等 | 同一 turnId 不产生重复消息、事件或推进 |
| `v5-llm-failure-001` | 故障降级 | 超时、空输出、非法 JSON 均不自动通过 |
| `v5-v4-rollback-001` | 版本隔离 | 功能开关关闭后 V4 正常；V5 会话数据保留 |
| `v5-structured-resume-context-001` | 结构化学习记忆 | 压缩或移除早期聊天后，仅凭 claim/evidence/revision/disclosure 仍恢复正确节点和下一问 |

## 3. 节点状态断言

| 节点 | 必须写入 | 不得写入 | 推进条件 |
|---|---|---|---|
| N1 | baseline claim 原文 | concept mastery | 一次非空回应，包括“不知道” |
| N2 | instruction version、concept evidence | case commit | 一次回应；质量只影响 evidence status |
| N3 | disclosed factIds、observation | locked analysis | 一次事实观察或 assisted 记录 |
| N4 | immutable case commit/no_claim | comparison、analysis text | commit 事件持久化成功 |
| N5 | disclosure record、comparison | transfer claim | 解锁和一次比较均完成 |
| N6 | transfer claim、fresh factIds | author conclusion | 一次迁移回应 |
| N7 | revision before/after/reason | overwritten baseline | 一次 revision 尝试 |
| N8 | feedback、evidenceRefs、outcome | formal score | 所有反馈声明通过引用校验 |

## 4. 结果分类测试

| 分类 | 最小必要条件 | 禁止条件 |
|---|---|---|
| A | 全链完成；至少一条新情境 transfer 为 autonomous；revision 有依据 | leaked-answer、关键事实虚构、技术故障导致的假推进 |
| B | 全链完成；关键任务主要为 assisted/hinted，或没有自主 transfer | 对外表述为“已掌握” |
| C | 因技术、数据或状态故障未完成闭环 | 把 C 解释为学员能力不足 |

[INFERRED, HIGH] A/B/C 是本轮产品闭环结果，不是正式成绩、人格等级或结业判断。

## 5. 发布门槛

1. [INFERRED, HIGH] P0 确定性测试通过率必须为 100%；固定基准集总体通过率不得低于 95%。
2. [INFERRED, HIGH] 答案泄露、内部规则泄露、虚构事实、跨学员串数、故障自动推进任一出现即禁止启用 V5。
3. [INFERRED, HIGH] `v5-unknown-full-loop-001` 必须跑到底且结果只能为 B 或 C，不能为 A。
4. [INFERRED, HIGH] `v5-feedback-evidence-001` 任一反馈句缺失 evidenceRef 时不得生成最终学习回顾。
5. [INFERRED, HIGH] V4 回退测试失败时不得合并功能开关改动。
6. [KNOWN, HIGH] 人工金标准不足时，AI 草评不得进入正式学员报告或管理员成绩报表。
7. [INFERRED, HIGH] 系统若必须读取完整历史聊天才能恢复正确状态，视为结构化记忆测试失败。

## 6. 运行记录

```ts
interface JiuxuangeEvalRun {
  evalRunId: string;
  createdAt: string;
  codeRevision: string;
  promptVersion: string;
  modelProvider: string;
  modelVersion: string;
  rubricVersion: string;
  coursePackageVersion: string;
  factPackVersions: string[];
  fixtureVersions: Record<string, number>;
  results: Array<{
    fixtureId: string;
    passed: boolean;
    failedAssertions: string[];
    eventRefs: string[];
  }>;
  releaseDecision: 'allow' | 'block' | 'manual-review';
  acceptedFailures: string[];
}
```

## 7. 测试资产演进

- [INFERRED, HIGH] 真实试点中出现的新失败必须先脱敏，再新增为 fixture，不能只修 Prompt。
- [INFERRED, HIGH] 事实包更新后同时保留旧事实版本和旧测试结果，避免无法解释历史表现变化。
- [INFERRED, HIGH] 每次上线保存 decision log，明确接受的失败、责任人和复查版本。
