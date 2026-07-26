# 测试与发布基线

## 1. 当前自动化基线

### V5.1 真实回放与反馈真实性基线（2026-07-22）

`eval_run_id`: `jgx-v5.1-learning-depth-replay-20260722-01`

| 字段 | 值 |
|---|---|
| 观察课堂 | `-9HjnSKv4w` |
| 可见回放 | 26 条消息：18 条 Agent、8 条学员 |
| 代码基线 | `dfc0fd5ee1b70fc84fb308a38f333d9b85f69380` + 本次未提交修正 |
| Prompt 版本 | `2026-07-11.v1` |
| 课程包 | `5.0.0-learning-loop-pilot` |
| 模型版本 | `unknown`；页面没有提供不可变运行标识 |
| 定向自动化 | 6 文件、24 测试通过 |
| 精确 ESLint | 0 error、0 warning |
| TypeScript | 通过 |
| 修正范围 | 非分数反馈不再把“不知道”或无事实短词描述为已形成判断、完成迁移或完成修正 |
| 发布判断 | `block`；重复讲授、节点专属教学补偿和节点角色漂移仍为 P0 |

[KNOWN, HIGH] 本次样本来自本机完成态页面的完整可见消息，不包含消息 ID、时间戳、当时的案例卡正文和内部运行事件。

[KNOWN, HIGH] 本次通过只证明回放样本已冻结且反馈真实性修正成立，不证明学习深度问题已经解决。

### V5.1 首页入口与新一轮基线（2026-07-21）

`eval_run_id`: `jgx-v5.1-course-entry-20260721-01`

| 验证 | 结果 |
|---|---|
| 会话与首页入口定向回归 | 2 文件、19 测试通过 |
| 完整相关归档回归 | 44 文件、207 测试通过 |
| 新一轮与旧记录隔离 | 通过；新旧 `stageId`、`projectId` 不同，旧完成态保留 |
| 最新一轮恢复 | 通过；首页恢复指向最新轮次 |
| 精确 ESLint | 0 error；`app/page.tsx` 1 个既有 Hook warning |
| TypeScript | 通过 |
| 本地服务 | `HEAD /` 返回 200 |
| 新版本浏览器视觉与点击 | 用户已确认基本操作流程；尚未形成自动视觉回归 |

[KNOWN, HIGH] V5.1 只修正首页入口和学习轮次语义，不改变 V5 课程包、学习节点、案例与证据规则。用户已确认基本操作流程；该证据仍不等于自动视觉回归或真实学习效果验证。

### V5 学习闭环可运行基线（2026-07-20）

`eval_run_id`: `jgx-v5-learning-loop-20260720-01`

| 验证 | 结果 |
|---|---|
| 课程包、证据、状态、三类固定回放、SSE 事件、证据导出、故障与会话回归 | 44 文件、216 测试通过 |
| SSE 运行事件、V5 Instructor 与三类回放定向复跑 | 3 文件、20 测试通过 |
| 精确 ESLint | 0 error；`app/page.tsx` 1 个既有 Hook warning |
| TypeScript 与生产构建 | 通过；44 个页面完成生成 |
| 浏览器完整链 | baseline → 短讲授 → 不知道辅助推进 → 便利蜂 commit → 分析解锁 → 生鲜 transfer → revision → 非分数反馈，通过 |
| 浏览器恢复 | 学习中服务重启后恢复到生鲜迁移节点；完成后刷新仍恢复反馈与完成状态 |
| 移动端 | `390 × 844` 无横向溢出；对话、反馈、当前任务与输入区可见 |

[KNOWN, HIGH] 三类固定回放分别覆盖：自主完成 A、五次提示后完成 B、连续回答“不知道”后完成 B 且不产生自主/提示掌握证据。三条路径均可序列化恢复，反馈引用均可解析到消息、不可变主张、修正记录或案例事实。

[KNOWN, HIGH] 当前代码基准为 `77756f4` 之上的未提交工作树；课程包版本为 `5.0.0-learning-loop-pilot`，功能开关为 `NEXT_PUBLIC_C_CUBIC_LEARNING_LOOP_V5`。关闭开关恢复 V4，不迁移或删除 V5 会话。

[KNOWN, HIGH] 这条基线证明 L0 实现和固定回归成立，未证明真实学员学习增益。模型与 Provider 版本尚未作为不可变运行制品锁定，因此本轮不能升级为 L1。

### V4 单课导学基线（2026-07-20）

`eval_run_id`: `jgx-v4-single-course-20260720-01`

| 验证 | 结果 |
|---|---|
| 九轩阁课程、证据、Instructor 回归 | 35 文件、169 测试通过 |
| V4 状态同步最终回归 | 3 文件、21 测试通过 |
| 全仓首次并发运行 | 272/283 文件、2124/2161 测试通过；37 条均为 11 个文件的并发超时/连带失败 |
| 失败文件单线程复跑 | 11 文件、66 测试全部通过 |
| TypeScript | 通过 |
| 精确 ESLint | 0 error；1 个既有 warning |
| 生产构建 | 通过 |
| 浏览器垂直链 | 首次讲授 → 不知道 → 辅助推进 → 继续学习 → 便利蜂案例，通过 |

判断：V4 达到 L0 本机演示基线；全仓并发测试的 5 秒超时仍需作为测试基础设施问题处理，不能记为全仓一次性全绿。

### 第一阶段归档基线

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

