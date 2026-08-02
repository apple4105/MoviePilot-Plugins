"""自定义音频 Provider 插件。

注册一个名为 "custom" 的音频 provider，所有配置（API Key、Base URL、模型等）
在插件表单内完成，不依赖系统设置中的音频参数。

启用后自动将系统音频输入/输出 provider 切换为 custom，
关闭后自动恢复为原始 provider。

STT: multipart POST（OpenAI Whisper 兼容格式）
TTS: JSON POST（OpenAI TTS 兼容格式），响应为二进制音频
"""

import wave
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from fastapi import Request

from app.agent.llm.capability import AudioCapabilityProvider, AgentCapabilityManager
from app.core.config import settings
from app.log import logger
from app.plugins import _PluginBase
from app.utils.http import RequestUtils


class CustomAudioProvider(AudioCapabilityProvider):
    """自定义音频 provider，配置由插件管理。"""

    name = "custom"

    # 类级配置，由 CustomAudio 插件更新
    _config: dict = {
        "input_api_key": None,
        "input_base_url": None,
        "input_model": None,
        "input_language": "zh",
        "output_api_key": None,
        "output_base_url": None,
        "output_model": None,
        "output_voice": "",
    }

    @classmethod
    def update_config(cls, config: dict):
        """由插件调用，更新 provider 运行时配置。"""
        cls._config.update(config)

    @staticmethod
    def _input_credentials() -> tuple[Optional[str], Optional[str]]:
        cfg = CustomAudioProvider._config
        return cfg.get("input_api_key"), cfg.get("input_base_url")

    @staticmethod
    def _output_credentials() -> tuple[Optional[str], Optional[str]]:
        cfg = CustomAudioProvider._config
        return cfg.get("output_api_key"), cfg.get("output_base_url")

    @staticmethod
    def _guess_mime_type(filename: str) -> str:
        suffix = Path(filename or "").suffix.lower()
        mime_map = {
            ".flac": "audio/flac",
            ".m4a": "audio/mp4",
            ".mp3": "audio/mpeg",
            ".ogg": "audio/ogg",
            ".opus": "audio/ogg",
            ".wav": "audio/wav",
        }
        return mime_map.get(suffix, "audio/ogg")

    def is_available_for_audio_input(self) -> bool:
        api_key, base_url = self._input_credentials()
        return bool(api_key and base_url)

    def is_available_for_audio_output(self) -> bool:
        api_key, base_url = self._output_credentials()
        return bool(api_key and base_url)

    def transcribe_audio(self, content: bytes, filename: str = "input.ogg") -> Optional[str]:
        if not content:
            return None
        if len(content) > self.MAX_TRANSCRIBE_BYTES:
            raise ValueError("语音文件超过 10MB，无法识别")

        try:
            api_key, base_url = self._input_credentials()
            if not api_key:
                raise ValueError("音频输入未配置 API Key")
            if not base_url:
                raise ValueError("音频输入未配置 Base URL")

            audio_file = BytesIO(content)
            audio_file.name = filename

            response = RequestUtils(
                headers={"Authorization": f"Bearer {api_key}"},
                proxies=settings.PROXY or {},
                timeout=120,
            ).post_res(
                url=base_url,
                files={"file": (filename, audio_file, self._guess_mime_type(filename))},
                data={
                    "model": CustomAudioProvider._config.get("input_model") or "",
                    "language": CustomAudioProvider._config.get("input_language") or "zh",
                    "response_format": "json",
                },
            )
            if not response:
                raise ValueError("请求无响应")
            if response.status_code >= 400:
                raise ValueError(f"HTTP {response.status_code}: {response.text[:500]}")

            result = response.json()
            text = result.get("text", "")
            if not text:
                logger.error(f"音频转写返回空文本: provider={self.name}, status={response.status_code}")
            return text.strip() if text else None
        except Exception as err:
            logger.error(f"音频输入转写失败: provider={self.name}, error={err}")
            return None

    def synthesize_speech(self, text: str) -> Optional[Path]:
        if not text:
            return None

        try:
            api_key, base_url = self._output_credentials()
            if not api_key:
                raise ValueError("音频输出未配置 API Key")
            if not base_url:
                raise ValueError("音频输出未配置 Base URL")

            response = RequestUtils(
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                proxies=settings.PROXY or {},
                timeout=60,
            ).post_res(
                url=base_url,
                json={
                    "model": CustomAudioProvider._config.get("output_model") or "",
                    "voice": CustomAudioProvider._config.get("output_voice") or "",
                    "input": text,
                    "response_format": "opus",
                },
            )
            if not response:
                raise ValueError("请求无响应")
            if response.status_code >= 400:
                raise ValueError(f"HTTP {response.status_code}: {response.text[:500]}")

            voice_dir = settings.TEMP_PATH / "voice"
            voice_dir.mkdir(parents=True, exist_ok=True)
            output_path = voice_dir / f"{uuid4().hex}.opus"
            output_path.write_bytes(response.content)
            return output_path
        except Exception as err:
            logger.error(f"音频输出合成失败: provider={self.name}, error={err}")
            return None


