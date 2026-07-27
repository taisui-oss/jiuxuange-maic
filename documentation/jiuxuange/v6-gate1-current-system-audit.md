# 九轩阁 MAIC V6 Gate 1 现状审计

日期：2026-07-27

审计基线：

```text
branch: codex/jiuxuange-v6-formal-release
commit: 25adb9141d8eb2f9484d6cd8bb5241c3ba798947
gate: Gate 1 技术审计
```

本文件只记录当前代码事实、正式使用差距和下一步实施边界。它不表示 Gate 1 功能已经实现。

## 1. 审计结论

[KNOWN, HIGH] 当前代码可以支持本机和受控演示，但不能作为 1000 名学员正式使用的身份、数据、权限和异步任务基础。

阻断正式使用的四个核心事实：

1. 学员身份来自受信任请求头或本机演示身份，不是真实会话；
2. 九轩阁门户和个人测试状态保存在单个 JSON 文件中；
3. 正式课堂进度和对话主要以浏览器 IndexedDB 为权威；
4. 课堂生成任务保存在本地文件，并只使用进程内锁。

[DECIDED, HIGH] Gate 1 不在现有 JSON、IndexedDB 和请求头身份上继续叠加正式功能。V6 建立新的服务端身份、PostgreSQL、权限和任务基础，旧实现继续作为开发 fixture 与回归资产。

## 2. 运行与部署基线

| 项目 | 当前事实 | 正式使用判断 |
|---|---|---|
| 应用 | Next.js 16、React 19、TypeScript | 保留 |
| 包管理 | pnpm 10.28.0 | 保留 |
| 本机 Node | v24.7.0 | 满足 Gate 1 候选依赖要求 |
| 容器 | `node:22-alpine` 多阶段 standalone | 保留形态；必须锁定满足依赖最低版本的镜像摘要 |
| 部署 | 单个 Web 容器，本地 `/app/data` volume | 不满足多实例和 Worker |
| 数据库 | 未接入 | 必须新增 PostgreSQL 16 |
| Worker | 未独立部署 | 必须新增独立 Worker 进程 |
| 对象存储 | 未接入 | 必须新增私有 S3 兼容存储 |
| 外层访问码 | 可选 HMAC Cookie | 只可作为预览环境附加门禁，不能代替用户认证 |

当前 `package.json` 没有 PostgreSQL ORM、身份框架、任务队列或 S3 SDK 依赖。Gate 1 实施时必须独立安装、锁版本并更新许可证清单。

## 3. 身份与会话现状

### 3.1 当前实现

当前入口：

```text
lib/server/jiuxuange/identity.ts
lib/server/jiuxuange/api.ts
middleware.ts
```

当前身份来源：

```text
JIUXUANGE_TRUST_IDENTITY_HEADERS=true
→ 读取 x-jiuxuange-learner-id

localhost / 127.0.0.1
→ demo-learner 或 demo-teammate
```

`middleware.ts` 只验证可选 `ACCESS_CODE`，不建立用户会话，也不读取班级、小组或项目关系。

### 3.2 风险

- 远程反向代理配置错误时，请求头身份可被伪造；
- 演示身份没有登录、退出、吊销和失效机制；
- 没有将企业微信身份与花名人员进行确定性绑定；
- 没有数据库会话，无法执行“全部设备退出”或即时撤销；
- 页面能否显示与资源是否有权读取没有统一授权边界。

### 3.3 Gate 1 替换边界

[DECIDED, HIGH] 正式请求必须通过统一 `getAuthenticatedActor()` 获取内部 `user_id`。任何业务 API 不再直接信任：

```text
x-jiuxuange-learner-id
x-jiuxuange-demo-learner
手机号
企业微信 user id
显示名
```

演示身份只能在显式开发模式、回环地址和测试构建中启用；生产构建检测到演示身份开关时必须启动失败。

## 4. 九轩阁门户数据现状

当前入口：

```text
lib/server/jiuxuange/repository.ts
lib/jiuxuange/portal/types.ts
app/api/jiuxuange/**
```

当前事实源：

```text
data/jiuxuange-portal/portal-state.v1.json
```

写入使用：

```text
进程内 Promise 队列
→ 读取整个 JSON
→ 修改内存对象
→ 原子覆盖文件
```

### 风险

- 进程内队列不能协调两个 Web 实例；
- 服务重启、容器替换和共享存储异常会影响数据；
- 整体读改写容易产生覆盖和性能问题；
- 缺少外键、唯一约束、事务和并发控制；
- 无法可靠执行成员有效期、提交次数和跨资源权限；
- 无法生成可审计的操作历史。

[DECIDED, HIGH] 当前 JSON 不迁移为正式数据。现有 seed 只转为测试 fixture，V6 正式表从空数据库建立。

## 5. 课堂状态现状

当前浏览器数据库：

```text
lib/utils/database.ts
lib/store/stage.ts
```

Dexie 数据库 `MAIC-Database` 当前保存：

- stage；
- scene；
- chat session；
- playback state；
- learning path；
- course progress；
- learning evaluation；
- media。

### 正确保留在客户端的状态

- 当前动画帧；
- 当前展开面板；
- 未提交输入框；
- 音量、播放速度等显示偏好。

### 必须迁到服务端的状态

