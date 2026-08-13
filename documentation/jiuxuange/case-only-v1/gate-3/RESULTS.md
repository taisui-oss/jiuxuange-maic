# Case-only V1 Gate 3 五案例验收记录

## Gate 结论

**五案例内容包与服务端顺序闯关 PASS。正式投放仍为 NO-GO。**

本 Gate 证明五个案例均具备完整的 OpenMAIC 多场景课堂包、五道必需互动和服务端顺序解锁链路；
同时证明学员初始页面不包含标准答案、评分提示和解析，教练可使用仓库内部答案版备课。

本 Gate 不证明案例内容已通过具名教研审批，也不证明候选系统已具备 1,000 人正式使用所需的
企微身份、生产 PostgreSQL、备份恢复、容量测试和发布授权。

## 构建标识

- Worktree: `/Users/sijia/Documents/C 立方/OpenMAIC/.worktrees/jiuxuange-case-only-v1`
- Branch: `codex/jiuxuange-case-only-v1`
- Gate 2 commit: `9861c081a73519d29dae8bc7f7e81062f685f40b`
- Gate 3 commit: 包含本验收记录的提交
- Node.js: `v24.7.0`
- pnpm: `10.28.0`
- 验证数据库: PostgreSQL `16.14`，本地隔离端口 `55432`
- 候选模式: `JIUXUANGE_CASE_ONLY=true`

## 五个案例内容包

| 顺序 | 案例 | Classroom ID | 场景 | 必需题 | 来源类型 | 审核状态 |
|---:|---|---|---:|---:|---|---|
| 1 | 社区早餐连锁 | `jxg-bm-case-breakfast-chain-six-elements-v1` | 10 | 5 | 原创教学情境 | `pending_named_sme_review` |
| 2 | 便利蜂 | `jxg-bm-case-convenience-bee-v1` | 10 | 5 | 历史课程材料 | `pending_named_sme_review` |
| 3 | 生鲜零售 | `jxg-bm-case-fresh-grocery-comparison-v1` | 10 | 5 | 历史课程材料 | `pending_named_sme_review` |
| 4 | SHEIN | `jxg-bm-case-shein-system-capabilities-v1` | 10 | 5 | 历史课程材料 | `pending_named_sme_review` |
| 5 | 花西子 | `jxg-bm-case-florasis-business-model-v1` | 10 | 5 | 历史课程材料 | `pending_named_sme_review` |

五个案例均以下列六要素因果顺序组织：

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

社区早餐连锁使用一个集中必需测验；其余案例在课堂中设置两轮必需互动。五个案例均有
10 个场景和 5 道必需题，完成当前案例后才由服务端解锁下一案例。

## 教练答案与学员数据边界

- 教练答案: [CASE_ANSWER_KEY.md](../coach/CASE_ANSWER_KEY.md)
- 案例来源: [CASE_SOURCE_MANIFEST.md](../coach/CASE_SOURCE_MANIFEST.md)
- 教练答案包含每题参考答案、解释、案例因果链、来源页码和文件哈希。
- 学员初始 HTML 与客户端课堂数据会删除 `answer`、`hasAnswer`、`analysis` 和
  `commentPrompt`。
- 客观题错答时，服务端只向当次失败请求返回相应题解析，不在初始页面泄露答案。
- 教练文档不在 Next.js 学员路由下公开；直链测试返回 `404`。
- 真实企业案例按来源材料的历史口径讲授，不得表述为当前实时经营事实。

## 已验证行为

| 行为 | 结果 |
|---|---|
| 五个完整课堂包可加载 | Pass |
| 每个案例 10 场景、5 道必需题 | Pass |
| 案例 2-5 未解锁时直达 | `404` |
| 错误答案不推进进度 | `422`，`progress_version` 不变 |
| 正确交互推进当前场景 | Pass |
| 案例 N 完成后服务端解锁 N+1 | Pass |
| 五案例从 0/5 到 5/5 完整闯关 | Pass |
| 刷新恢复 | Pass |
| 清除 `localStorage` 后恢复 | Pass |
| 第二浏览器上下文恢复 | Pass |
| 重复幂等提交不重复推进 | Pass（继承 Gate 2） |
| 学员初始 HTML 不含答案与解析 | Pass |
| 教练答案 Web 直链 | `404` |
| 桌面布局 | Pass |
| 手机 390 x 844 布局 | Pass，无页面级水平溢出 |

