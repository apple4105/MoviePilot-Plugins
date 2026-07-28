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
    plugin_version = "0.0.2"
    plugin_author = "apple4105"
    author_url = "https://github.com/apple4105"
    plugin_config_prefix = "agenttokenspro_"
    plugin_order = 45
    auth_level = 1

    DATA_KEY_USAGE = "usage"

    # 失败自动切换：连续失败次数达到阈值后跳过该供应商。
    DEFAULT_MAX_FAILURES = 3

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
        available_rows = [
            row for row in enabled_rows
            if not row["usage"].get("exhausted")
            and row.get("api_key")
            and row.get("model")
            and row.get("base_url")
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
            new_providers = self._normalize_providers(config.get("providers") or [])
            # 安全校验：如果前端提交空供应商但当前已有配置，拒绝并提示
            existing_providers = list(getattr(self, "_providers", []))
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
            response.raise_for_status()
            data = response.json()
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
            return schemas.Response(success=True, data={"models": model_ids})
        except Exception as err:
            logger.warning(f"Agent Tokens 获取模型列表失败: {err}")
            return schemas.Response(success=False, message=f"未获取到模型：{err}")

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

    def reset_all_usage_api(self) -> schemas.Response:
        """
        重置所有供应商的已记录用量。
        """
        with self._usage_lock:
            self._save_usage({})
        return schemas.Response(success=True, data=self.get_status().data)

    # ---- 供应商切换通知防轰炸 ----

    def _notify_switch(self, old_name: str, new_name: str, reason: str):
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
        title = "【AgentTokens】自动切换供应商"
        text = f"供应商 [{old_name}] 不可用（{reason}），已自动切换到 [{new_name}]"
        self.post_message(
            mtype=schemas.NotificationType.Plugin,
            title=title,
            text=text,
        )

    def test_connection_api(self, payload: Optional[dict] = Body(default=None)) -> schemas.Response:
        """
        测试供应商连接：先用轻量 GET /models 探测，失败时回退到最小 chat 请求。
        仅 401/403/网络错误视为失败；HTTP 200 或有效 JSON 视为成功。
        """
        payload = payload or {}
        base_url = self._clean_text(payload.get("base_url")).rstrip("/")
        api_key = self._clean_text(payload.get("api_key"))
        model = self._clean_text(payload.get("model"))
        if not api_key:
            return schemas.Response(success=False, message="缺少 API Key")
        if not base_url:
            return schemas.Response(success=False, message="缺少 API 地址")

        headers = {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}
        if payload.get("user_agent"):
            headers["User-Agent"] = payload["user_agent"]

        # 阶段 1：轻量 GET /models 探测（无需模型名）
        probe_error = None
        try:
            resp = requests.get(f"{base_url}/models", headers=headers, timeout=15)
            if resp.status_code in (200, 201):
                return schemas.Response(success=True, message="连接成功（/models 可达）")
            if resp.status_code in (401, 403):
                return schemas.Response(
                    success=False,
                    message=f"{resp.status_code} {'Unauthorized' if resp.status_code == 401 else 'Forbidden'} - API Key 无效或已过期",
                )
            # 其他状态码记录但不立即失败，继续尝试 chat
            probe_error = f"/models 返回 {resp.status_code}"
        except requests.exceptions.ConnectionError as err:
            return schemas.Response(success=False, message=f"连接失败: 无法连接到服务器 ({err})")
        except requests.exceptions.Timeout:
            return schemas.Response(success=False, message="连接超时: 服务器无响应")
        except Exception as err:
            probe_error = str(err)

        # 阶段 2：回退到最小 chat 请求（需要模型名）
        if not model:
            return schemas.Response(
                success=False,
                message=f"连接失败: {probe_error or '未知错误'}（未提供模型名，无法进一步测试）",
            )
        try:
            from openai import OpenAI, AuthenticationError, NotFoundError, RateLimitError, APIStatusError, APITimeoutError, APIConnectionError
            client = OpenAI(api_key=api_key, base_url=base_url, timeout=30)
            resp = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "hi"}],
                max_tokens=1,
            )
            if resp and resp.choices:
                usage = resp.usage
                prompt_tokens = getattr(usage, "prompt_tokens", 0) if usage else 0
                completion_tokens = getattr(usage, "completion_tokens", 0) if usage else 0
                return schemas.Response(
                    success=True,
                    message=f"连接成功，消耗 {prompt_tokens}+{completion_tokens} tokens",
                )
            return schemas.Response(success=False, message="未收到有效响应")
        except AuthenticationError as err:
            status = getattr(err, 'status_code', 401)
            detail = getattr(err, 'message', str(err)) or str(err)
            return schemas.Response(success=False, message=f"{status} Unauthorized - {detail}")
        except NotFoundError as err:
            status = getattr(err, 'status_code', 404)
            detail = getattr(err, 'message', str(err)) or str(err)
            return schemas.Response(success=False, message=f"{status} Not Found - {detail}")
        except RateLimitError as err:
            status = getattr(err, 'status_code', 429)
            detail = getattr(err, 'message', str(err)) or str(err)
            return schemas.Response(success=False, message=f"{status} Too Many Requests - {detail}")
        except APITimeoutError as err:
            return schemas.Response(success=False, message=f"Timeout - {err}")
        except APIConnectionError as err:
            return schemas.Response(success=False, message=f"Connection Error - {err}")
        except APIStatusError as err:
            status = getattr(err, 'status_code', 'unknown')
            detail = getattr(err, 'message', str(err)) or str(err)
            return schemas.Response(success=False, message=f"{status} Error - {detail}")
        except Exception as err:
            return schemas.Response(success=False, message=f"连接失败: {err}")

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

        # 手动锁定模式：检查手动选择的供应商是否仍然可用
        manual_override = getattr(self, "_manual_override", False)
        current_active_id = getattr(self, "_active_provider_id", None)
        logger.info(
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
                logger.info(f"Agent Tokens 手动锁定模式：继续使用 [{provider_name}] 模型：[{model}]")

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
            logger.info("Agent Tokens 没有可用供应商，Agent 将使用系统 LLM 配置")
            self._active_provider_id = None
            return

        provider_name = provider.get("name")
        model = provider.get("model")
        old_active_id = self._active_provider_id
        self._active_provider_id = provider.get("id")
        logger.info(f"Agent Tokens 分配 LLM 供应商：[{provider_name}] 模型：[{model}]")

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
                    logger.info(f"Agent Tokens 供应商 [{provider_name}] 调用成功，重置失败计数")
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
            
            logger.info(f"Agent Tokens 更新用量记录：供应商 [{provider_name}] 本次消耗了 {total_tokens} Tokens")
            
            self._save_usage(usage)

    @eventmanager.register(EventType.PluginReload)
    def reload(self, event: Event):
        """
        插件重载后重新注册动态 API。
        """
        if event.event_data.get("plugin_id") == self.__class__.__name__:
            register_plugin_api(plugin_id=self.__class__.__name__)