- 学员是否有权进入课程；
- 课程版本和课堂实例；
- required 互动是否完成；
- 客观题是否答对；
- 单元是否完成；
- 案例是否解锁；
- 项目讨论消息；
- 个人测试草稿和正式提交；
- 跨设备恢复位置。

[DECIDED, HIGH] Gate 2 通过 `LearningRuntimeAdapter` 将 OpenMAIC 客户端事件映射到服务端进度，不能把 Dexie 全部表直接复制到 PostgreSQL。

## 6. 课堂和任务文件存储现状

当前入口：

```text
lib/server/classroom-storage.ts
lib/server/classroom-job-store.ts
```

当前行为：

- 课堂内容和生成任务写入本地 JSON 文件；
- 每个 Job 使用进程内 mutex；
- 30 分钟无更新的运行任务被视为失败；
- 没有独立 Worker、租约、心跳、死信或跨实例幂等。

### Gate 1 处理

- 课堂课程包继续是版本化制品，不在 Gate 1 重写；
- 业务异步任务采用 PostgreSQL 队列；
- 后续课程包媒体和企业材料进入对象存储；
- 本地文件 Job 保留给旧自由学习回归，不能承载正式测评评价。

## 7. LLM Provider 现状

当前入口：

```text
lib/server/resolve-model.ts
lib/server/provider-config.ts
lib/server/model-routes.ts
```

当前能力：

- 服务端 `DEFAULT_MODEL` 和 `MODEL_ROUTES`；
- Server-managed Provider；
- 模型阶段路由；
- 对客户端 URL 的 SSRF 检查；
- 部分请求仍允许传入 `x-model`、`x-api-key`、`x-base-url`。

### Gate 1 结论

[DECIDED, HIGH] V6 正式业务用途必须使用服务端注册的模型策略，拒绝客户端提供 Key、Base URL 和模型路由。

首批服务端用途：

```text
project_discussion_reply
personal_note_draft
project_record_draft
assessment_evaluation
project_asset_extraction
```

每个用途后续绑定：

```text
prompt_version
input_schema
output_schema
provider policy
token ceiling
cost ceiling
timeout
retry policy
redaction policy
```

Gate 1 只冻结接口，不实现上述业务 AI。

## 8. 当前实现资产处理矩阵

| 资产 | 决定 | 说明 |
|---|---|---|
| OpenMAIC 播放器与场景运行时 | REUSE | Gate 2 通过 Adapter 接入 |
| Dexie 瞬时 UI 状态 | KEEP | 不作为正式完成事实源 |
| Dexie 正式进度 | DISABLE_AS_AUTHORITY | Gate 2 由服务端替代 |
| 九轩阁门户类型 | REFERENCE | 用于迁移业务概念，不直接映射整表 JSON |
| JSON 门户 Repository | FIXTURE_ONLY | 正式路由不得调用 |
| 请求头/演示身份 | DEV_ONLY | 生产启动必须拒绝 |
| Access Code | OPTIONAL_OUTER_GATE | 不代替身份和权限 |
| 本地课堂文件存储 | LEGACY_ONLY | 正式课程包后续进入受控制品存储 |
| 本地课堂 Job | LEGACY_ONLY | 正式异步任务使用 Worker |
| Server model routing | REFACTOR | V6 业务调用只允许服务端策略 |
| V5/V5.1 补偿证据机制 | FROZEN_EXPERIMENT | 不接入 V6 主线 |
| 六题两次提交领域合同 | REUSE_CONCEPT | Gate 4 迁入 PostgreSQL |

## 9. 最大不确定性与遗漏检查

### 最没有把握的事项

[KNOWN, HIGH] 花名系统和企业微信的真实接口合同尚未提供。当前只能冻结 Adapter 和安全边界，不能确认字段、回调参数、租户模式或用户匹配键。

### 当前最大遗漏

[INFERRED, HIGH] “花名 + 企微登录”不仅是登录页面问题。真正决定能否正式使用的是：

- 花名人员与企微成员的确定性匹配键；
- 人员离职、退学、换班、换组后的失效时点；
- 企微多租户或单一主体；
- 无法匹配账号的人工对账流程；
- 1000 人首次同步失败后的补偿机制。

Gate 1 在这些输入缺失时只能完成数据库、Adapter、Fake Provider 和权限自动化，不能宣称真实身份联调通过。

## 10. Gate 1 审计判断

```text
Gate 1 technical audit: COMPLETE
Gate 1 implementation: NOT STARTED
Gate 1 external integration: BLOCKED_BY_INPUTS
V6 release status: INTERNAL / NOT FOR FORMAL USE
```

下一步实施只允许：

```text
PostgreSQL + Drizzle 基线
Better Auth 兼容性刺探
花名与企微 Fake Adapter
内部 user_id 与关系表
数据库 Session
统一授权与审计
同组 / 异组 / 失效成员 E2E
```

不得在收到真实接口前伪造花名系统或企业微信成功响应并包装成已联调。

## 11. 审计证据

本次只读检查：

```text
node -v: v24.7.0
pnpm -v: 10.28.0
git status: clean
```

本轮没有运行产品测试，因为没有修改产品代码。文档提交前只执行文档链接、格式和工作树检查。

[RULES I BROKE]: 无
