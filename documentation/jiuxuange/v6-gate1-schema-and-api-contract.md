# 九轩阁 MAIC V6 Gate 1 Schema 与 API 合同

日期：2026-07-27

状态：Implementation contract

前置 ADR：

1. `adr/0001-postgresql-drizzle-and-migrations.md`
2. `adr/0002-roster-wecom-auth-and-session.md`
3. `adr/0003-pg-boss-worker-and-events.md`
4. `adr/0004-object-storage-and-disclosure.md`

## 1. 范围

Gate 1 只建立：

```text
内部用户
花名导入
企业微信 Adapter
数据库 Session
学年/班级/小组关系
最小课程报名
最小项目关系
统一授权
安全审计
PostgreSQL 与 Worker 基础
```

Gate 1 不实现：

```text
主线课程完成
案例解锁
项目卡编辑
个人研习
小组讨论
个人笔记
项目档案
六题测试
AI 评价
正式对象存储上传页
```

## 2. 模块边界

建议目录：

```text
lib/server/jiuxuange-v6/
├── auth/
│   ├── actor.ts
│   ├── better-auth.ts
│   ├── wecom-provider.ts
│   └── csrf.ts
├── db/
│   ├── client.ts
│   ├── schema/
│   ├── repositories/
│   └── transactions.ts
├── roster/
│   ├── contract.ts
│   ├── import-service.ts
│   └── fixture-adapter.ts
├── authorization/
│   ├── actions.ts
│   ├── authorize.ts
│   └── policies.ts
├── audit/
├── jobs/
└── config/

app/api/jiuxuange/v6/
├── auth/
├── me/
├── projects/
└── admin/roster/

workers/jiuxuange-v6/
└── main.ts
```

实际路径可根据当前仓库惯例调整，但以下边界不可改变：

- Route Handler 不直接写 SQL；
- 页面不直接读取 Session Cookie；
- 业务域不依赖 Better Auth 类型；
- 授权逻辑不散落在组件；
- 外部 Adapter 不返回业务实体；
- 测试 fixture 与真实 Provider 使用同一接口。

## 3. 数据库命名

```text
database: deployment provider decides
business schema: jiuxuange_v6
queue schema: pgboss
```

命名规则：

```text
table: snake_case plural
column: snake_case
primary key: id uuid
foreign key: {entity}_id
time: timestamptz
soft deletion: deleted_at only where legally/business required
version counter: lock_version integer
```

## 4. Gate 1 表合同

### 4.1 `users`

内部业务主体。

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | uuid | PK, default generated |
| `status` | text | `pending/active/suspended/archived` |
| `display_name` | text | 非空 |
| `created_at` | timestamptz | 非空 |
| `updated_at` | timestamptz | 非空 |
| `lock_version` | integer | 非空，默认 0 |

禁止保存为主键：

```text
手机号
企微 user id
花名人员 id
邮箱
```

### 4.2 `roster_people`

花名人员标准化快照。

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | uuid | PK |
| `source_system` | text | 非空 |
| `source_tenant_id` | text | 非空 |
| `roster_person_id` | text | 非空 |
| `user_id` | uuid | FK users，可空，唯一 |
| `status` | text | `active/inactive` |
| `display_name` | text | 非空 |
| `source_version` | text | 非空 |
| `source_payload_hash` | text | 非空 |
| `effective_at` | timestamptz | 非空 |
| `synced_at` | timestamptz | 非空 |

唯一：

```text
(source_system, source_tenant_id, roster_person_id)
```

原始敏感 Payload 不直接保存在此表；只保存标准字段、hash 和可审计 import 引用。

### 4.3 `roster_imports`

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | uuid | PK |
| `source_system` | text | 非空 |
| `source_tenant_id` | text | 非空 |
| `source_version` | text | 非空 |
| `idempotency_key` | text | 唯一 |
| `status` | text | `received/validating/applied/rejected` |
| `record_count` | integer | 非空 |
| `accepted_count` | integer | 非空 |
| `rejected_count` | integer | 非空 |
| `input_hash` | text | 非空 |
| `created_by` | uuid | FK users，可空，仅系统导入时为空 |
| `created_at` | timestamptz | 非空 |
| `completed_at` | timestamptz | 可空 |

