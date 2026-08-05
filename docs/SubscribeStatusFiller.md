# SubscribeStatusFiller · 剧集订阅增强

根据剧集播出状态自动调整订阅策略：已完结剧下完整剧集包，连载剧只追已播集数。

## 功能说明

- 监听订阅添加事件（`SubscribeAdded`），自动从 TMDB 查询媒体播出状态（`Ended` / `Returning Series` / `Canceled` / `In Production` / `Pilot` 等）并写入订阅 `note` 字段
- 根据播出状态自动应用下载策略（见下表），无需手动配置订阅参数
- 连载剧订阅完成后自动否决（`SubscribeCompletionCheck`），持续追更直至剧集完结
- 定时任务（默认每 6 小时）自动检查 TMDB 已播集数，推进连载剧订阅的 `total_episode` / `lack_episode`
- 提供斜杠命令 `/fill_subscribe_status`，可手动补全存量订阅的播出状态并应用策略
- 侧边栏「订阅」分区提供连载剧订阅状态页，展示已播/总集数/缺失/起始集数及策略状态

## 设计意图

| 剧集状态 | 期望策略 |
|---------|---------|
| 已完结（Ended / Canceled） | 一次性下载完整剧集包（`best_version=1` + `best_version_full=1`，全集洗版，只收完整整季包） |
| 连载中（Returning / In Production / Pilot） | 逐集追更（`best_version=0` + `best_version_full=0` + `manual_total_episode=1`），按 TMDB 已播集数锁定 `total_episode` / `lack_episode`，避免误下"1-N 集合集包" |

> 连载剧可针对单个订阅覆盖起始集数（`start_episode`），通过插件配置 `start_episode_overrides` 或页面/API `/set_start_episode` 设置；第 N 集起追更，此前集数不再下载。

## 配置项

| 配置 | 说明 |
|------|------|
| `ended_best_version` | 已完结剧全集洗版开关（默认开启） |
| `returning_lock_aired` | 连载剧锁定已播集数开关（默认开启） |
| `check_interval` | 连载剧已播集数检查间隔（小时，默认 6） |
| `overwrite` | `/fill_subscribe_status` 是否覆盖已有策略（默认关闭） |
| `show_sidebar` | 显示侧边栏「订阅」分区入口（默认开启；关闭后可从插件详情页进入） |

## 命令与 API

| 命令 / API | 说明 |
|-----------|------|
| `/fill_subscribe_status` | 手动补全所有存量订阅的 TMDB 播出状态并应用策略 |
| `GET /api/v1/plugin/SubscribeStatusFiller/subscribes` | 连载剧订阅状态列表（含已播、总集数、缺失、起始集数） |
| `POST /api/v1/plugin/SubscribeStatusFiller/set_start_episode` | 设置单个订阅的起始集数 |

## 订阅状态页

侧边栏「订阅」分区展示连载剧订阅列表，主要列：

| 列 | 说明 |
|----|------|
| 已播 | 当前锁定/已下载追踪的集数（`total_episode`，等于 TMDB 已播集数） |
| 总集数 | TMDB 该季排期总集数（含未播出集，查不到时显示「暂无」） |
| 缺失 | 尚缺集数（`lack_episode`） |
| 起始集数 | 从第几集开始追更（`start_episode`） |
| 状态 | 播出状态与策略标签 |

## 版本历史

| 版本 | 说明 |
|------|------|
| v1.1 | 订阅状态列表新增「总集数」列：展示 TMDB 该季排期总集数，与已播集数分离展示，查不到时显示「暂无」 |
| v1.0.0 | 初始版本：状态查询写入 + 策略联动（Ended 全集洗版 / Returning 锁定已播逐集追更 + 完成否决 + 定时推进） |
