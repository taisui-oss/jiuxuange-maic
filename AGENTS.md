# 九轩阁 MAIC 项目启动规则

任何新的 Codex 项目对话在分析、设计或修改代码前，必须依次读取：

1. `/Users/sijia/Documents/C 立方/docs/codex-experience-playbook.md`
2. `documentation/jiuxuange/conversation-handoff-v6-formal-release-20260727.md`
3. `documentation/jiuxuange/v6-product-scope-and-business-flow.md`
4. `documentation/jiuxuange/v6-production-architecture.md`
5. `documentation/jiuxuange/v6-delivery-plan.md`
6. `documentation/jiuxuange/README.md`

启动后先检查当前分支、未提交改动、最近提交、测试基线和本地服务构建来源。不得丢弃或覆盖未提交改动。

`conversation-handoff-learning-depth-20260722.md`、`conversation-handoff-dual-entry-20260726.md` 和更早交接书均为历史或实现证据。V6 产品目标以 2026-07-27 V6 交接书为准；已实现事实仍以当前代码和实际测试结果为准。

产品判断必须区分：已实现、已验证、仅设计、尚未完成。流程完成不得写成学习动作完成。

涉及学习逻辑改动时，同步更新交接书、`decision-log.md`、`test-and-release-baseline.md` 和固定回放测试资产。

V6 开发必须逐 Gate 推进。未经前一 Gate 验收，不得自动连续实现下一 Gate；不得把演示身份、JSON/IndexedDB 数据或草案项目卡包装成正式使用能力。