### 4.4 `roster_reconciliation_issues`

无法自动匹配时的人工对账队列。

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | uuid | PK |
| `roster_import_id` | uuid | FK |
| `roster_person_id` | uuid | FK，可空 |
| `issue_type` | text | 非空 |
| `status` | text | `open/resolved/dismissed` |
| `details_json` | jsonb | 不得含 Secret |
| `resolved_by` | uuid | FK users，可空 |
| `resolved_at` | timestamptz | 可空 |
| `created_at` | timestamptz | 非空 |

### 4.5 `identity_bindings`

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK users |
| `provider` | text | 首发仅 `wecom` |
| `provider_tenant_id` | text | 非空 |
| `provider_subject_id` | text | 非空 |
| `verified_at` | timestamptz | 非空 |
| `revoked_at` | timestamptz | 可空 |
| `created_at` | timestamptz | 非空 |
| `created_by` | uuid | FK users，可空 |

部分唯一索引：

```text
UNIQUE(provider, provider_tenant_id, provider_subject_id)
WHERE revoked_at IS NULL
```

同一主体内，一个用户只能有一个有效首要企业微信绑定。

### 4.6 Auth 表

Better Auth 使用的 User、Session、Account 和 Verification 表由 Gate 1 兼容性刺探锁定的精确版本生成。

要求：

- 使用 `jiuxuange_v6` schema；
- 表名加 `auth_` 前缀；
- Auth User 与 `users.id` 一对一映射；
- Session 使用数据库策略；
- 任何自动 signup 必须关闭或在 Adapter 前被拒绝；
- 生成 SQL 必须入库审查。

本文件不预写第三方库可能变化的列名，避免在未锁版本前制造伪合同。

### 4.7 `cohorts`

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | uuid | PK |
| `code` | text | 唯一 |
| `title` | text | 非空 |
| `starts_at` | timestamptz | 可空 |
| `ends_at` | timestamptz | 可空 |
| `status` | text | `draft/active/archived` |

### 4.8 `classes`

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | uuid | PK |
| `cohort_id` | uuid | FK cohorts |
| `code` | text | 非空 |
| `title` | text | 非空 |
| `status` | text | `draft/active/archived` |

唯一：

```text
(cohort_id, code)
```

### 4.9 `groups`

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | uuid | PK |
| `class_id` | uuid | FK classes |
| `code` | text | 非空 |
| `title` | text | 非空 |
| `status` | text | `draft/active/archived` |

不限制五人，不写死小组数。

### 4.10 `class_memberships`

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | uuid | PK |
| `class_id` | uuid | FK classes |
| `user_id` | uuid | FK users |
| `role` | text | `learner/class_admin/observer` |
| `status` | text | `active/inactive` |
| `valid_from` | timestamptz | 非空 |
| `valid_to` | timestamptz | 可空 |
| `source` | text | 非空 |
| `source_version` | text | 非空 |
| `created_at` | timestamptz | 非空 |

### 4.11 `group_memberships`

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | uuid | PK |
| `group_id` | uuid | FK groups |
| `user_id` | uuid | FK users |
| `role` | text | `member/group_lead` |
| `status` | text | `active/inactive` |
| `valid_from` | timestamptz | 非空 |
| `valid_to` | timestamptz | 可空 |
| `source` | text | 非空 |
| `source_version` | text | 非空 |
| `created_at` | timestamptz | 非空 |

同一用户、同一组、同一角色的有效区间不得重叠。

### 4.12 `global_role_assignments`

全局角色只包含：

```text
coach
academic_admin
curriculum_researcher
system_admin
```

案主不是全局角色。

字段：

