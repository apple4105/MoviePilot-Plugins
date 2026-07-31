# Agent Tokens Pro

管理多平台免费 Token 配额，按优先级自动切换 Agent LLM 供应商。

## 致谢

本插件基于 [jxxghp/MoviePilot-Plugins](https://github.com/jxxghp/MoviePilot-Plugins) 的 `AgentTokens` 插件进行二次开发，感谢原作者的贡献。

## 主要增强功能

- **失败自动切换通知**：供应商连续失败达到阈值时自动跳过，并发送系统通知
- **两阶段连通性测试**：GET /models 验证鉴权 + POST chat/completions 验证对话兼容性
- **硬故障踢出**：HTTP >= 400 错误直接标记硬故障，踢出活跃供应商并触发切换
- **厂商管理**：支持厂商（Vendor）维度管理 API 地址，供应商引用厂商配置
- **Dashboard 故障高亮**：故障供应商名称标红，未配置供应商名称标黄
- **流式连通性测试高容错读取**：自动过滤 SSE 心跳行，支持非 UTF-8 响应

## 版本历史

| 版本 | 说明 |
|------|------|
| v0.0.5 | 两阶段严格校验、硬故障踢出、流式高容错读取、测试失败自动标记 |
| v0.0.4 | Dashboard 故障高亮、VendorManager 重构、移动端排版优化 |
| v0.0.3 | 名称重复自动编号、移除优先级字段、测试校验升级 |
| v0.0.2 | 修复 model_call_count 递增 bug、拖拽排序持久化 |
| v0.0.1 | 初始版本 |

## License

GPL-3.0
