# V6 案例与项目卡配置预览发布记录

## 发布身份

- 发布日期：2026-07-28
- Git 分支：`codex/jiuxuange-v6-formal-release`
- 源码提交：`664a5224408e04950b2e4013b8694778f541a7e6`
- 源码提交说明：`feat(jiuxuange): align cases and project card with six-element path`
- Netlify 站点：`jiuxuange-maic-v6-preview`
- 生产预览地址：<https://jiuxuange-maic-v6-preview.netlify.app/>
- 唯一部署地址：<https://6a67b29096f870e8a91956fe--jiuxuange-maic-v6-preview.netlify.app/>
- Netlify 部署 ID：`6a67b29096f870e8a91956fe`
- Netlify 构建 ID：`6a67b29096f870e8a91956fc`
- OpenMAIC 案例课堂包：
  `content/jiuxuange/classrooms/jxg-bm-case-breakfast-chain-six-elements-v1.json`
- 案例课堂包 SHA-256：
  `0994ff23584c6cc501a717ade7fc70e36bae7168a32d2ad203ac8dca773d7a4f`

## 本次已实现

### 1. 连续案例学习路径

商业模式大课不再展示一套独立的固定节点补救流程。案例统一采用 OpenMAIC
原生多轮课堂，并按完成顺序依次解锁。

所有案例沿同一条八步分析路径组织：

1. 谁和谁交易
2. 服务谁、解决什么问题
3. 各主体如何协作
4. 企业必须擅长什么
5. 谁向谁付钱
6. 钱在什么时候流入和占用
7. 什么决定长期企业价值
8. 汇总六要素因果图

首个可进入案例为“社区早餐连锁”，它是明确标注的不对应真实企业的教学情境。
便利蜂为第二个案例，完成首个案例后开放。其余案例保持顺序锁定和审校中状态。

### 2. 麦客思七模块项目卡

项目卡版本为 `project-card-mckess@1.1.0-draft`，包含：

1. 项目身份与治理
2. 企业基本业务信息
3. 当前经营快照
4. 本次项目核心问题
5. 事实、判断、假设与未知项
6. 企业材料目录
7. 前序课程结论

当前卡片是后台导入草案，不等于案主确认。公开预览只展示允许使用或已经区间化的
字段，不展示被标记为 `block` 的字段、完整报告事实或原始页码。

### 3. 同项目个人测评

- 测评 ID：`bm-assessment-mckess-v2`
- 绑定项目：麦客思
- 绑定项目卡：`project-card-mckess@1.1.0-draft`
- 题目数量：6
- 正式提交次数：最多 2 次
- 题型：事实判断、假设互动、方案比较、因果推理、判断修正
- 测评页不提供 Agent 实时帮助
- 不把个人研习或小组讨论历史带入答案
- 不生成数字总分

线上测评入口继续执行可信学员身份守卫。未完成花名和企微身份接入前，公开访客会看到
“暂时无法进入测评”，不得通过关闭守卫来制造可用假象。

## 验证记录

### 自动化与构建

- 定向测试：6 个文件，32 项通过
- 全量测试：307 个文件，2289 项通过
- TypeScript：0 error
- 生产构建：通过，共识别 47 条路由
- 改动范围 ESLint：通过
- 仓库全量 Prettier：仍有 40 个与本次改动无关的既有告警

### 本机浏览器

- 首页可进入商业模式大课
- 课程页显示完整八步路径和七个顺序案例
- 首个案例进入 OpenMAIC 原生课堂
- 项目卡显示七个模块和字段级披露状态
- 开发身份下可查看六题测评界面
- 课程页和测评页在 390 x 844 视口无横向溢出

### 线上验收

以下路径均返回 HTTP 200：

- `/`
- `/courses/business-model`
- `/classroom/jxg-bm-case-breakfast-chain-six-elements-v1`
- `/courses/business-model/projects/mckess`
- `/assessment/bm-assessment-mckess-v2`

真实浏览器已确认：

- 八步六要素路径完整显示
- 首个案例进入 11 个场景的 OpenMAIC 原生课堂
- 便利蜂及后续案例保持顺序锁定
- 项目卡公开页显示“当前为脱敏预览”
- 线上浏览器控制台无错误
- 无可信学员身份时，个人测评守卫按设计生效

## 发布故障与修复

两次 CLI 手工部署虽然被 Netlify 标记为已上线，但没有正确注册 Next.js 函数路由，
所有页面实际返回 404：

- `6a67aa85b38d179d14f44209`
- `6a67afe05c36a8afcbbcadc2`

根因是 Netlify 站点设置残留了 `netlify/functions` 函数目录，它覆盖了
`@netlify/plugin-nextjs` 生成的函数和路由配置。处理方式：

1. 清除站点级旧函数目录覆盖；
2. 从已连接的 GitHub 分支触发 Netlify 云端构建；
3. 确认插件状态为 `success`；
4. 确认部署包含 3 条重写规则、1 个 Next.js 服务函数和 1 个边缘函数；
5. 重新执行 HTTP 和真实浏览器验收。

## 尚未完成

本次结果是线上产品预览，不是 1000 人正式生产发布。正式使用仍受以下 Gate 阻塞：

- 花名系统与企业微信可信身份
- PostgreSQL 服务端权威数据
- 班级、小组、项目成员与资源权限
- 案主逐项确认麦客思项目卡
- 个人测评异步 AI 评价与人工校准
- 教授对正式案例课逐项内容审核
- 生产负载、备份恢复与运维演练

## 发布结论

案例配置、项目卡配置与六题测评合同已经同步到 GitHub，并在 Netlify 线上预览中完成
页面和路由验证。该版本允许产品、教研和案主进行受控审阅；在上述生产 Gate 完成前，
不得向 1000 名真实学员宣称已达到正式使用条件。
