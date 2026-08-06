<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({
  api: {
    type: Object,
    default: () => ({}),
  },
  pluginId: {
    type: String,
    default: 'CustomAudio',
  },
  hideTitle: {
    type: Boolean,
    default: false,
  },
  initialConfig: {
    type: Object,
    default: null,
  },
  configMode: {
    type: Boolean,
    default: false,
  },
})

const loading = ref(false)
const saving = ref(false)
const notice = ref({ show: false, text: '', type: 'success' })

// 上次成功加载/保存时的配置快照（用于 Dirty Check）
let _lastSavedConfig = null

// 密码可见性
const showInputKey = ref(false)
const showOutputKey = ref(false)

// 测试中状态
const testingTts = ref(false)
const testingAsr = ref(false)

// 测试结果状态：idle 未测试（蓝）/ success 成功（绿）/ error 失败（红）
const asrTestState = ref('idle')
const ttsTestState = ref('idle')

// 音色试听状态
const previewing = ref(false)
const previewText = ref('你好，欢迎试听，这是当前音色的声音效果。')
const previewAudioUrl = ref('')
const previewAudioRef = ref(null)

// Base64 解码提示
const base64Hint = ref({ show: false, text: '', color: 'info' })

const config = ref({
  enabled: true,
  enabled_input: false,
  enabled_output: false,
  input_api_key: '',
  input_base_url: '',
  input_model: '',
  input_language: 'zh',
  output_api_key: '',
  output_base_url: '',
  output_model: '',
  output_voice: 'alloy',
  audio_reply_with_text: false,
  prev_input_provider: 'openai',
  prev_output_provider: 'openai',
})

// 语言选项
const languageOptions = [
  { title: '中文', value: 'zh' },
  { title: 'English', value: 'en' },
  { title: '日本語', value: 'ja' },
  { title: '한국어', value: 'ko' },
]

// 顶部提示（带自动消失）
let noticeTimer = null
function showNotice(text, type = 'success', duration = 4000) {
  if (noticeTimer) clearTimeout(noticeTimer)
  notice.value = { show: true, text, type }
  noticeTimer = setTimeout(() => {
    notice.value.show = false
  }, duration)
}

// 显示 Base64 解码提示（带自动消失）
let base64HintTimer = null
function showBase64Hint(text, color = 'info', duration = 3000) {
  if (base64HintTimer) clearTimeout(base64HintTimer)
  base64Hint.value = { show: true, text, color }
  base64HintTimer = setTimeout(() => {
    base64Hint.value.show = false
  }, duration)
}

// Base64 智能解码：检测是否为 Base64 编码，支持嵌套解码（最多 3 次）
function decodeBase64Smart(input) {
  if (!input || typeof input !== 'string') return input
  let current = input.trim()
  for (let i = 0; i < 3; i++) {
    // 检查是否为有效的 Base64 字符串（长度 >= 4，只含 Base64 字符，长度是 4 的倍数）
    if (current.length < 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(current) || current.length % 4 !== 0) {
      break
    }
    try {
      const decoded = atob(current)
      // 解码结果必须是可打印文本（排除二进制）
      if (!/^[\x20-\x7E\t\n\r]*$/.test(decoded)) {
        break
      }
      // 如果解码后与原始值相同，说明不是 Base64
      if (decoded === current) {
        break
      }
      current = decoded
    } catch {
      break
    }
  }
  return current
}

// 检测并解码 Base64 API Key
function tryDecodeBase64Key(keyType) {
  const keyField = keyType === 'input' ? 'input_api_key' : 'output_api_key'
  const currentValue = config.value[keyField]

  if (!currentValue || typeof currentValue !== 'string') return

  const decoded = decodeBase64Smart(currentValue)
  if (decoded !== currentValue) {
    config.value[keyField] = decoded
    const label = keyType === 'input' ? 'ASR' : 'TTS'
    showBase64Hint(`${label} API Key 已自动从 Base64 解码`, 'info')
  }
}

