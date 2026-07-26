# 九轩阁自由学习课程生成热修复 V1.0.1

日期：2026-07-27

## 核心结论

[KNOWN, HIGH] 自由学习入口现已能在未配置 MinerU 时读取普通文本型 PDF，并从同一份资料生成课程、进入课堂。

[KNOWN, HIGH] 语音合成不再是课程生成的前置条件。TTS 失败时保留已生成的大纲、页面和教学动作，以无声文字模式进入并播放课堂。

[KNOWN, HIGH] 本次修复不改变正式课程、个人项目测评、PBL 状态、学习证据或评分逻辑。

## 用户确认的体验基线

[KNOWN, HIGH] 2026-07-27，产品负责人确认：“现在的自由学习技能，是我最满意的一版。”

本确认冻结为当前自由学习体验基线，覆盖：

- 自由学习与正式课程、个人测评的入口分工；
- 上传个人资料后生成课程；
- 文本型 PDF 无 MinerU 时仍可进入课堂；
- TTS 故障时保留文字课程并继续播放；
- 当前九轩阁 MAIC 的课堂呈现与交互。

[KNOWN, HIGH] 该确认不外推为课程内容已通过教授审校、语音已恢复、学习深度达标或真实学习增益已验证。后续改动必须与本版本做浏览器回放对比，出现入口、资料生成或课堂可用性退化时不得直接覆盖。

## 真实故障链

真实样本：

```text
/Users/sijia/C立方/商业模式学原理/商业模式大课图书/1.案例库/便利蜂商业模式.pdf
```

修复前存在两个连续断点：

1. 浏览器保留了未配置的 `mineru` 选择。上传 PDF 后接口直接返回 422，未尝试代码中已有的本地 `unpdf`。
2. PDF 解析修复后，大纲、首个页面和教学动作均已生成，但 macOS `system-tts` 返回空音频。前台把 TTS 失败升级为整门课程失败，丢弃了可用的文字课程。

对应固定回归样本：

```text
eval/jiuxuange-learning-partner/scenarios/document-extraction-regression.v1.json
```

## 实现合同

### 文档解析

| 输入 | 未配置 MinerU 时的行为 | 阻断条件 |
|---|---|---|
| 文本型 PDF | 自动回退到 `unpdf` | 本地提取结果无可读文字 |
| 普通 DOCX | 自动回退到 `docx-local` | 本地提取结果无可读文字 |
| PPTX | 不伪造本地支持 | 继续提示配置 MinerU |
| 扫描 PDF | 不从文件名生成通用课程 | 提示配置 MinerU OCR |

前端 Provider 列表和实际请求使用同一套可用性判断。MinerU 只有配置 Base URL 或由服务端托管时才标记为可用；MinerU Cloud 只有配置 API key 或由服务端托管时才标记为可用。

### 语音降级

- 音频成功写入 IndexedDB 后，才把 `audioId` 写到教学动作。
- 单个音频失败时不留下失效 `audioId`。
- 首场景、后台续生成和失败重试使用同一条非阻塞语音合同。
- TTS 失败只记录警告，不将场景标记为失败，不暂停课程生成，不改变学习进度。
- `AbortError` 仍然中止当前生成，避免用户主动取消后继续写入。

## 验证记录

`eval_run_id`: `jgx-free-learning-pdf-tts-hotfix-20260727-01`

| 验证项 | 结果 |
|---|---|
| 定向自动化 | 4 个文件、22 项通过 |
| Provider、文档、TTS 与设置相关回归 | 6 个文件、144 项通过 |
| TypeScript | `tsc --noEmit` 通过 |
| 精确 ESLint | 0 error；`app/page.tsx` 保留 1 个既有 Hook warning |
| Next.js 生产构建 | 通过；45 个路由完成构建 |
| 真实 PDF 本地解析 | `unpdf`，9 页，3946 个正文字符 |
| 真实 HTTP 回放 | 请求保留旧 `providerId=mineru` 时返回 200，并记录 `fallbackFromProviderId: mineru` |
| 浏览器大纲 | 生成“课程导入、便利蜂、定位、业务系统”等真实课程节点 |
| 浏览器课堂 | 进入 `/classroom/3HHRH5pw6S`，显示“商业模式六要素分析：便利蜂案例” |
| 无声播放 | 播放按钮从 `Play` 进入 `Pause`，未因缺音频阻断 |

## 当前边界

[KNOWN, HIGH] 当前运行进程中的 macOS `system-tts` 仍返回空音频，因此本次验证的是“无声但可学习”，不是“语音恢复”。

[KNOWN, HIGH] 2026-07-26 的本地语音记录是当时快照的历史证据；2026-07-27 当前进程的真实回放已经证明该能力不能被视为稳定依赖。

[KNOWN, HIGH] `unpdf` 适用于含文本层的 PDF，不承担扫描 OCR、复杂表格、公式、图片语义或原版式还原。

[INFERRED, HIGH] 当前每个语音片段仍会执行 Provider 重试，故障时会增加进入课堂的等待时间。它不再影响正确性，但仍是后续性能优化项。

[KNOWN, HIGH] 课程成功生成只证明产品链路可运行，不证明课程内容经过教授审校或产生真实学习增益。

## 版本与回退

- 修复分支：`fix/jiuxuange-pdf-local-fallback-20260727`
- 修复前标签：`jiuxuange-maic-dual-entry-v1-20260727`
- 修复版本标签：`jiuxuange-maic-dual-entry-v1.0.1-20260727`
- 用户确认基线标签：`jiuxuange-maic-free-learning-confirmed-20260727`
- 本地测试入口：`http://127.0.0.1:8794/`

回退到修复前标签不会删除浏览器 IndexedDB 中已经生成的课堂。若只需关闭语音，可关闭 TTS；文档解析与学习数据不受影响。
