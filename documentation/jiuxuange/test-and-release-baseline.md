# 测试与发布基线

## 1. 当前自动化基线

归档时执行：

```bash
pnpm test tests/c-cubic \
  tests/server/c-cubic-assessment-route.test.ts \
  tests/server/c-cubic-orientation-route.test.ts \
  tests/server/jiuxuange-agent-prompts.test.ts \
  tests/server/provider-config.test.ts \
  tests/pbl/v2/instructor.test.ts \
  tests/pbl/v2/instructor-base-rules.test.ts \
  tests/pbl/v2/apply-instructor-event.test.ts
```

结果：30 个测试文件、267 个测试通过。

## 2. 已有覆盖

| 能力 | 主要测试 | 当前状态 |
|---|---|---|
| 功能开关与旧体验回退 | `unified-learning-regression.test.ts` | 已覆盖 |
| 课程包引用、来源、可见性、案例顺序 | `course-package.test.ts` | 已覆盖 |
| 课程包编译为 PBL | `project-factory.test.ts` | 已覆盖 |
| 稳定会话定位、恢复、重复创建 | `session.test.ts` | 已覆盖 |
| 单角色、单问和内部结构隐藏 | `runtime.test.ts`、`agent-prompts.test.ts` | 已覆盖 |
| 导学附着、阶段推进和重复问题恢复 | `orientation.test.ts`、`instructor-integration.test.ts` | 已覆盖 |
| 事实可见性与证据门 | `knowledge-visibility.test.ts`、`evidence-transition.test.ts` | 已覆盖 |
| 案例盲解与作者分析解锁 | `instructor-knowledge.test.ts` | 已覆盖 |
| 六道开放题、原文证据、非分数反馈 | `assessment-*.test.ts` | 已覆盖 |
| 诱导泄露、教练结论、刷时长等红队样本结构 | `red-team-jiuxuange-learning-partner.test.ts` | 部分覆盖 |
| 非 ASCII 请求头与无效凭据 | `http-headers.test.ts`、`provider-config.test.ts` | 已覆盖 |

## 3. 未覆盖或覆盖不足

| 风险 | 缺失验证 | 优先级 |
|---|---|---|
| 短回答语义 | 接受临时目标时“可以/愿意”应推进，普通敷衍时不推进 | P0 |
| 真实长链 | 一名学员从导学连续走完概念、两案例、测评 | P0 |
| 服务端身份与权限 | 学员不能读取他人或其他小组会话 | P0 |
| 幂等与并发 | 重复提交、双标签页、断网重试只产生一个回合 | P0 |
| 数据持久性 | 换设备、浏览器缓存清理、服务重启后的恢复 | P0 |
| 课程内容正确性 | 教授逐节审核知识片段、问题和案例分析 | P0 人工 |
| 人工校准 | AI 草评与教练金标准的偏差统计 | P1 |
| 有效时长 | 寒暄、复读、复制粘贴、短句刷屏不计时 | P1 |
| 教练后台 | 证据卡与异常卡能否减少全量阅读 | P1 |
| 浏览器体验 | 桌面/移动端完整 E2E、视觉回归、无重叠 | P1 |
| 成本与稳定性 | Provider 超时、限流、费用上限和降级率 | P1 |

## 4. 发布层级

### L0：开发演示

- 本机运行。
- 合成或已核验样例事实。
- 可以人工清理数据。
- 当前达到。

### L1：受控试点

- 5-10 名实名/花名可识别学员。
- 服务端会话、证据和审计日志。
- 一个完整核验案例。
- 教练每天查看异常队列。
- 当前未达到。

### L2：正式课程

- 内容、人工校准、权限、隐私、有效时长和反馈报告全部达标。
- 固定基准通过率至少 95%。
- 高危失败为 0。
- 当前未达到。

## 5. 一票否决

出现以下任一情况，不得进入下一发布层级：

- 直接替学员说出核心矛盾或标准答案。
- 泄露评分维度、证据门、反速通或教练隐藏分析。
- 未核验事实被当成真实项目事实。
- 学员可以读取其他学员或小组数据。
- 回合重复写入导致进度或证据重复。
- AI 草评未经人工校准进入正式报告。
- 固定基准集通过率低于 95%。

## 6. 每次迭代必须记录

- `eval_run_id`
- 代码 commit
- Prompt 版本
- 模型与 Provider 版本
- 课程包版本
- rubric 版本
- 通过率、失败样本、相对上次的退化项
- 上线/不上线决策和接受风险