function _takeSnapshot() {
  _lastSavedConfig = JSON.stringify(config.value)
}

function hasUnsavedChanges() {
  if (!_lastSavedConfig) return false
  return JSON.stringify(config.value) !== _lastSavedConfig
}

// 从 initialConfig 加载（Config.vue 模式）
function loadFromInitialConfig() {
  if (props.initialConfig) {
    config.value = { ...config.value, ...props.initialConfig }
    _takeSnapshot()
  }
}

// 从插件 API 加载配置
async function loadStatus(showNoticeOnSuccess = false) {
  if (props.configMode) {
    loadFromInitialConfig()
    return
  }
  loading.value = true
  try {
    const res = await props.api.get('plugin/CustomAudio/config')
    if (res?.success) {
      const configData = res?.data
      if (configData && typeof configData === 'object') {
        config.value = { ...config.value, ...configData }
      }
      _takeSnapshot()
      if (showNoticeOnSuccess) {
        showNotice('配置已重新加载')
      }
    } else {
      showNotice(res?.message || '配置加载失败', 'error')
    }
  } catch {
    showNotice('配置加载失败，使用默认值', 'error')
  } finally {
    loading.value = false
  }
}

// 获取当前配置（供 Config.vue 调用）
function getConfig() {
  return { ...config.value }
}

// 表单校验：ASR/TTS 启用时必填项非空检查
function validateForm() {
  if (config.value.enabled_input) {
    const asrFields = [
      { key: 'input_api_key', label: 'ASR API Key' },
      { key: 'input_base_url', label: 'ASR API 地址' },
      { key: 'input_model', label: 'ASR 模型' },
    ]
    for (const field of asrFields) {
      if (!String(config.value[field.key] || '').trim()) {
        showNotice(`开启 ASR 时，${field.label} 不能为空`, 'error')
        return false
      }
    }
  }
  if (config.value.enabled_output) {
    const ttsFields = [
      { key: 'output_api_key', label: 'TTS API Key' },
      { key: 'output_base_url', label: 'TTS API 地址' },
      { key: 'output_model', label: 'TTS 模型' },
      { key: 'output_voice', label: 'TTS 语音音色' },
    ]
    for (const field of ttsFields) {
      if (!String(config.value[field.key] || '').trim()) {
        showNotice(`开启 TTS 时，${field.label} 不能为空`, 'error')
        return false
      }
    }
  }
  return true
}

// 保存配置（configMode 和页面模式统一走 API）
async function saveConfig() {
  if (!validateForm()) {
    return false
  }
  saving.value = true
  try {
    const saveData = { ...config.value }
    const res = await props.api.post('plugin/CustomAudio/config', saveData)
    if (res?.success) {
      if (res?.data) {
        config.value = { ...config.value, ...res.data }
      }
      _takeSnapshot()
      showNotice(res?.message || '保存成功')
      return true
    } else {
      showNotice(res?.message || '保存失败', 'error')
      return false
    }
  } catch {
    showNotice('保存失败，请检查插件状态', 'error')
    return false
  } finally {
    saving.value = false
  }
}

// 测试 TTS
async function testTts() {
  testingTts.value = true
  try {
    const ttsData = {
      output_api_key: config.value.output_api_key,
      output_base_url: config.value.output_base_url,
      output_model: config.value.output_model,
      output_voice: config.value.output_voice,
    }
    const res = await props.api.post('plugin/CustomAudio/test_tts', ttsData)
    if (res?.success) {
      ttsTestState.value = 'success'
      showNotice(res?.message || 'TTS 连接成功')
    } else {
      ttsTestState.value = 'error'
      showNotice(res?.message || 'TTS 连接失败', 'error')
    }
  } catch {
    ttsTestState.value = 'error'
    showNotice('TTS 连接失败，请检查网络和配置', 'error')
  } finally {
    testingTts.value = false
  }
}

