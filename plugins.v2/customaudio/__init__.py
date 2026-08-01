"""自定义音频 Provider 插件。

注册一个名为 "custom" 的音频 provider，所有配置（API Key、Base URL、模型等）
在插件表单内完成，不依赖系统设置中的音频参数。

启用后自动将系统音频输入/输出 provider 切换为 custom，
关闭后自动恢复为原始 provider。

STT: multipart POST（OpenAI Whisper 兼容格式）
TTS: JSON POST（OpenAI TTS 兼容格式），响应为二进制音频
"""

from io import BytesIO
from pathlib import Path
from typing import Optional
from uuid import uuid4

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
        "output_voice": "alloy",
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
                logger.warning(
                    f"音频转写返回空文本: provider={self.name}, "
                    f"status={response.status_code}, "
                    f"content_type={response.headers.get('content-type', 'unknown')}, "
                    f"body_preview={response.text[:300]}"
                )
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
                    "voice": CustomAudioProvider._config.get("output_voice") or "alloy",
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
    plugin_version = "1.1"
    plugin_author = "apple4105"
    author_url = "https://github.com/apple4105"
    plugin_order = 100

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

        # 更新 provider 运行时配置
        provider_config = {
            "input_api_key": config.get("input_api_key"),
            "input_base_url": config.get("input_base_url"),
            "input_model": config.get("input_model"),
            "input_language": config.get("input_language") or "zh",
            "output_api_key": config.get("output_api_key"),
            "output_base_url": config.get("output_base_url"),
            "output_model": config.get("output_model"),
            "output_voice": config.get("output_voice") or "alloy",
        }
        CustomAudioProvider.update_config(provider_config)

        # 输入开关：切换/恢复系统 provider
        if self._enabled_input:
            if settings.AUDIO_INPUT_PROVIDER != "custom":
                self._prev_input_provider = settings.AUDIO_INPUT_PROVIDER
                settings.update_setting("AUDIO_INPUT_PROVIDER", "custom")
                logger.info(f"音频输入已切换为 custom，原 provider: {self._prev_input_provider}")
            else:
                self._prev_input_provider = config.get("prev_input_provider") or "openai"
        else:
            restore = config.get("prev_input_provider") or "openai"
            if settings.AUDIO_INPUT_PROVIDER == "custom":
                settings.update_setting("AUDIO_INPUT_PROVIDER", restore)
                logger.info(f"音频输入已恢复为 {restore}")
            self._prev_input_provider = restore

        # 输出开关：切换/恢复系统 provider
        if self._enabled_output:
            if settings.AUDIO_OUTPUT_PROVIDER != "custom":
                self._prev_output_provider = settings.AUDIO_OUTPUT_PROVIDER
                settings.update_setting("AUDIO_OUTPUT_PROVIDER", "custom")
                logger.info(f"音频输出已切换为 custom，原 provider: {self._prev_output_provider}")
            else:
                self._prev_output_provider = config.get("prev_output_provider") or "openai"
        else:
            restore = config.get("prev_output_provider") or "openai"
            if settings.AUDIO_OUTPUT_PROVIDER == "custom":
                settings.update_setting("AUDIO_OUTPUT_PROVIDER", restore)
                logger.info(f"音频输出已恢复为 {restore}")
            self._prev_output_provider = restore

        # 持久化配置
        self.__save_config({
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
            "prev_input_provider": self._prev_input_provider,
            "prev_output_provider": self._prev_output_provider,
        })

    def __save_config(self, config: dict):
        self.update_config(config)

    def get_state(self) -> bool:
        return self._enabled_input or self._enabled_output

    def get_form(self):
        return [
            {
                "component": "VForm",
                "content": [
                    {
                        "component": "VAlert",
                        "props": {
                            "type": "info",
                            "variant": "tonal",
                            "text": "启用后系统音频输入/输出将使用下方配置的 custom provider。"
                                   "关闭开关后自动恢复为系统默认 provider。",
                        }
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
                                            "model": "enabled_input",
                                            "label": "自定义音频输入（STT）",
                                            "hint": "启用后使用下方配置进行语音转文字",
                                            "persistent-hint": True,
                                        }
                                    }
                                ]
                            },
                            {
                                "component": "VCol",
                                "props": {"cols": 12, "md": 6},
                                "content": [
                                    {
                                        "component": "VSwitch",
                                        "props": {
                                            "model": "enabled_output",
                                            "label": "自定义音频输出（TTS）",
                                            "hint": "启用后使用下方配置进行文字转语音",
                                            "persistent-hint": True,
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    # 音频输入配置
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
                                            "type": "warning",
                                            "variant": "text",
                                            "text": "音频输入（STT）配置",
                                            "density": "compact",
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "component": "VRow",
                        "content": [
                            {
                                "component": "VCol",
                                "props": {"cols": 12},
                                "content": [
                                    {
                                        "component": "VTextField",
                                        "props": {
                                            "model": "input_api_key",
                                            "label": "输入 API Key",
                                            "placeholder": "sk-xxx",
                                            "type": "password",
                                        }
                                    }
                                ]
                            },
                            {
                                "component": "VCol",
                                "props": {"cols": 12},
                                "content": [
                                    {
                                        "component": "VTextField",
                                        "props": {
                                            "model": "input_base_url",
                                            "label": "输入 Base URL（完整端点）",
                                            "placeholder": "https://api.example.com/v1/audio/transcriptions",
                                        }
                                    }
                                ]
                            },
                            {
                                "component": "VCol",
                                "props": {"cols": 12, "md": 6},
                                "content": [
                                    {
                                        "component": "VTextField",
                                        "props": {
                                            "model": "input_model",
                                            "label": "输入模型",
                                            "placeholder": "whisper-1",
                                        }
                                    }
                                ]
                            },
                            {
                                "component": "VCol",
                                "props": {"cols": 12, "md": 6},
                                "content": [
                                    {
                                        "component": "VTextField",
                                        "props": {
                                            "model": "input_language",
                                            "label": "语言",
                                            "placeholder": "zh",
                                            "hint": "BCP-47 语言代码",
                                            "persistent-hint": True,
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    # 音频输出配置
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
                                            "type": "warning",
                                            "variant": "text",
                                            "text": "音频输出（TTS）配置",
                                            "density": "compact",
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "component": "VRow",
                        "content": [
                            {
                                "component": "VCol",
                                "props": {"cols": 12},
                                "content": [
                                    {
                                        "component": "VTextField",
                                        "props": {
                                            "model": "output_api_key",
                                            "label": "输出 API Key",
                                            "placeholder": "sk-xxx",
                                            "type": "password",
                                        }
                                    }
                                ]
                            },
                            {
                                "component": "VCol",
                                "props": {"cols": 12},
                                "content": [
                                    {
                                        "component": "VTextField",
                                        "props": {
                                            "model": "output_base_url",
                                            "label": "输出 Base URL（完整端点）",
                                            "placeholder": "https://api.example.com/v1/audio/speech",
                                        }
                                    }
                                ]
                            },
                            {
                                "component": "VCol",
                                "props": {"cols": 12, "md": 6},
                                "content": [
                                    {
                                        "component": "VTextField",
                                        "props": {
                                            "model": "output_model",
                                            "label": "输出模型",
                                            "placeholder": "tts-1",
                                        }
                                    }
                                ]
                            },
                            {
                                "component": "VCol",
                                "props": {"cols": 12, "md": 6},
                                "content": [
                                    {
                                        "component": "VTextField",
                                        "props": {
                                            "model": "output_voice",
                                            "label": "音色",
                                            "placeholder": "alloy",
                                            "hint": "如 alloy / echo / fable / onyx / nova / shimmer",
                                            "persistent-hint": True,
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                ]
            }
        ], {
            "enabled_input": False,
            "enabled_output": False,
            "input_api_key": "",
            "input_base_url": "",
            "input_model": "",
            "input_language": "zh",
            "output_api_key": "",
            "output_base_url": "",
            "output_model": "",
            "output_voice": "alloy",
        }

    def get_command(self):
        return []

    def get_api(self):
        return []

    def get_page(self):
        return None

    def get_service(self):
        return []

    def stop_service(self):
        pass
