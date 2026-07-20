# 归档清单

## 1. 归档对象

- 工作区：`/Users/sijia/Documents/C 立方/OpenMAIC/.worktrees/jiuxuange-unified-learning`
- 开发分支：`codex/jiuxuange-unified-learning-phase1`
- 归档前实现基线：`77756f4`
- 产品范围：九轩阁商业模式大课 V5.1 学习闭环、首页入口、十五境服务端接入与完整测试归档
- 运行形态：Next.js 16 + React 19 + OpenMAIC PBL v2 + Dexie
- 私有 GitHub 仓库：`https://github.com/taisui-oss/jiuxuange-maic`
- Git 远端：`origin` 保留 OpenMAIC 上游；`jiuxuange` 指向九轩阁私有仓库

## 2. 回退点

| 分支 | 含义 |
|---|---|
| `codex/checkpoint-before-unified-learning-20260711` | 统一学习空间开发前 |
| `codex/checkpoint-unified-learning-deepseek-20260711` | 统一运行时与 DeepSeek 配置阶段 |
| `codex/checkpoint-before-guided-course-v2-20260711` | 完整导学、概念、案例、测评链开发前 |
| `codex/archive-jiuxuange-phase1-20260713` | 第一阶段业务逻辑归档 |
| `codex/checkpoint-jiuxuange-maic-v5.1-20260721` | 基本操作流程确认后的 V5.1 完整源代码与文档回退点 |

本次归档同时建立标签 `jiuxuange-maic-v5.1-confirmed-20260721`。回退分支、标签与私有仓库 `main` 指向同一提交。

## 3. 功能开关

| 开关 | 开启效果 | 关闭效果 |
|---|---|---|
| `NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING` | 显示统一课程入口 | 恢复旧学习路径页面 |
| `NEXT_PUBLIC_C_CUBIC_GUIDED_COURSE_V2` | 启用首页导学和 V2 完整链 | 回到 V1 B 模块统一课堂 |
| `NEXT_PUBLIC_C_CUBIC_SIX_LEVEL_JOURNEY` | 启用 V3 六关 PBL 地图 | 回到较早课程包 |
| `NEXT_PUBLIC_C_CUBIC_SINGLE_COURSE_ORIENTATION_V4` | 启用 V4 单课导学 | 回到 V3 |
| `NEXT_PUBLIC_C_CUBIC_LEARNING_LOOP_V5` | 启用 V5 最小可验证学习闭环与 V5.1 入口行为 | 回到 V4，不删除 V5 会话 |

关闭功能开关不会删除已有本地会话。

## 4. 关键代码入口

- 首页：`app/page.tsx`
- 课程入口：`components/c-cubic/business-model-course-entry.tsx`
- 首页导学：`components/c-cubic/home-orientation-entry.tsx`
- 课程包：`lib/c-cubic/course-package/`
- 会话：`lib/c-cubic/session.ts`
- 导学状态：`lib/c-cubic/orientation.ts`
- 教学导演：`lib/c-cubic/runtime.ts`
- 证据：`lib/c-cubic/evidence.ts`
- 知识：`lib/c-cubic/knowledge/`
- 测评：`lib/c-cubic/assessment/`
- PBL 教学运行时：`lib/pbl/v2/agents/instructor.ts`
- 学员工作台：`components/scene-renderers/pbl-renderer.tsx`
- 回归测试：`tests/c-cubic/`
- V5.1 入口与新一轮合同：`documentation/jiuxuange/learning-loop-v5-entry-recovery-20260721.md`

## 5. 本地运行

```bash
pnpm install
WATCHPACK_POLLING=true pnpm dev --hostname 127.0.0.1 --port 8792 --webpack
```

模型凭据放在被 Git 忽略的 `.env.local` 或正式服务端密钥管理中。归档不保存、不复制任何真实 API key。

本次归档前验证：44 个相关测试文件、207 项测试通过；相关 ESLint 0 error、1 个既有 Hook warning；TypeScript 通过；本地 `HEAD /` 返回 200。

## 6. 数据归档限制

- 代码和课程包已进入 Git。
- 浏览器 IndexedDB 中的真实试用会话不在 Git 归档内。
- 本地 `.env.local` 不进入 Git。
- 本机教材原文件不复制到仓库，只保存来源标识和短片段目录。
- 现有测试样本以代码测试为主，尚未形成完整 YAML 固定基准资产库。

因此本归档能恢复“产品代码状态”，不能恢复某个浏览器中的完整真实学习会话。下一阶段必须增加服务端导出与事件归档能力。

## 7. 恢复检查

1. 切换到 `codex/checkpoint-jiuxuange-maic-v5.1-20260721`，或检出标签 `jiuxuange-maic-v5.1-confirmed-20260721`。
2. 安装锁定依赖。
3. 配置服务端可用模型凭据，不在源码中写密钥。
4. 开启所需功能开关并重新构建。
5. 运行 `test-and-release-baseline.md` 中的测试命令。
6. 打开首页，确认课程入口、导学和工作台能够进入。
7. 不把本地“能打开”解释为达到正式发布条件。
