# 九轩阁 MAIC 双入口 V1 新对话交接书

日期：2026-07-26

## 新对话启动顺序

1. 读本文件。
2. 读 `dual-entry-v1-implementation-20260726.md`。
3. 读 `conversation-handoff-learning-depth-20260722.md`，继承尚未关闭的学习深度 P0。
4. 检查当前 Git 工作树，不得覆盖学习深度、DOCX、本地语音和双入口未提交改动。
5. 检查实际服务端口与构建来源；当前 launchd 服务使用 `8792`，且 `pnpm build` 必须完成 standalone 静态资源装配。

## 当前已实现

- 首页显示“我的课程 / 个人项目测评 / 自由学习”。
- 商业模式大课继续进入原 V5 持续课堂。
- 个人测评使用服务端 JSON 仓库，支持同组共享冻结项目卡、个人隔离草稿和两次提交。
- 测评草稿刷新恢复、首轮方向反馈、二轮最终反馈和锁定已实现。
- 测评活跃心跳实现；隐藏、闲置不计时。
- 独立回退开关 `NEXT_PUBLIC_JIUXUANGE_DUAL_ENTRY_V1` 已实现。

## 当前未实现

- 真实花名、班级、项目组 API。
- 管理员课程发布、项目卡发布和题目确认界面。
- 生产数据库与正式权限审计。
- 正式课程与自由学习的服务端活跃心跳。
- 旧 IndexedDB 课程的服务端跨设备恢复。
- 数字评分、人工金标准和正式管理员报表。
- V5 节点专属教学补偿和 Agent 角色漂移修复。

## 下一条最小闭环

不要继续扩页面。下一任务应在以下两项中只选一项：

1. **生产身份纵切**：取得花名系统接口，替换 demo identity，并用两名同组学员和一名不同组学员验证权限。
2. **管理员发布纵切**：实现项目卡版本、六题确认与发布，验证发布后修改不会影响进行中测评。

在两项完成前，不得宣称“同组项目测评已可正式开放”。

## 当前测试页

`http://127.0.0.1:8792/`

## GitHub 版本

- 发布分支：`release/jiuxuange-dual-entry-v1-20260727`
- 发布标签：`jiuxuange-maic-dual-entry-v1-20260727`
- 私有仓库：`https://github.com/taisui-oss/jiuxuange-maic`
- 发布记录：`release-dual-entry-v1-20260727.md`

## 回退

设置 `NEXT_PUBLIC_JIUXUANGE_DUAL_ENTRY_V1=false` 后重新构建。关闭开关不删除新旧数据。

## 2026-07-27 V1.0.1 热修复补充

[KNOWN, HIGH] 自由学习入口曾因浏览器保留未配置的 MinerU 而无法读取 PDF；文档解析通过后，`system-tts` 空音频又会把整门课程判为失败。

[KNOWN, HIGH] 当前热修复已完成：

- 文本型 PDF 自动回退 `unpdf`，普通 DOCX 自动回退 `docx-local`；
- 本地解析无可读正文时停止生成并提示 OCR；
- TTS 失败不再丢弃课程，失败片段不写失效 `audioId`；
- 真实便利蜂 PDF 已进入课堂 `/classroom/3HHRH5pw6S`，无声播放可运行。

[KNOWN, HIGH] 当前 `system-tts` 仍返回空音频，因此只能确认文字课程可用，不能确认教授语音已恢复。

[KNOWN, HIGH] 产品负责人已确认 V1.0.1 是目前最满意的自由学习版本。后续开发不得凭体感覆盖，应至少复跑“上传文本型 PDF → 生成大纲与教学动作 → TTS 失败降级 → 进入并播放课堂”。

后续新对话还需读取：

```text
documentation/jiuxuange/free-learning-course-generation-hotfix-20260727.md
eval/jiuxuange-learning-partner/scenarios/document-extraction-regression.v1.json
```

## 2026-07-27 麦客思项目卡补充

[KNOWN, HIGH] 已从 37 页小组作业建立 `project-card-mckess@1.0.0-draft`，并将报告事实、学员主张、改造建议、预测假设和开放矛盾分开保存。

[KNOWN, HIGH] 该项目卡不同于正式教学案例：教授不能把它当教材；学长用于练习支架，神秘角色用于利益相关者对抗，成长反馈官用于判断修正回放。

[KNOWN, HIGH] 所有来源陈述目前均为 `draft`。它尚未绑定课程、项目组或 Agent 运行时，新对话不得将“数据资产已建立”描述为“项目互动已上线”。

后续还需读取：

```text
documentation/jiuxuange/project-card-mckess-v1-20260727.md
lib/jiuxuange/project-card/mckess-v1.ts
tests/jiuxuange/project-card-mckess.test.ts
```

## 2026-07-27 商业模式课程中心 V1 补充

[KNOWN, HIGH] 首页“我的课程”现在明确显示商业模式大课，点击进入 `/courses/business-model` 后可见六个案例候选和麦客思项目练习。

[KNOWN, HIGH] 便利蜂、生鲜零售只表示已进入既有主线；SHEIN、花西子、整车货运平台和智能汽车仍是“审校中”，不得描述为已可互动。

[KNOWN, HIGH] 麦客思项目卡已经可见，但仍是草案预览。项目方核验、项目组绑定和 Agent 运行时接线均未完成。

[KNOWN, HIGH] 本轮同时修复 standalone 缺少 `.next/static` 导致“页面可见但点击无效”的启动缺陷。后续必须通过 `pnpm build` 生成完整 standalone 产物，不得手工省略静态资源阶段。

后续新对话还需读取：

```text
documentation/jiuxuange/business-model-course-hub-v1-20260727.md
eval/jiuxuange-learning-partner/scenarios/business-model-course-hub.v1.json
```
