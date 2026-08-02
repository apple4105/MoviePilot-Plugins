# CustomAudio · 语音识别与合成

为 MoviePilot Agent 提供语音识别 (ASR) 和语音合成 (TTS) 能力，兼容 OpenAI 接口格式。

## 功能

- 注册名为 `custom` 的音频 provider，所有配置在插件表单内完成，不依赖系统设置中的音频参数
- 启用后自动将系统音频输入/输出 provider 切换为 `custom`，关闭后自动恢复原始 provider
- **ASR (语音转文字)**：multipart POST，兼容 OpenAI Whisper 接口格式
- **TTS (文字转语音)**：JSON POST，兼容 OpenAI TTS 接口格式，响应为二进制音频
- 前端表单强校验：ASR/TTS 启用时必填项非空检查
- 语音回复附带文字开关，联动 `AUDIO_OUTPUT_INCLUDE_TEXT` 系统配置

## 配置说明

### ASR (语音识别)

| 字段 | 说明 | 示例 |
|------|------|------|
| API Key | ASR 服务的 API 密钥 | `sk-xxxx` |
| Base URL | ASR 服务地址 | `https://api.stepfun.com/v1` |
| Model | 识别模型名称 | `step-asr` |
| Language | 语言代码 | `zh` |

### TTS (语音合成)

| 字段 | 说明 | 示例 |
|------|------|------|
| API Key | TTS 服务的 API 密钥 | `sk-xxxx` |
| Base URL | TTS 服务地址 | `https://api.stepfun.com/v1` |
| Model | 合成模型名称 | `step-tts` |
| Voice | 音色名称 | `yunxi` |

## StepFun 配置指引

以 [StepFun](https://www.stepfun.com/) 为例：

1. 在 StepFun 开放平台获取 API Key
2. ASR 配置：
   - **Base URL**：`https://api.stepfun.com/v1`
   - **Model**：`step-asr`
   - **Language**：`zh`
3. TTS 配置：
   - **Base URL**：`https://api.stepfun.com/v1`
   - **Model**：`step-tts`
   - **Voice**：根据 StepFun 文档选择音色（如 `yunxi`）
4. 点击「测试连接」验证 ASR 和 TTS 连通性
5. 保存配置并启用插件

> StepFun 的 ASR/TTS 接口兼容 OpenAI 格式，Base URL 需包含 `/v1` 路径。

## 版本历史

| 版本 | 更新内容 |
|------|----------|
| v1.0 | 初始版本，支持 OpenAI 兼容的 ASR/TTS 接口 |
| v1.1 | 新增语音回复附带文字开关，联动 `AUDIO_OUTPUT_INCLUDE_TEXT` 系统配置 |
| v1.2 | 新增前端表单强校验（ASR/TTS 启用时必填项非空检查） |

## 技术细节

- 插件等级：Level 2
- 插件类型：V2 插件（Vue Module Federation）
- 前端框架：Vue 3 + Vuetify 3
- 构建工具：Vite 5

## License

GPL-3.0
