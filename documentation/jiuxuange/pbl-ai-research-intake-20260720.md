# PBL 式 AI 学习平台调研：九轩阁吸收与取舍记录

状态：**研究输入已阅读、关键依据已核验；不代表相关能力已实现**  
记录版本：`pbl-ai-research-intake.v1`  
输入文件：`pbl-ai-learning-research.zip`  
记录日期：2026-07-20

## 1. 覆盖范围与证据边界

- [KNOWN, HIGH] 报告比较了 OpenMAIC、DeepTutor、Open TutorAI CE、Tutor MCP 与 AutoPBL，并提出动态脚手架、中央学习者状态、EDF、能力门控、认知算法和多 Agent 等改造方向。
- [KNOWN, HIGH] 报告来源混合了官方仓库、论文、机构博客和二手分析，因此本记录只把官方仓库、本地代码、正式论文和机构实验报告作为高权重依据。
- [KNOWN, HIGH] 本地工作树为 `v0.3.0-56-g77756f4-dirty`，包含 Next.js 16、React 19、LangGraph、PBL v2、确定性 proficiency engine、Instructor memory compression 和 SSE 运行链。
- [INFERRED, HIGH] 报告适合作为架构模式索引，不适合作为直接开发任务清单；它没有结合九轩阁当前课程内容、事实包和证据链缺口排序。

## 2. 关键外部依据核验

| 研究主张 | 核验结果 | 九轩阁解释 |
|---|---|---|
| AutoPBL 用项目分块与 checkpoint 支持个人 PBL | [KNOWN, HIGH] 清华团队页面和论文确认其围绕项目框架、分块内容、情境问答与检查点展开 | [INFERRED, HIGH] 可借鉴 Block/Checkpoint 结构，但不能把失败 checkpoint 变成禁止学习 |
| EDF 将证据、判断与反馈分离 | [KNOWN, HIGH] AAAI 论文提出结合 ECD、社会认知理论与 ZPD 的自适应脚手架 | [INFERRED, HIGH] 与 V5 的 EvidenceDecision、DisclosurePolicy、Feedback 完全同向 |
| 结构化学习历史能改善后续独立表现 | [KNOWN, HIGH] Khan Academy 报告显示近期练习摘要与前置技能信息改善 next-item correctness，而原始日志本身未稳定改善表现 | [INFERRED, HIGH] 续聊 Prompt 应读取结构化 claim、证据和卡点，不应把全量聊天直接塞入模型 |
| DeepTutor 使用多层记忆与可审计引用 | [KNOWN, HIGH] 官方仓库和 release notes 描述 L1/L2/L3、稳定 ID、引用和快照历史 | [INFERRED, MED] 可作为 L1 后的长期学习记忆参考，不属于 V5 最小闭环 |
| Tutor MCP 提供持久状态与认知算法 | [KNOWN, MED] 官方站点声明其提供学习状态、记忆和认知科学调度 | [INFERRED, HIGH] 工具存在不等于适合当前阶段；尚无九轩阁重复题项数据支撑 BKT/IRT/FSRS 参数化 |

核验来源：

