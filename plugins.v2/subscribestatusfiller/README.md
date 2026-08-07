# SubscribeStatusFiller · 剧集订阅增强

根据剧集播出状态自动调整订阅策略：已完结剧下完整剧集包，连载剧只追已播集数。

## 功能说明

- 监听订阅添加事件（`SubscribeAdded`），自动从 TMDB 查询媒体状态并写入订阅 `note` 字段
- **已完结（Ended / Canceled）**：自动设置 `best_version=1` + `best_version_full=1`，只收完整整季包，一次性洗版全集
- **连载中（Returning / In Production / Pilot）**：自动锁定 TMDB 已播集数（`total_episode` / `lack_episode`），逐集追更，避免误下"1-N 集合集包"
- 监听 `SubscribeCompletionCheck` 事件：连载剧未完结时否决订阅误完成，继续追更
- 定时任务 `check_returning_series`（默认 6 小时）：TMDB 已播集数推进时自动更新 `total_episode` / `lack_episode` 并触发补集下载
- 提供斜杠命令 `/fill_subscribe_status`，手动补全存量订阅的播出状态并应用策略
- 提供侧栏「订阅」页面：展示连载剧订阅列表，含起始集数、已播集数、TMDB 排期总集数

## 设计意图

| 剧集状态 | 期望策略 |
|---------|---------|
| 已完结（Ended） | 一次性下载完整剧集包（整季包） |
| 连载中（Returning） | 逐集追更，避免误下"1-N集合集包" |

## 配置项

| 配置 | 说明 |
|------|------|
| ended_best_version | 已完结剧集启用全集洗版（默认开启） |
| returning_lock_aired | 连载剧锁定 TMDB 已播集数（默认开启） |
| check_interval | 连载剧已播集数检查间隔（小时，默认 6） |
| overwrite | 存量订阅补全状态时是否覆盖已有策略 |
| show_sidebar | 是否显示侧边栏「订阅」入口（默认开启） |

## 命令

| 命令 | 说明 |
|------|------|
| `/fill_subscribe_status` | 手动补全所有存量订阅的 TMDB 播出状态并应用策略 |

## 版本历史

| 版本 | 说明 |
|------|------|
| v1.2 | 代码审查修复：存量订阅策略持久化（统一 `_save_note`）、策略开关关闭时不再强制套用、起始集数写回与下限保护、已播集数当日缓存减少 TMDB 请求、API 非 dict 请求体防御、完成否决日志降噪；前端：侧栏全页改用 AppPage（无关闭按钮）、小窗保留关闭按钮、起始集数数字居中 |
| v1.1 | 订阅列表新增「总集数」列：展示 TMDB 该季排期总集数，与已播集数分离展示，查不到时显示「暂无」；版本号统一为 1.1 |
| v1.0.0 | 初始版本：监听订阅添加事件，自动从 TMDB 查询媒体状态写入 note 字段 |

## License

GPL-3.0
