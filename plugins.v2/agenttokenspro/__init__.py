import re
import threading
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Body
import requests

from app import schemas
from app.api.endpoints.plugin import register_plugin_api
from app.core.event import Event, eventmanager
from app.log import logger
from app.plugins import _PluginBase
from app.schemas.types import ChainEventType, EventType


class AgentTokensPro(_PluginBase):
    """
    Agent Tokens Pro 管理插件。

    通过 Agent LLM 供应商链式事件按优先级选择仍有 token 余量的供应商，
    并通过 Agent Tokens 用量广播事件回写实际消耗。
    """

    plugin_name = "Agent Tokens Pro"
    plugin_desc = "管理多平台免费 Token 配额，按优先级自动切换 Agent LLM 供应商。"
    plugin_icon = "agentresourceofficer.png"
    plugin_version = "0.0.5"
    plugin_author = "apple4105"
    author_url = "https://github.com/apple4105"
    plugin_config_prefix = "agenttokenspro_"
    plugin_order = 45
    auth_level = 1

    DATA_KEY_USAGE = "usage"
    DATA_KEY_VENDORS = "vendors"

    # 失败自动切换：连续失败次数达到阈值后跳过该供应商。
    DEFAULT_MAX_FAILURES = 3

    @property
    def name(self) -> str:
        """兼容框架 event.py 中 plugin.name 访问（_PluginBase 仅有 get_name() 方法）。"""
        return self.plugin_name

    def init_plugin(self, config: dict = None):
        """
        初始化插件配置，补齐供应商稳定 ID 以便后续用量能持续关联。
        """
        self._usage_lock = threading.RLock()
        config = config or {}
        self._enabled = bool(config.get("enabled"))
        self._show_sidebar_nav = bool(config.get("show_sidebar_nav", True))
        self._max_failures = max(self._to_int(config.get("max_failures"), self.DEFAULT_MAX_FAILURES), 1)
        self._active_provider_id = self._clean_text(config.get("active_provider_id")) or None
        self._manual_override = bool(config.get("manual_override", False))
        self._providers = self._normalize_providers(config.get("providers") or [])
        # 供应商切换通知防轰炸：记录上次通知时间和供应商 ID，仅在真正切换且冷却期内无重复通知
        self._last_switch_notify_time: float = 0.0
        self._last_notified_provider_id: Optional[str] = None
        # 仅当供应商列表非空时才回写（补齐的 UUID 需要持久化）；
        # 空列表时不写回，避免数据库被意外清空后启动时再次覆盖。
        if self._providers:
            self._save_config()
        else:
            logger.warning("Agent Tokens 插件启动时未加载到任何供应商配置，跳过配置回写以保护数据安全。")

    def get_state(self) -> bool:
        """
        返回插件是否已启用。
        """
        return bool(getattr(self, "_enabled", False))

    @staticmethod
    def get_command() -> List[Dict[str, Any]]:
        """
        当前插件不注册远程命令。
        """
        return []

    def get_api(self) -> List[Dict[str, Any]]:
        """
        注册 Vue 界面需要调用的插件 API。
        """
        return [
            {
                "path": "/status",
                "endpoint": self.get_status,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "获取 Agent Tokens 状态",
            },
            {
                "path": "/config",
                "endpoint": self.save_config_api,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "保存 Agent Tokens 配置",
            },
            {
                "path": "/models",
                "endpoint": self.list_models_api,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "获取供应商可用模型",
            },
            {
                "path": "/usage/reset",
                "endpoint": self.reset_usage_api,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "重置指定供应商用量",
            },
            {
                "path": "/usage/reset_failures",
                "endpoint": self.reset_failures_api,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "重置指定供应商失败计数",
            },
            {
                "path": "/test-connection",
                "endpoint": self.test_connection_api,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "测试供应商连接",
            },
            {
                "path": "/usage/reset_all",
                "endpoint": self.reset_all_usage_api,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "重置全部供应商用量",
            },
            {
                "path": "/vendors",
                "endpoint": self.get_vendors_api,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "获取厂商列表",
            },
            {
                "path": "/vendors",
                "endpoint": self.save_vendor_api,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "创建或更新厂商",
            },
            {
                "path": "/vendors/reorder",
                "endpoint": self.reorder_vendors_api,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "厂商排序",
            },
            {
                "path": "/vendors/delete",
                "endpoint": self.delete_vendor_api,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "删除厂商",
            },
        ]

    @staticmethod
    def get_render_mode() -> Tuple[str, str]:
        """
        声明插件使用 Vue 联邦组件渲染。
        """
        return "vue", "dist/assets"

    def get_form(self) -> Tuple[List[dict], Dict[str, Any]]:
        """
        Vue 模式下返回默认配置模型。
        """
        return [], self._current_config()

    def get_page(self) -> List[dict]:
        """
        Vue 模式下详情页由远程 Page 组件渲染。
        """
        return []

    def get_dashboard_meta(self) -> Optional[List[Dict[str, str]]]:
        """
        声明一个用量概览仪表板组件。
        """
        return [{"key": "usage", "name": "Agent Tokens 管理"}] if self.get_state() else []

    def get_dashboard(self, key: str, **kwargs) -> Optional[Tuple[Dict[str, Any], Dict[str, Any], Optional[List[dict]]]]:
        """
        返回 Vue 仪表板组件的布局与标题配置。
        """
        if not self.get_state():
            return None
        return (
            {"cols": 12, "sm": 6, "md": 4},
            {
                "title": "Agent Tokens 管理",
                "subtitle": "LLM 配额使用情况",
                "refresh": 30,
                "border": True,
            },
            None,
        )

    def get_sidebar_nav(self) -> List[Dict[str, Any]]:
        """
        将 Agent Tokens 管理页注册到主界面侧栏。
        """
        if not self.get_state() or not getattr(self, "_show_sidebar_nav", True):
            return []
        return [
            {
                "nav_key": "main",
                "title": "Agent Tokens 管理",
                "icon": "mdi-key-chain",
                "section": "system",
                "permission": "manage",
                "order": 46,
            }
        ]

    def stop_service(self):
        """
        插件无后台服务，停用时无需清理额外资源。
        """
        pass

    @staticmethod
    def _to_int(value: Any, default: int = 0) -> int:
        """
        将配置或事件中的数字字段安全转为整数。
        """
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _clean_text(value: Any) -> str:
        """
        清理配置中的文本字段，避免空白值参与供应商选择。
        """
        return str(value or "").strip()

    @staticmethod
    def _event_get(event_data: Any, key: str, default: Any = None) -> Any:
        """
        兼容读取 Pydantic 事件模型或字典中的字段。
        """
        if isinstance(event_data, dict):
            return event_data.get(key, default)
        return getattr(event_data, key, default)

    @staticmethod
    def _event_set(event_data: Any, key: str, value: Any) -> None:
        """
        兼容写入 Pydantic 事件模型或字典中的字段。
        """
        if isinstance(event_data, dict):
            event_data[key] = value
        else:
            setattr(event_data, key, value)

    @classmethod
    def _normalize_provider(cls, provider: dict, index: int) -> dict:
        """
        标准化单个供应商配置，并为旧配置补齐稳定 ID。
        """
        provider = provider or {}
        provider_id = cls._clean_text(provider.get("id")) or uuid.uuid4().hex
        token_limit = max(cls._to_int(provider.get("token_limit"), 0), 0)
        used_tokens = max(cls._to_int(provider.get("used_tokens"), 0), 0)
        priority = cls._to_int(provider.get("priority"), index + 1)
        return {
            "id": provider_id,
            "enabled": bool(provider.get("enabled", True)),
            "name": cls._clean_text(provider.get("name")) or f"Provider {index + 1}",
            "provider": cls._clean_text(
                provider.get("provider") or provider.get("llm_provider")
            ) or "openai",
            "base_url": cls._clean_text(provider.get("base_url")),
            "api_key": cls._clean_text(provider.get("api_key")),
            "user_agent": cls._clean_text(provider.get("user_agent")),
            "use_proxy": bool(provider.get("use_proxy", True)),
            "model": cls._clean_text(provider.get("model")),
            "token_limit": token_limit,
            "used_tokens": used_tokens,
            "priority": priority,
        }

    @classmethod
    def _normalize_providers(cls, providers: list) -> List[dict]:
        """
        标准化供应商列表，保持前端传来的数组顺序。
        """
        normalized = [
            cls._normalize_provider(provider, index)
            for index, provider in enumerate(providers or [])
            if isinstance(provider, dict)
        ]
        # 不再按 priority 排序，直接保持前端传来的数组顺序
        return normalized

    def _resolve_provider_name(self, raw_provider: dict, normalized_id: str,
                               existing_providers_map: dict, used_names: set) -> str:
        """
        解析供应商名称，处理重名时自动添加/递增数字后缀。

        规则：
        - 编辑模式下名称未修改 → 保持原名
        - 名称未被使用 → 直接使用
        - 名称已被使用 → 解析基础名称，从 1 开始递增找下一个可用序号
        """
        name = self._clean_text(raw_provider.get("name"))
        if not name:
            name = "Provider"

        # 编辑模式：如果名称未修改，保持原名
        if normalized_id and normalized_id in existing_providers_map:
            original_name = self._clean_text(existing_providers_map[normalized_id].get("name"))
            if name == original_name:
                return name

        # 如果名称未被使用，直接使用
        if name not in used_names:
            return name

        # 解析基础名称（去掉结尾数字）
        match = re.match(r'^(.*?)(\d+)$', name)
        if match:
            base_name = match.group(1)
        else:
            base_name = name

        # 从 1 开始找下一个可用序号
        next_num = 1
        while f"{base_name}{next_num}" in used_names:
            next_num += 1

        return f"{base_name}{next_num}"

    @staticmethod
    def _mask_api_key(api_key: str) -> str:
        """
        生成 API Key 的脱敏展示文本。
        """
        if not api_key:
            return ""
        if len(api_key) <= 8:
            return "****"
        return f"{api_key[:4]}...{api_key[-4:]}"

    def _current_config(self) -> Dict[str, Any]:
        """
        返回当前插件配置快照。
        """
        return {
            "enabled": bool(getattr(self, "_enabled", False)),
            "show_sidebar_nav": bool(getattr(self, "_show_sidebar_nav", True)),
            "max_failures": getattr(self, "_max_failures", self.DEFAULT_MAX_FAILURES),
            "providers": list(getattr(self, "_providers", [])),
            "active_provider_id": getattr(self, "_active_provider_id", None) or None,
            "manual_override": bool(getattr(self, "_manual_override", False)),
        }

    def _save_config(self) -> None:
        """
        保存当前插件配置，确保供应商 ID 的补齐结果能持久化。
        安全校验：如果数据库中已有供应商配置，而当前内存为空，则拒绝写入以防数据丢失。
        """
        current_providers = list(getattr(self, "_providers", []))
        if not current_providers:
            # 二次防御：读取数据库中的配置，若数据库已有供应商则拒绝空覆盖
            try:
                db_config = self.get_config() or {}
                db_providers = db_config.get("providers") or []
                if db_providers:
                    logger.error(
                        f"Agent Tokens 安全拦截：拒绝用空供应商列表覆盖数据库中已有的 "
                        f"{len(db_providers)} 个供应商配置！如需清空请通过前端显式操作。"
                    )
                    return
            except Exception as exc:
                logger.warning(f"Agent Tokens 读取数据库配置用于安全校验失败: {exc}")
        self.update_config(self._current_config())

    def _load_usage(self) -> Dict[str, dict]:
        """
        读取已记录的供应商用量。
        """
        usage = self.get_data(self.DATA_KEY_USAGE) or {}
        return usage if isinstance(usage, dict) else {}

    def _save_usage(self, usage: Dict[str, dict]) -> None:
        """
        保存供应商用量数据。
        """
        self.save_data(self.DATA_KEY_USAGE, usage or {})

    def _provider_usage(self, provider: dict, usage: Optional[Dict[str, dict]] = None) -> dict:
        """
        汇总供应商的手工初始用量和 Agent 实际记录用量。
        """
        usage = usage if usage is not None else self._load_usage()
        provider_usage = usage.get(provider["id"], {}) or {}
        recorded_total = self._to_int(provider_usage.get("total_tokens"), 0)
        manual_used = self._to_int(provider.get("used_tokens"), 0)
        total_used = manual_used + recorded_total
        token_limit = self._to_int(provider.get("token_limit"), 0)
        remaining = None if token_limit <= 0 else max(token_limit - total_used, 0)
        percent = 0
        if token_limit > 0:
            percent = min(round(total_used * 100 / token_limit, 2), 100)
        return {
            "input_tokens": self._to_int(provider_usage.get("input_tokens"), 0),
            "output_tokens": self._to_int(provider_usage.get("output_tokens"), 0),
            "recorded_tokens": recorded_total,
            "manual_used_tokens": manual_used,
            "total_tokens": total_used,
            "token_limit": token_limit,
            "remaining_tokens": remaining,
            "usage_percent": percent,
            "model_call_count": self._to_int(provider_usage.get("model_call_count"), 0),
            "runs": self._to_int(provider_usage.get("runs"), 0),
            "success_count": self._to_int(provider_usage.get("success_count"), 0),
            "failure_count": self._to_int(provider_usage.get("failure_count"), 0),
            "last_used_at": provider_usage.get("last_used_at"),
            "last_error": provider_usage.get("last_error"),
            "exhausted": token_limit > 0 and total_used >= token_limit,
        }

    def _provider_status_rows(self) -> List[dict]:
        """
        构建前端展示用的供应商状态列表。
        """
        usage = self._load_usage()
        rows = []
        for provider in getattr(self, "_providers", []):
            provider_usage = self._provider_usage(provider, usage)
            rows.append({
                **provider,
                "masked_api_key": self._mask_api_key(provider.get("api_key", "")),
                "usage": provider_usage,
            })
        return rows

    def _summary(self) -> Dict[str, Any]:
        """
        汇总当前供应商数量以及限量/不限量 token 使用情况。
        """
        rows = self._provider_status_rows()
        enabled_rows = [row for row in rows if row.get("enabled")]
        max_failures = getattr(self, "_max_failures", self.DEFAULT_MAX_FAILURES)
        available_rows = [
            row for row in enabled_rows
            if not row["usage"].get("exhausted")
            and row.get("api_key")
            and row.get("model")
            and row.get("base_url")
            and row["usage"].get("failure_count", 0) < max_failures
        ]
        limited_rows = [
            row for row in rows
            if row["usage"].get("token_limit", 0) > 0
        ]
        unlimited_rows = [
            row for row in rows
            if row["usage"].get("token_limit", 0) <= 0
        ]
        limited_total = sum(row["usage"]["token_limit"] for row in limited_rows)
        limited_used = sum(row["usage"]["total_tokens"] for row in limited_rows)
        unlimited_used = sum(row["usage"]["total_tokens"] for row in unlimited_rows)
        limited_remaining = None if limited_total <= 0 else max(limited_total - limited_used, 0)
        limited_usage_percent = 0
        if limited_total > 0:
            limited_usage_percent = min(round(limited_used * 100 / limited_total, 2), 100)
        return {
            "enabled": self.get_state(),
            "provider_count": len(rows),
            "enabled_count": len(enabled_rows),
            "available_count": len(available_rows),
            "limited_provider_count": len(limited_rows),
            "unlimited_provider_count": len(unlimited_rows),
            "total_limit": limited_total,
            "total_used": limited_used + unlimited_used,
            "limited_used": limited_used,
            "unlimited_used": unlimited_used,
            "limited_remaining": limited_remaining,
            "limited_usage_percent": limited_usage_percent,
        }

    def _select_provider(self) -> Optional[dict]:
        """
        按优先级选择第一个启用且未耗尽 token 配额的供应商。
        连续失败次数达到 max_failures 阈值的供应商会被跳过。
        """
        usage = self._load_usage()
        max_failures = getattr(self, "_max_failures", self.DEFAULT_MAX_FAILURES)
        for provider in getattr(self, "_providers", []):
            if not provider.get("enabled"):
                continue
            if not provider.get("api_key") or not provider.get("model") or not provider.get("base_url"):
                continue
            provider_usage = self._provider_usage(provider, usage)
            if provider_usage["exhausted"]:
                continue
            # 连续失败次数达到阈值时跳过该供应商
            failure_count = provider_usage.get("failure_count", 0)
            if failure_count >= max_failures:
                logger.debug(
                    f"Agent Tokens 跳过供应商 [{provider.get('name')}]："
                    f"连续失败 {failure_count} 次，阈值 {max_failures}"
                )
                continue
            return provider
        return None

    def _latest_used_provider_id(self, usage: Optional[Dict[str, dict]] = None) -> Optional[str]:
        """
        根据最近一次调用时间推断最后实际使用的供应商。
        """
        usage = usage if usage is not None else self._load_usage()
        latest_provider_id = None
        latest_used_at = ""
        for provider_id, record in (usage or {}).items():
            used_at = self._clean_text((record or {}).get("last_used_at"))
            if used_at and used_at >= latest_used_at:
                latest_provider_id = provider_id
                latest_used_at = used_at
        return latest_provider_id

    def _display_active_provider_id(self) -> Optional[str]:
        """
        返回前端应高亮的供应商 ID。

        优先使用本轮 Agent 已分配的供应商；如果当前进程尚未发生分配，
        则回退到最近实际调用过的供应商；仍为空时回退到当前会被选中的可用供应商。
        """
        active_provider_id = getattr(self, "_active_provider_id", None)
        manual_override = getattr(self, "_manual_override", False)
        provider_ids = {provider.get("id") for provider in getattr(self, "_providers", [])}
        if active_provider_id in provider_ids:
            return active_provider_id

        latest_provider_id = self._latest_used_provider_id()
        if latest_provider_id in provider_ids:
            return latest_provider_id

        selected_provider = self._select_provider()
        if selected_provider:
            return selected_provider.get("id")
        return None

    def get_status(self) -> schemas.Response:
        """
        获取插件配置、供应商用量和概览统计。
        """
        display_id = self._display_active_provider_id()
        return schemas.Response(
            success=True,
            data={
                "config": self._current_config(),
                "providers": self._provider_status_rows(),
                "summary": self._summary(),
                "active_provider_id": display_id,
            },
        )

    @staticmethod
    def _api_key_fingerprint(api_key: str) -> str:
        """
        生成 API Key 的前三后四指纹用于查重。
        Key 长度不足 7 位时退化为全匹配。
        """
        if not api_key:
            return ""
        key = api_key.strip()
        if len(key) < 7:
            return key
        return f"{key[:3]}...{key[-4:]}"

    def _check_duplicate_api_keys(self, providers: list) -> Optional[str]:
        """
        检查供应商列表中是否存在前三后四相同的 API Key。
        返回错误消息字符串表示存在重复，返回 None 表示无重复。
        """
        seen: Dict[str, str] = {}  # fingerprint -> provider name
        for provider in providers:
            api_key = self._clean_text(provider.get("api_key"))
            if not api_key:
                continue
            fp = self._api_key_fingerprint(api_key)
            name = self._clean_text(provider.get("name")) or provider.get("id", "未知")
            if fp in seen:
                return (
                    f"检测到已存在相同/高度相似的 Token："
                    f"供应商 [{name}] 与 [{seen[fp]}] 的 API Key 前三后四相同（{fp}），禁止保存"
                )
            seen[fp] = name
        return None

    def save_config_api(self, config: dict = Body(...)) -> schemas.Response:
        """
        保存前端提交的供应商配置。
        """
        try:
            self._enabled = bool(config.get("enabled"))
            self._show_sidebar_nav = bool(config.get("show_sidebar_nav", True))
            self._max_failures = max(self._to_int(config.get("max_failures"), self.DEFAULT_MAX_FAILURES), 1)

            # 获取现有供应商映射（用于编辑模式判断）
            existing_providers = list(getattr(self, "_providers", []))
            existing_providers_map = {p.get("id"): p for p in existing_providers if p.get("id")}

            # 收集已使用的名称（现有供应商的名称）
            used_names = set()
            for p in existing_providers:
                n = self._clean_text(p.get("name"))
                if n:
                    used_names.add(n)

            # 标准化并处理名称重名
            raw_providers = config.get("providers") or []
            new_providers = []
            for index, raw_provider in enumerate(raw_providers):
                if not isinstance(raw_provider, dict):
                    continue
                normalized = self._normalize_provider(raw_provider, index)
                # 处理名称重名
                resolved_name = self._resolve_provider_name(
                    raw_provider, normalized.get("id", ""),
                    existing_providers_map, used_names
                )
                normalized["name"] = resolved_name
                used_names.add(resolved_name)
                new_providers.append(normalized)

            # 安全校验：如果前端提交空供应商但当前已有配置，拒绝并提示
            if not new_providers and existing_providers:
                logger.error(
                    f"Agent Tokens 安全拦截：前端提交了空供应商列表，但当前已有 "
                    f"{len(existing_providers)} 个供应商。已拒绝保存以防止数据丢失。"
                )
                return schemas.Response(
                    success=False,
                    message=f"安全拦截：当前有 {len(existing_providers)} 个供应商配置，不允许用空列表覆盖。如需清空请逐个删除。"
                )
            # API Key 前三后四查重校验
            dup_result = self._check_duplicate_api_keys(new_providers)
            if dup_result:
                return schemas.Response(success=False, message=dup_result)
            self._providers = new_providers
            # 保存前端手动选择的活跃供应商（如果提供且存在于当前供应商列表中）
            active_provider_id = config.get("active_provider_id")
            if active_provider_id and isinstance(active_provider_id, str):
                provider_ids = {provider.get("id") for provider in (self._providers or [])}
                if active_provider_id in provider_ids:
                    old_active_id = getattr(self, "_active_provider_id", None)
                    if old_active_id != active_provider_id:
                        old_provider = next((p for p in self._providers if p.get("id") == old_active_id), None)
                        old_name = old_provider.get("name", old_active_id) if old_provider else (old_active_id or "系统默认")
                        new_provider = next((p for p in self._providers if p.get("id") == active_provider_id), None)
                        new_name = new_provider.get("name", active_provider_id) if new_provider else active_provider_id
                        self._notify_switch(old_name, new_name, "手动切换", is_manual=True)
                    self._active_provider_id = active_provider_id
                    self._manual_override = True
                    logger.info(f"前端手动切换活跃供应商为: {active_provider_id}（已锁定，禁止自动覆盖）")
                else:
                    logger.warning(
                        f"active_provider_id={active_provider_id} 不在当前供应商列表中，忽略"
                    )
            else:
                # 前端未指定 active_provider_id 时，清除手动锁定状态
                self._manual_override = False
            self._save_config()
            return schemas.Response(success=True, data=self.get_status().data)
        except Exception as err:
            logger.error(f"保存 Agent Tokens 配置失败: {err}")
            return schemas.Response(success=False, message=str(err))


    def list_models_api(self, payload: Optional[dict] = Body(default=None)) -> schemas.Response:
        """
        根据前端填写的供应商 API 配置拉取可用模型列表。
        严格校验：必须携带 API Key，返回 401/402/403 时判定为失败。
        """
        payload = payload or {}
        provider = self._normalize_provider(payload, 0)
        base_url = self._clean_text(provider.get("base_url")).rstrip("/")
        api_key = self._clean_text(provider.get("api_key"))
        if not base_url:
            return schemas.Response(success=False, message="请先填写 API 地址")
        if not api_key:
            return schemas.Response(success=False, message="请先填写 API Key")

        headers = {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}
        if provider.get("user_agent"):
            headers["User-Agent"] = provider.get("user_agent")
        try:
            response = requests.get(f"{base_url}/models", headers=headers, timeout=20)
            # 严格断言：任何 HTTP >= 400 一律判定失败
            if response.status_code >= 400:
                status_map = {
                    400: "400 Bad Request - 请求格式错误或接口不支持",
                    401: "401 Unauthorized - API Key 无效或已过期",
                    402: "402 Payment Required - 账户欠费或配额已用完",
                    403: "403 Forbidden - 无权限访问该接口",
                    404: "404 Not Found - /models 接口不存在",
                    429: "429 Too Many Requests - 请求频率超限",
                }
                msg = status_map.get(response.status_code, f"HTTP {response.status_code} - 服务器返回错误")
                try:
                    body = response.json()
                    if isinstance(body, dict) and body.get("error"):
                        err_obj = body["error"]
                        err_msg = err_obj.get("message", str(err_obj)) if isinstance(err_obj, dict) else str(err_obj)
                        msg = f"{msg}（{err_msg}）"
                except Exception:
                    pass
                return schemas.Response(success=False, message=msg)
            if response.status_code != 200:
                return schemas.Response(success=False, message=f"HTTP {response.status_code} - 异常状态码")
            data = response.json()
            # 检查响应体中的 error 字段
            if isinstance(data, dict) and data.get("error"):
                err_obj = data["error"]
                err_msg = err_obj.get("message", str(err_obj)) if isinstance(err_obj, dict) else str(err_obj)
                return schemas.Response(success=False, message=f"获取模型列表失败: {err_msg}")
            models = data.get("data", data) if isinstance(data, dict) else data
            model_ids = []
            if isinstance(models, list):
                for item in models:
                    if isinstance(item, dict):
                        model_id = self._clean_text(item.get("id") or item.get("name") or item.get("model"))
                    else:
                        model_id = self._clean_text(item)
                    if model_id and model_id not in model_ids:
                        model_ids.append(model_id)
            if not model_ids:
                return schemas.Response(success=False, message="获取模型列表失败：接口返回空列表")
            return schemas.Response(success=True, data={"models": model_ids})
        except requests.exceptions.ConnectionError as err:
            return schemas.Response(success=False, message=f"连接失败: 无法连接到服务器 ({err})")
        except requests.exceptions.Timeout:
            return schemas.Response(success=False, message="连接超时: 服务器无响应")
        except Exception as err:
            logger.warning(f"Agent Tokens 获取模型列表失败: {err}")
            return schemas.Response(success=False, message=f"获取模型列表失败：{err}")

    def reset_usage_api(self, payload: Optional[dict] = Body(default=None)) -> schemas.Response:
        """
        重置指定供应商的已记录用量。
        """
        payload = payload or {}
        provider_id = self._clean_text(payload.get("provider_id"))
        if not provider_id:
            return schemas.Response(success=False, message="缺少 provider_id")
        with self._usage_lock:
            usage = self._load_usage()
            usage.pop(provider_id, None)
            self._save_usage(usage)
        return schemas.Response(success=True, data=self.get_status().data)

    def reset_failures_api(self, payload: Optional[dict] = Body(default=None)) -> schemas.Response:
        """
        仅重置指定供应商的失败计数和最后错误，保留用量统计。
        """
        payload = payload or {}
        provider_id = self._clean_text(payload.get("provider_id"))
        if not provider_id:
            return schemas.Response(success=False, message="缺少 provider_id")
        with self._usage_lock:
            usage = self._load_usage()
            record = usage.get(provider_id)
            if record:
                record["failure_count"] = 0
                record["last_error"] = None
                self._save_usage(usage)
        return schemas.Response(success=True, data=self.get_status().data)

    def reset_all_usage_api(self) -> schemas.Response:
        """
        重置所有供应商的已记录用量。
        """
        with self._usage_lock:
            self._save_usage({})
        return schemas.Response(success=True, data=self.get_status().data)

    # ---- 厂商管理 API ----

    def _load_vendors(self) -> List[dict]:
        """
        读取已记录的厂商列表。
        """
        vendors = self.get_data(self.DATA_KEY_VENDORS) or []
        return vendors if isinstance(vendors, list) else []

    def _save_vendors(self, vendors: List[dict]) -> None:
        """
        保存厂商列表数据。
        """
        self.save_data(self.DATA_KEY_VENDORS, vendors or [])

    @staticmethod
    def _normalize_vendor(vendor: dict, index: int) -> dict:
        """
        标准化单个厂商配置。
        """
        vendor = vendor or {}
        vendor_id = AgentTokensPro._clean_text(vendor.get("id")) or uuid.uuid4().hex
        return {
            "id": vendor_id,
            "enabled": bool(vendor.get("enabled", True)),
            "name": AgentTokensPro._clean_text(vendor.get("name")) or f"厂商 {index + 1}",
            "url": AgentTokensPro._clean_text(vendor.get("url")),
            "sort_order": AgentTokensPro._to_int(vendor.get("sort_order"), index),
        }

    def get_vendors_api(self) -> schemas.Response:
        """
        获取厂商列表。
        """
        vendors = self._load_vendors()
        # 按 sort_order 排序
        vendors.sort(key=lambda v: AgentTokensPro._to_int(v.get("sort_order"), 0))
        return schemas.Response(success=True, data={"vendors": vendors})

    def save_vendor_api(self, payload: Optional[dict] = Body(default=None)) -> schemas.Response:
        """
        创建或更新单个厂商。
        """
        try:
            payload = payload or {}
            vendor_id = self._clean_text(payload.get("id"))
            vendors = self._load_vendors()

            # 标准化厂商数据
            index = 0
            for i, v in enumerate(vendors):
                if v.get("id") == vendor_id:
                    index = i
                    break
                index = i + 1

            normalized = self._normalize_vendor(payload, index)
            # 保持原有 sort_order（编辑时）
            if vendor_id:
                existing = next((v for v in vendors if v.get("id") == vendor_id), None)
                if existing:
                    normalized["sort_order"] = self._to_int(existing.get("sort_order"), index)

            # 更新或新增
            if vendor_id:
                found = False
                for i, v in enumerate(vendors):
                    if v.get("id") == vendor_id:
                        vendors[i] = normalized
                        found = True
                        break
                if not found:
                    vendors.append(normalized)
            else:
                normalized["sort_order"] = len(vendors)
                vendors.append(normalized)

            self._save_vendors(vendors)
            return schemas.Response(success=True, data={"vendors": vendors})
        except Exception as err:
            logger.error(f"Agent Tokens 保存厂商失败: {err}")
            return schemas.Response(success=False, message=str(err))

    def reorder_vendors_api(self, payload: Optional[dict] = Body(default=None)) -> schemas.Response:
        """
        厂商排序：接收排序后的厂商 ID 列表，更新 sort_order。
        """
        try:
            payload = payload or {}
            ordered_ids = payload.get("vendor_ids") or []
            if not isinstance(ordered_ids, list):
                return schemas.Response(success=False, message="参数错误：vendor_ids 必须为列表")

            vendors = self._load_vendors()
            # 按 ordered_ids 重新排序
            vendor_map = {v.get("id"): v for v in vendors}
            reordered = []
            for idx, vid in enumerate(ordered_ids):
                if vid in vendor_map:
                    vendor_map[vid]["sort_order"] = idx
                    reordered.append(vendor_map[vid])
            # 添加未在 ordered_ids 中的厂商（如果有）
            for v in vendors:
                if v.get("id") not in ordered_ids:
                    v["sort_order"] = len(reordered)
                    reordered.append(v)

            self._save_vendors(reordered)
            return schemas.Response(success=True, data={"vendors": reordered})
        except Exception as err:
            logger.error(f"Agent Tokens 厂商排序失败: {err}")
            return schemas.Response(success=False, message=str(err))

    def delete_vendor_api(self, payload: Optional[dict] = Body(default=None)) -> schemas.Response:
        """
        删除指定厂商。
        """
        try:
            payload = payload or {}
            vendor_id = self._clean_text(payload.get("id") or payload.get("vendor_id"))
            if not vendor_id:
                return schemas.Response(success=False, message="缺少厂商 ID")

            vendors = self._load_vendors()
            vendors = [v for v in vendors if v.get("id") != vendor_id]
            self._save_vendors(vendors)
            return schemas.Response(success=True, data={"vendors": vendors})
        except Exception as err:
            logger.error(f"Agent Tokens 删除厂商失败: {err}")
            return schemas.Response(success=False, message=str(err))

    # ---- 供应商切换通知防轰炸 ----

    def _notify_switch(self, old_name: str, new_name: str, reason: str, is_manual: bool = False):
        """
        仅当真正切换到新供应商、且距上次通知超过 60 秒时才发送系统通知，防止通知轰炸。
        """
        import time
        COOLDOWN_SECONDS = 60
        now = time.monotonic()
        if self._last_notified_provider_id == (new_name or old_name) and (now - self._last_switch_notify_time) < COOLDOWN_SECONDS:
            return
        self._last_switch_notify_time = now
        self._last_notified_provider_id = new_name or old_name
        if is_manual:
            title = "【AgentTokens】手动切换供应商"
            text = f"供应商 [{old_name}] → [{new_name}]（{reason}）"
        else:
            title = "【AgentTokens】自动切换供应商"
            text = f"供应商 [{old_name}] 不可用（{reason}），已自动切换到 [{new_name}]"
        self.post_message(
            mtype=schemas.NotificationType.Plugin,
            title=title,
            text=text,
        )

    @staticmethod
    def _extract_error_detail(resp) -> str:
        """从 HTTP 响应中提取错误详情文本。"""
        try:
            body = resp.json()
            if isinstance(body, dict) and body.get("error"):
                err_obj = body["error"]
                return err_obj.get("message", str(err_obj)) if isinstance(err_obj, dict) else str(err_obj)
        except Exception:
            if resp.text:
                return resp.text[:300]
        return ""

    @staticmethod
    def _status_brief(status_code: int) -> str:
        """HTTP 状态码 → 简短描述。"""
        status_map = {
            400: "400 Bad Request",
            401: "401 Unauthorized",
            402: "402 Payment Required",
            403: "403 Forbidden",
            404: "404 Not Found",
            422: "422 Unprocessable Entity",
            429: "429 Too Many Requests",
            500: "500 Internal Server Error",
            502: "502 Bad Gateway",
            503: "503 Service Unavailable",
        }
        return status_map.get(status_code, f"HTTP {status_code}")

    def _mark_provider_faulty(self, provider_id: str, error_message: str, hard_failure: bool = False) -> None:
        """
        将指定供应商标记为故障。

        - hard_failure=False（默认）：递增 failure_count，记录 last_error。
        - hard_failure=True：直接将 failure_count 设为 max_failures 阈值，
          使该供应商立即被跳过。用于测试连通性返回 HTTP >= 400 等硬故障场景。
        """
        if not provider_id:
            return
        with self._usage_lock:
            usage = self._load_usage()
            record = usage.get(provider_id, {})
            max_failures = getattr(self, "_max_failures", self.DEFAULT_MAX_FAILURES)
            if hard_failure:
                record["failure_count"] = max_failures
                logger.warning(
                    f"Agent Tokens 供应商 [{provider_id}] 硬故障，"
                    f"failure_count 直接设为 {max_failures}：{error_message[:200] if error_message else ''}"
                )
            else:
                record["failure_count"] = record.get("failure_count", 0) + 1
            record["last_error"] = error_message[:500] if error_message else None
            usage[provider_id] = record
            self._save_usage(usage)

    def _kick_active_provider_if_faulty(self, provider_id: str) -> None:
        """
        如果指定供应商是当前活跃供应商，将其从活跃状态中踢出。
        清除手动锁定，触发下次 select_llm_provider 时自动选择新供应商。
        """
        if not provider_id:
            return
        current_active_id = getattr(self, "_active_provider_id", None)
        if current_active_id != provider_id:
            return

        old_provider = next((p for p in getattr(self, "_providers", []) if p.get("id") == provider_id), None)
        old_name = old_provider.get("name", provider_id) if old_provider else provider_id

        # 清除活跃状态和手动锁定
        self._active_provider_id = None
        self._manual_override = False
        logger.warning(
            f"Agent Tokens 活跃供应商 [{old_name}] 被踢出（测试连通性硬故障）"
        )

        # 尝试立即选择新供应商
        new_provider = self._select_provider()
        if new_provider:
            self._active_provider_id = new_provider.get("id")
            new_name = new_provider.get("name", new_provider.get("id"))
            logger.info(f"Agent Tokens 自动切换到新供应商 [{new_name}]")
            self._notify_switch(old_name, new_name, "测试连通性失败，活跃供应商被踢出")
        else:
            logger.warning("Agent Tokens 没有其他可用供应商，活跃状态已清空")
            self._notify_switch(old_name, None, "测试连通性失败，无其他可用供应商")

    def test_connection_api(self, payload: Optional[dict] = Body(default=None)) -> schemas.Response:
        """
        测试连通性：两阶段严格校验。

        阶段 1 — GET /models：验证 API Key 有效性及接口可达性。
        阶段 2 — POST /chat/completions（stream=true）：发送最小化流式请求，
                 验证供应商对 stream 模式的兼容性。

        仅当两阶段均 HTTP 200 且响应 Body 无 error 字段时才判定为成功。
        任何 HTTP >= 400 或异常均判定为失败，失败原因透传前端。

        若 payload 中包含 provider_id，测试失败时递增该供应商的 failure_count，
        测试成功时重置 failure_count 为 0。
        前端通过 loadStatus() 刷新状态，response 不携带 data 字段以避免 unwrapResponse 误解包。
        """
        import time as _time
        _t0 = _time.monotonic()
        payload = payload or {}
        base_url = self._clean_text(payload.get("base_url")).rstrip("/")
        api_key = self._clean_text(payload.get("api_key"))
        model = self._clean_text(payload.get("model"))
        provider_id = self._clean_text(payload.get("provider_id"))

        logger.debug(
            f"AgentTokens test_connection_api START | provider_id={provider_id} "
            f"base_url={base_url} model={model} api_key={'***' + api_key[-4:] if api_key else 'N/A'}"
        )

        # 输入校验失败不标记故障（属于配置缺失，非连通性问题）
        if not api_key:
            return schemas.Response(success=False, message="缺少 API Key")
        if not base_url:
            return schemas.Response(success=False, message="缺少 API 地址")
        if not model:
            return schemas.Response(success=False, message="缺少模型名称，无法执行对话测试")

        def _fail(msg: str, hard: bool = True) -> schemas.Response:
            """
            标记供应商标记为故障并返回失败响应。
            hard=True 时直接将 failure_count 设为 max_failures（硬故障，立即跳过）。
            若该供应商是当前活跃节点，踢出并触发切换。
            """
            logger.warning(f"AgentTokens test_connection_api FAIL | provider_id={provider_id} msg={msg}")
            if provider_id:
                self._mark_provider_faulty(provider_id, msg, hard_failure=hard)
                # 如果故障供应商是当前活跃节点，踢出并触发切换
                self._kick_active_provider_if_faulty(provider_id)
            # 不携带 data 字段：unwrapResponse 在 data 非空时会返回 data 而非根对象，
            # 导致前端读不到 success/message 字段。前端通过 loadStatus() 刷新状态。
            return schemas.Response(success=False, message=msg)

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if payload.get("user_agent"):
            headers["User-Agent"] = payload["user_agent"]

        # ── 阶段 1：GET /models 探测 ──────────────────────────────
        _t1 = _time.monotonic()
        try:
            resp = requests.get(f"{base_url}/models", headers=headers, timeout=15)
        except requests.exceptions.ConnectionError as err:
            return _fail(f"连接失败: 无法连接到服务器 ({err})")
        except requests.exceptions.Timeout:
            return _fail("连接超时: 服务器无响应")
        except Exception as err:
            return _fail(f"连接失败: {err}")

        logger.debug(
            f"AgentTokens test_connection_api STAGE1 | status={resp.status_code} "
            f"elapsed={_time.monotonic() - _t1:.2f}s"
        )

        if resp.status_code >= 400:
            brief = self._status_brief(resp.status_code)
            detail = self._extract_error_detail(resp)
            msg = f"鉴权失败: {brief}"
            if detail:
                msg += f"（{detail}）"
            return _fail(msg)

        if resp.status_code != 200:
            return _fail(f"鉴权失败: {self._status_brief(resp.status_code)} - 异常状态码")

        # 校验 /models 返回内容
        try:
            data = resp.json()
        except Exception:
            return _fail("连接失败: /models 返回非 JSON 响应")

        if isinstance(data, dict) and data.get("error"):
            err_msg = self._extract_error_detail(resp)
            return _fail(f"鉴权失败: 服务器返回错误 - {err_msg}")

        # ── 阶段 2：POST /chat/completions 模拟真实对话 ────────────
        # 构造最小化 Payload，仅包含必要参数，避免 OneAPI/NewAPI 等代理网关
        # 因不支持 stream_options 等高级参数而返回 500 错误。
        chat_payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": "1"},
            ],
            "stream": True,
        }

        _t2 = _time.monotonic()
        try:
            with requests.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=chat_payload,
                timeout=10,
                stream=True,
            ) as chat_resp:
                logger.debug(
                    f"AgentTokens test_connection_api STAGE2 | status={chat_resp.status_code} "
                    f"elapsed={_time.monotonic() - _t2:.2f}s"
                )
                # 状态码优先判断
                if chat_resp.status_code >= 400:
                    brief = self._status_brief(chat_resp.status_code)
                    detail = self._extract_error_detail(chat_resp)
                    msg = f"对话测试失败: {brief}"
                    if detail:
                        msg += f"（{detail}）"
                    return _fail(msg)

                if chat_resp.status_code != 200:
                    return _fail(f"对话测试失败: {self._status_brief(chat_resp.status_code)} - 异常状态码")

                # 流式响应：高容错读取前若干 chunk，验证连接通畅
                # 使用 iter_content 替代 iter_lines，避免无尾 \n 时阻塞挂起
                raw_snippet = ""  # 收集原始内容用于异常诊断日志
                stream_error_msg = ""
                _t3 = _time.monotonic()

                try:
                    _chunk_count = 0
                    _line_buf = ""
                    _done = False

                    for raw_chunk in chat_resp.iter_content(chunk_size=512, decode_unicode=False):
                        if _chunk_count >= 5:
                            break
                        _chunk_count += 1

                        # 手动 decode，避免 decode_unicode=True 在非 UTF-8 内容上抛 UnicodeDecodeError
                        if isinstance(raw_chunk, bytes):
                            _line_buf += raw_chunk.decode("utf-8", errors="replace")
                        elif raw_chunk:
                            _line_buf += str(raw_chunk)

                        # 按行处理缓冲区
                        while "\n" in _line_buf:
                            line, _line_buf = _line_buf.split("\n", 1)
                            line = line.strip()
                            if not line:
                                continue

                            if len(raw_snippet) < 500:
                                raw_snippet += line + "\n"

                            # SSE 心跳/注释行（以 : 开头），跳过
                            if line.startswith(":"):
                                continue

                            # 检查是否包含 error 字段
                            if '"error"' in line:
                                try:
                                    import json as _json
                                    json_str = line[5:].strip() if line.startswith("data:") else line
                                    chunk_data = _json.loads(json_str)
                                    if isinstance(chunk_data, dict) and chunk_data.get("error"):
                                        err_obj = chunk_data["error"]
                                        stream_error_msg = (
                                            err_obj.get("message", str(err_obj))
                                            if isinstance(err_obj, dict)
                                            else str(err_obj)
                                        )
                                except Exception:
                                    pass
                                if stream_error_msg:
                                    _done = True
                                    break

                            # 读到 data: 行或任何非空非心跳内容 → 连接通畅
                            _done = True
                            break

                        if _done:
                            break

                    # 处理缓冲区中剩余的不完整行
                    if not _done and _line_buf.strip():
                        line = _line_buf.strip()
                        if len(raw_snippet) < 500:
                            raw_snippet += line + "\n"
                        if not line.startswith(":") and '"error"' not in line:
                            _done = True  # 有内容即视为成功

                    logger.debug(
                        f"AgentTokens test_connection_api STREAM DONE | chunks={_chunk_count} "
                        f"done={_done} error={stream_error_msg or 'none'} "
                        f"elapsed={_time.monotonic() - _t3:.2f}s"
                    )

                    if stream_error_msg:
                        return _fail(f"对话测试失败: 服务器返回错误 - {stream_error_msg}")

                    # 兜底逻辑：HTTP 200 且无异常 → 视为测试成功
                    # 即使未读到标准 data: 行（空流、非标 SSE、普通 HTTP 返回），
                    # 只要连接正常建立且无网络异常，判定成功

                except requests.exceptions.ChunkedEncodingError as err:
                    logger.warning(
                        f"Agent Tokens 测试连接流读取异常 (ChunkedEncodingError): {err}"
                    )
                    if raw_snippet:
                        logger.debug(
                            f"Agent Tokens 流式响应原始内容（前500字节）:\n{raw_snippet[:500]}"
                        )
                    return _fail(f"响应解析异常: 流式传输中断 - {err}")
                except Exception as err:
                    logger.warning(
                        f"Agent Tokens 测试连接流读取异常 ({type(err).__name__}): {err}"
                    )
                    if raw_snippet:
                        logger.debug(
                            f"Agent Tokens 流式响应原始内容（前500字节）:\n{raw_snippet[:500]}"
                        )
                    return _fail(f"响应解析异常: {type(err).__name__}: {err}")

        except requests.exceptions.ConnectionError as err:
            return _fail(f"网络连接失败: 无法连接到服务器 ({err})")
        except requests.exceptions.Timeout:
            return _fail("网络连接超时")
        except Exception as err:
            return _fail(f"对话测试失败: {err}")

        # 测试成功：重置故障计数
        if provider_id:
            with self._usage_lock:
                usage = self._load_usage()
                record = usage.get(provider_id, {})
                if record.get("failure_count", 0) > 0:
                    logger.debug(f"Agent Tokens 供应商 [{provider_id}] 测试连接成功，重置失败计数")
                    record["failure_count"] = 0
                    record["last_error"] = None
                    usage[provider_id] = record
                    self._save_usage(usage)

        logger.debug(
            f"AgentTokens test_connection_api SUCCESS | provider_id={provider_id} "
            f"total_elapsed={_time.monotonic() - _t0:.2f}s"
        )
        return schemas.Response(
            success=True,
            message="连接成功（鉴权通过 + 对话测试通过）",
        )

    def _is_provider_available(self, provider: dict) -> bool:
        """
        检查供应商是否可用（启用、有配置、未耗尽、未超过失败阈值）。
        """
        if not provider:
            return False
        if not provider.get("enabled"):
            return False
        if not provider.get("api_key") or not provider.get("model") or not provider.get("base_url"):
            return False
        usage = self._load_usage()
        provider_usage = self._provider_usage(provider, usage)
        if provider_usage["exhausted"]:
            return False
        max_failures = getattr(self, "_max_failures", self.DEFAULT_MAX_FAILURES)
        if provider_usage.get("failure_count", 0) >= max_failures:
            return False
        return True

    @eventmanager.register(ChainEventType.AgentLLMProvider, priority=50)
    def select_llm_provider(self, event: Event):
        """
        响应 Agent LLM 供应商链式事件，写入当前可用供应商配置。
        
        手动锁定模式下，仅当手动选择的供应商不可用时才触发自动切换。
        """
        if not self.get_state() or not event or not event.event_data:
            return
        if self._event_get(event.event_data, "selected_provider_id"):
            return

        # 显式初始化，确保所有分支下条件判断都能正常进行
        old_name = None
        old_active_id = None

        # 手动锁定模式：检查手动选择的供应商是否仍然可用
        manual_override = getattr(self, "_manual_override", False)
        current_active_id = getattr(self, "_active_provider_id", None)
        logger.debug(
            f"[AgentTokens.select_llm_provider] "
            f"_manual_override={manual_override}, _active_provider_id={current_active_id}"
        )

        if manual_override and current_active_id:
            # 查找手动选择的供应商
            manual_provider = None
            for provider in getattr(self, "_providers", []):
                if provider.get("id") == current_active_id:
                    manual_provider = provider
                    break

            if manual_provider and self._is_provider_available(manual_provider):
                # 手动选择的供应商仍可用，继续使用
                provider_name = manual_provider.get("name")
                model = manual_provider.get("model")
                logger.debug(f"Agent Tokens 手动锁定模式：继续使用 [{provider_name}] 模型：[{model}]")

                self._event_set(event.event_data, "provider", manual_provider.get("provider") or "openai")
                self._event_set(event.event_data, "base_url", manual_provider.get("base_url"))
                self._event_set(event.event_data, "api_key", manual_provider.get("api_key"))
                self._event_set(event.event_data, "user_agent", manual_provider.get("user_agent"))
                self._event_set(event.event_data, "use_proxy", bool(manual_provider.get("use_proxy", True)))
                self._event_set(event.event_data, "model", manual_provider.get("model"))
                self._event_set(event.event_data, "base_url_preset", None)
                self._event_set(event.event_data, "selected_provider_id", manual_provider.get("id"))
                self._event_set(event.event_data, "selected_provider_name", manual_provider.get("name"))
                self._event_set(event.event_data, "source", self.__class__.__name__)
                # 立即更新时间戳，提前展示"正在使用"
                with self._usage_lock:
                    usage = self._load_usage()
                    provider_id = manual_provider.get("id")
                    if provider_id:
                        entry = usage.get(provider_id, {})
                        entry["last_used_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        usage[provider_id] = entry
                        self._save_usage(usage)
                return
            else:
                # 手动选择的供应商不可用，降级到自动选择
                logger.warning(
                    f"Agent Tokens 手动选择的供应商 [{current_active_id}] 不可用，"
                    f"降级到自动选择模式"
                )
                old_name = manual_provider.get("name", current_active_id) if manual_provider else current_active_id
                # 临时清除手动锁，让 _select_provider 正常工作
                self._manual_override = False

        # 自动选择模式
        provider = self._select_provider()
        if not provider:
            logger.debug("Agent Tokens 没有可用供应商，Agent 将使用系统 LLM 配置")
            self._active_provider_id = None
            return

        provider_name = provider.get("name")
        model = provider.get("model")
        old_active_id = self._active_provider_id
        self._active_provider_id = provider.get("id")
        logger.debug(f"Agent Tokens 分配 LLM 供应商：[{provider_name}] 模型：[{model}]")

        # 立即更新时间戳，提前展示"正在使用"
        with self._usage_lock:
            usage = self._load_usage()
            pid = provider.get("id")
            if pid:
                entry = usage.get(pid, {})
                entry["last_used_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                usage[pid] = entry
                self._save_usage(usage)

        # 自动切换通知（仅当供应商实际变化且冷却期已过）
        if old_name and old_active_id != self._active_provider_id:
            self._notify_switch(old_name, provider_name, "手动锁供应商不可用，已降级")
        elif old_active_id and old_active_id != self._active_provider_id and not getattr(self, "_manual_override", False):
            old_provider = next((p for p in self._providers if p.get("id") == old_active_id), None)
            self._notify_switch(old_provider.get("name", old_active_id) if old_provider else old_active_id, provider_name, "供应商连续失败，已自动跳过")

        self._event_set(event.event_data, "provider", provider.get("provider") or "openai")
        self._event_set(event.event_data, "base_url", provider.get("base_url"))
        self._event_set(event.event_data, "api_key", provider.get("api_key"))
        self._event_set(event.event_data, "user_agent", provider.get("user_agent"))
        self._event_set(event.event_data, "use_proxy", bool(provider.get("use_proxy", True)))
        self._event_set(event.event_data, "model", provider.get("model"))
        self._event_set(event.event_data, "base_url_preset", None)
        self._event_set(event.event_data, "selected_provider_id", provider.get("id"))
        self._event_set(event.event_data, "selected_provider_name", provider.get("name"))
        self._event_set(event.event_data, "source", self.__class__.__name__)

    @eventmanager.register(EventType.AgentTokensUsage)
    def record_tokens_usage(self, event: Event):
        """
        响应 Agent Tokens 用量广播事件，累计记录到对应供应商。
        """
        if not self.get_state() or not event or not event.event_data:
            return

        provider_id = self._clean_text(
            self._event_get(event.event_data, "selected_provider_id")
        )
        if not provider_id:
            return

        input_tokens = max(self._to_int(self._event_get(event.event_data, "input_tokens"), 0), 0)
        output_tokens = max(self._to_int(self._event_get(event.event_data, "output_tokens"), 0), 0)
        total_tokens = max(self._to_int(self._event_get(event.event_data, "total_tokens"), 0), 0)
        if total_tokens <= 0:
            total_tokens = input_tokens + output_tokens

        with self._usage_lock:
            usage = self._load_usage()
            record = usage.setdefault(provider_id, {})
            record["input_tokens"] = self._to_int(record.get("input_tokens"), 0) + input_tokens
            record["output_tokens"] = self._to_int(record.get("output_tokens"), 0) + output_tokens
            record["total_tokens"] = self._to_int(record.get("total_tokens"), 0) + total_tokens
            record["model_call_count"] = self._to_int(
                record.get("model_call_count"), 0
            ) + max(self._to_int(self._event_get(event.event_data, "model_call_count"), 0), 0)
            record["runs"] = self._to_int(record.get("runs"), 0) + 1
            provider_name = self._clean_text(self._event_get(event.event_data, "selected_provider_name")) or provider_id
            max_failures = getattr(self, "_max_failures", self.DEFAULT_MAX_FAILURES)
            if bool(self._event_get(event.event_data, "success", False)):
                record["success_count"] = self._to_int(record.get("success_count"), 0) + 1
                record["last_error"] = None
                # 成功调用后清零失败计数，允许该供应商重新被选中
                if record.get("failure_count", 0) > 0:
                    logger.debug(f"Agent Tokens 供应商 [{provider_name}] 调用成功，重置失败计数")
                    record["failure_count"] = 0
            else:
                error_text = self._clean_text(self._event_get(event.event_data, "error"))
                record["last_error"] = error_text
                # 区分致命错误（不可恢复）与临时性错误（可重试）
                error_lower = error_text.lower() if error_text else ""
                is_fatal = False
                for fatal_code in ["401", "402", "403"]:
                    if fatal_code in error_lower:
                        is_fatal = True
                        break
                if is_fatal:
                    # 致命错误：直接将 failure_count 设为最大阈值，立即跳过
                    record["failure_count"] = max_failures
                    logger.warning(
                        f"Agent Tokens 供应商 [{provider_name}] 致命错误（{error_text}），"
                        f"直接标记为故障跳过"
                    )
                else:
                    # 临时性错误（429 限流、504 超时、网络异常等）：正常计数
                    record["failure_count"] = self._to_int(record.get("failure_count"), 0) + 1
            record["last_model"] = self._clean_text(self._event_get(event.event_data, "model"))
            record["last_used_at"] = (
                self._clean_text(self._event_get(event.event_data, "finished_at"))
                or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            )
            usage[provider_id] = record
            
            logger.debug(f"Agent Tokens 更新用量记录：供应商 [{provider_name}] 本次消耗了 {total_tokens} Tokens")
            
            self._save_usage(usage)

    @eventmanager.register(EventType.PluginReload)
    def reload(self, event: Event):
        """
        插件重载后重新注册动态 API。
        """
        if event.event_data.get("plugin_id") == self.__class__.__name__:
            register_plugin_api(plugin_id=self.__class__.__name__)
