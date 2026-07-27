# 九轩阁 MAIC V6 正式教学首发版交接书

日期：2026-07-27

用途：作为 V6 新开发对话、产品评审、技术实施和发布验收的当前入口。本文之后，旧 V5/V5.1 学习补偿交接书仅作为历史与实验资产，不再定义正式产品主线。

## 1. 当前基线

[KNOWN, HIGH] V6 从以下已发布且干净的基线创建：

```text
branch: codex/jiuxuange-v6-formal-release
base commit: df3107f63c6ae5d3abf988421b593442097fff75
base tag: jiuxuange-business-model-course-hub-v1-20260727
```

[KNOWN, HIGH] 当前基线已实现：

- 首页可进入商业模式课程中心；
- 六个案例候选可见，并区分已接入和审校中；
- 麦客思草案项目卡可见；
- 双入口个人项目测评已有六题、两次提交的 L0 领域合同；
- OpenMAIC 正式课程、自由学习课程生成和播放器均可在本机运行；
- 课程中心相关 6 个测试文件、39 项测试和生产构建已通过。

[KNOWN, HIGH] 当前基线尚不具备正式开放条件：

- 身份仍为演示身份或受信任请求头；
- 正式课程状态仍主要保存在浏览器 IndexedDB；
- 门户与测评数据仍使用服务端 JSON 文件；
- 没有 PostgreSQL 业务事实源；
- 没有花名系统与企业微信正式登录；
- 没有正式班级、项目组和关系权限；
- 没有项目卡案主填写、核验和发布流程；
- 没有个人研习、小组讨论、个人笔记和项目档案；
- 没有服务端 AI 网关、异步评价、费用审计和脱敏管道；
- 便利蜂、生鲜零售尚需具名 SME 完成正式内容审核；
- 麦客思仅为来源于小组作业的草案项目卡，尚未获得案主确认。

## 2. V6 版本定义

产品版本：

```text
Jiuxuange MAIC 6.0.0
```

开发阶段使用：

```text
6.0.0-rc.n
```

只有通过全部正式发布门禁后，才允许标记：

```text
6.0.0
```

[DECIDED, HIGH] V6 目标是支持首批 1000 名真实学员进入正式教学场景。班级数和小组数暂未确定，因此领域模型必须支持后续导入与调整，任何实现不得写死一个班级、固定小组数或五人上限。

[INFERRED, HIGH] “支持 1000 名学员”当前只表示注册、授权、数据隔离和业务容量目标，不等于 1000 人同时发起 LLM 请求。正式负载门槛必须在取得上课时间表和峰值假设后冻结。

## 3. 已冻结的产品决策

### 3.1 案例学习主路径

[DECIDED, HIGH] 商业模式大课对学员只呈现一条连续案例路径，不再把“六要素主线”和“正式案例”做成两套并列入口。第一个“社区早餐连锁”教学情境承担六要素概念导入，后续案例负责迁移。该情境明确不对应具体真实企业。

每个案例统一采用：

```text
进入独立预生成 OpenMAIC 课堂
→ 完成该案例全部必需场景
→ 完成课程包中 required 的原生互动
→ 有标准答案的题目必须答对
→ 答错时使用 OpenMAIC 原生重试
→ 标记当前案例完成
→ 解锁下一个案例
```

[DECIDED, HIGH] 案例完成暂不强制提交个人反思，不增加自定义 AI 掌握判定。

[DECIDED, HIGH] 旧 `attempted / taught / demonstrated`、确定性补救和 `remediation_exhausted` 保留为冻结实验资产；正式案例路径不调用，稳定发布前不删除。

### 3.2 顺序案例

[DECIDED, HIGH] 案例只按前一个案例的完成状态解锁。课程内容是否审校通过是第二道门；顺序满足但课程包未发布时仍不可进入。

首轮顺序：

| 顺序 | 案例 | 解锁条件 |
|---:|---|---|
| 1 | 社区早餐连锁：从一笔订单到六要素因果图 | 初始开放 |
| 2 | 便利蜂 | 完成社区早餐连锁案例 |
| 3 | 生鲜零售 | 完成便利蜂案例且内容审校通过 |
| 4-7 | SHEIN、花西子、整车货运平台、智能汽车 | 依次完成上一案例且内容审校通过 |

[DECIDED, HIGH] 便利蜂和生鲜零售只有在具名 SME 审核课程内容后才能进入正式发布。SHEIN、花西子、整车货运平台和智能汽车在审核完成前保持隐藏或审校中。

