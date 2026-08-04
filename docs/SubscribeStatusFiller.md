# SubscribeStatusFiller · 剧集订阅增强

根据剧集播出状态自动调整订阅策略：已完结剧下完整剧集包，连载剧只追已播集数。

## 功能说明

- 监听订阅添加事件（`SubscribeAdded`），自动从 TMDB 查询媒体状态（`Ended` / `Returning Series` / `Canceled` 等）
- 将播出状态写入订阅的 `note` 字段，供后续策略联动使用
- 提供斜杠命令 `/fill_subscribe_status`，可手动补全存量订阅的播出状态

## 设计意图

| 剧集状态 | 期望策略 |
|---------|---------|
| 已完结（Ended） | 一次性下载完整剧集包（整季包） |
| 连载中（Returning） | 逐集追更，避免误下"1-N集合集包" |

> 当前版本（v1.0.0）仅完成状态查询与写入，尚未联动下载策略。后续计划：
> - Ended → 设 `best_version=1` + `best_version_full=1`（全集洗版）
> - Returning → 监听 `SubscribeEpisodesRefresh` 事件持续修正 `total_episode`，监听 `SubscribeCompletionCheck` 事件否决连载剧误完成

## 配置项

| 配置 | 说明 |
|------|------|
| TMDB API Key | 系统设置中已配置的 TMDB API Key，无需重复填写 |

## 命令

| 命令 | 说明 |
|------|------|
| `/fill_subscribe_status` | 手动补全所有存量订阅的 TMDB 播出状态 |

## 版本历史

| 版本 | 说明 |
|------|------|
| v1.0.0 | 初始版本：监听订阅添加事件，自动从 TMDB 查询媒体状态写入 note 字段 |
