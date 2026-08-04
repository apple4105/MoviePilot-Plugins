# MoviePilot CustomAudio Plugin

语音识别 (ASR) 与语音合成 (TTS) 插件，为 MoviePilot Agent 提供语音交互能力。

## 功能特性

- **语音识别 (ASR)**：支持 OpenAI Whisper API 兼容接口
- **语音合成 (TTS)**：支持 OpenAI TTS API 兼容接口
- **多语言支持**：中文、英语、日语、韩语、法语、德语、西班牙语、俄语
- **连接测试**：一键测试 ASR/TTS API 连通性，测试按钮与区块标题按测试状态（成功/失败）动态变色
- **Base64 自动解码**：API Key 输入框支持粘贴 Base64 编码自动解码
- **语音回复附带文字**：开启后 Telegram 等渠道同时发送文字消息

## 配置说明

| 配置项 | 说明 |
|--------|------|
| 启用 | 总开关 |
| 启用语音识别 (ASR) | 开启 ASR 功能 |
| ASR API 地址 | 兼容 OpenAI 格式的 ASR 接口地址 |
| ASR 模型 | 如 `whisper-1` |
| ASR API Key | ASR 服务的 API Key |
| 识别语言 | 中文/英语/日语/韩语/法语/德语/西班牙语/俄语 |
| 启用语音合成 (TTS) | 开启 TTS 功能 |
| TTS API 地址 | 兼容 OpenAI 格式的 TTS 接口地址 |
| TTS 模型 | 如 `tts-1` |
| TTS API Key | TTS 服务的 API Key |
| 语音音色 | 音色名称，由供应商定义 |
| 语音回复附带文字 | 开启后同时发送文字消息 |

## 更新日志

### v1.4 (2026-08-04)
- **新增**：ASR/TTS 测试按钮与区块标题按测试状态动态变色（成功绿色 / 失败红色 / 未测试默认色）
- **优化**：配置项（API 地址、Key、模型、音色）变更后自动重置测试状态

### v1.3 (2026-08-02)
- **新增**：API Key 输入框支持 Base64 自动解码（粘贴/失焦时自动检测并解码）
- **优化**：页面首次加载时静默加载配置，不再显示"配置已重新加载"提示
- **优化**：嵌套 Base64 最多解码 3 层
- **优化**：音色 Placeholder UI（语音音色输入框提示文案与说明优化，明确由供应商定义）

### v1.2 (2026-08-01)
- **修复**：Telegram 渠道秒级静默期 + 10s 超时窗口
- **修复**：录音检测灵敏度优化（200ms 静音/150ms 最小时长/100ms 等待）
- **修复**：音频截断问题（min_silence_duration=300ms/500ms）

### v1.1 (2026-08-01)
- **新增**：TTS Provider 智能切换（配额耗尽自动切换）
- **优化**：移除 _build_openai_tts_payload 中的 response_format

### v1.0 (2026-08-01)
- 初始版本
- 支持 ASR (Whisper API) 和 TTS (OpenAI TTS API)
- 支持 Telegram/Discord 语音识别
- 支持语音回复附带文字

## License

GPL-3.0
