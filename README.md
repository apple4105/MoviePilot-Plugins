# MoviePilot-Plugin-Market

MoviePilot第三方插件市场：https://github.com/apple4105/MoviePilot-Plugins

### 插件列表

| 序号 |                名称                | 当前版本 | 功能简述 | 用户级别 |
|:--:|:--------------------------------:|:----:|:----|:----:|
| 1  |  [AgentTokensPro](docs/AgentTokensPro.md)  | v0.0.8 | 管理多平台 Token 配额，按优先级自动切换 Agent LLM 供应商，支持失败自动切换、两阶段连通性测试、硬故障踢出、厂商管理、未保存更改保护、冷却倒计时、全局设置同步。 | 需要认证 |
| 2  |  [自定义音频 Provider](docs/CustomAudio.md)  | v1.3 | 基于 StepFun API 的 ASR/TTS 语音插件，支持 OpenAI Whisper 兼容语音识别与 TTS 语音合成，启用后自动切换系统音频 provider，支持 Telegram 语音收发与动态配置。 | 需要认证 |

### 自定义音频 Provider 更新日志

#### v1.3 (2026-08-02)
- API Key 输入框支持 Base64 自动解码（粘贴/失焦时自动检测并解码）
- 页面首次加载时静默加载配置，不再显示"配置已重新加载"提示
- 嵌套 Base64 最多解码 3 层
- 优化音色 Placeholder UI（语音音色输入框提示文案与说明优化，明确由供应商定义）
- Bug 修复：测试连通性失败时正确记录 failure_count

#### v1.2 (2026-08-01)
- 新增前端表单强校验（ASR/TTS 启用时必填项非空检查）
- 新增语音回复附带文字开关，联动 `AUDIO_OUTPUT_INCLUDE_TEXT` 系统配置

#### v1.1 (2026-08-01)
- 支持 STT/TTS 独立配置 API Key、Base URL、模型
- 启用自动切换系统音频 provider，关闭自动恢复
- OpenAI Whisper/TTS 兼容格式

#### v1.0 (2026-08-01)
- 初始版本

### 特别鸣谢
- [MoviePilot](https://github.com/jxxghp/MoviePilot)
- [jxxghp](https://github.com/jxxghp)
- [thsrite](https://github.com/thsrite)
- [InfinityPacer](https://github.com/InfinityPacer)