class CustomAudio(_PluginBase):
    """注册自定义音频 provider 的插件，配置自包含。"""

    plugin_name = "自定义音频 Provider"
    plugin_desc = "注册 custom 音频 provider，所有配置在插件内完成，不依赖系统音频设置"
    plugin_version = "1.3"
    plugin_author = "apple4105"
    author_url = "https://github.com/apple4105"
    plugin_order = 100

    _enabled = False
    _enabled_input = False
    _enabled_output = False
    _prev_input_provider = None
    _prev_output_provider = None

    @property
    def service_info(self):
        return {
            "input_enabled": self._enabled_input,
            "output_enabled": self._enabled_output,
            "input_base_url": CustomAudioProvider._config.get("input_base_url") or "",
            "output_base_url": CustomAudioProvider._config.get("output_base_url") or "",
            "input_model": CustomAudioProvider._config.get("input_model") or "",
            "output_model": CustomAudioProvider._config.get("output_model") or "",
        }

    def init_plugin(self, config: dict = None):
        # 注册 provider（始终注册，可用性由 is_available_* 判断）
        try:
            AgentCapabilityManager.register_audio_provider(CustomAudioProvider())
            logger.info("CustomAudioProvider 已注册到 AgentCapabilityManager")
        except Exception as err:
            logger.error(f"注册 CustomAudioProvider 失败: {err}")

        if not config:
            return

        self._enabled_input = bool(config.get("enabled_input", False))
        self._enabled_output = bool(config.get("enabled_output", False))
        # 读取总开关，默认 True；子开关任一开启则强制启用
        self._enabled = bool(config.get("enabled", True))
        if self._enabled_input or self._enabled_output:
            self._enabled = True

        # 更新 provider 运行时配置
        provider_config = {
            "input_api_key": config.get("input_api_key"),
            "input_base_url": config.get("input_base_url"),
            "input_model": config.get("input_model"),
            "input_language": config.get("input_language") or "zh",
            "output_api_key": config.get("output_api_key"),
            "output_base_url": config.get("output_base_url"),
            "output_model": config.get("output_model"),
            "output_voice": config.get("output_voice") or "",
        }
        CustomAudioProvider.update_config(provider_config)

        # 输入开关：切换/恢复系统 provider + 总开关
        if self._enabled_input:
            if settings.AUDIO_INPUT_PROVIDER != "custom":
                self._prev_input_provider = settings.AUDIO_INPUT_PROVIDER
                settings.update_setting("AUDIO_INPUT_PROVIDER", "custom")
                logger.info(f"音频输入已切换为 custom，原 provider: {self._prev_input_provider}")
            else:
                self._prev_input_provider = config.get("prev_input_provider") or "openai"
            if not settings.LLM_SUPPORT_AUDIO_INPUT:
                settings.update_setting("LLM_SUPPORT_AUDIO_INPUT", True)
                logger.info("音频输入总开关 LLM_SUPPORT_AUDIO_INPUT 已开启")
        else:
            restore = config.get("prev_input_provider") or "openai"
            if settings.AUDIO_INPUT_PROVIDER == "custom":
                settings.update_setting("AUDIO_INPUT_PROVIDER", restore)
                logger.info(f"音频输入已恢复为 {restore}")
            if settings.LLM_SUPPORT_AUDIO_INPUT:
                settings.update_setting("LLM_SUPPORT_AUDIO_INPUT", False)
                logger.info("音频输入总开关 LLM_SUPPORT_AUDIO_INPUT 已关闭")
            self._prev_input_provider = restore

        # 输出开关：切换/恢复系统 provider + 总开关
        if self._enabled_output:
            if settings.AUDIO_OUTPUT_PROVIDER != "custom":
                self._prev_output_provider = settings.AUDIO_OUTPUT_PROVIDER
                settings.update_setting("AUDIO_OUTPUT_PROVIDER", "custom")
                logger.info(f"音频输出已切换为 custom，原 provider: {self._prev_output_provider}")
            else:
                self._prev_output_provider = config.get("prev_output_provider") or "openai"
            if not settings.LLM_SUPPORT_AUDIO_OUTPUT:
                settings.update_setting("LLM_SUPPORT_AUDIO_OUTPUT", True)
                logger.info("音频输出总开关 LLM_SUPPORT_AUDIO_OUTPUT 已开启")
        else:
            restore = config.get("prev_output_provider") or "openai"
            if settings.AUDIO_OUTPUT_PROVIDER == "custom":
                settings.update_setting("AUDIO_OUTPUT_PROVIDER", restore)
                logger.info(f"音频输出已恢复为 {restore}")
            if settings.LLM_SUPPORT_AUDIO_OUTPUT:
                settings.update_setting("LLM_SUPPORT_AUDIO_OUTPUT", False)
                logger.info("音频输出总开关 LLM_SUPPORT_AUDIO_OUTPUT 已关闭")
            self._prev_output_provider = restore

        # 语音回复附带文字：同步全局配置 AUDIO_OUTPUT_INCLUDE_TEXT
        audio_reply_with_text = bool(config.get("audio_reply_with_text", False))
        if settings.AUDIO_OUTPUT_INCLUDE_TEXT != audio_reply_with_text:
            settings.update_setting("AUDIO_OUTPUT_INCLUDE_TEXT", audio_reply_with_text)
            logger.info(f"语音回复附带文字已{'开启' if audio_reply_with_text else '关闭'} (AUDIO_OUTPUT_INCLUDE_TEXT={audio_reply_with_text})")

        # 持久化配置
        self.__save_config({
            "enabled": self._enabled,
            "enabled_input": self._enabled_input,
            "enabled_output": self._enabled_output,
            "input_api_key": provider_config["input_api_key"],
            "input_base_url": provider_config["input_base_url"],
            "input_model": provider_config["input_model"],
            "input_language": provider_config["input_language"],
            "output_api_key": provider_config["output_api_key"],
            "output_base_url": provider_config["output_base_url"],
            "output_model": provider_config["output_model"],
            "output_voice": provider_config["output_voice"],
            "audio_reply_with_text": audio_reply_with_text,
            "prev_input_provider": self._prev_input_provider,
            "prev_output_provider": self._prev_output_provider,
        })

    def __save_config(self, config: dict):
        self.update_config(config)

    def get_state(self) -> bool:
        return bool(self._enabled)

    @staticmethod
    def get_render_mode() -> Tuple[str, str]:
        """声明插件使用 Vue 联邦组件渲染。"""
        return "vue", "dist/assets"

    def get_form(self) -> Tuple[List[dict], Dict[str, Any]]:
        """Vue 模式下返回默认配置模型。"""
        return [], self._default_config()

    def get_page(self) -> List[dict]:
        """Vue 模式下详情页由远程 Page 组件渲染。"""
        return []

    def _default_config(self) -> Dict[str, Any]:
        return {
            "enabled": True,
            "enabled_input": False,
            "enabled_output": False,
            "input_api_key": "",
            "input_base_url": "",
            "input_model": "",
            "input_language": "zh",
            "output_api_key": "",
            "output_base_url": "",
            "output_model": "",
            "output_voice": "",
            "audio_reply_with_text": False,
            "prev_input_provider": "openai",
            "prev_output_provider": "openai",
        }

    def get_command(self):
        return []

    def get_api(self):
        return [
            {
                "path": "/config",
                "endpoint": self.get_config_api,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "获取插件配置",
            },
            {
                "path": "/config",
                "endpoint": self.save_config_api,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "保存插件配置",
            },
            {
                "path": "/test_tts",
                "endpoint": self.test_tts_api,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "测试 TTS 连接",
            },
            {
                "path": "/test_asr",
                "endpoint": self.test_asr_api,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "测试 ASR 连接",
            },
        ]

    async def get_config_api(self, request: Request):
        """返回当前插件配置，供 Vue 前端加载。"""
        try:
            return {
                "success": True,
                "data": self._current_config(),
            }
        except Exception as err:
            logger.error(f"获取配置失败: {err}")
            return {"success": False, "message": f"获取配置失败: {err}"}

    def _current_config(self) -> Dict[str, Any]:
        """返回当前持久化配置。"""
        config = self.get_config()
        if not config:
            return self._default_config()
        defaults = self._default_config()
        result = {}
        for key in defaults:
            result[key] = config.get(key, defaults[key])
        return result

    async def save_config_api(self, request: Request):
        """保存插件配置（Vue 侧栏页面用）。"""
        try:
            data = await request.json()
        except Exception:
            return {"success": False, "message": "请求数据解析失败"}

        try:
            # 保留 prev_* 字段
            current = self._current_config()
            data.setdefault("prev_input_provider", current.get("prev_input_provider", "openai"))
            data.setdefault("prev_output_provider", current.get("prev_output_provider", "openai"))
            # 确保总开关字段存在并持久化
            data["enabled"] = bool(data.get("enabled", True))

            # 先持久化配置到数据库（确保写盘成功）
            self.__save_config(data)

            # 再重新初始化插件（provider 注册 / 系统设置切换），
            # 即使此步骤抛异常也不影响已保存的配置和 200 响应
            try:
                self.init_plugin(data)
            except Exception as init_err:
                logger.error(f"保存后重新初始化出现异常（配置已保存）: {init_err}")

            return {
                "success": True,
                "data": self._current_config(),
                "message": "保存成功",
            }
        except Exception as err:
            logger.error(f"保存配置失败: {err}")
            return {"success": False, "message": f"保存失败: {err}"}

    async def test_tts_api(self, request: Request):
        """测试 TTS 配置连通性。"""
        try:
            try:
                data = await request.json()
            except Exception:
                return {"success": False, "message": "请求数据解析失败"}

            api_key = data.get("output_api_key", "")
            base_url = data.get("output_base_url", "")
            model = data.get("output_model", "")
            voice = data.get("output_voice", "")

            if not api_key or not base_url:
                return {"success": False, "message": "API Key 和 Base URL 不能为空"}

            response = RequestUtils(
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                proxies=settings.PROXY or {},
                timeout=30,
            ).post_res(
                url=base_url,
                json={
                    "model": model,
                    "voice": voice,
                    "input": "测试文本",
                    "response_format": "opus",
                },
                raise_exception=True,
            )
            if response.status_code >= 400:
                return {"success": False, "message": f"HTTP {response.status_code}: {response.text[:300]}"}
            content_type = response.headers.get("content-type", "")
            if "audio" in content_type or len(response.content) > 0:
                return {"success": True, "message": f"TTS 连接成功，收到 {len(response.content)} 字节音频数据"}
            return {"success": False, "message": "响应中未包含音频数据"}
        except Exception as err:
            logger.error(f"TTS 测试异常: {err}")
            return {"success": False, "message": f"测试失败: {err}"}

    async def test_asr_api(self, request: Request):
        """测试 ASR 配置连通性。"""
        try:
            try:
                data = await request.json()
            except Exception:
                return {"success": False, "message": "请求数据解析失败"}

            api_key = data.get("input_api_key", "")
            base_url = data.get("input_base_url", "")
            model = data.get("input_model", "")
            language = data.get("input_language", "zh")

            if not api_key or not base_url:
                return {"success": False, "message": "API Key 和 Base URL 不能为空"}

            # 预设含人声信号的短 WAV（Base64），规避 VAD "no speech found"
            import base64 as _b64
            _TEST_WAV_B64 = (
                "UklGRuQSAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YcASAAAAAAMADQAbACsAOgBF"
                "AEsASwBFADwAMgAqACQAJAAnACwAMgA1ADMAKgAaAAUA7v/W/8L/tf+v/67/sf+y/6z/mf93/0T/"
                "BP+9/nj+Qf4i/iX+Uf6m/iH/uP9cAAEBlAEHAlECbQJdAikC3AGEAS8B6QC5AKIAoACrALsAxAC9"
                "AKIAcgAxAOf/nv9g/zX/H/8d/yf/Mv8v/xP/0/5u/uf9TP2x/C382fvL+xH8sPyg/dH+JgCBAb8C"
                "wgN1BMsExQRxBOMDNwOJAvABfwE8ASUBLwFJAV4BXgE8AfQAjAAOAI3/GP+//ov+e/6H/p7+qP6Q"
                "/kT+uv32/Aj8DPsm+n75Ofly+Tj6hPtC/Ur/bQF2AzQFfgY9B2sHFgdZBl0FTARPA4UC/wHAAboB"
                "2AH8AQsC7wGeARcBaQCr//X+YP79/dL91v30/RD+Cf7B/SX9NPz7+pz5Rvgx95H2lfZW99n4Cfu5"
                "/akAkwMvBkAImgktCv8JMQnzB4EGFAXcA/oCegJRAmgCmQK9ArICZQLNAfkAAAAE/yj+hv0t/Rr9"
                "OP1k/XX9Qf2p/J77LPpy+Kj2E/X685/zLvS69TX4cfsm//kCjQaMCbQL3wwLDVMM8AonCUYHkgU8"
                "BGAD/QL7Ai8DaQN5Az4DpwK5AY4ATv8i/jP9mvxe/G78pfzR/L38O/wv+5n5lfde9UHzmfG68Onw"
                "S/Lh9IH43/yUAS0GOApaDVMPDxCfDzwONQzpCbAH1AWCBMkDlgO/AwkEOQQdBJcDogJUAdX/Wf4S"
                "/Sr8svuh+9X7Gfws/ND72/o9+Qj3c/TS8Y7vEO607bnuMfEC9eH5YP/4BCAKXQ5VEdgS6RK2EZYP"
                "8gw5CssH7gXEBEUETASaBOcE8wSPBKcDSAKYANH+MP3r+yT73vr/+lD7iftg+5f6DfnE9uvz1vD2"
                "7cjrv+o061btHPFG9mX85gIqCZgOthI1Ff8VNhUsE1EQKA0nCrAH+gUTBd4EHAV/BbUFfwW4BF4D"
                "kQGM/5P96vvF+jb6Lvp8+tX64vpW+vr4vfbB81Hw4+wA6jPo8eeF6QDtNfK9+AAATAfvDUwT8xav"
                "GIsYzRbqE2wQ5AzMCXgHDgZ/BZUF/QVaBloGxAWHBLQCggA8/jH8ovq4+XL5qPkS+lP6Dfr1+OX2"
                "6fNB8F7s0Og25h7l8+Xm6OLtkfRe/IwEUwz4EuYXxBqAG0walRfuE/cPRAxICUIHPQYOBmQG2wYS"
                "B7sGrwXwA6oBKf/C/Mj6dPna+OH4Sfmy+bP57/go91H0mPBj7ELo4OTk4tXiB+WH6RPwJfj/AMkJ"
                "qxHuFxIc4x11HSgbihdJEw4Pagu6CCQHkga7BjoHoAeNB8QGMQXzAk0AnP06+3X5dvg4+IX4BPlG"
                "+d34c/fk9EPx5uxV6EDkXuFW4JzhX+V/64rzzPxiBmQP9xZ2HIQfFiBvHhcbvBYZEtoNewpBCC8H"
                "Dgd7BwEIMAi0B2QGSgScAbX++fvE+VX4vPfW91X4yPi2+Lj3i/Ur8tLt/ehV5KDgl97S3qXhFOfK"
                "7iT4RAI0DP4U2htBIAAiOyFmHioaSxWKEIMMmwnyB2gHpgc3CJ4Icwh2B5gFAQMAAP78Yvp/+Hv3"
                "TPew9z74efjp9zP2NPMN7yPqFuWq4Kzdz9yM3g7jI+pF86H9PAgSEjgaACANI10jRyFnHYIYZhPL"
                "DjQL5QjXB8kHSQjWCPgIVgjKBmUEagE8/kv7+PiC9/T2JPe09yn4//fJ9kf0evCs62rmc+Gb3arb"
                "PNyj39Xlbu6y+KwDUQ6bF7keIyOvJI8jSCCXG1EWQBEIDQ0KaQjwB0II3gg/CfkIzge1Bd4Co/9z"
                "/L751Pfc9sD2N/fN9/v3Q/dN9fvxd+016OXiW95s29Da/twZ4uDpuPPA/ucJHhRzHDciFSUXJaIi"
                "YR4oGc0TDQ9rCyQJKwgyCL8ISwlaCZUI3AZFBBwBzP3I+nT4C/eS9tX2cPff95v3NfZ082LvUurg"
                "5NXfDNxS2j7bG9/V5fXus/kMBesPRhlPIIMkxCVQJLkgxhtTFi8R+AwPCoQIJQiHCCUJeAkYCckH"
                "iwWTAkL/Cvxb+YP3ovac9iD3tffQ9/b20vRO8Z7sP+fq4Xfdvdpw2v7cfuKk6sn0AAA2C1oVfR36"
                "IoUlNiV7IggetBhXE6kOJgsDCSkIRAjYCFsJVAl0CJ4G8QO9AHH9ffpC+Pb2lvbq9oj36veL9wT2"
                "IPPz7trpdOSN3wDckdrR2/3f9uY98AD7PAbeEOUZiiBbJEMliyPMH84aaxVqEGQMqwlKCAYIcwgL"
                "CU0J1ghxByUFLALo/sv7P/mM98v22vZl9/D39/cC98b0NPGJ7EfnJuL53ZHbldtn3hLkQexJ9joB"
                "DAy0FVMdUiJ0JNoj+CCEHE8XKBK7DXoKjgjaBwYImAgMCfEI/QcfBngDWwAz/Wz6YPg89/j2V/fv"
                "90D4y/cx9kjzK+876hblhOBT3Tzcv90O4v7oDfJs/B4HHhF9GYUf1CJhI3whvR3nGMkTGw9oC/cI"
                "yQegBxIIngjMCEII1gaUBLcBoP66+2f55vdJ92r39Pdw+GL4Xfce9aLxKe0z6HPjsN+q3fnd7+CM"
                "5nXuAvhNAlwMOBUYHHggJyJRIWkeHxo4FXIQawyDCdoHTgeHBxEIcghECEkHcwXrAgAAFv2S+sP4"
                "zfej9wf4lPjQ+Er4rfba8/HvU+uZ5nziu9/73q3g8uSc6yb0zP2jB7kQOBiAHUAgeiCBHuYaYRau"
                "EXQNLAoPCBcHBwd3B/IHDAh3BxIG7ANCAW/+0/vF+X74Bfgy+LX4H/n++PL3xvV78lTuzemK5UTi"
                "peAy4Szki+nz8MH5IwMyDBMUFBrGHQcfBh41GzYXvRJ2DugKZQgDB5sG3QZaB6cHagdwBrMEWwK0"
                "/xj94vpV+Y34evje+Fr5gvnx+F/3tvQa8enssegZ5c7iXuIn5EHode5I9gP/zwfXD10W2xoOHQMd"
                "DBuvF5QTYw+tC9gIEQdOBlAGuwYjBywHkgY+BUID2ABT/gr8R/o4+d/4FfmM+eL5svmo+Jv2lPPS"
                "78nrEOhK5Q3kx+St567scPNd+7YDrguFEqMXrBqMG3MazBcrFDAQcQxgCUIHIwbcBSEGkAbJBoIG"
                "kAX0A9UBef8w/Un7/flg+V75vvko+j76p/kp+LX1cfK27gTr8ucV5ujlt+eP6znxQPgAALoHsQ5E"
                "FAEYuBl4GZIXgRTYECsN+AmSBx0GhwWYBfoFUAZKBrAFcwSlAn8ASf5Q/NT6+Pm6+fT5Xvqh+mT6"
                "Y/l797v0YPHV7aDqUOhm50DoA+ua77D1vPwSBP8K3RArFaAXMBgMF5gUWBHYDZkK/Qc6BlUFKAVt"
                "Bc0F9gWoBcIESQNiAU7/Uv20+6H6J/oy+ov65frr+lH66fiq9rvzbvA47ZzqHukm6fDqgu6l8+35"
                "xACFB4kNRhJeFa0WSRZ6FLIRcw4/C4AIewZJBdkE9ARNBZMFgQXqBMMDIgI4AEj+lfxV+6P6evq1"
                "+hP7Rfv++gX6QPjA9cHyou/d7PDqSuo469jtD/KO99b9TgRZCmYPCRMFFVcVMBTsEQAP6QsXCdwG"
                "YwWtBJQE2AQrBUYF8wQZBL4CBwEu/3L9Dvwp+8v63/oy+337dfvZ+oP5cPfG9NLx/+7D7JDrwOuF"
                "7d3wkvVA+14BWAebDK8QRxNHFMYTDBJ/D5YMwQldB6QFqARUBHYEyAQBBeYEUQQ7A7sBAABG/sn8"
                "tvsl+wz7R/ub+777b/t6+s74ffbB8/TwhO7i7HDscO347+rz+viy/ocE6wldDn8RIhNFExoS9w9J"
                "DX8K/QcKBskENwQtBHAEugTKBHEEnQNWAsAAEf+D/Ur8hvs9+1j7pfvk+9D7MPvj+er3bfW28ifw"
                "L+417YftTu+F8vb2P/ziAVYHFAyzD+8RsxIbEmoQAw5RC70ImAYUBT4EAQQpBHYEpQSBBOkD2wJv"
                "AdL/O/7h/O77dPtn+6P77/sH/K37tvoT+dr2RPSp8XDvA+667dHuVfEo9f35ZP/XBNMJ4g2vEBIS"
                "DxLZEMUOOAycCU0HiQVtBPQD9gM6BH0EgwQkBE4DDgKIAPH+fv1f/LL7efua++X7Gvz6+1D7//kN"
                "+KL1CfOh8NXuA+527lDwhvPh9wD9ZwKUBwcMXw9dEfQRQhGMDzENmgooCCgGxQQKBNwDCwRVBH0E"
                "TwSwA6ACOAGm/yD+2/z7+5H7jvvN+xP8Ify5+7b6DPnU9kr0xPGq71/uO+5w7wry5fWy+gAATgUa"
                "CvUNjhDDEZ4RUxA4DrMLKQnyBkgFRQTeA+sDMQRwBG0EAgQkA98BWgDJ/mL9Uvy0+4f7rvv5+yf8"
                "+vs/+9754Pdx9d3yhfDS7iHuuO618Aj0dvic/fwCEwhnDJgPbhHgEQ8RRA/gDEsK5Qf2BacE/gPe"
                "AxMEXQR9BEQEmAN8Ag0Bef/3/br85/uJ+4/70vsV/Bf8oPuI+sr4gvbv82vxX+8u7i3ujO9Q8lH2"
                "O/uaAOwFrQpwDukQ+RGwEUgQFw6HC/wIzQYxBT4E5gP9A0YEgQR0BPwDDgO7AS0Amv41/S78m/t4"
                "+6b78vsZ/N77DvuV+X/3/vRh8g3wa+7Z7ZnuxvBL9OX4Lf6iA78ICQ0jENgRJRIxEUgPzwwwCskH"
                "4gWhBAYE8gMuBHgEkQRLBI4DYgLlAEn/xf2N/MP7b/t/+8b7B/z++3P7Q/pr+Av2afPh8N7ux+3r"
                "7XrvcvKm9rz7OgGcBlwLDw9sEVkS6xFgEBQOcwviCLcGJgVBBPYDFwRjBJkEgQT5A/oCmQEAAGf+"
                "Bf0G/H37Zfub++f7B/y8+9b6Q/kW94L03fGO7wDukO187tvwk/Ra+cT+SwRqCacNphA5Sl8SRhFA"
                "D7QMDAqnB8sFmAQMBAQERQSNBJ4ESgR9A0ICuQAZ/5b9Zvyn+2D7efvD+wD86/tO+wj6Gfip9f/y"
                "fPCL7pLt3+2b78HyHfdP/NsBOgfoC30PtBF4EuQROxDdDTQLqAiJBgkFNgT5AyEEbgSeBHoE5APY"
                "Am0B0v88/uT88ft2+2n7pfvw+wf8rfu1+hL52PZB9KTxae/67bHtxu5M8SH1+Plj/9sE3AnvDcAQ"
                "JBIiEuwQ1Q5GDKgJVQePBXME+QP7Az8EgwSJBCkEUgMRAokA8P57/Vv8rft0+5X74fsX/Pb7S/v6"
                "+Qb4mvUA85fwyu757W7uSfCC89/3//xoApQHBgxcD1kR7hE6EYQPKQ2SCiEIIgbABAUE1wMFBE4E"
                "dQRHBKkDmgI1Aaf/Jf7j/Af8n/ud+9v7Ifwv/Mr7zPoq+f72gfQK8vzvvO6c7s7vXPIi9tP6AAAq"
                "BdQJkQ0UEDsRExHPD8INTwvYCLMGFwUcBLgDwwMGBEAEPQTWAwADyQFVANj+g/2C/Oz7w/vp+zH8"
                "Xvw1/Ib7PPpe+Bn2svOF8fPvVO/m78Xx4vQC+cn9wwJ2B3ELXQ4IEGoQpA/6DcULZQkxB2wFOgSe"
                "A4ADrgPwAwsE1gM6AzoC8ACH/y/+F/1c/Ar8EvxO/Iv8j/wo/DX7sPm193v1UPOP8Y/wlfDM8TX0"
                "rffp+4QADwUaCUgMWw46D/QOvA3cC64JiAewBVUEiAM9A04DiQO3A6oDRQOAAmoBJQDd/rz96fx0"
                "/Fr8gvzA/OL8tPwS/On6RvlR90j1fPM98tXxdPIu9O/2g/qY/soCsgb0CUkMjQ29DfoMgQudCZ8H"
                "zwVhBG8D+gLpAhIDRgNWAyADlQK5AaUAfP9n/on9+/zC/ND8Bf01/TH90/wC/L76HvlU95/1SPSU"
                "87jz0fTc9rf5Jf3SAGUEhgfwCXULBQyxC6UKHgljB7YFTARJA7QCggKUAsEC4ALOAncC1wH7AAAA"
                "B/8x/pj9Sf09/WD9kf2m/Xz9+PwR/NH6Wfna95H2ufWF9Rf2efeZ+Uv8Uf9fAi0FeAcQCd8J5wlE"
                "CSMIvgZOBQYEBwNkAhgCEQIvAlECVgIpAr8BIAFcAI7/0v4//uX9xv3V/fz9HP4V/s79Ov1a/EH7"
                "Evr4+CP4wPfw98L4MPog/Gf+zAAXAw4FiAZqB64HZAeoBqUFhwR5A5oC/gGnAYwBmQGzAcIBsQF1"
                "AQ4BhgDv/1z/4v6N/mX+ZP58/pr+pf6J/jn+sv37/Cr8W/uv+kf6Pvqj+nj7r/wu/tH/cAHjAgoE"
                "zQQlBRYFsQQRBFMDlgLxAXQBJgEDAQEBDgEbARkB/wDIAHsAHwDD/3D/M/8Q/wj/Ev8m/zT/Mf8T"
                "/9X+e/4N/pv9Nv3y/Nz8//xe/fP9sf6H/18AJQHGATcCcQJ3Ak8CBwKtAU8B+gC3AIoAcQBpAGoA"
                "bgBuAGUAUwA5ABkA+f/d/8f/u/+4/7v/w//L/8//zv/G/7r/rP+g/5j/mP+f/6//xP/a/+7//P8="
            )
            wav_buffer = BytesIO(_b64.b64decode(_TEST_WAV_B64))

            response = RequestUtils(
                headers={"Authorization": f"Bearer {api_key}"},
                proxies=settings.PROXY or {},
                timeout=30,
            ).post_res(
                url=base_url,
                files={"file": ("test.wav", wav_buffer, "audio/wav")},
                data={
                    "model": model,
                    "language": language,
                    "response_format": "json",
                },
                raise_exception=True,
            )
            if response.status_code >= 400:
                error_text = response.text[:300]
                if response.status_code in (401, 403):
                    return {"success": False, "message": f"鉴权失败 HTTP {response.status_code}: {error_text}"}
                if response.status_code == 400 and "no speech found" in response.text:
                    return {"success": True, "message": "API Key 及网络连通性测试成功（测试音频无人声，ASR VAD 正常拦截）"}
                return {"success": False, "message": f"HTTP {response.status_code}: {error_text}"}
            result = response.json()
            text = result.get("text", "")
            return {"success": True, "message": f"ASR 连接成功，识别结果: \"{text}\""}
        except Exception as err:
            logger.error(f"ASR 测试异常: {err}")
            return {"success": False, "message": f"测试失败: {err}"}

    def get_service(self):
        return []

    def stop_service(self):
        pass
