# 九轩阁 Agent 设计与运行时审计（2026-07-22）

## 1. 审计结论

[KNOWN, HIGH] 当前四个 Agent 共享同一条 PBL 会话、同一份项目状态和同一个 Instructor 执行链。它们是教学动作的人格视图，不是四套独立业务逻辑。

[KNOWN, HIGH] 角色的人格 Prompt 已分别定义，但最终可见内容还受课程包问题模板、确定性讲授文本、证据门结果和降级文案共同控制。因此“教授 Agent 的问题”不能只靠修改教授 Prompt 解决。

[KNOWN, HIGH] V5 冻结的节点合同与当前运行时角色选择发生漂移：合同规定 N3 学长、N4 学长、N5 教授、N6 神秘角色；运行时按 `phase` 映射后实际成为 N3 教授、N4 神秘角色、N5 学长、N6 学长。

[INFERRED, HIGH] 角色责任不稳定会让四个 Agent 更像换头像，而不是可预测的教学分工。

## 2. 四角色设计合同

| 角色 | 核心职责 | 允许动作 | 禁止动作 | 当前实现来源 |
|---|---|---|---|---|
| 教授 | 定义概念、澄清边界、讲解课程解释 | 短讲授后问一个检验问题；在 commit 后解释 | 用术语压人；提前给案例答案；代替学员判断 | `lib/c-cubic/agent-prompts.ts`、课程包 `teachingText` |
| 学长 | 降低行动门槛、帮助观察事实、提供支架 | 指向事实、缩小问题、提供句式框架 | 把支架写成答案；把“试过”写成“掌握” | `lib/c-cubic/agent-prompts.ts`、问题 `scaffolds` |
| 神秘角色 | 制造张力、给反例和新情境、检验迁移 | 改变情境条件；追问边界或反证 | 泄露作者结论；随意切换节点 | `lib/c-cubic/agent-prompts.ts`、案例任务 |
| 成长反馈官 | 回放证据、比较前后判断、给下一步建议 | 引用学员原话；区分自主、提示、未形成 | 生成无证据评价；把尝试包装成完成 | `lib/c-cubic/agent-prompts.ts`、`learning-loop.ts` |

## 3. 当前运行时链路

```text
当前 PBL microtask
→ 读取 jiuxuange.phase
→ ROLE_BY_PHASE 选择可见角色
→ 拼接共享规则 + 角色 Prompt + 当前问题 + 可见事实
→ LLM 生成候选表达
→ 证据门判定
→ 确定性讲授/问题/降级文案可能覆盖候选表达
→ 写入同一 thread.messages 与 projectV2 事件
```

[KNOWN, HIGH] 状态迁移由证据门和 PBL 事件决定，不由某个 Agent 自报完成。

[KNOWN, HIGH] V5 的 `assistantText` 在节点初次呈现、节点完成和故障降级时大量使用确定性文本。这提高了可恢复性，但也造成重复讲授和所有弱回答共用一句“辅助理解”。

## 4. 节点角色对账

| 节点 | 冻结合同角色 | 当前 phase | 当前运行角色 | 结论 |
|---|---|---|---|---|
| N1 初始判断 | 教授 | `ground` | 教授 | 一致 |
| N2 必知必会 | 教授 | `ground` | 教授 | 一致 |
| N3 便利蜂事实观察 | 学长 | `ground` | 教授 | 漂移 |
| N4 便利蜂独立判断 | 学长 | `judge` | 神秘角色 | 漂移 |
| N5 解锁解释并比较 | 教授 | `compare` | 学长 | 漂移 |
| N6 生鲜新情境迁移 | 神秘角色 | `test` | 学长 | 漂移 |
| N7 判断修正 | 成长反馈官 | `reflect` | 成长反馈官 | 一致 |
| N8 非分数反馈 | 成长反馈官 | `reflect` | 成长反馈官 | 一致 |

[KNOWN, HIGH] 漂移来自 `lib/c-cubic/runtime.ts` 的全局 `ROLE_BY_PHASE`，而节点合同把角色责任定义在具体学习节点上。

[INFERRED, HIGH] 下一版应让课程包节点显式声明 `agentRole`，导演只校验，不再从通用 phase 反推角色。若要保留 phase 映射，则必须重新冻结节点合同；两者不能继续并存。

## 5. 可见体验的具体问题

1. [KNOWN, HIGH] 同一概念短讲连续出现三次，支架升级时没有只替换问题，而是重复整段讲授。
2. [KNOWN, HIGH] “中央大脑”“不知道”“物流”等不同失败类型都落入相同的通用降级文案，没有告诉学员具体缺了事实、关系还是结果。
3. [KNOWN, HIGH] Agent 切换没有稳定对应教学动作，学员无法形成“教授负责讲清、学长负责带练、神秘角色负责挑战、反馈官负责回放”的预期。
4. [KNOWN, HIGH] 关键节点可以在没有发生实质教学补偿时继续，导致流程完成与学习动作完成脱节。
5. [KNOWN, HIGH] 最终反馈语言高估了实际证据，把未形成的判断、迁移和修正写成已经完成。

## 6. 下一版 Agent 输出合同

| 学员状态 | Agent 必须做什么 | 结果记录 |
|---|---|---|
| 回答成立 | 简短确认具体成立点，再进入下一教学动作 | autonomous/hinted evidence |
| 回答有对象但缺关系 | 指出缺的是“关系变化”，提供一个句式槽位，只问一个补全问题 | attempt；不得写成完成 |
| 回答有关系但缺事实 | 展示一条已披露事实并问它能否支持该关系 | assisted；保留 fact reference |
| 回答“不知道” | 做 60-120 字节点专属微讲授，再给二选一或单槽补全 | taught/attempted；不得写成 formed/completed |
| 连续不知道 | 允许推进，但明确记录“本轮未形成该学习动作” | assisted progression，非 mastery |
| LLM 故障 | 返回节点专属确定性教学动作 | failure event；不生成学习证据 |

[INFERRED, HIGH] 以上合同保留“不阻塞”，但把“不阻塞”从自动放行改成“先发生最小教学补偿，再继续”。

## 7. 设计文件与代码索引

- 角色人格与共享规则：`lib/c-cubic/agent-prompts.ts`
- 运行时角色选择：`lib/c-cubic/runtime.ts`
- V5 节点与讲授文本：`lib/c-cubic/course-package/business-model-v5.ts`
- Instructor 输出和确定性降级：`lib/pbl/v2/agents/instructor.ts`
- 学习声明、修正和反馈：`lib/c-cubic/learning-loop.ts`
- 冻结节点合同：`documentation/jiuxuange/learning-loop-v5-node-contracts.md`
