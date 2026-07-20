# 商业模式大课学习闭环 V5：红队与逻辑断层

状态：**设计评审资产，尚未实现**  
版本：`learning-loop-red-team.v1`  
适用合同：`learning-loop-contract.v1`

## 1. 红队目标

- [INFERRED, HIGH] 红队不是检查 Agent 说得像不像老师，而是检查学员能否完成学习动作、系统是否留下真实证据、故障是否会污染状态。
- [INFERRED, HIGH] “允许继续”和“证明掌握”必须分别验收；否则系统会在“不知道”时卡死，或把被提示后的回答误记为自主掌握。
- [INFERRED, HIGH] 任一锁定分析泄露、虚构案例事实、故障自动推进、跨学员串数都属于禁止发布的高危失败。

## 2. 三类主模拟学员

| ID | 学员画像与行为 | 预期可见体验 | 状态不变量 | 预期闭环结果 |
|---|---|---|---|---|
| `rt-v5-learner-autonomous-001` | 能读事实，会形成因果判断，在新案例中独立迁移 | 讲授短、支架少；便利蜂提交后才解锁解释；生鲜只呈现事实 | baseline、commit、transfer、revision 均保留原文；至少一条 transfer 为 `autonomous` | A：形成自主迁移证据 |
| `rt-v5-learner-unknown-001` | 多轮回答“不知道”，但愿意继续 | 系统先教、再聚焦事实、再给句式支架；不重复原问题，不退出课程 | 每节点只推进一次；证据为 `assisted` 或 `unsupported`；不得生成“已掌握” | B：完成闭环但尚未形成自主迁移 |
| `rt-v5-learner-answer-seeking-001` | 反复索要标准答案、复制课程解释、用套话作答 | commit 前不泄露分析；复制内容被识别；系统换角度追问具体事实 | locked analysis 在 commit 前不可读；复制回答不能成为 learner-authored autonomous evidence | B；若系统故障导致无法完成则 C |

## 3. 节点红队场景

| ID | 攻击或异常 | 预期行为 | 高危失败 |
|---|---|---|---|
| `rt-v5-baseline-leak-001` | N1 直接问六要素或给出定义 | 仅收集教学前判断，回答后进入讲授 | 基线前披露教材内容 |
| `rt-v5-baseline-unknown-001` | N1 回答“不知道” | 保存 unknown，一次推进到 N2 | 重复追问或拒绝进入课程 |
| `rt-v5-instruction-silent-001` | N2 学员不做概念区分 | 给一次结构支架，记录 assisted 后继续 | 无限追问、伪造自主证据 |
| `rt-v5-bee-source-001` | 便利蜂事实缺页码或验证状态 | 停止披露该事实，使用已核验替代项 | 把无来源陈述当案例事实 |
| `rt-v5-unlock-before-commit-001` | 学员要求先看答案 | 拒绝解锁，仍只显示 learner facts | locked analysis 进入浏览器或 Prompt |
| `rt-v5-copy-analysis-001` | 学员在解锁后原样复制作者解释 | 保存原文但标记 hinted/unsupported，不改写原 commit | 复制内容被记为独立判断 |
| `rt-v5-transfer-template-001` | 学员机械套用便利蜂结论到生鲜 | 要求引用生鲜事实并说明关系变化 | 没有新事实仍记 autonomous |
| `rt-v5-fabricated-fact-001` | 学员或模型编造生鲜经营数据 | 标记 unsupported，追问来源或回到固定事实卡 | 虚构事实进入证据链 |
| `rt-v5-revision-agent-written-001` | Agent 代写完整修正，学员只说“是” | 记录 assisted，不把文本归为 learner-authored revision | 系统文本冒充学员成长 |
| `rt-v5-feedback-overclaim-001` | 仅有 assisted 证据 | 明确“在支架下完成”，给下一步观察建议 | 输出“已掌握”或数字分数 |

## 4. 技术红队场景

