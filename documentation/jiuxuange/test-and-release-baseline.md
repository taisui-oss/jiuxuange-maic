# 测试与发布基线

## 0. V6 正式发布目标（2026-07-27）

[DECIDED, HIGH] V6.0.0 目标是支持首批 1000 名真实学员进入正式商业模式课程。当前已完成 Gate 0，并完成 Gate 1 技术审计、ADR 和实施合同；Gate 1 产品代码尚未开始，尚未达到任何生产发布门槛。

当前版本边界：

| 维度 | 当前 V1 | V6.0.0 发布要求 |
|---|---|---|
| 身份 | 演示身份或请求头 | 花名系统 + 企业微信 + 内部 `user_id` |
| 班级与小组 | 演示 seed | 服务端关系、有效时间和权限 |
| 正式课程状态 | IndexedDB | 服务端权威进度与跨设备恢复 |
| 门户与测评 | JSON 文件 | PostgreSQL |
| 项目卡 | 麦客思草案预览 | 案主填写、核验、版本发布 |
| 项目讨论 | 未实现 | 个人私有 + 小组共享 |
| 双档案 | 未实现 | 个人笔记与项目档案独立 |
| 个人测试 | 六题两次 L0 | PostgreSQL + 异步 AI 评价 |
| AI 治理 | 分散 Provider 调用 | 服务端 Gateway、脱敏、限费和审计 |
| 内容状态 | 案例未完成正式审核 | 具名 SME 审核 |
| 运维 | 本机 standalone | 生产部署、备份、告警、回退 |

V6 Gate：

```text
Gate 0 版本与架构冻结
Gate 1 身份、数据库与权限
Gate 2 主线原生完成与案例解锁
Gate 3 项目卡、讨论与双档案
Gate 4 六题测试与异步评价
Gate 5 安全、负载、运维、内容审核与正式发布
```

Gate 5 前必须新增并通过：

- 1000 账号同步或导入测试；
- 花名与企业微信真实环境登录测试；
- 同组、异组、退出成员和未登录权限矩阵测试；
- 跨设备课程、讨论、笔记和测评恢复；
- 项目卡 V1/V2 历史隔离；
- 敏感 canary 模型、日志和导出零命中；
- AI 超时、重复提交、Worker 重启与幂等；
- PostgreSQL 备份和恢复；
- 桌面、移动端完整 E2E；
- 根据正式课表冻结的负载测试；
- 便利蜂、生鲜和正式项目卡的人工审核记录。

[ASSUMPTION, MEDIUM] 在正式课表和同时在线人数未提供前，负载测试暂以 200 个并发活跃用户和 50 个并发 LLM Job 为起点。该数字不得对外描述为已确认业务容量。

### V6 Gate 1 技术审计基线（2026-07-27）

```text
branch: codex/jiuxuange-v6-formal-release
audit base: 25adb9141d8eb2f9484d6cd8bb5241c3ba798947
```

| 验证 | 结果 |
|---|---|
| 工作树 | 审计开始时干净 |
| 本机 Node | v24.7.0 |
| pnpm | 10.28.0 |
| 当前身份 | 受信任请求头或 localhost fixture，不是正式认证 |
| 当前九轩阁门户 | 单个 JSON 文件 + 进程内写队列 |
| 当前课堂状态 | Dexie/IndexedDB 为主要本机状态 |
| 当前课堂 Job | 本地 JSON + 进程内锁 |
| 当前 LLM | 有服务端路由，但部分接口仍允许客户端模型参数 |
| Gate 1 ADR | PostgreSQL/Drizzle、身份 Session、pg-boss、S3 已冻结 |
| Gate 1 Schema/API | 已冻结 |
| Gate 1 代码 | 未开始 |
| 正式花名/企微联调 | 未开始，外部输入未提供 |