[DECIDED, HIGH] 所有正式案例都必须以便利蜂为形态标准，制作成独立、预生成、
连续多轮的 OpenMAIC 原生课堂。单张案例卡、单轮聊天或另一套自建固定对话流程
均不构成正式案例课。

### 3.3 项目空间

[DECIDED, HIGH] 项目卡不是正式教材，项目空间包含三个独立入口：

```text
项目空间
├── 个人研习
├── 小组讨论
└── 个人项目测试
```

个人研习：

- 学员与 Agent 私有讨论；
- 原始对话默认仅本人可见；
- 可形成个人笔记草稿；
- 不评分，不自动进入项目档案。

小组讨论：

- 同组成员共享持久化讨论线程；
- Agent 使用项目卡、当前课程概念和通用商业知识；
- 讨论本身不自动成为正式项目结论；
- 学员明确执行“沉淀到项目档案”后，才形成项目记录。

个人项目测试：

- 每门课程可配置 3-6 道开放场景题；
- 商业模式首发配置 6 题；
- 最多两次正式提交；
- 测试期间不提供实时 Agent 帮答；
- `assessment_assignment.project_id` 必须与项目卡 `project_id` 一致；
- 使用冻结后的 `project_card_version_id`、题目集和量表；
- 测评会话再次冻结相同的 `project_id + project_card_version_id`，不允许只靠标题关联；
- AI 生成文字评价，不显示未经人工校准的数字总分；
- 答案保存成功即视为提交成功，AI 评价异步执行；
- AI 失败不得丢失答案或消耗额外提交次数。

### 3.4 项目卡

[DECIDED, HIGH] 正式项目卡由案主学员在学员端填写并确认，再由授权审核人发布。首发可由教务后台统一导入草稿，但导入记录必须保持 `pending owner confirmation`；麦客思继续作为开发和演示用案例项目卡，不得自动升级为正式企业事实。

首版项目卡最少包含：

```text
1. 项目身份与治理
2. 企业基本业务信息
3. 当前经营快照
4. 本次项目核心问题
5. 已验证事实、案主判断、待验证假设与未知项
6. 企业材料目录
7. 前序课程结论
```

字段与材料的 `allow / mask / block`、信息截止日期和项目卡版本属于跨模块强制属性。

每次个人研习、小组讨论和个人项目测试必须绑定当时的 `project_card_version_id`。项目卡更新后，旧记录继续引用旧版本，不得静默改写历史依据。

### 3.5 两条数据线路

[DECIDED, HIGH] 个人学习档案和标的项目档案是两个独立业务对象。

个人学习档案保存：

- 个人研习对话；
- 个人笔记；
- 课程和案例中的个人记录；
- 个人项目测试；
- AI 评价反馈；
- 学员主动记录的认知变化和待解决问题。

标的项目档案保存：

- 企业基本信息和材料；
- 六门课主题下的讨论记录；
- 经确认沉淀的项目观点、假设和结论；
- 小组作业、评审和修订历史；
- 项目卡版本和前序课程结论。

同一段讨论可以分别产生：

```text
记入我的笔记
沉淀到项目档案
```

两项操作不得合并，个人私有对话不得自动公开。

### 3.6 Agent 上下文和数据安全

Agent 可使用：

```text
项目卡已验证事实
+ 当前课程概念
+ 前序课程结论
+ 通用商业知识
+ 明确标记的新假设
```

Agent 提出项目卡中不存在的判断时必须：

1. 明确说明这是假设；
2. 说明项目卡暂无直接证据；
3. 询问学员是否认同；
4. 追问需要什么信息验证；
5. 不得把假设写成企业事实。

所有字段和材料在进入模型前执行：

```text
allow
mask
block
```

禁止把完整原文先发送给模型，再通过 Prompt 要求模型忽略敏感信息。

## 4. 正式使用基础

[DECIDED, HIGH] 登录采用“花名系统 + 企业微信登录”，内部业务主键始终为不可变 `user_id`。

身份关系至少包含：

```text
user_id
roster_person_id
wecom_tenant_id
wecom_subject_id
class_membership
group_membership
project_membership
valid_from
valid_to
```

[DECIDED, HIGH] 班级和小组数量暂未确定，因此：

- 班级、小组、课程和项目关系必须配置化；
- 小组成员关系必须带有效时间；
- 换组不得覆盖历史成员关系；
- 项目角色和全局角色必须分开；
- 非同组学员必须无法读取项目卡、讨论、作业和个人记录。

[DECIDED, HIGH] 正式版必须使用 PostgreSQL 作为业务事实源，企业材料进入对象存储，长耗时 AI 任务进入异步任务系统。

