# 九轩阁 MAIC V6 开发与发布计划

目标版本：`6.0.0`

开发分支：`codex/jiuxuange-v6-formal-release`

目标用户：首批 1000 名真实学员

## 1. 执行原则

1. 每个 Gate 只解决一个可验证纵向闭环。
2. 每个 Gate 独立提交、打候选标签并更新交接书。
3. 未通过前一 Gate，不自动进入下一 Gate。
4. 正式业务状态必须写入服务端事实源。
5. 页面可点击、HTTP 200 和测试通过都不等于正式发布。
6. 课程内容审核、案主确认、权限和运维与代码同属发布门槛。
7. 旧 V5/V5.1 和自由学习已确认体验必须保留回归与回退。

## 2. Gate 0：版本与架构冻结

目标：把最新产品决策变成仓库内唯一有效交接。

交付：

```text
conversation-handoff-v6-formal-release-20260727.md
v6-product-scope-and-business-flow.md
v6-production-architecture.md
v6-delivery-plan.md
AGENTS.md 更新
README.md 更新
decision-log.md 更新
test-and-release-baseline.md 更新
```

验收：

- V6 与 V5/V5.1 的保留、停用和新增边界明确；
- 1000 人、花名企微、无强制反思、六题两次、麦客思开发卡已记录；
- 已实现、已验证、仅设计、尚未完成分开；
- 外部输入、Owner 和阻塞 Gate 可追踪；
- Git 工作树只包含文档与项目规则变更。

## 3. Gate 1：身份、数据库与权限基础

目标纵切：

```text
企业微信登录
→ 映射花名人员
→ 创建内部 user_id
→ 读取课程报名与小组关系
→ 授权访问一个服务端项目
→ 非同组访问被拒绝并留审计
```

[KNOWN, HIGH] 2026-07-27 已完成 Gate 1 现状审计、ADR 和 Schema/API 合同；尚未开始依赖安装、数据库 migration 或身份实现。

实施任务：

1. `DONE` 冻结身份、数据库、Worker 和对象存储 ADR；
2. `NEXT` 完成 Drizzle、Better Auth、Fake OAuth 和 pg-boss 兼容性刺探；
3. 建立 PostgreSQL 迁移机制；
4. 实现 User、IdentityBinding、Class、Group、Enrollment、Membership；
5. 实现花名同步或导入 Adapter；
6. 实现企业微信 OAuth Adapter；
7. 替换演示请求头身份；
8. 建立统一授权函数和审计日志；
9. 建立最小生产配置与 Secret 管理；
10. 用两个同组账号、一个外组账号和一个失效账号完成 E2E；
11. 使用真实花名和企业微信测试环境完成联调。

Gate 1 硬条件：

- 不允许远程 demo identity；
- 不允许把企微 ID 或手机号当业务主键；
- 不允许依赖前端隐藏按钮实现权限；
- 同组、异组、失效成员和未登录访问均有自动化测试；
- 用户、关系与审计数据全部在 PostgreSQL。

外部输入：

- 花名系统接口或脱敏样例；
- 企业微信测试应用；
- 三个真实测试身份；
- 第一批班级和小组字段定义。

Gate 1 当前状态：

```text
technical audit: COMPLETE
implementation: NOT STARTED
real integration: BLOCKED_BY_INPUTS
```

## 4. Gate 2：主线与案例

目标纵切：

```text
真实学员登录
→ 进入商业模式主线
→ 完成 required 原生互动
→ 客观题答对
→ 服务端记录单元完成
→ 解锁便利蜂案例
→ 进入独立案例课堂
→ 换设备恢复
```

实施任务：

1. 定义 OpenMAIC Runtime Adapter；
2. 区分服务端权威学习状态和客户端瞬时 UI 状态；
3. 建立 Course、CourseVersion、UnitProgress、InteractionAttempt、CaseUnlock；
4. 停用正式主线中的自定义 V5.1 补偿状态机；
5. 保留旧课堂只读和回退；
6. 为便利蜂和生鲜建立独立案例课程包与路由；
7. 建立案例解锁配置；
8. 建立跨设备恢复；
9. 完成桌面、移动端和断网重试 E2E。

Gate 2 硬条件：

- required 客观题未答对时不得完成；
- 不建立第二份互相冲突的进度状态；
- 重复提交和双标签页不得重复完成或解锁；
- 未解锁案例不能通过直接 URL 进入；
- 旧 V5/V5.1 课堂仍可只读打开；
- 自由学习 V1.0.1 上传、生成、无声降级和播放回归通过。

## 5. Gate 3：项目卡、讨论与双档案

目标纵切：

```text
案主填写并发布项目卡 V1
→ 小组获得访问
→ 学员创建私有研习
→ 小组进入共享讨论
→ 保存个人笔记
→ 确认一个项目记录
→ 案主发布 V2
→ V1 历史保持不变
```

实施任务：

1. 项目卡草稿、预览、案主确认和发布；
2. 事实、判断、假设、未知项和材料分层；
3. 对象存储和材料权限；
4. `allow/mask/block` 上下文生成器；
5. 个人研习私有会话；
6. 小组共享讨论线程；
7. 个人笔记草稿与保存；
8. 项目记录草稿、确认和版本；
9. 项目卡版本绑定和历史回放；
10. 退出成员的历史署名与后续访问控制。

Gate 3 硬条件：

- 麦客思仅作为开发 fixture；
- 正式项目卡必须有案主；
- 个人对话不会自动进入项目档案；
- `block` 字段 canary 在模型输入和日志中零命中；
- V2 发布不改变 V1 会话；
- 非同组成员无法读取共享讨论；
- 原始对话、个人笔记和项目记录是三个对象。