[KNOWN, HIGH] 本次完成的是只读技术审计和实施合同，不是功能验收。没有新增产品代码，因此没有以既有全量测试冒充 Gate 1 通过。

Task 1.1 必须新增：

- PostgreSQL 空库 migration 测试；
- Better Auth / Next.js 16 兼容性测试；
- Fake WeCom state、PKCE 和 callback 测试；
- 非花名人员拒绝测试；
- 数据库 Session 吊销测试；
- pg-boss 事务 Job 回滚测试；
- 生产禁用 demo identity 测试。

### V6 升级前现有界面与功能实测（2026-07-27）

`eval_run_id`: `jgx-v6-current-ui-functional-smoke-20260727-01`

```text
branch: codex/jiuxuange-v6-formal-release
commit: f203b39af3b80f544771219c08cf65b33bd6c9aa
served origin: http://127.0.0.1:8792
served artifact: .next/standalone
build timestamp: 2026-07-27 04:38 CST
isolated draft origin: http://localhost:8792
```

| 验证项 | 结果 | 发布判断 |
|---|---|---|
| 首页、课程目录、麦客思项目卡、六题测评、已有案例课堂桌面渲染 | 通过 | 可继续作为本机演示 |
| 课程目录、项目卡、六题测评 `390 × 844` | 主体布局通过，无页面级横向滚动 | 需继续做完整移动端 E2E |
| 首页自由学习角色选择器 `390 × 844` | 失败；固定 `w-96` 宽度使控件右侧超出视口并被裁切 | P0 UI 修复 |
| 六题测评 | 6 个输入框、无 Agent 帮答入口、显示最多 2 次；草稿刷新恢复通过；答案不全时保持 `0/2` | 规则层可用，仍是本机状态 |
| 六题必答提示 | 能阻止不完整提交，但中文界面显示英文 `All six questions require a complete original answer.` | P1 本地化修复 |
| 正式主线入口 | 能恢复课堂，但仍进入旧固定对话工作台，包含教授追问、当前任务和“提交产出” | 不符合 V6 已冻结主线 |
| 已解锁案例卡 | 失败；便利蜂、生鲜卡片无链接、按钮、键盘焦点或点击处理 | P0 功能修复 |
| 麦客思项目卡 | 可查看，明确标记“模拟项目卡·尚未发布”；无案主填写、个人研习、小组讨论或测试入口 | 仅草案预览 |
| 自由学习 AI 大纲 | DeepSeek 成功生成 9 个场景并进入人工审阅 | 仅前半链通过 |
| 自由学习完整课程 | 失败；首场景连续 3 次出现 `Failed to process successful response`，最终显示生成失败 | P0 稳定性阻断 |
| 生成失败恢复 | 能返回首页，但错误信息为英文，且最近学习中残留 `0 页` 失败课堂 | P0 失败收口修复 |
| 浏览器控制台 | 本次页面未发现前端 `error` / `warn` | 不代表服务端无错误 |
| 服务端日志 | 记录 3 次 Scene Content API 解析失败 | 已定位到真实运行错误 |
| 定向自动化 | 13 个文件、52 项通过 | 规则回归通过 |
| TypeScript | `pnpm exec tsc --noEmit` 通过 | 通过 |

[KNOWN, HIGH] 本轮没有正式提交个人测评，没有消耗提交次数。草稿恢复在
`localhost:8792` 独立 origin 验证，测试字段随后已清理；不得把该结果与
`127.0.0.1:8792` 的 IndexedDB 会话混为同一份证据。

[KNOWN, HIGH] DeepSeek 凭证和大纲生成可用，但完整课程生成不稳定。服务端在
`2026-07-27T09:46:17Z`、`09:47:20Z` 和 `09:48:24Z` 对首场景连续记录
`AI_APICallError: Failed to process successful response`。这说明当前问题不是
“未配置模型”，而是模型成功响应后的结构化解析或合同兼容失败。