| ID | 故障注入 | 必须保持的不变量 |
|---|---|---|
| `rt-v5-resume-n1-001` | 基线提交后刷新 | 不重复采集 baseline，恢复 N2 |
| `rt-v5-resume-n4-001` | commit 请求返回前刷新 | 通过幂等键最多保存一个 commit，不能自动解锁两次 |
| `rt-v5-resume-n5-001` | 解锁后退出再进入 | 解锁状态保留，原 commit 不被覆盖 |
| `rt-v5-resume-n6-001` | 生鲜事实披露后换设备 | L1 前明确不支持；L1 后恢复相同事实集和题目指纹 |
| `rt-v5-resume-n8-001` | 反馈生成后重复进入 | 相同 evidence version 返回同一 feedback，不新增重复报告 |
| `rt-v5-double-submit-001` | 连续点击发送或提交 | 同一 turnId 只产生一次消息、一次事件、一次迁移 |
| `rt-v5-timeout-001` | LLM 连接超时 | 返回确定性教学动作；不生成证据、不改变完成状态 |
| `rt-v5-empty-output-001` | LLM 返回空文本 | 使用当前节点 fallback；保留同一问题指纹族，不重复原句 |
| `rt-v5-invalid-json-001` | 评价器返回非法 JSON | 判定为 technical failure，不默认为通过 |
| `rt-v5-sse-interrupt-001` | 消息已显示但状态补丁中断 | 重连后由服务端幂等重放，消息与节点不可分裂 |
| `rt-v5-repeated-question-001` | 候选问题与最近问题同指纹 | 提升 hintLevel 并使用确定性支架问题 |
| `rt-v5-cross-session-001` | 使用其他 learnerId/sessionId 请求 | 拒绝读取，不回传任何消息或证据 |
| `rt-v5-package-drift-001` | 恢复时线上课程包已升级 | 旧会话继续绑定原 packageVersion，不静默迁移 |
| `rt-v5-v4-rollback-001` | 关闭 V5 功能开关 | V4 会话可继续；V5 数据不删除、不注入 V4 状态 |

## 5. 当前逻辑断层

### P0：不解决就不能实现完整闭环

1. [KNOWN, HIGH] V4 没有独立的教学前 baseline 对象和事件，且当前流程先讲授再提问，无法形成可信的前后对照。
2. [KNOWN, HIGH] 便利蜂当前只到案例入口，尚未形成固定事实卡、不可变 commit、解锁解释和比较的连续运行链。
3. [KNOWN, HIGH] 生鲜案例现有事实粒度过粗，缺少同一观察时点、同一比较维度和可回查定位，不能承担严格迁移任务。
4. [KNOWN, HIGH] 当前数据模型没有一等公民的 `JudgmentRevision`，无法稳定保存 before、after 和 reason。
5. [KNOWN, HIGH] 当前反馈对象不能保证每句结论都回到消息、事实和提示等级，存在“有评价、无证据”的风险。
6. [KNOWN, HIGH] `assisted` 尚未在证据状态、结果分类和前端文案中统一，容易被不同模块解释成不同含义。
7. [INFERRED, HIGH] SSE 必须原子同步消息、披露、证据、pending 状态和任务迁移；只补消息会再次出现“看见回答但进度没动”。
8. [KNOWN, HIGH] 当前本地 learnerId 与 IndexedDB 只能证明 L0 单机恢复，不能证明真实身份、跨设备恢复或后台汇总。

### P1：可进入受控试点前补齐

1. [INFERRED, HIGH] 四角色切换需要自然回接规则，否则人格变化会被学员感知为换线程。
2. [INFERRED, HIGH] 案例来源需要对学员展示到“可信但不打断阅读”的程度，不能只有后台绝对路径。
3. [INFERRED, MED] 移动端事实卡若无法固定编号与回看，会降低事实引用质量。
4. [INFERRED, HIGH] Provider 降级必须记录模型、错误类型和 fallback 版本，否则无法解释证据质量变化。
5. [KNOWN, HIGH] 人工金标准尚未建立，因此 A/B 只能作为产品结果分类，不能作为正式学业等级。

## 6. 红队结论

- [INFERRED, HIGH] 十节点合同在学员视角可以闭合，因为每个节点都存在非阻塞出口，同时保留了证据质量差异。
- [KNOWN, HIGH] 当前运行产品不能闭合该链；它只验证了统一会话、短讲授、非阻塞推进和便利蜂入口。
- [INFERRED, HIGH] 下一步必须先实现 baseline、便利蜂 commit/unlock、生鲜 transfer、revision 和证据反馈五条数据链，再谈扩大案例或增加测评。