## 5. 本期明确不做

- 其余五门专业大课的完整上线；
- 四个未审核案例的正式发布；
- 未校准的数字评分、排名、晋级或淘汰；
- 把在线时长或发言次数直接当作学习质量；
- 自动公开个人研习或个人测试结果；
- 旧 IndexedDB 演示数据迁移；
- 微信账号合并和复杂账号申诉流程；
- 多 Agent 同时发言；
- 多人实时文档共同编辑；
- 完整 BI 数据仓库和复杂教练大屏；
- 在没有真实数据前宣称学习效果提升。

## 6. 发布硬门槛

V6.0.0 不得发布，除非全部成立：

1. 花名与企业微信身份完成真实环境联调；
2. 1000 个账号可导入或同步；
3. 班级、小组和项目关系可配置且可审计；
4. 两名同组学员与一名非同组学员的权限测试通过；
5. 课程进度、讨论、笔记、项目卡和测评可跨设备恢复；
6. 项目卡新版本不改写旧会话和旧测评；
7. 敏感 canary 在模型请求、日志和导出中零命中；
8. AI 超时、重试、重复提交和 Worker 重启不会丢失或重复业务记录；
9. 便利蜂和生鲜课程包获得具名 SME 审核；
10. 正式使用的项目卡获得案主确认；
11. 备份恢复、监控告警、生产部署和回退演练通过；
12. 生产 E2E、权限、负载和故障测试全部达到冻结阈值。

## 7. 外部输入与阻塞

下列内容不阻塞领域合同和本地实现，但阻塞正式联调或发布：

| 输入 | 需要提供的内容 | 阻塞 Gate |
|---|---|---|
| 花名系统 | 接口文档、测试环境、稳定人员 ID、班级和小组字段 | Gate 1 |
| 企业微信 | 企业 ID、应用配置、回调域名、测试账号、OAuth 范围 | Gate 1 |
| 班级与小组 | 首批班级数、分组规则、导入时间、换组规则 | Gate 3 |
| 峰值计划 | 上课时间、预计同时在线人数、LLM 峰值 | Gate 5 |
| 课程 SME | 姓名、审核范围、审核时间和最终批准人 | Gate 4 |
| 正式项目卡 | 案主、企业授权、项目卡内容、敏感字段策略 | Gate 3 |
| 生产环境 | 域名、TLS、数据库、对象存储、Secret 管理和告警接收人 | Gate 5 |

## 8. Codex 下一步

本交接书通过后，Codex 按以下顺序执行，不允许跨 Gate 自动连续开发：

```text
Gate 0 版本与架构冻结
→ Gate 1 真实身份、PostgreSQL 与权限基础
→ Gate 2 OpenMAIC 连续案例完成规则与顺序解锁
→ Gate 3 项目卡、个人研习、小组讨论与双档案
→ Gate 4 3-6 题个人测试与异步 AI 评价
→ Gate 5 生产安全、负载、运维、内容审核与正式发布
```

当前唯一下一动作：

> 只执行 Gate 1 Task 1.1“依赖与兼容性刺探”：验证 PostgreSQL/Drizzle、Better Auth Generic OAuth Fake Provider、数据库 Session 和 pg-boss 事务任务能否在当前 Next.js 16 / Node 22+ 仓库稳定运行。通过后独立提交并停止，不继续实现完整身份和页面。

## 9. Gate 状态更新

### Gate 0

```text
status: PASSED
commit: 25adb9141d8eb2f9484d6cd8bb5241c3ba798947
tag: jiuxuange-maic-v6-gate0-20260727
```

### Gate 1

```text
technical audit: COMPLETE
ADR: COMPLETE
schema/API contract: COMPLETE
implementation: NOT STARTED
real roster integration: BLOCKED_BY_INPUTS
real WeCom integration: BLOCKED_BY_INPUTS
```

### Gate 2 本机试学切片

```text
sequential native case entry: COMPLETE
all-correct objective quiz gate: COMPLETE
local case unlock: COMPLETE
convenience-bee native classroom: COMPLETE / INTERNAL_PILOT
cross-classroom SPA state isolation: COMPLETE
server-authoritative progress: NOT STARTED
direct URL authorization: NOT STARTED
cross-device recovery: NOT STARTED
SME approval: BLOCKED_BY_INPUTS
formal Gate 2: NOT PASSED
```

实施与验收记录：

- `v6-gate2-native-classroom-pilot-20260727.md`

Gate 1 当前技术合同：

