# ADR 0003：pg-boss Worker、事务任务与领域事件

日期：2026-07-27

状态：Accepted

适用版本：Jiuxuange MAIC V6

## 1. 决策

[DECIDED, HIGH] V6 使用：

```text
一个独立 Node.js Worker
+ pg-boss
+ 与业务相同的 PostgreSQL
```

不在 Gate 1 引入 Redis、Kafka 或云厂商专属队列。

pg-boss 基于 PostgreSQL `SKIP LOCKED`，支持重试、死信、并发策略、心跳，并支持通过 Drizzle Adapter 在现有事务中创建任务：[pg-boss](https://timgit.github.io/pg-boss/)。

## 2. 对原 Outbox 设计的修正

Gate 0 写的是：

```text
业务表
+ append-only 事件
+ outbox
+ Worker
```

[DECIDED, HIGH] Gate 1 将其简化为：

```text
业务表
+ append-only domain_event
+ 事务内 pg-boss job
+ Worker
```

对于当前只在同一 PostgreSQL 内部消费的异步任务，pg-boss 的 Job 表本身承担事务任务出站职责，不再额外建立一张“Job Outbox”后再二次投递。

只有未来需要向外部消息系统、数据平台或第三方系统投递时，才新增 `integration_outbox`。

该修正减少：

- 双重队列；
- outbox dispatcher；
- 二次幂等；
- 一条任务在两个表之间的对账成本。

## 3. 进程边界

正式部署：

```text
Web/BFF
→ 验证、事务写入、查询、任务创建

Worker
→ 异步 AI、文档处理、摘要、投影

PostgreSQL
→ 业务事实、Session、领域事件、Job
```

Web 不在 HTTP 请求中执行：

- 六题评价；
- 企业材料解析；
- 长文摘要；
- 大批量通知；
- 读投影重建。

## 4. 首批 Queue

```text
assessment-evaluate-v1
project-asset-process-v1
discussion-summarize-v1
projection-rebuild-v1
```

Gate 1 只实现基础队列和健康检查；Gate 3、Gate 4 再启用具体业务任务。

### 推荐策略

| Queue | Policy | Singleton key | Retry |
|---|---|---|---|
| `assessment-evaluate-v1` | singleton | `attempt:{attempt_id}` | 3 次，指数退避，死信 |
| `project-asset-process-v1` | singleton | `asset:{asset_id}:{checksum}` | 3 次，指数退避，死信 |
| `discussion-summarize-v1` | standard | `session:{session_id}:{head_message_id}` | 2 次，允许 debounce |
| `projection-rebuild-v1` | key strict FIFO | `projection:{projection}:{subject_id}` | 3 次，死信后告警 |

正式值必须在真实 Provider 延迟和失败样本后校准。

## 5. 事务边界

个人测试提交：

```text
BEGIN
  锁定 assessment_session
  验证最多两次
  插入 assessment_attempt
  更新 assessment_session
  插入 domain_event
  在同一事务创建 assessment-evaluate-v1 Job
COMMIT
```

如果任何一步失败：

```text
答案、提交次数、事件和 Job 全部回滚
```

AI 评价失败时：

```text
assessment_attempt 仍保持 submitted
evaluation_report 保持 pending / failed
Job 按策略重试
不得创建新的 attempt
不得消耗额外提交次数
```

## 6. 幂等

业务幂等键不是 pg-boss Job ID。

```text
assessment evaluation:
  assessment:{attempt_id}:{rubric_version_id}

asset processing:
  asset:{asset_id}:{checksum}:{pipeline_version}

discussion summary:
  discussion:{session_id}:{head_message_id}:{prompt_version}
```

数据库中对最终结果建立唯一约束。即使 Job 被人工 redrive，也只能得到一份当前版本结果。

Worker 写入流程：

```text
读取 Job
→ 读取冻结输入
→ 检查结果唯一键
→ 已存在则返回成功
→ 执行 AI Gateway
→ 校验输出
→ 事务保存结果与 AI Run
→ 完成 Job
```

## 7. 失败和恢复

必须覆盖：

- Worker 在模型调用前崩溃；
- Worker 在模型返回后、写数据库前崩溃；
- 写数据库成功、Job ack 前崩溃；
- Provider 超时；
- Provider 返回非法 JSON；
- 重复 Job；
- 人工 redrive；
- 数据库短时不可用；
- Worker 滚动升级。

pg-boss Queue 使用：

```text
retryLimit
retryDelay
retryBackoff
deadLetter
expireInSeconds
heartbeatSeconds
warningQueueSize
```

官方文档区分 Job 最大执行时间与 Worker 心跳，并提供死信和重试策略：[Queue policies](https://timgit.github.io/pg-boss/api/queues)。

## 8. Node 与 PostgreSQL 要求

pg-boss 当前文档要求 Node 22.12+ 和 PostgreSQL 13+。V6 选择：

```text
Node >= 22.12
PostgreSQL 16
```

当前本机 Node v24.7.0 满足；Docker 的浮动 `node:22-alpine` 在实施时必须改成满足最低版本的固定版本或镜像摘要，避免以后解析到不兼容镜像。

## 9. pg-boss Schema 管理

pg-boss 使用独立 `pgboss` schema。

实施规则：

1. 不让普通 Web 启动账号自动升级 pg-boss schema；
2. 使用 pg-boss CLI 生成或检查安装 SQL；
3. 将已审查的 SQL/版本写入发布制品；
4. 由 migration 身份在 pre-deploy 阶段执行；
5. Worker 启动时只检查兼容版本；
6. pg-boss schema 备份和恢复与业务库一起演练。

官方文档提供数据库安装和 CLI 管理入口：[Database install](https://timgit.github.io/pg-boss/install)、[CLI](https://timgit.github.io/pg-boss/cli)。

## 10. 领域事件

`domain_events` 是不可变业务事实记录，不是唯一业务存储。

最小字段：

```text
id
aggregate_type
aggregate_id
event_type
event_version
actor_user_id
occurred_at
payload_json
trace_id
idempotency_key
```

敏感原文不进入事件载荷。事件只保存可删除业务对象的 ID、分类和必要摘要。

## 11. 可观测性

至少记录：

```text
queue
job_id
business_idempotency_key
attempt
status
queued_at
started_at
completed_at
latency_ms
trace_id
error_code
provider_run_id
```

告警：

- 队列积压超过冻结阈值；
- 死信新增；
- Job 超时；
- 评价失败率；
- 重试率异常；
- Worker 心跳中断；
- 数据库连接耗尽。

## 12. 权衡

### 优势

- 不增加 Redis/Kafka 运维；
- 与业务事务保持原子性；
- 适合当前 1000 人规模；
- 提供重试、死信和多 Worker；
- 可独立扩容 Worker。

### 风险

- 队列负载与业务数据库共享资源；
- 需要为 Worker 单独控制连接池；
- 高峰期必须监控数据库锁和队列积压；
- 将来跨系统事件可能仍需独立 broker。

## 13. 发布测试

- 提交事务回滚时没有孤儿 Job；
- Worker 重启不会生成重复评价；
- 同一 attempt 并发投递只产生一份评价；
- 死信可以受控 redrive；
- 队列积压触发告警；
- Web 停止后 Worker 可继续消费；
- Worker 停止时 Web 仍能保存提交并显示“评价排队中”；
- pg-boss migration 与应用 migration 可以从空库重建。

[RULES I BROKE]: 无