- [OpenMAIC 官方仓库](https://github.com/THU-MAIC/OpenMAIC)
- [DeepTutor 官方仓库](https://github.com/HKUDS/DeepTutor)
- [AutoPBL 论文](https://pi.cs.tsinghua.edu.cn/wp-content/uploads/2025/06/AutoPBL.pdf)
- [AAAI 自适应脚手架论文](https://ojs.aaai.org/index.php/AAAI/article/view/37154)
- [Khan Academy 产品实验](https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/)
- [Tutor MCP 官方站点](https://www.tutor-mcp.dev/)

## 3. 直接吸收进 V5 的原则

### 3.1 Evidence → Decision → Feedback

- [KNOWN, HIGH] V5 架构已经把 LearnerClaim、EvidenceDecision 与 LearningFeedback 分开。
- [INFERRED, HIGH] 后续实现继续维持单向关系：原始消息/事实 → 证据判定 → 状态决策 → 可引用反馈；反馈不能反写原始证据。

### 3.2 独立新情境作为学习结果

- [INFERRED, HIGH] 生鲜零售迁移相当于九轩阁的 next-item：学员在便利蜂教学之后，面对未披露解释的新情境独立形成判断。
- [INFERRED, HIGH] 对话内“说懂了”不应作为 A 类条件；A 类仍要求至少一条生鲜 `autonomous transfer`。

### 3.3 结构化记忆，而非聊天堆叠

- [KNOWN, HIGH] 当前 PBL v2 已有 bounded Instructor summary，但摘要主要提取工具、偏好、卡点和进度词，不等同于可审计学习证据。
- [INFERRED, HIGH] V5 恢复上下文应优先读取 baseline、commit、comparison、transfer、revision、hintLevel 和 disclosure，而不是依赖模型从历史聊天重新推断状态。

### 3.4 动态脚手架与渐进淡出

- [INFERRED, HIGH] V5 三级支架继续成立：轻提示 → 结构支架 → 事实聚焦。
- [INFERRED, HIGH] 支架升级由失败类型和已有证据决定；支架使用次数进入 evidence status，后续节点不自动继承最高支架。

### 3.5 有界自主性和单写状态

- [KNOWN, HIGH] 当前 V5 已把 LLM 限定在教学表达层，把任务迁移、披露和证据决定交给确定性服务。
- [INFERRED, HIGH] 多角色共享同一导演与状态写入口；不能因为增加 Critique/Reflection 人格而新增第二套状态逻辑。

## 4. 必须修正后再采用的观点

### 4.1 “永不直接给答案”过于绝对

- [INFERRED, HIGH] 正确边界应是：独立 commit 前不得泄露目标判断；commit 或 `no_claim` 冻结后必须进行明确教学，否则系统只有追问、没有学习。
- [INFERRED, HIGH] 教授在 N5 可以讲解关系和因果，但不得把系统讲解回写成 learner-authored autonomous evidence。

### 4.2 Checkpoint 不等于资格门

- [INFERRED, HIGH] checkpoint 应决定证据等级、支架和披露，不应决定学员有没有资格继续获得教学。
- [KNOWN, HIGH] 这与九轩阁已确认的“回答不知道也允许辅助推进”一致。

### 4.3 多 Agent 不等于多业务逻辑

- [INFERRED, HIGH] Critique、Reflection 等能力可映射到神秘角色和成长反馈官的教学动作，无需再增加前台角色或独立线程。

### 4.4 RAG 不等于知识可信

- [INFERRED, HIGH] V5 的教材与案例范围有限且需要严格披露，确定性节点检索、来源定位和 server-only 内容包比向量召回更可控。
- [INFERRED, MED] 当课程扩展到更多教材、跨课程概念和开放问答后，再评估混合检索或知识图谱。

## 5. 本阶段明确延期

| 方向 | 决策 | 原因 |
|---|---|---|
| Tutor MCP 集成 | [INFERRED, HIGH] 延期 | 当前没有稳定题项、重复观测和参数校准；接入会增加第二决策引擎 |
| BKT/IRT/PFA/Rasch | [INFERRED, HIGH] 延期 | V5 是单次判断闭环，尚不具备可靠估计潜在能力的观测密度 |
| FSRS 间隔重复 | [INFERRED, HIGH] 延期 | 当前还没有跨日复习任务和可定义的记忆题项 |
| 长期认知画像 | [INFERRED, HIGH] 延期 | 服务端身份、权限和跨设备事件存储尚未完成 |
| 多用户协作 PBL | [INFERRED, HIGH] 延期 | 个人闭环尚未成立，提前引入小组状态会放大归因困难 |
| LMS、数字人、更多 Agent | [INFERRED, HIGH] 延期 | 与当前学习效果验证无直接因果关系 |

## 6. 对 V5 设计的实际影响

1. [INFERRED, HIGH] V5 十节点和业务架构不重写；报告强化了现有“内容、状态、证据、表达分层”的方向。
2. [INFERRED, HIGH] 固定测试集新增“结构化恢复上下文”断言：删除早期原始聊天后，仅凭结构化对象仍能恢复正确节点与下一问。
3. [INFERRED, HIGH] 学习反馈增加“独立新情境表现”作为核心表述，但仍不显示数字分数。
4. [INFERRED, HIGH] 教学规则改为“commit 前不泄露，commit 后必须讲清”，替代无边界的“永不直接给答案”。
5. [INFERRED, HIGH] 当前实施顺序不变：先事实包和可运行 fixture，再做状态与证据链；不先集成外部认知引擎。

## 7. 最没有把握与最大遗漏

- [INFERRED, HIGH] 最没有把握的是这些通用研究结论在成人商业教育中的效应大小；现有公开验证多来自数学、STEM 或一般自学场景。
- [KNOWN, HIGH] 最大遗漏仍是便利蜂与生鲜事实包没有完成教学审校和同口径加工；没有这一层，任何脚手架或认知模型都只能优化空壳流程。