- `v6-gate1-current-system-audit.md`
- `v6-gate1-schema-and-api-contract.md`
- `adr/0001-postgresql-drizzle-and-migrations.md`
- `adr/0002-roster-wecom-auth-and-session.md`
- `adr/0003-pg-boss-worker-and-events.md`
- `adr/0004-object-storage-and-disclosure.md`

[DECIDED, HIGH] 内部异步任务采用业务事务内 pg-boss Job，不再重复建立一套内部 Job Outbox。`domain_events` 继续保存不可变业务事件；只有未来向外部系统投递时才新增 `integration_outbox`。

## 10. 事实边界

- 已实现：课程中心、双入口 L0、商业模式六题两次提交合同、自由学习、本机课堂、麦客思七模块草案卡、八步案例分析路径、顺序案例目录、社区早餐连锁与便利蜂独立多轮原生课堂、麦客思项目卡与六题测评硬绑定。
- 已验证：上述能力的定向测试、构建和本机浏览器路径；案例答错拦截、完成后解锁下一案例、课堂 ID 切换和项目不一致拒绝已完成回归。
- 仅设计：V6 PostgreSQL/身份/权限合同、服务端课程进度与案例解锁、项目空间、双档案、正式项目卡、异步 AI 评价。
- 尚未完成：Gate 1 依赖刺探、花名企微登录、PostgreSQL 实现、服务端课程状态、权限、生产部署、内容审核、真实 1000 人发布。

## 11. 2026-07-27 自由学习生成链 P0 热修复

### 11.1 本轮目标

[KNOWN, HIGH] 本轮不是 Gate 1 实现，而是关闭升级前真实浏览器测试发现的两个
P0 阻断：

1. DeepSeek 已成功返回但场景结构化响应连续解析失败；
2. 首场景失败后最近学习残留 `0 页` 课堂。

随后真实运行暴露第三个问题：当前 `system-tts` 生成空音频并重复请求，
使可读文字课堂迟迟不能出现。本轮将其收口为可选能力失败，不改变课程生成结果。

### 11.2 已实现

```text
按场景类型限制 maxOutputTokens
→ DeepSeek 场景正文/动作关闭 thinking
→ SDK maxRetries 固定为 0
→ 首个完整场景成功后才提交课堂
→ 首场景失败清理临时课堂与 Agent
→ 失败信息本地化
→ system-tts 单次失败后停止该场景剩余可选语音
→ 文字课程继续可用
```

失败证据已经固定为：

- `tests/replay/jiuxuange-deepseek-scene-terminated-20260727.json`
- `tests/replay/jiuxuange-system-tts-empty-audio-20260727.json`

### 11.3 验证结果

| 验证 | 结果 |
|---|---|
| 9 页 DeepSeek 中文课程 | 课堂 `9rm7i5Yk5i` 成功进入并完成 9 页生成 |
| 1 页 DeepSeek 中文课程 | 课堂 `4ZCjxrJCkv` 约 51 秒进入；TTS 失败不阻塞正文 |
| 失败清理 | 首场景失败后最近学习数量不增加，无新增 0 页课堂 |
| 定向自动化 | 27/27 通过 |
| 受控全量自动化 | 303/303 files，2273/2273 tests 通过 |
| TypeScript / ESLint / Build | 全部通过 |

[KNOWN, HIGH] 浏览器验收使用热修复后的全新生产构建
`http://127.0.0.1:8794`。当前 `system-tts` 没有得到有效音频，
因此本轮只验收“语音失败时文字课堂仍可完成”，没有验收正式语音质量。

### 11.4 Gate 与发布边界

```text
DeepSeek 自由学习课程生成阻断：CLOSED
失败课堂残留阻断：CLOSED
V6 Gate 1 implementation：NOT STARTED
V6 formal release：NO-GO
```

[DECIDED, HIGH] 下一正式开发动作不变：只执行 Gate 1 Task 1.1
“依赖与兼容性刺探”，不得因为本轮生成成功而跳过身份、PostgreSQL、
关系权限、服务端状态和生产发布 Gate。

## 12. 2026-07-27 连续案例与项目一致性修订

### 12.1 产品合同

```text
商业模式大课
→ 第一个多轮 OpenMAIC 原生案例
→ 完成当前案例
→ 解锁下一个案例
```

- 不再向学员提供“六要素主线/正式案例”两个并列入口；
- 社区早餐连锁教学情境负责六要素概念导入，并明确不对应具体真实企业；
- 便利蜂是后续正式案例的多轮课堂标准；
- 每个案例有独立课堂 ID、内容状态和前序案例依赖；
- 内容处于 `in_review` 时不能因为前序完成而提前开放。