[KNOWN, HIGH] 当前正式主线仍是旧学习补偿工作台，不是已冻结的
“OpenMAIC 原生课件场景 + required 互动 + 客观题答对后原生重试”。
已解锁案例也尚不能点击进入独立案例课堂。因此，当前界面不能作为 V6 正式产品流程验收通过。

#### 本轮正式发布判断

```text
NO-GO：不得投入 1000 名学员正式使用。
ALLOW：本机内容审阅、项目卡草案核对、六题规则演示。
BLOCK：正式登录、主线新版流程、案例独立课堂、项目讨论、完整 AI 生成和移动端完整链。
```

进入下一次浏览器回归前，至少完成：

1. 修复 DeepSeek 场景响应解析、超时与重试收口；失败不得留下可误点的 `0 页` 课堂。
2. 将正式主线切换到 OpenMAIC 原生互动完成规则，停止从正式入口进入旧固定对话工作台。
3. 为已解锁案例提供可访问、可键盘操作的独立课堂入口，并验证未解锁直接 URL 守卫。
4. 修复首页角色选择器移动端固定宽度和测评错误提示本地化。
5. 完成 Gate 1 身份、PostgreSQL、关系权限和生产禁用 demo identity 后，再测试真实学员数据隔离。

### V6 自由学习生成 P0 热修复验收（2026-07-27）

`eval_run_id`: `jgx-v6-generation-hotfix-20260727-01`

[KNOWN, HIGH] 上述“自由学习完整课程生成失败”和“失败后残留 0 页课堂”是热修复前的真实基线，
不得删除或改写。下表记录同一分支完成热修复后的新证据。

#### 修复范围

| 问题 | 修复决定 | 验证结果 |
|---|---|---|
| DeepSeek 场景正文使用全局超大输出窗口和高推理，结构化响应连续失败 | 按场景类型设置输出上限；DeepSeek 场景正文和动作生成关闭 thinking，其他 AI 路径不变 | 真实 9 页与 1 页课程均成功 |
| SDK 内重试与路由外层重试叠加 | SDK 保持 `maxRetries: 0`，只由路由层控制重试 | 自动化合同通过 |
| 首场景完成前先写入课堂和角色 | 首个完整场景成功后才提交课堂；失败时恢复此前角色选择并清理临时数据 | 失败测试中最近学习数量不增加 |
| 首场景可选 TTS 失败阻塞可读课堂 | 系统 TTS 单次失败后停止该场景剩余可选语音；文字课堂继续可用 | 真实 1 页课程约 51 秒进入课堂 |
| 生成失败显示英文底层错误 | 首场景失败统一显示本地化生成失败信息，底层错误只进入服务端日志 | 浏览器路径通过 |

新场景生成预算：

```text
slide: 4096
quiz: 8192
pbl: 16384
interactive: 32768
actions: 4096
```

#### 真实浏览器路径

| 路径 | 课堂 ID | 结果 |
|---|---|---|
| DeepSeek 生成“商业模式六要素的咖啡店案例”，共 9 页 | `9rm7i5Yk5i` | 首场景正文约 16.6 秒完成，动作约 11 秒完成；课堂非空、可进入，后台继续完成 9 页；首页最近学习从 4 增至 5 |
| DeepSeek 生成“商业模式中的价值主张”，共 1 页 | `4ZCjxrJCkv` | 约 51 秒进入可读课堂；系统 TTS 仅请求 1 次，失败后未阻塞文字课程；首页显示 1 页课程，最近学习从 5 增至 6 |

[KNOWN, HIGH] 两条路径均来自热修复后的全新生产构建
`http://127.0.0.1:8794`，不是原 `8792` 的旧构建，也没有混用
`localhost` 与 `127.0.0.1` 的 IndexedDB 证据。

#### 自动化与构建

```text
定向回归：27/27 passed
受控全量回归：303/303 files，2273/2273 tests passed
TypeScript：passed
变更文件 ESLint：passed
production build：passed，47 个页面/路由
```

