# ADR 0001：PostgreSQL、Drizzle 与迁移策略

日期：2026-07-27

状态：Accepted

适用版本：Jiuxuange MAIC V6

## 1. 决策

[DECIDED, HIGH] V6 使用：

```text
PostgreSQL 16
+ node-postgres
+ Drizzle ORM
+ Drizzle Kit 版本化 SQL migration
```

数据库 schema：

```text
jiuxuange_v6   业务表与 Auth 表
pgboss         pg-boss 自管队列表
```

生产迁移只能使用：

```text
drizzle-kit generate
→ 人工审查 SQL
→ 测试环境 migrate
→ 备份与恢复检查
→ 生产 pre-deploy migrate
```

禁止在生产环境使用：

```text
drizzle-kit push
应用实例并发启动时自动修改 schema
破坏性 down migration
未提交到 Git 的手工 SQL
```

Drizzle 官方建议在生产使用 `generate + migrate` 保留版本历史，并指出零停机部署可把迁移作为应用接流量前的独立步骤：[Drizzle PostgreSQL migrations](https://orm.drizzle.team/docs/tutorials/node-railway-pg)。

## 2. 原因

### 2.1 与当前代码匹配

- 当前仓库是 TypeScript 单体；
- 领域类型已使用 TypeScript 和 Zod；
- 1000 人规模不需要引入独立数据平台；
- 需要精确 SQL、事务、外键、唯一约束和可审计 migration；
- 后续 pg-boss 可以复用同一 PostgreSQL。

### 2.2 为什么不使用 JSON 或 IndexedDB

现有 JSON 和 IndexedDB 无法提供：

- 多实例一致性；
- 跨设备恢复；
- 关系权限；
- 两次提交的并发约束；
- 可追溯数据库迁移；
- 可靠异步任务事务。

### 2.3 为什么不选择 Prisma

Prisma 能完成需求，但本项目需要较多：

- PostgreSQL 约束；
- partial unique index；
- `FOR UPDATE`；
- 队列事务；
- 显式 SQL 审查。

Drizzle 更贴近 SQL，且引入的运行时边界更薄。

### 2.4 为什么不直接手写全部 SQL

纯 SQL 的控制力最高，但会增加：

- TypeScript 类型重复；
- Repository 输入输出漂移；
- schema 变更的人肉同步成本。

V6 采用“Drizzle 定义 + 生成 SQL + 人工审查”，保留类型与 SQL 两侧的可见性。

## 3. 连接和事务

Web 与 Worker 各自建立受限连接池：

```text
Web:
  application_name=jiuxuange-web

Worker:
  application_name=jiuxuange-worker

Migration:
  application_name=jiuxuange-migrate
  使用独立高权限凭证
```

业务应用账号不得拥有：

```text
CREATE DATABASE
DROP DATABASE
CREATE ROLE
任意 schema 的 DDL 权限
```

所有跨表业务状态使用单个数据库事务完成。例如个人测试正式提交：

```text
锁定 assessment_session
→ 验证提交次数
→ 插入 assessment_attempt
→ 更新 session 状态
→ 追加 domain_event
→ 事务内创建 pg-boss job
→ COMMIT
```

## 4. Migration 规则

目录候选：

```text
drizzle/
├── jiuxuange-v6/
│   ├── 0000_identity_and_membership.sql
│   ├── 0001_auth_session.sql
│   └── meta/
└── pgboss-reviewed/
```

Gate 1 实施前由仓库结构测试确认最终目录。

规则：

1. 每个 migration 有明确前滚行为；
2. 不依赖 down migration 回滚数据；
3. 回滚应用时，数据库保持向后兼容；
4. 删除列采用“停止写入 → 观察 → 后续版本删除”；
5. 大表索引使用适合生产的在线策略；
6. migration 与应用版本一起归档；
7. migration 失败时不启动新版本；
8. 生产执行结果写入发布报告。

## 5. 标识与时间

主键：

```text
uuid
default gen_random_uuid()
```

外部接口只暴露不透明 ID，不从手机号、企微 ID、班级名或项目名推导。

时间：

```text
timestamptz
统一写 UTC
前端按 Asia/Shanghai 展示
```

成员有效期使用半开区间语义：

```text
valid_from <= now
AND (valid_to IS NULL OR now < valid_to)
```

## 6. 并发与约束

关键约束必须由数据库保证，不只靠页面：

- 企业微信身份绑定唯一；
- 同一课程报名的活跃记录唯一；
- 同一成员关系的有效区间不得重叠；
- 同一测试 session 的提交次数只能为 1 或 2；
- 同一测试 attempt number 唯一；
- 同一案例解锁只产生一条有效记录；
- 项目卡发布版本不可原地修改；
- 幂等键在其业务作用域内唯一。

对“先读再写”的提交、发布和成员变更使用行锁或带版本号的乐观并发控制。

## 7. 备份与恢复

Gate 5 前必须验证：

```text
每日完整备份
持续 WAL 或等价时间点恢复
备份加密
恢复到隔离环境
随机抽查关键关系和评测记录
记录 RPO / RTO 实测值
```

RPO 和 RTO 当前未冻结，不得在未演练前写成承诺。

## 8. 影响

### 优势

- 类型、SQL 和 migration 可审查；
- 与现有 TypeScript 代码匹配；
- 支持事务队列和未来读投影；
- 基础设施数量少。

### 代价

- 需要新增数据库运行与备份能力；
- 团队必须掌握 SQL，而不是只依赖 ORM；
- migration 需要独立发布门禁；
- 旧 JSON 和 IndexedDB 不能直接复用为正式数据。

## 9. 实施门禁

Gate 1 只有以下结果全部通过，ADR 才算落地：

1. 新数据库可从空库迁移；
2. 同一 migration 重跑安全；
3. Web 和 Worker 使用不同连接身份；
4. 事务回滚不会留下半条成员关系或审计记录；
5. 备份和还原脚本至少在本地/测试环境完成一次；
6. 正式路由不再写 JSON；
7. 数据库集成测试在真实 PostgreSQL 上运行，不使用内存替代品。

## 10. 参考

- [Drizzle PostgreSQL existing project](https://orm.drizzle.team/docs/get-started/postgresql-existing)
- [Drizzle configuration and migration table](https://orm.drizzle.team/docs/drizzle-config-file)
- [Drizzle production migration guidance](https://orm.drizzle.team/docs/tutorials/node-railway-pg)

[RULES I BROKE]: 无