### 12.2 项目卡与个人测评

- 麦客思个人测评绑定 `project_id = mckess-central-kitchen`；
- 测评会话冻结 `project_card_version_id = project-card-mckess@1.1.0-draft`；
- assignment、session 和 project card 任一 ID 不一致时拒绝创建、保存和提交；
- 旧泥膜演示草稿保留，旧 assignment 关闭，不作为当前入口；
- 六题全部是麦客思项目情境题，不读取其他项目资料。

### 12.3 项目卡录入责任

```text
主路径：案主学员在学员端填写和确认
兜底：教务后台批量导入草稿
```

后台导入必须记录 `admin_import + import_ref`，并保持
`draft + pending owner confirmation`。导入只替代录入动作，不替代案主确认。

### 12.4 验证

```text
专项自动化：6 files / 28 tests passed
全量首轮：299 files / 2273 tests passed，6 files / 9 tests 并发失败
失败文件单 Worker 复跑：6 files / 31 tests passed
最终受控全量自动化：306 files / 2284 tests passed
TypeScript：passed
ESLint：passed
i18n key alignment：passed，8 locale files
Production build：passed，47 个页面/路由
桌面与 375px 移动端：无横向溢出
```

浏览器已验证课程目录、便利蜂原生课堂、麦客思项目卡、麦客思六题测评和接口
项目 ID 一致性。模型不可用时，新问题会保留，学员端只显示通用重试提示，不再
暴露 Provider、API Key、HTTP 500 或内部错误。

[KNOWN, HIGH] 当前 standalone 实际加载 `0 LLM Provider`。因此预生成课堂可以
浏览，实时 Agent 对话尚不可用。服务端模型配置、探测、脱敏、费用限制和调用审计
全部通过前，当前版本只能保持本机 L0，正式 Gate 状态不得提升。

## 13. 2026-07-28 项目卡与个人项目测评合同修订

[DECIDED, HIGH] 固定六题合同修订为：

```text
每门课程可配置 3-6 道开放场景题
商业模式首发仍配置 6 题
最多两次正式提交
测试期间禁止实时 Agent 帮答
不显示未经人工校准的数字总分
```

[DECIDED, HIGH] 首批支持五类题型：

```text
事实判断
假设互动
方案比较
因果推理
判断修正
```

[DECIDED, HIGH] 项目卡采用七模块，讨论和评价中的内容来源必须区分：

```text
项目卡已验证事实
当前课程概念
前序课程结论
通用商业知识
明确标记的新假设
```

Agent 新假设必须说明项目卡暂无直接证据、询问学员是否认同并追问验证方法，
不得升级为企业事实。

完整合同：

- `v6-project-card-and-assessment-contract-20260728.md`

[KNOWN, HIGH] 本次修订只冻结 Gate 3/4 产品合同。Gate 1 实现尚未开始，
不得提前把现有 JSON 项目卡和固定反馈测评页描述为正式能力。

## 14. 2026-07-28 案例与项目卡配置实现

[IMPLEMENTED, HIGH] 当前预览配置已统一采用以下八步路径：

```text
谁和谁交易
→ 服务谁、解决什么问题
→ 各主体如何协作
→ 企业必须擅长什么
→ 谁向谁付钱
→ 钱在什么时候流入和占用
→ 什么决定长期企业价值
→ 汇总六要素因果图
```

[IMPLEMENTED, HIGH] 首个案例已由旧咖啡店画布替换为
`jxg-bm-case-breakfast-chain-six-elements-v1`。该课程包包含 10 个 OpenMAIC
原生场景和 5 道原生客观互动；完成后解锁便利蜂。旧咖啡课程包保留为历史资产，
不再位于当前案例目录。

[IMPLEMENTED, HIGH] 麦客思项目卡升级为 `project-card-mckess@1.1.0-draft`，
包含七模块、字段级 `allow / mask / block` 和同一八步分析路径。商业模式个人项目
测评升级为 `bm-assessment-mckess-v2`，包含六道题并覆盖事实判断、假设互动、方案
比较、因果推理和判断修正。

[IMPLEMENTED, HIGH] Netlify 预览仅显示 `allow` 或已区间化的 `mask` 字段；
`block` 字段、完整报告事实和原始页码只在本机受控环境显示。测评使用脱敏事实文本，
不提供实时 Agent 帮答。

[KNOWN, HIGH] 上述实现仍是公开预览配置，不改变正式 Gate：

```text
V6 Gate 1 implementation：NOT STARTED
V6 formal release：NO-GO
```

[RULES I BROKE]: 无