[KNOWN, HIGH] 默认无限制并行的第一次全量测试曾出现 5 个超时或跨测试干扰失败；
对应 3 个文件单独重跑为 14/14 通过，随后使用 `--maxWorkers=4`
完成全量 2273/2273 通过。该记录保留用于区分代码回归与本机并行资源干扰。

#### 热修复发布判断

```text
PASS：DeepSeek 自由学习课程生成 P0 阻断已关闭。
PASS：首场景失败不再残留可误点的 0 页课堂。
PASS：可选系统语音失败不再阻断文字课堂。
NO-GO：V6 整体仍不得投入 1000 名学员正式使用。
```

### V6 原生主线与多轮案例课堂试学验收（2026-07-27）

`eval_run_id`: `jgx-v6-native-mainline-case-pilot-20260727-01`

| 验证项 | 结果 | 发布判断 |
|---|---|---|
| 正式课程入口 | 进入原生 OpenMAIC 主线，不再进入 V5.1 固定问答工作台 | 本机通过 |
| 客观题错误 | 完成页阻止解锁并返回知识检测 | 本机通过 |
| 客观题全部正确 | 记录本机完成，显示答对 `3/3` | 本机通过 |
| 便利蜂案例 | 解锁后进入独立 10 场景 OpenMAIC 原生课堂 | 内部试学通过 |
| 课堂 SPA 切换 | 主线返回目录再进入便利蜂时不再显示上一课堂 | 已修复并回归 |
| 正式案例标准 | 全部案例目录冻结为 `native_multi_round`，未完成课程包保持审校中 | 合同通过 |
| 专项自动化 | 5 files / 34 tests | 通过 |
| TypeScript / ESLint / Build | 全部通过 | 通过 |
| 全量自动化 | 300 files 通过，4 files 首轮并发失败；失败文件单独 20/20 通过 | 不表述为全绿 |
| 服务端进度、直接 URL 权限、跨设备恢复 | 未实现 | 阻塞正式 Gate 2 |
| 便利蜂 SME 审核 | 未提供 | 阻塞正式发布 |

[KNOWN, HIGH] 该验收证明产品路径、原生课堂复用和本机解锁行为成立，
不证明服务端学习进度、正式权限、课程专业准确性或 1000 人容量成立。

### V6 连续案例与项目测评一致性验收（2026-07-27）

`eval_run_id`: `jgx-v6-sequential-cases-project-bound-assessment-20260727-01`

| 验证项 | 结果 | 发布判断 |
|---|---|---|
| 商业模式课程结构 | 单一“案例学习路径”，共 7 个案例 | 通过 |
| 案例完成规则 | 第一个案例直接开放；后续案例依赖前一案例完成 | 合同与 UI 通过 |
| 案例运行时 | 便利蜂进入独立 OpenMAIC 原生课堂；页面进度为 11 步，课程包含 10 个内容场景 | 浏览器通过 |
| 审校门 | 前置案例完成也不能绕过 `in_review` | 自动化通过 |
| 项目卡入口 | 麦客思显示“后台导入草案 · 待案主确认” | 浏览器通过 |
| 项目测评入口 | 麦客思项目卡进入麦客思六题个人测评 | 浏览器通过 |
| 项目一致性 | session、assignment、project card 使用 `mckess-central-kitchen` | 接口通过 |
| 项目卡版本一致性 | 测评冻结 `project-card-mckess@1.0.0-draft` | 接口通过 |
| 旧草稿迁移 | 旧泥膜测评草稿保留，旧 assignment 关闭 | 自动化通过 |
| 后台导入边界 | 导入草稿未经案主确认不得发布 | 自动化通过 |
| 专项自动化 | 6 files / 28 tests | 通过 |
| 模型故障呈现 | 问题保留；学员端只显示可重试提示，不暴露 Provider、密钥、HTTP 状态或内部错误 | 浏览器与回放测试通过 |
| 失败文件隔离复跑 | 6 files / 31 tests | 通过 |
| TypeScript / ESLint / i18n 键一致性 / Build | 全部通过，8 个语言包对齐，47 个页面/路由 | 通过 |
| 全量自动化首轮 | 299 files / 2273 tests 通过；6 files / 9 tests 并发失败 | 不表述为全绿 |
| 最终受控全量自动化 | `--maxWorkers=4`，306 files / 2284 tests | 全部通过 |
| 桌面与移动端 | 1265px、375px 均无横向溢出 | 浏览器通过 |

