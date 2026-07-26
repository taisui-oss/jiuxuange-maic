# 九轩阁本地免费语音热修复

日期：2026-07-26

## 1. 问题与根因

[KNOWN, HIGH] 课程工作台能够显示教授文字，但当前 Codex 内置浏览器没有可用的 `speechSynthesis` 音色，原有 `browser-native-tts` 即使打开也不能产生声音。

[KNOWN, HIGH] 原系统已经支持多种云端 TTS，但默认均需要 API key 或外部服务。对于当前本机受控试学，这会让“教授是否有声”依赖另一套付费配置。

## 2. 本次决策

[KNOWN, HIGH] 新增服务端 Provider `system-tts`，前台名称为“九轩阁本地语音（免费）”。它调用当前 macOS 自带的 `/usr/bin/say`，使用中文音色 `Tingting` 生成 WAV，不需要 API key，也不经过外部网络。

[KNOWN, HIGH] 在九轩阁模式且服务端公布该 Provider 时，系统只在首次同步时自动选择并打开它。完成一次自动配置后，学员或管理员仍可手动关闭，后续同步不得强制重新打开。

[KNOWN, HIGH] LLM 仍负责生成教授文字；TTS 只负责把已经生成的文字变成音频，不参与课程状态、证据判断或学习进度迁移。

## 3. 配置与回退

开发机配置：

```env
NEXT_PUBLIC_C_CUBIC_FREE_TTS=true
TTS_SYSTEM_ENABLED=true
```

关闭两个开关并重新构建、重启服务，即恢复原有语音 Provider 选择逻辑。关闭语音不会删除课堂、消息或学习证据。

## 4. 已实现

- 新增 `system-tts` Provider、模型 `macos-say` 和中文音色 `Tingting`。
- 服务端使用无 shell 的参数调用，限制音色、语速和单次文本长度。
- 临时音频文件在读取后清理；空文件和异常输出不会作为成功音频返回。
- 设置页显示“九轩阁本地语音（免费）”和“服务端”标识。
- 九轩阁首次同步自动选择免费语音，并保留用户之后的手动选择。
- 八种界面语言补齐 Provider 名称。

## 5. 验证证据

| 验证项 | 结果 |
|---|---|
| 系统语音、Provider 配置、设置同步 | 3 个测试文件，125 项通过 |
| 既有音频 Provider 与音色解析回归 | 3 个测试文件，26 项通过 |
| 多语言键完整性 | 1 个测试文件，1 项通过 |
| 生产构建 | 通过 |
| 生产健康检查 | `tts: true` |
| 服务端 Provider 列表 | 返回 `system-tts` |
| 真实中文音频生成 | HTTP 200，WAV，125002 字节，RIFF/WAVE 头 |
| 浏览器设置页 | Provider 可见、已启用、测试按钮完成后恢复可用 |
| 浏览器错误日志 | 测试播放后无 TTS error/warn |

[KNOWN, HIGH] 本次部署还发现 standalone 启动前必须包含 `.next/standalone/.next/static`。缺失时浏览器会产生 `ChunkLoadError`。本机服务已补齐静态文件并重启，目标 chunk 返回 HTTP 200。

## 6. 尚未完成

[KNOWN, HIGH] 自动化只能验证音频文件、播放调用和错误日志，不能代替人耳判断音色自然度、响度和长段落听感。

[KNOWN, HIGH] 当前免费方案只适用于运行服务的 macOS 本机。Linux、容器或公网部署没有 `/usr/bin/say`，不得把该 Provider 宣称为跨平台免费 API。

[INFERRED, HIGH] 若进入公网试点，应在相同 Provider 接口后接入自托管 Kokoro/Lemonade 等可部署语音引擎，或选择有明确免费额度和服务条款的正式云服务；切换语音引擎不应改变课程状态机。

[KNOWN, HIGH] 当前测试课堂仍可能保留此前课程生成失败或未完成的状态。语音热修复只解决“文字转声音”，不修复 LLM 生成、课程内容或旧课堂状态。

## 7. 发布判断

允许在当前 macOS 本机 `8792` 环境进行有声课程体验测试；不因此提升九轩阁整体发布层级，不作为公网语音架构完成的证据。
