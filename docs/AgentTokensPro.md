# AgentTokensPro

管理多平台免费 Token 配额，按优先级自动切换 Agent LLM 供应商。

## 功能特性

- **多供应商管理**：支持 OpenAI 兼容接口的多平台 Token 配额管理，按优先级自动选择
- **失败自动切换**：供应商连续失败达到阈值时自动跳过，切换到下一个可用供应商并发送系统通知
- **两阶段连通性测试**：GET `/models` 验证鉴权 + POST `/chat/completions` 验证对话兼容性
- **硬故障踢出**：HTTP ≥ 400 错误直接标记硬故障，踢出活跃供应商并立即触发切换
- **厂商管理**：以厂商（Vendor）维度管理 API 地址，供应商引用厂商配置，避免重复填写
- **Dashboard 状态高亮**：故障供应商名称标红，未配置供应商名称标黄，活跃供应商闪电标识
- **流式高容错读取**：自动过滤 SSE 心跳行，兼容非 UTF-8 响应，空流兜底判定
- **用量统计**：记录每个供应商的调用次数、成功/失败计数、最后使用时间和模型
- **拖拽排序**：供应商列表支持拖拽排序，顺序即优先级

## 安装

### 方式一：通过插件市场安装

1. 在 MoviePilot 中进入 **设定 → 插件市场**
2. 添加本仓库地址：`https://github.com/apple4105/MoviePilot-Plugins`
3. 搜索 **AgentTokensPro** 并安装

### 方式二：手动安装

将 `plugins.v2/agenttokenspro/` 目录复制到 MoviePilot 的插件目录，重启后生效。

## 使用说明

1. 在插件设置页添加厂商（Vendor），填写 API 地址
2. 添加供应商（Provider），选择厂商并填写 API Key 和模型名
3. 拖拽排序供应商列表，顺序即为优先级
4. 点击「测试连通性」验证供应商可用性
5. 启用插件后，MoviePilot Agent 的 LLM 请求将自动通过本插件路由

## 版本历史

| 版本 | 说明 |
|------|------|
| v0.0.5 | 两阶段严格校验（GET /models + POST chat/completions stream）；硬故障自动踢出活跃供应商并触发切换通知；流式连通性测试高容错读取；测试失败自动标记故障供应商并刷新前端状态 |
| v0.0.4 | Dashboard 故障状态红色高亮；VendorManager 重构；移动端表格排版优化 |
| v0.0.3 | 名称重复自动编号；移除优先级字段；测试连通性校验升级；模型列表获取严格校验；前端 Toast 提示 |
| v0.0.2 | 修复 model_call_count 只在成功时递增的 bug；供应商拖拽排序持久化；请求失败用量统计逻辑修复 |
| v0.0.1 | 初始版本：UI 精简、自动保存、自动测试、后端三重防护、失败自动切换通知 |

## 致谢

本插件基于 [jxxghp/MoviePilot-Plugins](https://github.com/jxxghp/MoviePilot-Plugins) 的 `AgentTokens` 插件进行二次开发，感谢原作者的贡献。