结果：30 个测试文件、267 个测试通过。该数字保留为第一阶段历史基线，不再代表当前工作树。

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
| V5 三类端到端学习路径 | `learning-loop-v5-replay.test.ts` | 已覆盖 |
| V5 不知道辅助推进且不误判掌握 | `learning-loop-v5-state.test.ts`、`learning-loop-v5-instructor.test.ts` | 已覆盖 |
| V5 案例提交前后披露边界 | `learning-loop-v5-course-package.test.ts`、`learning-loop-v5-view.test.ts` | 已覆盖 |
| V5 案例来源页码与 PDF 内容指纹 | `learning-loop-v5-course-package.test.ts`、`learning-loop-v5-source-audit-20260720.md` | 已覆盖 |
| V5 反馈证据引用解析 | `learning-loop-v5-replay.test.ts` | 已覆盖 |
| V5 连续任务自动推进 | `c-cubic-learning-loop-task-update.test.ts` | 已覆盖 |
| V5 证据随课堂 ZIP 的 `manifest.json` 往返保留 | `export-classroom-inline.test.ts` | 已覆盖 |
| V5 真实浅层完成回放与反馈真实性 | `learning-depth-replay.test.ts`、`learning-loop-v5-state.test.ts` | 已覆盖样本与反馈措辞；教学补偿未覆盖 |
| DOCX 默认本地正文提取与 MinerU 显式回退 | `extract-document-route.test.ts`、`extractor-registry.test.ts` | 2026-07-26：6 个文档测试文件、27 项通过；生产构建与 8792 页面上传通过 |
| macOS 本地免费中文语音 | `system-tts.test.ts`、`provider-config.test.ts`、`settings-server-sync.test.ts` | 2026-07-26：125 项核心测试、26 项音频回归通过；生产接口生成 125002 字节 WAV；设置页测试播放无 TTS 错误 |
| 双入口业务合同与个人测评隔离 | `dual-entry-domain.test.ts`、`jiuxuange-dual-entry-route.test.ts` | 2026-07-26：10 项核心合同通过；同组同题、个人隔离、发布门、两次提交和活跃时长已覆盖 |

[KNOWN, HIGH] 2026-07-27 双入口 V1 GitHub 发布前整包回归覆盖 14 个测试文件、185 项测试，包含 V5 会话、学习深度回放、双入口、DOCX、本地语音、Provider 和设置同步，全部通过。

## 3. 未覆盖或覆盖不足

| 风险 | 缺失验证 | 优先级 |
|---|---|---|
| 短回答语义 | 接受临时目标时“可以/愿意”应推进，普通敷衍时不推进 | P0 |
| 节点专属教学补偿 | 不知道或无事实短答后先发生具体微讲授，再允许流程继续 | P0 |
| Agent 节点所有权 | N3-N6 运行角色与冻结节点合同保持一致 | P0 |
| 内部诊断导出 | 授权教练可导出消息、事实披露、Prompt 版本和事件账本；学员端不泄露内部结构 | P0 |
| V5 真实学员长链 | 一名外部真实学员跑完 baseline、短讲授、便利蜂、生鲜迁移、revision 与反馈，并由教练逐条复核证据 | P0，代码与模拟回放已完成，真人试学未执行 |
| 服务端身份与权限 | 学员不能读取他人或其他小组会话 | P0 |
| 幂等与并发 | 重复提交、双标签页、断网重试只产生一个回合 | P0 |
| 数据持久性 | 换设备、浏览器缓存清理、服务重启后的恢复 | P0 |
| 课程内容正确性 | 教授逐节审核知识片段、问题和案例分析 | P0 人工 |
| 人工校准 | AI 草评与教练金标准的偏差统计 | P1 |
| 有效时长 | 寒暄、复读、复制粘贴、短句刷屏不计时 | P1 |
| 教练后台 | 证据卡与异常卡能否减少全量阅读 | P1 |
| 浏览器体验 | 已完成一条桌面长链及移动端完成态验收；仍缺移动端从零开始的完整 E2E 与自动视觉回归 | P1 |
| 成本与稳定性 | Provider 超时、限流、费用上限和降级率 | P1 |
| 复杂 Office 结构 | DOCX 图片、复杂表格、公式、页码及 PPTX 本地解析仍依赖 MinerU | P1 |
| 公网语音部署 | 当前免费语音依赖 macOS `/usr/bin/say`；Linux、容器和公网实例尚无正式 TTS Provider | P1 |
| 双入口生产身份 | localhost 使用演示身份；真实花名、班级和项目组接口未接入 | P0 |
| 双入口管理员发布 | 当前课程、项目卡和六题为 seed；无管理员确认与发布界面 | P0 |
| 三类活跃时长完整接线 | 仅个人测评页发送服务端心跳；正式课程与自由学习尚未接线 | P1 |

V5 已补充“不知道不阻塞且不计为掌握”、可见事实序号引用和确定性故障降级。复杂非标准回答、真人使用节奏和教授内容审校仍未完成，因此 L1 与真实学习效果 P0 不关闭。

## 4. 发布层级

### L0：开发演示

- 本机运行。
- 合成或已核验样例事实。
- 可以人工清理数据。
- 当前达到。

### L1：受控试点

- 5-10 名实名/花名可识别学员。
- 服务端会话、证据和审计日志。
- 一个核验教学案例和一个核验迁移案例。
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
- 把“不知道”、无事实短词或 unsupported 回答描述为已经形成判断、完成迁移或完成修正。
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