```text
id
user_id
role
valid_from
valid_to
assigned_by
created_at
```

### 4.13 `courses` 与 `course_versions`

Gate 1 只建立最小课程目录，以支持报名关系；Gate 2 扩展单元与互动。

`courses`：

```text
id
code
title
status
created_at
```

`course_versions`：

```text
id
course_id
version
package_fingerprint
status
published_at
created_at
```

唯一：

```text
(course_id, version)
package_fingerprint
```

### 4.14 `course_enrollments`

```text
id
user_id
class_id
course_version_id
status
valid_from
valid_to
source
source_version
created_at
```

### 4.15 `projects`

Gate 1 只建立授权所需的最小项目壳。项目卡内容在 Gate 3 建立。

```text
id
code
title
status
owner_user_id
created_at
updated_at
```

`status`：

```text
draft
active
archived
```

### 4.16 `project_memberships`

```text
id
project_id
user_id
role
status
valid_from
valid_to
source
source_version
created_at
```

`role`：

```text
target_owner
member
project_lead
observer
```

案主在这里表达为 `target_owner`。

### 4.17 `coach_assignments`

```text
id
coach_user_id
class_id nullable
group_id nullable
project_id nullable
valid_from
valid_to
assigned_by
created_at
```

数据库 Check：

```text
class_id / group_id / project_id 恰好一个非空
```

### 4.18 `audit_logs`

安全和高影响操作审计。

```text
id
event_type
actor_user_id nullable
actor_session_id nullable
resource_type
resource_id nullable
decision
reason_code
request_method
request_path
ip_hash nullable
user_agent_hash nullable
trace_id
metadata_json
occurred_at
```

`decision`：

```text
allowed
denied
failed
```

应用账号对该表只有 Insert 和受控查询权限，不允许 Update/Delete。

### 4.19 `domain_events`

```text
id
aggregate_type
aggregate_id
event_type
event_version
actor_user_id nullable
payload_json
idempotency_key
trace_id
occurred_at
```

唯一：

```text
(aggregate_type, aggregate_id, idempotency_key)
```

## 5. 有效期与不重叠

成员关系采用半开区间：

```text
[valid_from, valid_to)
```

Gate 1 migration 使用 PostgreSQL exclusion constraint 或等价事务锁，防止同一关系产生重叠有效区间。

换组：

```text
关闭旧 membership.valid_to
→ 创建新 membership
→ 保留旧记录
→ 追加 group.membership_changed
```

不得 Update 旧记录的 `group_id`。

## 6. 授权合同

### 6.1 Action

```ts
export type JiuxuangeAction =
  | 'course.read'
  | 'project.read'
  | 'project.manage'
  | 'discussion.personal.read'
  | 'discussion.group.read'
  | 'assessment.self.read'
  | 'assessment.coach.read'
  | 'roster.import'
  | 'audit.read';
```

### 6.2 Resource

```ts
export interface AuthorizationResource {
  type: 'course' | 'project' | 'discussion' | 'assessment' | 'roster' | 'audit';
  id?: string;
  ownerUserId?: string;
  classId?: string;
  groupId?: string;
  projectId?: string;
  disclosureLevel?: 'normal' | 'sensitive' | 'restricted';
}
```

### 6.3 Result

```ts
export interface AuthorizationDecision {
  allowed: boolean;
  reasonCode:
    | 'allowed_owner'
    | 'allowed_active_membership'
    | 'allowed_assignment'
    | 'denied_unauthenticated'
    | 'denied_inactive_membership'
    | 'denied_wrong_group'
    | 'denied_disclosure'
    | 'denied_role';
}
```

所有拒绝写审计，但防止存在性泄露：

```text
未登录：401
已登录但资源不应被发现：404
已登录、资源可发现但动作不允许：403
```

页面隐藏按钮只是体验优化，不能代替 Route Handler 授权。

## 7. API 合同

稳定前缀：

```text
/api/jiuxuange/v6
```

### 7.1 响应