// 测试 ASR
async function testAsr() {
  testingAsr.value = true
  try {
    const asrData = {
      input_api_key: config.value.input_api_key,
      input_base_url: config.value.input_base_url,
      input_model: config.value.input_model,
      input_language: config.value.input_language,
    }
    const res = await props.api.post('plugin/CustomAudio/test_asr', asrData)
    if (res?.success) {
      asrTestState.value = 'success'
      showNotice(res?.message || 'ASR 连接成功')
    } else {
      asrTestState.value = 'error'
      showNotice(res?.message || 'ASR 连接失败', 'error')
    }
  } catch {
    asrTestState.value = 'error'
    showNotice('ASR 连接失败，请检查网络和配置', 'error')
  } finally {
    testingAsr.value = false
  }
}

// 配置字段变化时重置测试状态（旧的测试结果不再有效）
watch(
  () => [
    config.value.input_api_key,
    config.value.input_base_url,
    config.value.input_model,
    config.value.input_language,
  ],
  () => {
    asrTestState.value = 'idle'
  }
)

watch(
  () => [
    config.value.output_api_key,
    config.value.output_base_url,
    config.value.output_model,
    config.value.output_voice,
  ],
  () => {
    ttsTestState.value = 'idle'
  }
)

// Base64 转 Blob，用于播放试听音频
function base64ToBlob(base64, mimeType) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType || 'audio/mpeg' })
}

// 试听当前音色
async function previewVoice() {
  const text = previewText.value.trim()
  if (!text) {
    showNotice('请输入试听文本', 'error')
    return
  }
  previewing.value = true
  try {
    const payload = {
      output_api_key: config.value.output_api_key,
      output_base_url: config.value.output_base_url,
      output_model: config.value.output_model,
      output_voice: config.value.output_voice,
      text,
    }
    const res = await props.api.post('plugin/CustomAudio/preview_voice', payload)
    if (res?.success && res?.data?.audio_base64) {
      if (previewAudioUrl.value) {
        URL.revokeObjectURL(previewAudioUrl.value)
      }
      const blob = base64ToBlob(res.data.audio_base64, res.data.content_type)
      previewAudioUrl.value = URL.createObjectURL(blob)
      await nextTick()
      previewAudioRef.value?.play().catch(() => {})
      showNotice('试听音频已生成')
    } else {
      showNotice(res?.message || '试听失败', 'error')
    }
  } catch {
    showNotice('试听失败，请检查网络和配置', 'error')
  } finally {
    previewing.value = false
  }
}

// 联邦加载环境下外部 CSS 文件不会被自动加载，此处运行时注入关键样式
function injectCustomAudioStyles() {
  if (document.getElementById('customaudio-injected-styles')) return
  const style = document.createElement('style')
  style.id = 'customaudio-injected-styles'
  style.textContent = `
    .ca-form-label {
      width: 85px;
      flex-shrink: 0;
      font-size: 0.875rem;
      line-height: 40px;
      color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
      padding-right: 12px;
    }
    .ca-form-item {
      width: 100%;
      display: flex;
      align-items: flex-start;
      padding: 10px 0;
      border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    }
    .ca-form-item:last-child {
      border-bottom: none;
    }
    .ca-form-item--merged {
      gap: 8px;
      padding: 10px 0;
      align-items: flex-start;
    }
    .ca-form-item__half {
      flex: 1;
      display: flex;
      align-items: flex-start;
      min-width: 0;
    }
    .ca-form-item__half .ca-form-label {
      width: 85px;
      flex-shrink: 0;
      white-space: nowrap;
    }
    @media (min-width: 601px) {
      .ca-form-item__half:first-child {
        flex: 1.2;
      }
      .ca-form-item__half:last-child .ca-form-label {
        width: auto;
      }
    }
    .ca-form-item__half > .v-input {
      flex: 1;
      min-width: 0;
    }
    @media (max-width: 600px) {
      .ca-form-item--merged {
        flex-direction: column;
        align-items: stretch;
        gap: 4px;
      }
      .ca-form-item__half {
        flex: none;
        width: 100%;
      }
    }
    .ca-input-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }
    .ca-input-group > .v-input {
      flex: 1;
      min-width: 0;
    }
    .ca-input-action-btn {
      flex-shrink: 0;
      min-width: 36px !important;
      min-height: 36px !important;
      border-radius: 6px;
      background: rgba(var(--v-theme-on-surface), 0.04);
    }
    :deep(.ca-key-field .v-field__input) {
      min-width: 0;
      text-overflow: ellipsis;
    }
  `
  document.head.appendChild(style)
}

