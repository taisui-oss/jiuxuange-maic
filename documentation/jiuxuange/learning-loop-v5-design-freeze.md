# 商业模式大课学习闭环 V5：设计冻结候选

状态：**候选冻结，待产品确认后进入代码实现**  
版本：`learning-loop-freeze-candidate.v1`  
目标课程包：`5.0.0-learning-loop-pilot`

## 1. 本轮冻结范围

- [INFERRED, HIGH] 只实现一次可验证学习闭环，不扩六关、不接个人项目、不接正式测评。
- [INFERRED, HIGH] 学员在同一课程会话内完成 baseline、短讲授、便利蜂盲解、生鲜迁移、revision 和非分数反馈。
- [INFERRED, HIGH] PBL `projectV2` 继续作为运行时真相；六关地图和角色只从状态派生，不建立第二份进度。
- [INFERRED, HIGH] LLM 只表达教学动作；状态迁移、内容披露、证据分类和结果输出由确定性服务控制。

## 2. 默认设计决策

| 决策 | 默认值 | 状态 | 反证条件 |
|---|---|---|---|
| 教学前基线 | 一个通用判断题，回答即过 | 待确认 | 教学专家认为无法与结课 revision 比较 |
| 教学案例 | 便利蜂 | 已有方向，待内容审校 | 事实包无法支持决策权与关系变化观察 |
| 迁移案例 | 生鲜零售两模式比较 | 待确认 | 无法形成同口径、同观察时点的可比事实 |
| A 类门槛 | 至少一条 autonomous 生鲜 transfer | 待确认 | 人工金标准证明该条件区分度不足 |
| “不知道”策略 | 两级支架后 assisted 继续 | 已确认原则 | 不适用；只可调整支架内容和次数 |
| 正式测评 | 不进入本闭环 | 已确认 | 产品重新定义本轮范围 |
| 正式数字评分 | 关闭 | 已确认 | 人工校准通过并另行发布评分版本 |

## 3. 开发前置数据

| 数据资产 | 最低可用标准 | 当前判断 |
|---|---|---|
| 必知必会短讲授 | 80-140 字；教材定义可回查；课程专家审校 | [INFERRED, MED] 有原料，尚未形成最终教学制品 |
| 便利蜂 learner facts | 3-5 条；每条含来源页码、观察时间、验证状态 | [KNOWN, HIGH] 尚未达到该结构 |
| 便利蜂 locked analysis | 1-3 个按问题切分的解释片段 | [KNOWN, HIGH] 现有服务端片段可复用，但需教学审校 |
| 生鲜 learner facts | 两模式 4-6 条同口径事实；不得含作者结论 | [KNOWN, HIGH] 当前摘要事实不足 |
| 反馈模板 | 只引用 baseline/commit/transfer/revision | [INFERRED, HIGH] 需新增确定性模板与校验器 |
| 人工金标准 | autonomous/hinted/assisted/unsupported 样本 | [KNOWN, HIGH] 尚未建立 |

## 4. 实施顺序

1. [INFERRED, HIGH] 先加工并核验便利蜂与生鲜事实包，冻结 `factPackVersion`。
2. [INFERRED, HIGH] 先写固定测试 fixture 和失败测试，覆盖 baseline、commit、unlock、transfer、revision、feedback。
3. [INFERRED, HIGH] 新增 V5 课程包和功能开关，保留 V4 会话与数据。
4. [INFERRED, HIGH] 实现 claim、disclosure、revision、feedback 数据对象及幂等事件。
5. [INFERRED, HIGH] 将十节点编译为 PBL milestone/microtask，不创建并行进度状态。
6. [INFERRED, HIGH] 接入四角色教学导演、问题去重和确定性故障降级。
7. [INFERRED, HIGH] 完成桌面与移动端浏览器验收，并运行三类模拟学员闭环。
8. [INFERRED, HIGH] 只有固定基准通过后，才允许受控真实学员试点。

## 5. 本轮明确不做

- [KNOWN, HIGH] 不实现六道开放题、正式评分、十五境定级、有效十小时、管理员成绩报表。
- [INFERRED, HIGH] 不接真实个人项目，避免同时验证课程教学、项目事实核验和个性化反馈三种未知。
- [INFERRED, HIGH] 不扩充更多案例；先证明“一个教学案例 + 一个迁移案例”能形成可回放判断变化。
- [INFERRED, HIGH] 不让 Agent 自由选择节点、解锁内容或宣告学员完成。

## 6. 进入开发的准入条件

- [INFERRED, HIGH] 产品确认本文件第 2 节三个待确认默认值。
- [INFERRED, HIGH] 便利蜂和生鲜事实包满足第 3 节最低标准。
- [INFERRED, HIGH] 固定测试合同进入仓库，至少三类主学员 fixture 可复跑。
- [INFERRED, HIGH] V5 功能开关、V4 回退路径和课程包版本隔离方案通过代码评审。

## 7. 最小真实试点

- [INFERRED, MED] 首轮建议 5-8 名学员，每人完成同一闭环；该数量只用于发现流程和内容问题，不用于证明教学效果。
- [INFERRED, HIGH] 试点必须记录完成率、节点停留、支架次数、重复问题、故障、事实引用和 revision 证据。
- [INFERRED, HIGH] 试点结束后由教练盲标 transfer 与 revision，再比较系统分类偏差；未校准前不得公开结果等级。

