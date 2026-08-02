# 自定义音频 Provider

基于 StepFun API 的 ASR/TTS 语音插件，注册 custom 音频 provider，所有配置在插件内完成，不依赖系统音频设置。支持 OpenAI Whisper 兼容 STT 和 OpenAI TTS 兼容格式，启用后自动切换系统音频输入/输出 provider，支持 Telegram 语音收发与动态配置。

## 功能特性

- **独立配置**：STT 和 TTS 可分别配置 API Key、Base URL、模型，互不干扰
- **OpenAI 兼容**：STT 使用 multipart POST（Whisper 兼容格式），TTS 使用 JSON POST（TTS 兼容格式）
- **自动切换**：启用插件后自动将系统音频输入/输出 provider 切换为 custom，关闭后自动恢复原始 provider
- **多格式支持**：STT 支持 flac、m4a、mp3、ogg、opus、wav 等常见音频格式
- **语言参数**：STT 支持设置识别语言（默认中文），TTS 支持设置语音角色（默认 alloy）
- **表单强校验**：ASR/TTS 启用时必填项非空检查，防止无效配置
- **语音回复附带文字**：可开关是否在语音回复中同时发送文字内容，联动 `AUDIO_OUTPUT_INCLUDE_TEXT` 系统配置

## 安装

### 方式一：通过插件市场安装

1. 在 MoviePilot 中进入 **设定 → 插件市场**
2. 添加本仓库地址：`https://github.com/apple4105/MoviePilot-Plugins`
3. 搜索 **自定义音频 Provider** 并安装

### 方式二：手动安装

将 `plugins.v2/customaudio/` 目录复制到 MoviePilot 的插件目录，重启后生效。

## 使用说明

1. 在插件设置页分别填写 STT（语音转文字）和 TTS（文字转语音）的 API Key、Base URL、模型名
2. STT 可选设置识别语言（如 `zh`、`en`），TTS 可选设置语音角色（如 `alloy`、`nova`）
3. 启用插件后，系统音频输入/输出将自动切换为 custom provider
4. 关闭插件后，系统自动恢复为原始音频 provider

## 版本历史

| 版本 | 说明 |
|------|------|
| v1.1 | 支持 STT/TTS 独立配置 API Key、Base URL、模型；启用自动切换系统音频 provider，关闭自动恢复；OpenAI Whisper/TTS 兼容格式 |
| v1.2 | 新增前端表单强校验（ASR/TTS 启用时必填项非空检查）；新增语音回复附带文字开关，联动 `AUDIO_OUTPUT_INCLUDE_TEXT` 系统配置 |
