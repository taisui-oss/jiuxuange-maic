# DOCX 本地解析热修复基线（2026-07-26）

## 结论

[事实] 普通 DOCX 课程资料现在默认由本地解析器提取正文，不再要求配置 MinerU。

[事实] MinerU 与 MinerU Cloud 仍保留为显式可选的高保真解析路径；PDF、PPTX 的既有处理方式未改变。

[事实] 本次是文档导入基础设施热修复，不改变商业模式大课课程包、学习节点、证据门、评分规则或会话版本。

## 原故障

上传 DOCX 后，系统返回：

```text
DOCX extraction requires a configured MinerU document extractor.
```

根因是文档提取注册表只提供纯文本和 PDF Provider。DOCX 虽然只需要正文，也会默认匹配 MinerU，因此在未配置 MinerU 时被 422 响应阻断。

## 修复合同

| 文档类型与需求 | 默认解析路径 | 能力边界 |
|---|---|---|
| DOCX 正文 | `docx-local`（Mammoth 1.12.0） | 提取语义文本；不承诺图片、公式、精确表格和版式还原 |
| DOCX 高保真结构 | 显式选择 MinerU / MinerU Cloud | 需要对应 Base URL 或 API Key |
| PDF | 原 PDF Provider 链 | 未改变 |
| PPTX | MinerU / MinerU Cloud | 本次未新增本地 PPTX 解析 |
| TXT / Markdown | `plain-text` | 未改变 |

默认选择顺序：

```text
plain-text
→ docx-local
→ unpdf
→ mineru
→ mineru-cloud
```

显式指定 Provider 时仍优先遵循用户选择；明确选择未配置的 MinerU 时继续返回可操作的 422 提示。

## 验证记录

`eval_run_id`: `docx-local-hotfix-20260726-01`

| 验证项 | 结果 |
|---|---|
| 文档测试 | 6 个文件、27 项通过 |
| DOCX 默认本地提取 | 通过 |
| 显式未配置 MinerU 的诊断 | 通过 |
| 显式 MinerU Cloud DOCX 路径 | 通过 |
| TypeScript | 通过 |
| 精确 ESLint | 通过 |
| Next.js 生产构建 | 通过 |
| 8792 健康检查 | 通过 |
| 真实 HTTP DOCX 上传 | 返回 `parser: docx-local` 和正文 |
| 页面上传 | 文件成功附加，无 MinerU 错误和浏览器错误日志 |

HTTP 验证样本使用 Mammoth 自带的单段落测试 DOCX，返回正文 `Walking on imported air`。页面验证完成后已移除测试文件，未写入课程或学习会话。

## 未覆盖与风险

- [事实] 尚未使用用户截图对应的原始 DOCX 做版式完整性核验，因为当前对话只提供了错误截图，没有提供该 DOCX。
- [事实] 本地解析器不输出图片、表格结构、公式或原页码。
- [推演] 对以正文为主的课程资料，这条路径足以支撑课堂生成；对依赖图表、复杂表格或页面布局的教材，应继续使用 MinerU。
- [事实] 本次没有新增 PPTX 本地解析能力。

## 回退

回退本热修复时，撤销以下范围：

- `lib/document/extractors/docx.ts`
- `lib/document/extractors/registry.ts` 中的 `docx-local`
- `package.json` 与 `pnpm-lock.yaml` 中的 Mammoth 依赖
- 对应文档提取测试

回退后 DOCX 会重新依赖 MinerU。不得用回退覆盖当前工作树中无关的学习深度改动。
