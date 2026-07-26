# 商业模式大课课程中心 V1

日期：2026-07-27

## 1. 本轮目标

[KNOWN, HIGH] 解决“正式课程入口看不到、项目卡只能在后台找到”的体验断点，同时保护已确认的自由学习体验，不改写 V5 课程会话与证据状态。

学员当前可见路径为：

```text
首页“我的课程”
→ 商业模式大课
→ 六要素学习主线
→ 六个正式案例候选
→ 项目练习
→ 麦客思项目卡预览
```

## 2. 已实现

- 首页新增稳定的“进入课程”入口。课程历史摘要未读完或读取失败时，入口仍可点击。
- 新增 `/courses/business-model` 课程中心，不再要求学员从自由学习输入框猜测正式课程入口。
- 显示六个案例候选：
  - 便利蜂、生鲜零售已接入既有主线，标记为“主线内解锁”；
  - SHEIN、花西子、整车货运平台、智能汽车标记为“审校中”。
- 六个案例合计覆盖定位、业务系统、关键资源能力、盈利模式、现金流结构、企业价值。
- 项目练习与正式案例课物理分区。
- 新增麦客思项目卡可见预览，展示 14 条报告事实、5 个开放矛盾和四 Agent 使用边界。
- 新增独立开关 `NEXT_PUBLIC_JIUXUANGE_COURSE_HUB_V1`。设置为 `false` 并重新构建后，恢复首页直接进入既有课堂。
- 构建命令自动把 `.next/static` 和 `public` 复制进 standalone 产物，避免页面只有 HTML、无前端交互。

## 3. 数据与信任边界

[KNOWN, HIGH] 麦客思当前是 `project-card-mckess@1.0.0-draft`。页面中的来源陈述只能表述为“作业报告称”，不代表项目方确认。

[KNOWN, HIGH] 项目卡不是教材：

- 教授只能用正式教材讲授六要素；
- 学长可基于项目卡做事实追问；
- 神秘角色只能基于卡内事实进行情境对抗；
- 成长反馈官只能回放判断修正，不能生成正式分数。

[KNOWN, HIGH] 远程环境默认不能打开草案项目卡。只有显式配置 `JIUXUANGE_ENABLE_DRAFT_PROJECT_CARDS=true` 后才允许远程预览。

## 4. 尚未实现

- 六个案例尚未分别形成独立、可交互的自由学习式案例课堂。
- SHEIN、花西子、整车货运平台和智能汽车尚未完成教师审校与内容发布。
- 麦客思尚未经过项目方逐条事实核验。
- 麦客思项目卡尚未接入学长、神秘角色和成长反馈官运行时。
- 项目卡尚未绑定真实项目组、花名身份和服务端会话。
- 本轮没有新增学习效果证据，不能把“目录可见、页面可点击”解释为“学员已经学会六要素”。

## 5. 固定回归

版本化合同：

```text
eval/jiuxuange-learning-partner/scenarios/business-model-course-hub.v1.json
```

自动验证：

```bash
pnpm test \
  tests/jiuxuange/business-model-course-hub.test.ts \
  tests/jiuxuange/project-card-mckess.test.ts \
  tests/jiuxuange/dual-entry-domain.test.ts \
  tests/c-cubic/unified-learning-regression.test.ts \
  tests/c-cubic/course-package.test.ts \
  tests/server/standalone-assets.test.ts
pnpm build
```

浏览器验收：

- 首页“我的课程”可见，课程历史读取未完成时“进入课程”仍可点击；
- 点击后进入 `/courses/business-model`；
- 六个案例候选和“项目练习”同时可见；
- 点击“查看项目卡”进入 `/courses/business-model/projects/mckess`；
- 桌面与 390×844 移动端无横向溢出；
- 当前生产 HTML 引用的前端 chunk 均返回 HTTP 200。

## 6. 发布判断

[KNOWN, HIGH] 当前达到“课程目录与草案项目卡 L0 本机可见”的水平。允许产品负责人查看和继续编排，不允许把四个审校中案例或麦客思项目互动对外宣称为已发布。
