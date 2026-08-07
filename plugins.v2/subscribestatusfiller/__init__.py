# -*- coding: utf-8 -*-
"""
剧集订阅增强

根据 TMDB 剧集播出状态自动调整订阅下载策略：
- 已完结剧集 -> 开启全集洗版，只收完整剧集包，下完自动收口
- 连载中剧集 -> 锁定到已播出集数，逐集追更，不下含未播剧集的合集包
"""
import json
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Request

from app.chain.media import MediaChain
from app.chain.tmdb import TmdbChain
from app.core.event import Event, eventmanager
from app.db.subscribe_oper import SubscribeOper
from app.db.models.subscribe import Subscribe
from app.schemas.types import EventType, ChainEventType, MediaType
from app.schemas.event import SubscribeCompletionCheckEventData
from app.log import logger
from app.plugins import _PluginBase


class SubscribeStatusFiller(_PluginBase):
    # 插件名称
    plugin_name = "剧集订阅增强"
    # 插件描述
    plugin_desc = "根据剧集播出状态自动调整订阅策略：已完结剧下完整剧集包，连载剧只追已播集数"
    # 插件版本
    plugin_version = "1.2"
    # 插件作者
    plugin_author = "apple4105"
    # 作者主页
    author_url = ""
    # 插件配置项 ID 前缀
    plugin_config_prefix = "subscribestatusfiller_"
    # 加载顺序
    plugin_order = 20
    # 可使用的用户级别
    auth_level = 1

    # 配置项
    _enable: bool = True
    _overwrite: bool = True
    _ended_best_version: bool = True
    _returning_lock_aired: bool = True
    _check_interval: int = 6
    _show_sidebar: bool = True
    # 按订阅 ID 覆盖的起始集数（subscribe_id -> start_episode），持久化在配置 start_episode_overrides 中
    _start_episode_overrides: dict = {}

    def init_plugin(self, config: dict = None):
        self.subscribe_oper = SubscribeOper()
        self.mediachain = MediaChain()
        self.tmdbchain = TmdbChain()
        self._load_config(config or {})

    def _load_config(self, config: dict):
        self._enable = config.get("enable", True)
        self._overwrite = config.get("overwrite", True)
        self._ended_best_version = config.get("ended_best_version", True)
        self._returning_lock_aired = config.get("returning_lock_aired", True)
        self._check_interval = int(config.get("check_interval", 6)) or 6
        self._show_sidebar = config.get("show_sidebar", True)
        # 读取按订阅覆盖的起始集数
        overrides = config.get("start_episode_overrides")
        self._start_episode_overrides = dict(overrides) if isinstance(overrides, dict) else {}

    def get_state(self) -> bool:
        return self._enable

    def stop_service(self):
        pass

    def get_service(self) -> List[Dict[str, Any]]:
        if not self._enable or not self._returning_lock_aired:
            return []
        return [
            {
                "id": "check_returning_series",
                "name": "检查连载剧更新",
                "trigger": "interval",
                "interval": max(self._check_interval, 1) * 3600,
                "func": self._check_returning_series,
                "kwargs": {},
            }
        ]

    def get_form(self) -> Tuple[List[dict], Dict[str, Any]]:
        return [
            {
                "component": "VRow",
                "content": [
                    {
                        "component": "VCol",
                        "props": {"cols": 12, "md": 6},
                        "content": [
                            {
                                "component": "VSwitch",
                                "props": {
                                    "model": "enable",
                                    "label": "启用插件",
                                    "hint": "开启后，新添加的电视剧订阅会自动根据完结状态调整下载策略",
                                    "persistent-hint": True,
                                },
                            }
                        ],
                    },
                    {
                        "component": "VCol",
                        "props": {"cols": 12, "md": 6},
                        "content": [
                            {
                                "component": "VSwitch",
                                "props": {
                                    "model": "overwrite",
                                    "label": "覆盖已有策略",
                                    "hint": "开启后，已设置过策略的订阅也会重新调整；关闭则只调整新订阅",
                                    "persistent-hint": True,
                                },
                            }
                        ],
                    },
                ],
            },
            {
                "component": "VRow",
                "content": [
                    {
                        "component": "VCol",
                        "props": {"cols": 12, "md": 6},
                        "content": [
                            {
                                "component": "VSwitch",
                                "props": {
                                    "model": "show_sidebar",
                                    "label": "显示侧边栏入口",
                                    "hint": "关闭后不在左侧「订阅」导航中显示本插件入口，插件仍正常运行，可从插件市场/我的插件列表进入详情页",
                                    "persistent-hint": True,
                                },
                            }
                        ],
                    },
                ],
            },
            {
                "component": "VRow",
                "content": [
                    {
                        "component": "VCol",
                        "props": {"cols": 12, "md": 6},
                        "content": [
                            {
                                "component": "VSwitch",
                                "props": {
                                    "model": "ended_best_version",
                                    "label": "已完结剧自动开启全集洗版",
                                    "hint": "已完结的剧只会下载完整覆盖整季的剧集包，下完自动收口，不下载缺集残包",
                                    "persistent-hint": True,
                                },
                            }
                        ],
                    },
                    {
                        "component": "VCol",
                        "props": {"cols": 12, "md": 6},
                        "content": [
                            {
                                "component": "VSwitch",
                                "props": {
                                    "model": "returning_lock_aired",
                                    "label": "连载剧只追已播集数",
                                    "hint": "连载中的剧不下含未播剧集的合集包，只下载已播出集数，新集播出后自动追更",
                                    "persistent-hint": True,
                                },
                            }
                        ],
                    },
                ],
            },
            {
                "component": "VRow",
                "content": [
                    {
                        "component": "VCol",
                        "props": {"cols": 12, "md": 6},
                        "content": [
                            {
                                "component": "VTextField",
                                "props": {
                                    "model": "check_interval",
                                    "label": "连载剧检查间隔（小时）",
                                    "hint": "每隔几小时检查一次连载剧是否有新集播出，自动更新追更进度",
                                    "persistent-hint": True,
                                    "type": "number",
                                    "min": 1,
                                    "max": 72,
                                },
                            }
                        ],
                    },
                ],
            },
            {
                "component": "VRow",
                "content": [
                    {
                        "component": "VCol",
                        "props": {"cols": 12},
                        "content": [
                            {
                                "component": "VAlert",
                                "props": {
                                    "type": "info",
                                    "variant": "tonal",
                                    "text": "本插件根据 TMDB 剧集状态自动调整订阅下载策略。"
                                            "已完结的剧：开启全集洗版，只收完整覆盖整季的剧集包，下完自动结束。"
                                            "连载中的剧：锁定到已播出集数，不会下载含未播剧集的合集包，新集播出后自动追更。"
                                            "新订阅自动生效，存量订阅可发送 /fill_subscribe_status 命令补全。"
                                            "连载剧的起始集数请在插件详情页的订阅列表中按订阅单独设置。",
                                },
                            }
                        ],
                    }
                ],
            },
        ], {
            "enable": True,
            "overwrite": True,
            "show_sidebar": True,
            "ended_best_version": True,
            "returning_lock_aired": True,
            "check_interval": 6,
        }

    @staticmethod
    def get_render_mode() -> Tuple[str, str]:
        """Vue 渲染模式，前端构建产物在 dist/assets 目录"""
        return "vue", "dist/assets"

    def get_api(self) -> List[Dict[str, Any]]:
        return [
            {
                "path": "/subscribes",
                "endpoint": self.get_subscribes_api,
                "methods": ["GET"],
                "summary": "获取进行中的连载剧订阅列表",
                "description": "返回全部进行中（连载中/即将开播/试播）的电视剧订阅及当前起始集数",
                "auth": "bear",
            },
            {
                "path": "/set_start_episode",
                "endpoint": self.set_start_episode_api,
                "methods": ["POST"],
                "summary": "设置订阅起始集数",
                "description": "按订阅 ID 覆盖连载剧起始集数，并重新应用连载剧追更策略",
                "auth": "bear",
            },
        ]

    def get_page(self) -> List[dict]:
        """Vue 渲染模式，无独立 JSON 页面"""
        return []

    def get_sidebar_nav(self) -> List[Dict[str, Any]]:
        """声明插件在侧栏导航中的全页入口。"""
        if not self._enable or not self._show_sidebar:
            return []
        return [
            {
                "nav_key": "main",
                "title": "剧集订阅增强",
                "icon": "mdi-television-classic",
                "section": "subscribe",
                "permission": "subscribe",
                "order": 50,
            }
        ]

    @staticmethod
    def get_command() -> List[Dict[str, Any]]:
        return [
            {
                "cmd": "/fill_subscribe_status",
                "event": EventType.PluginAction,
                "desc": "补全存量订阅状态并调整下载策略",
                "category": "订阅管理",
                "data": {"action": "fill_subscribe_status"},
            }
        ]

    @eventmanager.register(EventType.SubscribeAdded)
    def on_subscribe_added(self, event: Event):
        """
        订阅添加事件：查询 TMDB 状态，写入订阅状态，联动下载策略
        """
        if not self._enable or not event or not event.event_data:
            return
        event_data = event.event_data
        subscribe_id = event_data.get("subscribe_id") or event_data.get("id")
        if not subscribe_id:
            return

        try:
            subscribe_id = int(subscribe_id)
        except (TypeError, ValueError):
            return

        subscribe = self.subscribe_oper.get(subscribe_id)
        if not subscribe:
            return

        # 只处理电视剧
        if subscribe.type != MediaType.TV.value:
            return

        # 检查覆盖
        note = self._parse_note(subscribe.note)
        if not self._overwrite and note.get("strategy_applied"):
            return

        # 获取 TMDB 状态
        status = self._get_media_status(subscribe, event_data)
        if not status:
            return

        # 写入状态到 note
        note["tmdb_status"] = status

        # 根据状态联动下载策略（尊重配置开关）
        if status in ("Ended", "Canceled"):
            if self._ended_best_version:
                self._apply_ended_strategy(subscribe, note)
            else:
                note["strategy_applied"] = False
        elif status in ("Returning Series", "In Production", "Pilot"):
            if self._returning_lock_aired:
                self._apply_returning_strategy(subscribe, note)
            else:
                note["strategy_applied"] = False
        else:
            # 其他状态（如 Planned 等），只写状态不做策略联动
            note["strategy_applied"] = False
            self._save_note(subscribe, note)
            return

        # 保存
        self._save_note(subscribe, note)
        logger.info(f"订阅 {subscribe.name}（{subscribe.id}）策略已应用：{status}")

    @eventmanager.register(ChainEventType.SubscribeCompletionCheck)
    def on_completion_check(self, event: Event):
        """
        订阅完成判定事件：连载剧否决误完成，继续追更
        """
        if not self._enable or not event or not event.event_data:
            return
        event_data: SubscribeCompletionCheckEventData = event.event_data
        subscribe = event_data.subscribe
        if not subscribe:
            return
        # 检查订阅状态
        note = self._parse_note(subscribe.note)
        status = note.get("tmdb_status", "")
        if status not in ("Returning Series", "In Production", "Pilot"):
            return
        # 连载剧否决完成
        event_data.cancel = True
        event_data.source = "SubscribeStatusFiller"
        event_data.reason = "剧集连载中，继续追更"
        logger.debug(f"订阅 {subscribe.name} 完成被否决（连载中），继续追更")

    @eventmanager.register(EventType.PluginAction)
    def action_event_handler(self, event: Event):
        """
        命令处理：/fill_subscribe_status 补全存量订阅
        """
        if not event or not event.event_data:
            return
        event_data = event.event_data
        if event_data.get("action") != "fill_subscribe_status":
            return
        channel = event_data.get("channel")
        userid = event_data.get("user")

        self.post_message(
            channel=channel,
            title="开始补全存量订阅状态与策略 ...",
            userid=userid,
        )
        msg = self._fill_existing_subscribes()
        self.post_message(
            channel=channel,
            title=msg or "补全完成",
            userid=userid,
        )

    def _check_returning_series(self):
        """
        定时任务：检查连载剧是否有新集播出，更新追更进度
        """
        if not self._enable or not self._returning_lock_aired:
            return
        subscribes = self.subscribe_oper.list() or []
        today = date.today()
        updated = 0

        for sub in subscribes:
            if sub.type != MediaType.TV.value:
                continue
            if sub.state == "S":  # 暂停的跳过
                continue
            note = self._parse_note(sub.note)
            status = note.get("tmdb_status", "")
            if status not in ("Returning Series", "In Production", "Pilot"):
                continue
            if not sub.tmdbid or sub.season is None:
                continue

            # 查询已播集数
            aired = self._get_aired_count(sub.tmdbid, sub.season)
            if aired is None or aired == 0:
                continue

            # 如果已播集数大于当前 total_episode，更新
            current_total = sub.total_episode or 0
            if aired > current_total:
                lack = sub.lack_episode or 0
                downloaded = max(0, current_total - lack)
                # 起始集数下限保护：已下载数不能低于起始集数-1（与策略应用逻辑一致）
                start_ep = self._get_start_episode(sub.id)
                if start_ep and start_ep > 1:
                    downloaded = max(downloaded, start_ep - 1)
                new_lack = max(0, aired - downloaded)
                self.subscribe_oper.update(sub.id, {
                    "total_episode": aired,
                    "lack_episode": new_lack,
                    "manual_total_episode": 1,
                })
                updated += 1
                logger.info(f"连载剧 {sub.name} 总集数更新：{current_total} -> {aired}，缺集 {new_lack}")

        if updated:
            logger.info(f"连载剧检查完成，共更新 {updated} 个订阅")

    def _get_media_status(self, subscribe: Subscribe, event_data: dict) -> Optional[str]:
        """
        获取媒体状态（优先从事件中取，回退到 TMDB 查询）
        """
        # 优先从事件携带的 mediainfo 取
        event_mediainfo = event_data.get("mediainfo")
        if event_mediainfo:
            if isinstance(event_mediainfo, dict):
                status = event_mediainfo.get("status")
            else:
                status = getattr(event_mediainfo, "status", None)
            if status:
                return status

        # 回退：从 TMDB 查询
        tmdb_id = subscribe.tmdbid
        if not tmdb_id:
            return None
        media_type = subscribe.type
        try:
            mtype = MediaType(media_type) if media_type in (
                MediaType.MOVIE.value, MediaType.TV.value) else None
        except (ValueError, TypeError):
            mtype = None
        tmdb_info = self.mediachain.tmdb_info(tmdbid=tmdb_id, mtype=mtype)
        if not tmdb_info:
            return None
        return tmdb_info.get("status")

    def _apply_ended_strategy(self, subscribe: Subscribe, note: dict):
        """
        已完结剧集策略：开启全集洗版
        """
        note["strategy_applied"] = True
        note["strategy_type"] = "ended_best_version"
        self.subscribe_oper.update(subscribe.id, {
            "best_version": 1,
            "best_version_full": 1,
        })

    def _apply_returning_strategy(self, subscribe: Subscribe, note: dict):
        """
        连载剧集策略：锁定到已播集数，逐集追更
        """
        note["strategy_applied"] = True
        note["strategy_type"] = "returning_locked"

        if not subscribe.tmdbid or subscribe.season is None:
            return

        # 确保不开启全集洗版
        updates = {
            "best_version": 0,
            "best_version_full": 0,
            "manual_total_episode": 1,
        }

        # 应用起始集数（优先使用按订阅覆盖的值，否则默认 1；始终写回以清除旧残留值）
        start_ep = self._get_start_episode(subscribe.id) or 1
        updates["start_episode"] = start_ep

        # 查询已播集数，锁定 total_episode
        aired = self._get_aired_count(subscribe.tmdbid, subscribe.season)
        if aired and aired > 0:
            current_total = subscribe.total_episode or 0
            lack = subscribe.lack_episode or 0
            downloaded = max(0, current_total - lack)
            # 如果设置了起始集数，已下载数不能低于起始集数-1
            if start_ep and start_ep > 1:
                downloaded = max(downloaded, start_ep - 1)
            new_lack = max(0, aired - downloaded)
            updates["total_episode"] = aired
            updates["lack_episode"] = new_lack

        self.subscribe_oper.update(subscribe.id, updates)

    def _get_aired_count(self, tmdb_id: int, season: int) -> Optional[int]:
        """
        查询某季已播出集数（air_date <= 今天）
        """
        try:
            episodes = self.tmdbchain.tmdb_episodes(tmdbid=tmdb_id, season=season)
            if not episodes:
                return None
            today = date.today()
            aired = 0
            for ep in episodes:
                if ep.air_date:
                    try:
                        ep_date = datetime.strptime(ep.air_date, "%Y-%m-%d").date()
                        if ep_date <= today:
                            aired += 1
                    except ValueError:
                        continue
            return aired
        except Exception as e:
            logger.warning(f"查询已播集数失败 tmdbid={tmdb_id} season={season}：{e}")
            return None

    def _get_scheduled_count(self, tmdb_id: int, season: int) -> Optional[int]:
        """
        查询某季排期总集数（含未播出集数），查询失败返回 None
        """
        try:
            episodes = self.tmdbchain.tmdb_episodes(tmdbid=tmdb_id, season=season)
            if not episodes:
                return None
            return len(episodes)
        except Exception as e:
            logger.warning(f"查询排期总集数失败 tmdbid={tmdb_id} season={season}：{e}")
            return None

    def _get_cached_scheduled_count(self, subscribe: Subscribe) -> Optional[int]:
        """
        获取排期总集数：优先读 note 缓存（当日有效），过期或缺失时查询 TMDB 并回写缓存，
        避免列表接口每次对每个订阅发起 TMDB 请求
        """
        if not subscribe.tmdbid or subscribe.season is None:
            return None
        note = self._parse_note(subscribe.note)
        cached = note.get("scheduled_count")
        cached_at = note.get("scheduled_count_at")
        if isinstance(cached, int) and cached > 0 and cached_at:
            try:
                cache_date = datetime.strptime(str(cached_at), "%Y-%m-%d").date()
                if (date.today() - cache_date).days < 1:
                    return cached
            except ValueError:
                pass
        count = self._get_scheduled_count(subscribe.tmdbid, subscribe.season)
        if count:
            note["scheduled_count"] = count
            note["scheduled_count_at"] = date.today().isoformat()
            self._save_note(subscribe, note)
        return count

    def _get_start_episode(self, subscribe_id: int) -> int:
        """
        获取订阅生效的起始集数（优先按订阅覆盖值，默认 1）
        """
        overrides = self._start_episode_overrides or {}
        try:
            return int(overrides.get(str(subscribe_id), 1)) or 1
        except (TypeError, ValueError):
            return 1

    def _save_start_episode_override(self, subscribe_id: int, start_episode: int) -> bool:
        """
        持久化按订阅覆盖的起始集数（<=1 时视为默认值，删除覆盖）
        """
        current = self.get_config() or {}
        overrides = dict(current.get("start_episode_overrides") or {})
        key = str(subscribe_id)
        if start_episode <= 1:
            overrides.pop(key, None)
        else:
            overrides[key] = int(start_episode)
        current["start_episode_overrides"] = overrides
        self.update_config(current)
        self._start_episode_overrides = overrides
        return True

    def _collect_returning_subscribes(self) -> List[dict]:
        """
        收集进行中的连载剧订阅列表（含当前生效的起始集数）
        """
        subscribes: List[Subscribe] = self.subscribe_oper.list() or []
        result: List[dict] = []
        for sub in subscribes:
            # 只处理进行中的电视剧订阅
            if sub.type != MediaType.TV.value:
                continue
            if sub.state == "S":
                continue
            note = self._parse_note(sub.note)
            status = note.get("tmdb_status", "")
            if status not in ("Returning Series", "In Production", "Pilot"):
                continue
            total = sub.total_episode or 0
            lack = sub.lack_episode or 0
            result.append({
                "subscribe_id": sub.id,
                "name": sub.name or "",
                "season": sub.season,
                "status": status,
                "total_episodes": self._get_cached_scheduled_count(sub),
                "total_episode": total,
                "lack_episode": lack,
                # 连载剧已锁定 total_episode 为已播集数，起始集数上限取 total+1
                "aired": total,
                "start_episode": self._get_start_episode(sub.id),
                "best_version": sub.best_version or 0,
                "best_version_full": sub.best_version_full or 0,
            })
        result.sort(key=lambda x: (x["name"] or "", x["season"] or 0))
        return result

    async def get_subscribes_api(self, request: Request):
        """
        API：获取进行中的连载剧订阅列表
        """
        if not self._enable:
            return {"success": False, "message": "插件未启用"}
        try:
            return {"success": True, "data": {"subscribes": self._collect_returning_subscribes()}}
        except Exception as e:
            logger.error(f"获取连载剧订阅列表失败：{e}")
            return {"success": False, "message": f"获取订阅列表失败：{e}"}

    async def set_start_episode_api(self, request: Request):
        """
        API：按订阅 ID 设置起始集数并重新应用连载剧追更策略
        """
        if not self._enable:
            return {"success": False, "message": "插件未启用"}
        try:
            data = await request.json()
        except Exception:
            return {"success": False, "message": "请求数据解析失败"}
        if not isinstance(data, dict):
            return {"success": False, "message": "请求数据解析失败"}

        try:
            subscribe_id = int(data.get("subscribe_id"))
            start_episode = int(data.get("start_episode"))
        except (TypeError, ValueError):
            return {"success": False, "message": "参数错误：subscribe_id 和 start_episode 必须为数字"}

        if start_episode < 1:
            return {"success": False, "message": "起始集数必须大于等于 1"}

        subscribe = self.subscribe_oper.get(subscribe_id)
        if not subscribe:
            return {"success": False, "message": f"订阅 {subscribe_id} 不存在"}
        if subscribe.type != MediaType.TV.value:
            return {"success": False, "message": "仅电视剧订阅支持起始集数设置"}

        try:
            self._save_start_episode_override(subscribe_id, start_episode)
        except Exception as e:
            logger.error(f"保存起始集数失败 subscribe_id={subscribe_id}：{e}")
            return {"success": False, "message": f"保存失败：{e}"}

        # 若该订阅是连载剧且启用了锁定策略，重新应用策略
        note = self._parse_note(subscribe.note)
        status = note.get("tmdb_status", "")
        if status in ("Returning Series", "In Production", "Pilot") and self._returning_lock_aired:
            try:
                self._apply_returning_strategy(subscribe, note)
                self._save_note(subscribe, note)
                logger.info(f"订阅 {subscribe.name}（{subscribe.id}）起始集数已更新为 {start_episode}，策略已重新应用")
            except Exception as e:
                logger.error(f"重新应用连载剧策略失败 subscribe_id={subscribe_id}：{e}")
                return {"success": False, "message": f"起始集数已保存，但策略应用失败：{e}"}

        return {"success": True, "data": {"subscribes": self._collect_returning_subscribes()}, "message": "保存成功"}

    def _parse_note(self, note: Any) -> dict:
        """解析订阅 note 字段"""
        if isinstance(note, dict):
            return note
        if isinstance(note, str):
            try:
                parsed = json.loads(note)
                return parsed if isinstance(parsed, dict) else {}
            except (json.JSONDecodeError, TypeError):
                return {}
        return {}

    def _save_note(self, subscribe: Subscribe, note: dict):
        """保存订阅 note 字段"""
        note_json = json.dumps(note, ensure_ascii=False)
        self.subscribe_oper.update(subscribe.id, {"note": note_json})

    def _fill_existing_subscribes(self) -> str:
        """
        遍历所有订阅，补全状态并应用策略
        """
        if not self._enable:
            return "插件未启用，已跳过"

        subscribes: List[Subscribe] = self.subscribe_oper.list() or []
        if not subscribes:
            return "没有找到任何订阅"

        total = 0
        filled = 0
        skipped = 0
        failed = 0

        for subscribe in subscribes:
            total += 1
            # 只处理电视剧
            if subscribe.type != MediaType.TV.value:
                skipped += 1
                continue

            note = self._parse_note(subscribe.note)
            if not self._overwrite and note.get("strategy_applied"):
                skipped += 1
                continue

            tmdb_id = subscribe.tmdbid
            if not tmdb_id:
                skipped += 1
                continue

            # 获取状态
            try:
                media_type = subscribe.type
                mtype = MediaType(media_type) if media_type in (
                    MediaType.MOVIE.value, MediaType.TV.value) else None
                tmdb_info = self.mediachain.tmdb_info(tmdbid=tmdb_id, mtype=mtype)
                if not tmdb_info:
                    failed += 1
                    continue
                status = tmdb_info.get("status")
                if not status:
                    failed += 1
                    continue
            except Exception as e:
                logger.warning(f"TMDB 查询失败 tmdbid={tmdb_id}：{e}")
                failed += 1
                continue

            note["tmdb_status"] = status

            # 应用策略（无论策略开关是否启用，状态都要写入 note 并持久化）
            if status in ("Ended", "Canceled"):
                if self._ended_best_version:
                    self._apply_ended_strategy(subscribe, note)
                else:
                    note["strategy_applied"] = False
            elif status in ("Returning Series", "In Production", "Pilot"):
                if self._returning_lock_aired:
                    self._apply_returning_strategy(subscribe, note)
                else:
                    note["strategy_applied"] = False
            else:
                note["strategy_applied"] = False
            self._save_note(subscribe, note)

            filled += 1
            logger.info(f"存量补全：订阅 {subscribe.name}（{subscribe.id}）状态：{status}")

        return (f"共 {total} 个订阅，已处理 {filled} 个，跳过 {skipped} 个，失败 {failed} 个")