## 命令与退出码

```text
pnpm exec vitest run \
  tests/jiuxuange/case-only-content.test.ts \
  tests/jiuxuange/case-only-route-policy.test.ts \
  tests/jiuxuange/case-only-grading.test.ts
exit 0: 3 files, 9 tests passed

bash scripts/jiuxuange-case-only-test-db.sh reset
exit 0: isolated PostgreSQL database reset and migrations applied

JIUXUANGE_DATABASE_URL=postgresql://127.0.0.1:55432/jiuxuange_case_only_test \
  pnpm exec vitest run \
  tests/jiuxuange/case-only-content.test.ts \
  tests/jiuxuange/case-only-route-policy.test.ts \
  tests/jiuxuange/case-only-grading.test.ts \
  tests/jiuxuange/case-only-progress.integration.test.ts
exit 0: 4 files, 13 tests passed

pnpm exec tsc --noEmit
exit 0

pnpm exec eslint --no-warn-ignored <Gate 3 changed TypeScript and JavaScript files>
exit 0

pnpm build:case-only
exit 0: production compilation and 47-page static data pass completed

bash scripts/jiuxuange-case-only-test-db.sh reset
JIUXUANGE_DATABASE_URL=postgresql://127.0.0.1:55432/jiuxuange_case_only_test \
  pnpm exec playwright test -c playwright.case-only.gate3.config.ts
exit 0: 1 five-case browser test passed in 1.1 minutes
```

Vitest 五案例端到端数据库测试首次运行触发了默认 5 秒测试时限；将该测试的明确时限设为
30 秒后通过。这是测试用例时限调整，不是屏蔽业务失败。

最终复验时，受限 shell 下的 `pg_ctl status` 未识别已由另一会话启动的同一测试库进程，
重置脚本因此误尝试二次启动。脚本已增加“端口上活跃 PostgreSQL 的 `data_directory` 必须等于
候选测试目录”的验证后再重用，重置命令随后返回 `0`。

## 浏览器证据

- [桌面端初始 0/5](./screenshots/gate3-desktop-five-cases-initial.png)
- [案例 1 首场景](./screenshots/gate3-case-1-first-scene.png)
- [案例 2 首场景](./screenshots/gate3-case-2-first-scene.png)
- [案例 3 首场景](./screenshots/gate3-case-3-first-scene.png)
- [案例 4 首场景](./screenshots/gate3-case-4-first-scene.png)
- [案例 5 首场景](./screenshots/gate3-case-5-first-scene.png)
- [手机端第二上下文 3/5](./screenshots/gate3-mobile-cross-device-three-cases.png)
- [手机端 SHEIN 播放器](./screenshots/gate3-mobile-case-4-player.png)
- [桌面端完成 5/5](./screenshots/gate3-desktop-five-cases-complete.png)

## 已知限制与正式使用阻断

- 五个案例内容均为 `pending_named_sme_review`；生成完成不等于专业教研批准。
- 社区早餐连锁使用一个集中必需测验，便利蜂、生鲜零售、SHEIN 和花西子使用两轮必需互动。
- 当前 fixed-candidate 身份只用于候选验证，不能支持 1,000 名学员的花名与企微登录。
- PostgreSQL 只在本地隔离数据库验证，尚无生产备份、PITR、连接池、监控和容量测试。
- 无 OSS；课堂包仍是仓库资产。
- 无 Agent 讨论、项目卡、个人项目测评或 AI 评分。
- 未发布到生产，未使用真实学员数据或生产密钥。
- 手机端沿用 16:9 课堂画布缩放；本次验证无重叠与水平溢出，但小屏文字密度仍需正式发布前用真机复核。

## 退出决策

Gate 3 在“五案例内容包 + 教练答案 + 服务端顺序闯关”范围内关闭。本分支不直接发布生产。

下一个硬门禁是：

```text
具名 SME 逐案例审核与签署
→ 锁定最终 content_version
→ 接入正式花名 / 企微身份
→ 托管 PostgreSQL 与生产运维验收
→ 容量与恢复演练
→ 单独生产发布授权
```