[KNOWN, HIGH] 全量首轮失败集中在本轮未修改的语音配置、生成路由、场景重试和
Web Search 测试，包含 5 秒超时与跨测试 Mock 干扰；6 个失败文件使用单 Worker
复跑为 31/31 通过，最终受控全量回归为 306/306 files、2284/2284 tests 通过。
默认无限并发基线仍不稳定，正式 CI 应固定并发上限。

[DECIDED, HIGH] 项目卡主录入路径为案主学员在学员端填写。后台批量导入仅是首发
兜底，必须记录导入来源并保持 `draft + pending owner confirmation`，不能直接
进入正式 Agent 上下文、项目测评或发布态。

[KNOWN, HIGH] 当前仍使用演示身份、JSON 仓库和浏览器本地案例完成状态，且麦客思
项目卡尚未获得案主确认。以上验收只允许本机审阅和内部试学，不构成 1000 人正式
发布批准。

[KNOWN, HIGH] 当前 production standalone 启动时加载到 `0 LLM Provider`。预生成
课件、角色讲解、导航和客观题可运行，但实时 Agent 对话不能完成。学员端的错误信息
已做安全降级，这只解决错误暴露问题，不等于模型能力可用。正式试学前必须配置并探测
一个服务端 LLM Provider，并完成超时、限费、脱敏和审计验收。

当前判断：

```text
ALLOW：本机产品审阅、内部试学、课程内容审校。
NO-GO：真实外部学员和 1000 人正式发布。
```

[KNOWN, HIGH] `/usr/bin/say` 在当前运行环境生成了 4096 字节但
`audio bytes = 0` 的 WAV，因此本轮只证明文字课堂可稳定降级，没有证明系统语音可用于正式场景。
正式发布前必须接入可部署 TTS Provider，或明确采用经过浏览器兼容验证的无语音方案。

[INFERRED, HIGH] 当前下一正式开发动作仍是 Gate 1 Task 1.1 依赖与兼容性刺探。
本次热修复没有实现花名企微登录、PostgreSQL、关系权限、案例独立课堂或项目空间，
不得据此推进 V6 Gate 状态。

## 1. 当前自动化基线

### 麦客思项目卡 V1 草案基线（2026-07-27）

`eval_run_id`: `jgx-project-card-mckess-v1-20260727-01`

| 字段 | 值 |
|---|---|
| 源文件 | 37 页小组作业 PDF |
| 源文件 SHA-256 | `c6c9e6ce2fa77a3d23ac2b98669dd8262cb8de4784051c6ad9e258286c26d376` |
| 项目卡版本 | `project-card-mckess@1.0.0-draft` |
| 数据分层 | 14 条报告事实、8 条学员主张、6 条改造建议、6 条预测假设、5 个开放矛盾 |
| 定向回归 | 3 文件、22 项通过 |
| 项目卡专属测试 | 1 文件、6 项通过 |
| TypeScript | 通过 |
| 定向 ESLint | 0 error、0 warning |
| Prettier | 通过 |
| 发布判断 | `draft only`；允许内容审阅和本机模拟，不允许作为已核验项目事实发布 |