成功：

```json
{
  "data": {},
  "meta": {
    "traceId": "trc_..."
  }
}
```

失败：

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "无法执行此操作",
    "traceId": "trc_..."
  }
}
```

不得向客户端返回：

- SQL；
- Provider 响应；
- Secret；
- 内部堆栈；
- 资源是否存在的敏感提示。

### 7.2 Auth

```text
GET  /api/jiuxuange/v6/auth/wecom/start
GET  /api/jiuxuange/v6/auth/wecom/callback
GET  /api/jiuxuange/v6/auth/session
POST /api/jiuxuange/v6/auth/logout
POST /api/jiuxuange/v6/auth/logout-all
```

Better Auth 内部路由可以位于 `/api/auth/**`，但产品代码只依赖上述九轩阁 Facade。

### 7.3 当前用户

```text
GET /api/jiuxuange/v6/me
GET /api/jiuxuange/v6/me/courses
GET /api/jiuxuange/v6/me/projects
```

### 7.4 项目授权探针

```text
GET /api/jiuxuange/v6/projects/{projectId}
```

Gate 1 只返回：

```text
id
title
status
actorRole
```

不返回项目卡敏感内容。

### 7.5 花名管理

```text
POST /api/jiuxuange/v6/admin/roster/imports
GET  /api/jiuxuange/v6/admin/roster/imports/{importId}
GET  /api/jiuxuange/v6/admin/roster/reconciliation
POST /api/jiuxuange/v6/admin/roster/reconciliation/{issueId}/resolve
```

导入必须携带：

```text
Idempotency-Key
sourceVersion
inputHash
```

## 8. 花名导入事务

```text
接收标准化 records
→ schema 校验
→ 检查 sourceVersion 与幂等键
→ 计算 input hash
→ 将整批写入 staging
→ 检查重复稳定 ID
→ 检查企微绑定冲突
→ 应用 roster_people
→ 建立/更新 classes 和 groups
→ 关闭失效 membership
→ 创建新 membership
→ 写 reconciliation issues
→ 写 domain_events 和 audit_logs
→ commit
```

批次出现结构错误时：

```text
整批 rejected
不部分更新正式关系
```

业务可接受的个别未匹配：

```text
记录 reconciliation issue
其余有效记录可以 applied
未匹配用户不能登录
```

两种失败必须有不同状态。

## 9. 配置合同

Gate 1 实施将新增以下环境变量名，真实值不进入 Git：

```text
JIUXUANGE_V6_ENABLED
JIUXUANGE_DATABASE_URL
JIUXUANGE_DATABASE_SSL_MODE
JIUXUANGE_AUTH_SECRET
JIUXUANGE_AUTH_BASE_URL
JIUXUANGE_TRUSTED_ORIGINS
JIUXUANGE_SESSION_MAX_AGE_SECONDS
JIUXUANGE_WECOM_CORP_ID
JIUXUANGE_WECOM_AGENT_ID
JIUXUANGE_WECOM_SECRET
JIUXUANGE_WECOM_CALLBACK_URL
JIUXUANGE_ROSTER_ADAPTER
JIUXUANGE_PGBOSS_SCHEMA
```

生产启动校验：

- V6 开启但缺数据库：失败；
- V6 开启但缺 Auth Secret：失败；
- 生产开启 demo identity：失败；
- Callback URL 非 HTTPS：失败；
- trusted origins 包含通配符：失败；
- Secret 出现在 `NEXT_PUBLIC_*`：失败。

## 10. Gate 1 实施任务

### Task 1.1：依赖与兼容性刺探

只安装和验证：

```text
drizzle-orm
drizzle-kit
pg
@types/pg
better-auth
@better-auth/drizzle-adapter
pg-boss
```

通过后独立提交。失败则停止并写 ADR 修订。

### Task 1.2：数据库与 Migration

- 建立 schema；
- 生成首个 migration；
- 人工检查 SQL；
- 空库 migrate；
- 重跑 migrate；
- 建立数据库集成测试。

### Task 1.3：Fake 花名导入

- 使用脱敏 fixture；
- 导入两个同组、一个异组、一个失效成员；
- 生成内部 user_id；
- 验证换组历史。

### Task 1.4：Fake WeCom 与 Session

- Fake Provider 走完整 state/PKCE/callback；
- 只允许已匹配花名人员；
- 建立、读取、退出、全部吊销 Session；
- 生产禁用 demo identity。

### Task 1.5：授权与审计

- 实现 `getAuthenticatedActor()`；
- 实现 `authorize()`；
- 同组项目可读；
- 异组、失效成员、未登录拒绝；
- 每次拒绝可按 trace 查询审计。

### Task 1.6：真实接口联调

只有外部输入到位后执行：

- 真实企业微信应用；
- 真实花名测试环境；
- 三个测试身份；
- 字段映射；
- 登录与停用 E2E。

## 11. 测试合同

### 单元

- 外部身份规范化；
- 花名记录校验；
- 有效区间；
- 授权决策；
- 错误码映射；
- 生产配置拒绝。

### PostgreSQL 集成

- migration 从空库通过；
- 事务回滚；
- 唯一绑定；
- membership 不重叠；
- Session 吊销；
- 并发导入幂等；
- 审计不可更新；
- pg-boss 事务 Job。

### Route

- 401 未登录；
- 404 异组项目；
- 403 无管理员动作；
- 同组读取成功；
- 失效成员不能读取；
- 花名导入只允许教务/管理员；
- 客户端身份请求头无效。

### E2E

固定四人：

```text
learner-a: group-1 active
learner-b: group-1 active
learner-c: group-2 active
learner-d: group-1 inactive
```

必须证明：

1. A、B 可进入 group-1 项目；
2. C 通过页面和直接 API 都不能读取；
3. D 旧历史署名保留，但不能读取失效后新增资源；
4. Session 吊销后所有写请求失败；
5. 同名用户不会串号；
6. 客户端伪造头不能改变 Actor。

## 12. 回退

功能开关：

```text
JIUXUANGE_V6_ENABLED=false
```

回退只切回当前 V1 页面和 fixture，不删除 V6 数据库。

禁止：

- 回退时 DROP V6 表；
- 将正式 V6 数据写回 JSON；
- 重新启用远程 demo identity；
- 将旧 IndexedDB 自动升级为正式记录。

## 13. Gate 1 完成标准

Gate 1 只有全部成立才为 Passed：

- PostgreSQL migration 和集成测试通过；
- Fake 花名和 Fake WeCom 纵向链路通过；
- 真实花名和企微联调通过；
- 内部 user_id 生效；
- 同组、异组、失效、未登录权限通过；
- 数据与审计全部在 PostgreSQL；
- 正式路由不信任身份请求头；
- 数据库 Session 可吊销；
- 生产配置安全检查通过；
- Worker 基础健康和事务 Job 通过；
- 技术负责人签署结果。

在真实外部接口未到位前，最多可标记：

```text
Gate 1 implementation candidate
```

不得标记：

```text
Gate 1 passed
企业微信登录已完成
支持 1000 人正式使用
```

## 14. 后续表登记

下列对象只登记名称，禁止在 Gate 1 提前实现：

### Gate 2

```text
course_units
learning_sessions
unit_progress
native_interaction_attempts
case_lessons
case_unlocks
```

### Gate 3

```text
project_cards
project_card_versions
project_facts
project_judgments
project_hypotheses
project_unknowns
project_assets
project_disclosure_policies
course_conclusions
discussion_sessions
discussion_participants
discussion_messages
personal_learning_notes
project_records
project_record_versions
```

### Gate 4

```text
assessment_assignments
question_set_versions
rubric_versions
assessment_sessions
assessment_drafts
assessment_attempts
evaluation_reports
criterion_evaluations
ai_runs
```

[RULES I BROKE]: 无