defineExpose({ loadStatus, saveConfig, getConfig, hasUnsavedChanges, loading, saving })

onMounted(() => {
  injectCustomAudioStyles()
  loadStatus(false)
})
</script>

<template>
  <div class="customaudio-app-page pa-4">
    <!-- 标题 -->
    <div v-if="!hideTitle" class="text-h5 mb-4">自定义音频 Provider</div>

    <!-- 本地提示（不触发全局 Toast） -->
    <VAlert
      v-if="notice.show"
      :type="notice.type"
      variant="tonal"
      density="compact"
      class="mb-4"
      closable
      @click:close="notice.show = false"
    >
      {{ notice.text }}
    </VAlert>

    <!-- Base64 解码提示（Toast 通知，与保存成功提示一致） -->
    <VSnackbar
      v-model="base64Hint.show"
      :color="base64Hint.color"
      location="bottom"
      timeout="3000"
    >
      {{ base64Hint.text }}
    </VSnackbar>

    <!-- 总开关 -->
    <VSwitch
      v-model="config.enabled"
      label="启用"
      color="primary"
      hide-details
      class="mb-2"
    />

    <VDivider class="mb-4" />

    <!-- 启用开关 -->
    <VRow>
      <VCol cols="12" sm="6">
        <VSwitch
          v-model="config.enabled_input"
          label="启用语音识别 (ASR)"
          color="primary"
          hide-details
        />
      </VCol>
      <VCol cols="12" sm="6">
        <VSwitch
          v-model="config.enabled_output"
          label="启用语音合成 (TTS)"
          color="primary"
          hide-details
        />
      </VCol>
    </VRow>

    <VDivider class="my-4" />

    <!-- ASR 配置 -->
    <template v-if="config.enabled_input">
    <div class="d-flex justify-space-between align-center mb-3">
      <div
        class="text-subtitle-1 font-weight-bold"
        :class="asrTestState === 'success' ? 'text-success' : asrTestState === 'error' ? 'text-error' : ''"
      >语音识别 (ASR / STT)</div>
      <VBtn
        :color="asrTestState === 'success' ? 'success' : asrTestState === 'error' ? 'error' : 'info'"
        variant="tonal"
        size="small"
        :loading="testingAsr"
        :disabled="!config.input_api_key || !config.input_base_url"
        prepend-icon="mdi-microphone"
        @click="testAsr"
      >
        测试 ASR 连接
      </VBtn>
    </div>
    <div class="ca-form-item ca-form-item--merged">
      <div class="ca-form-item__half">
        <span class="ca-form-label">API 地址</span>
        <VTextField
          v-model="config.input_base_url"
          placeholder="https://api.openai.com/v1"
          hint="兼容 OpenAI 格式的 ASR 接口地址"
          persistent-hint
          density="compact"
          variant="outlined"
        />
      </div>
      <div class="ca-form-item__half">
        <span class="ca-form-label">模型</span>
        <VTextField
          v-model="config.input_model"
          placeholder="whisper-1"
          density="compact"
          variant="outlined"
        />
      </div>
    </div>
    <div class="ca-form-item">
      <span class="ca-form-label">API Key</span>
      <div class="ca-input-group">
        <VTextField
          v-model="config.input_api_key"
          :type="showInputKey ? 'text' : 'password'"
          placeholder="sk-..."
          density="compact"
          variant="outlined"
          hide-details
          class="ca-key-field"
          @blur="tryDecodeBase64Key('input')"
          @paste="() => setTimeout(() => tryDecodeBase64Key('input'), 50)"
        />
        <VBtn
          v-if="config.input_api_key"
          :icon="showInputKey ? 'mdi-eye-off' : 'mdi-eye'"
          size="small"
          variant="tonal"
          class="ca-input-action-btn"
          @click.stop="showInputKey = !showInputKey"
        />
      </div>
    </div>
    <div class="ca-form-item">
      <span class="ca-form-label">识别语言</span>
      <VSelect
        v-model="config.input_language"
        :items="languageOptions"
        density="compact"
        variant="outlined"
      />
    </div>

    </template>

    <VDivider class="my-4" />

    <!-- TTS 配置 -->
    <template v-if="config.enabled_output">
    <div class="d-flex justify-space-between align-center mb-3">
      <div
        class="text-subtitle-1 font-weight-bold"
        :class="ttsTestState === 'success' ? 'text-success' : ttsTestState === 'error' ? 'text-error' : ''"
      >语音合成 (TTS)</div>
      <VBtn
        :color="ttsTestState === 'success' ? 'success' : ttsTestState === 'error' ? 'error' : 'info'"
        variant="tonal"
        size="small"
        :loading="testingTts"
        :disabled="!config.output_api_key || !config.output_base_url"
        prepend-icon="mdi-speaker"
        @click="testTts"
      >
        测试 TTS 连接
      </VBtn>
    </div>
    <div class="ca-form-item ca-form-item--merged">
      <div class="ca-form-item__half">
        <span class="ca-form-label">API 地址</span>
        <VTextField
          v-model="config.output_base_url"
          placeholder="https://api.openai.com/v1"
          hint="兼容 OpenAI 格式的 TTS 接口地址"
          persistent-hint
          density="compact"
          variant="outlined"
        />
      </div>
      <div class="ca-form-item__half">
        <span class="ca-form-label">模型</span>
        <VTextField
          v-model="config.output_model"
          placeholder="tts-1"
          density="compact"
          variant="outlined"
        />
      </div>
    </div>
    <div class="ca-form-item">
      <span class="ca-form-label">API Key</span>
      <div class="ca-input-group">
        <VTextField
          v-model="config.output_api_key"
          :type="showOutputKey ? 'text' : 'password'"
          placeholder="sk-..."
          density="compact"
          variant="outlined"
          hide-details
          class="ca-key-field"
          @blur="tryDecodeBase64Key('output')"
          @paste="() => setTimeout(() => tryDecodeBase64Key('output'), 50)"
        />
        <VBtn
          v-if="config.output_api_key"
          :icon="showOutputKey ? 'mdi-eye-off' : 'mdi-eye'"
          size="small"
          variant="tonal"
          class="ca-input-action-btn"
          @click.stop="showOutputKey = !showOutputKey"
        />
      </div>
    </div>
    <div class="ca-form-item">
      <span class="ca-form-label">语音音色</span>
      <VTextField
        v-model="config.output_voice"
        placeholder="请输入音色名称"
        hint="音色名称，由供应商定义"
        persistent-hint
        density="compact"
        variant="outlined"
      />
    </div>

    <!-- 语音回复附带文字 + 音色试听 -->
    <VRow class="align-center mb-2">
      <VCol cols="12" sm="6">
        <VSwitch
          v-model="config.audio_reply_with_text"
          label="语音回复附带文字"
          color="primary"
          hint="开启后，Telegram 等渠道发送语音回复时将同时附带文字消息内容"
          persistent-hint
          hide-details
        />
      </VCol>
      <VCol cols="12" sm="6" class="d-flex align-center ga-3">
        <audio
          ref="previewAudioRef"
          :src="previewAudioUrl"
          controls
          style="height: 40px; width: 260px; flex: 0 0 260px;"
        />
        <VBtn
          color="primary"
          variant="tonal"
          size="small"
          :loading="previewing"
          :disabled="!config.output_api_key || !config.output_base_url || !config.output_voice"
          prepend-icon="mdi-headphones"
          @click="previewVoice"
        >
          试听音色
        </VBtn>
      </VCol>
    </VRow>
    </template>
  </div>
</template>