[KNOWN, HIGH] 该基线证明项目卡分类、来源页码、内容指纹、矛盾引用和 Agent 使用边界可被自动校验。它不证明项目方已经确认事实，也不证明学长 Agent、项目组绑定或课程互动已经上线。

### 自由学习 PDF 与 TTS 降级基线（2026-07-27）

`eval_run_id`: `jgx-free-learning-pdf-tts-hotfix-20260727-01`

| 字段 | 值 |
|---|---|
| 基础标签 | `jiuxuange-maic-dual-entry-v1-20260727` |
| 修复分支 | `fix/jiuxuange-pdf-local-fallback-20260727` |
| 固定失败集 | `document-extraction-regression.v1.json`，3 条场景 |
| 定向自动化 | 4 文件、22 项通过 |
| 相关扩展回归 | 6 文件、144 项通过 |
| TypeScript | 通过 |
| 精确 ESLint | 0 error；首页 1 个既有 Hook warning |
| 生产构建 | 通过；45 个路由 |
| 真实解析样本 | 便利蜂 PDF，`unpdf`，9 页，3946 个正文字符 |
| 浏览器闭环 | 首页上传 → 大纲 → 页面 → 教学动作 → TTS 失败降级 → `/classroom/3HHRH5pw6S` |
| 发布判断 | `allow L0 hotfix`；文本课程可用，语音能力仍未恢复 |

[KNOWN, HIGH] 本基线证明普通文本型 PDF 能生成课程，且 TTS 故障不再吞掉课程。它不证明扫描 PDF 可解析、有声体验稳定、课程内容已经教授审校或学习效果成立。

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
| PDF Provider 可用性、本地回退与空文本阻断 | `extract-document-route.test.ts`、`pdf-provider-availability.test.ts` | 2026-07-27：真实便利蜂 PDF 回放通过；扫描件继续需要 OCR |
| TTS 故障不阻断课程生成 | `use-scene-generator-retry.test.ts`、`document-extraction-regression.v1.json` | 2026-07-27：首场景、后台续生成和重试均按无声模式继续 |
| macOS 本地免费中文语音 | `system-tts.test.ts`、`provider-config.test.ts`、`settings-server-sync.test.ts` | 2026-07-26：125 项核心测试、26 项音频回归通过；生产接口生成 125002 字节 WAV；设置页测试播放无 TTS 错误 |
| 双入口业务合同与个人测评隔离 | `dual-entry-domain.test.ts`、`jiuxuange-dual-entry-route.test.ts` | 2026-07-26：10 项核心合同通过；同组同题、个人隔离、发布门、两次提交和活跃时长已覆盖 |
| 商业模式课程中心与草案项目卡 | `business-model-course-hub.test.ts`、`project-card-mckess.test.ts` | 2026-07-27：首页可见性、六案例目录、项目/案例分域、回退开关和本机草案门已覆盖 |
| standalone 静态资源完整性 | `standalone-assets.test.ts` | 2026-07-27：构建自动复制 `.next/static` 与 `public`；真实页面引用 chunk 返回 HTTP 200 |

[KNOWN, HIGH] 2026-07-27 双入口 V1 GitHub 发布前整包回归覆盖 14 个测试文件、185 项测试，包含 V5 会话、学习深度回放、双入口、DOCX、本地语音、Provider 和设置同步，全部通过。

[KNOWN, HIGH] `jgx-business-model-course-hub-v1-20260727-01` 覆盖 6 个测试文件、39 项测试并通过生产构建；浏览器完成首页、课程中心、项目卡以及桌面/移动端验收。该运行证明入口与页面成立，不证明案例教学效果。

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
| 本机语音跨进程稳定性 | 2026-07-27 当前生产进程的 `/usr/bin/say` 返回空音频；历史单次成功不能作为当前稳定能力 | P0 体验、P1 学习链正确性 |
| TTS 故障等待时间 | 音频已非阻塞，但每个片段仍会重试后再降级 | P1 |
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