外部输入：

- 首批正式项目案主；
- 项目卡内容；
- 企业材料授权；
- 班级和小组名单；
- 数据保留与可见性政策。

## 6. Gate 4：六题个人项目测试与异步评价

目标纵切：

```text
教研发布六题
→ 学员独立作答
→ 第一次正式提交
→ 方向反馈
→ 第二次正式提交
→ 答案锁定
→ Worker 异步生成最终评价
→ 教练按权限查看
```

实施任务：

1. 将现有 L0 六题、两次提交领域合同迁移到 PostgreSQL；
2. 建立题目集和量表版本；
3. 建立草稿自动保存；
4. 禁用测试页实时 Agent；
5. 提交事务与评价 Job 分离；
6. 建立 Outbox、幂等键、重试和死信处理；
7. 实现 AI Gateway、结构化输出校验和 AI Run；
8. 输出六维文字评价；
9. 建立评价可见性、重试和人工备注；
10. 固定 AI 失败、重复提交、Worker 重启和越权样本。

Gate 4 硬条件：

- 只允许两次正式提交；
- 草稿不消耗机会；
- AI 失败不改变提交状态；
- 重试只生成一份评价；
- 评价引用冻结题目、答案、项目卡和量表版本；
- 不显示数字总分；
- 不读取个人研习或小组讨论历史；
- 不输出人格、潜力、晋级或淘汰结论。

## 7. Gate 5：正式发布

目标：证明系统可以服务首批 1000 名真实学员，而不是只完成开发环境演示。

发布任务：

1. 生产环境、域名和 TLS；
2. PostgreSQL 与对象存储备份；
3. 迁移和回退演练；
4. 结构化日志、Trace、指标和告警；
5. AI Provider、预算、限流和费用告警；
6. 1000 账号导入或同步；
7. 权限与敏感数据红队；
8. 负载和队列积压测试；
9. 桌面与移动端 E2E；
10. 便利蜂、生鲜和正式项目卡人工审核；
11. 使用说明、支持流程和事故联系人；
12. 正式发布报告与冻结标签。

暂定负载起点：

```text
1000 个真实账户
200 个并发活跃用户
50 个并发 LLM Job
```

该数字是技术假设，必须根据正式课表和同时在线预期重签。

正式发布标签：

```text
jiuxuange-maic-v6.0.0
```

只有 Gate 5 全部通过后才能创建。

## 8. 当前外部输入清单

| 编号 | 输入 | 当前状态 | Owner | 最晚 Gate |
|---|---|---|---|---|
| I1 | 花名系统接口文档与测试环境 | 未提供 | 项目负责人/技术接口人 | Gate 1 |
| I2 | 企业微信应用与测试账号 | 未提供 | 企业微信管理员 | Gate 1 |
| I3 | 班级数、字段和导入方式 | 未确定 | 教务 | Gate 3 |
| I4 | 小组数、分组和换组规则 | 未确定 | 教务 | Gate 3 |
| I5 | 正式项目案主和项目卡 | 未提供 | 项目负责人/案主 | Gate 3 |
| I6 | 便利蜂和生鲜 SME 审核 | 未完成 | 课程负责人 | Gate 4 |
| I7 | LLM Provider、模型和预算 | 未确定 | 技术负责人/项目负责人 | Gate 4 |
| I8 | 正式课表和峰值人数 | 未确定 | 教务 | Gate 5 |
| I9 | 生产域名、数据库、存储和告警 | 未提供 | 运维/技术负责人 | Gate 5 |
| I10 | 数据保留、删除、导出和隐私文本 | 未确定 | 项目负责人/合规负责人 | Gate 5 |

## 9. Codex 单任务启动指令

Gate 1 技术审计完成后，下一次仅允许执行 Task 1.1“依赖与兼容性刺探”，不得一次开发完整 Gate 1：

```text
先读取：
- AGENTS.md
- documentation/jiuxuange/conversation-handoff-v6-formal-release-20260727.md
- documentation/jiuxuange/v6-gate1-current-system-audit.md
- documentation/jiuxuange/v6-gate1-schema-and-api-contract.md
- documentation/jiuxuange/adr/0001-postgresql-drizzle-and-migrations.md
- documentation/jiuxuange/adr/0002-roster-wecom-auth-and-session.md
- documentation/jiuxuange/adr/0003-pg-boss-worker-and-events.md

本次只完成 Task 1.1：
1. 安装并锁定 Drizzle、pg、Better Auth、Drizzle Adapter 和 pg-boss；
2. 启动隔离测试 PostgreSQL；
3. 验证 migration 从空库执行和重复执行；
4. 用 Fake WeCom Provider 验证 state/PKCE/callback；
5. 验证未在 Fake 花名中的人不能建立 Session；
6. 验证数据库 Session 创建、读取、退出和吊销；
7. 验证业务事务内创建 pg-boss Job，事务回滚时 Job 一并消失；
8. 记录实际版本、文件、测试、失败和回退；
9. 只提交兼容性刺探，不实现正式页面或真实接口；
10. 提交后停止。
```

## 10. 停止条件

出现以下任一情况应停止对应 Gate，不以临时代码绕过：

- 花名或企业微信无法提供稳定身份；
- 无法证明非同组数据隔离；
- 正式项目事实没有案主确认；
- 敏感字段进入模型或日志；
- AI 重试产生重复评价；
- 旧课程或自由学习体验发生无回退退化；
- 负载阈值未定义却要求宣布支持 1000 人同时使用；
- 测试或页面完成被描述成学习效果完成。

[RULES I BROKE]: 无
