<script setup>
import { onMounted, ref } from 'vue'

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

// 密码可见性
const showInputKey = ref(false)
const showOutputKey = ref(false)

// 测试中状态
const testingTts = ref(false)
const testingAsr = ref(false)

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

function showNotice(text, type = 'success') {
  notice.value = { show: true, text, type }
}

// 从 initialConfig 加载（Config.vue 模式）
function loadFromInitialConfig() {
  if (props.initialConfig) {
    config.value = { ...config.value, ...props.initialConfig }
  }
}

// 从插件 API 加载配置
async function loadStatus() {
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
      showNotice(res?.message || 'TTS 连接成功')
    } else {
      showNotice(res?.message || 'TTS 连接失败', 'error')
    }
  } catch {
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
      showNotice(res?.message || 'ASR 连接成功')
    } else {
      showNotice(res?.message || 'ASR 连接失败', 'error')
    }
  } catch {
    showNotice('ASR 连接失败，请检查网络和配置', 'error')
  } finally {
    testingAsr.value = false
  }
}

defineExpose({ loadStatus, saveConfig, getConfig, loading, saving })

onMounted(() => {
  loadStatus()
})
</script>

<template>
  <div class="customaudio-app-page pa-4">
    <!-- 标题 -->
    <div v-if="!hideTitle" class="text-h5 mb-4">语音识别与合成</div>

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
    <div class="text-subtitle-1 font-weight-bold mb-3">语音识别 (ASR / STT)</div>
    <VRow>
      <VCol cols="12" sm="6">
        <VTextField
          v-model="config.input_base_url"
          label="API 地址"
          placeholder="https://api.openai.com/v1"
          hint="兼容 OpenAI 格式的 ASR 接口地址"
          persistent-hint
          density="compact"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <VTextField
          v-model="config.input_model"
          label="模型"
          placeholder="whisper-1"
          density="compact"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <VTextField
          v-model="config.input_api_key"
          :type="showInputKey ? 'text' : 'password'"
          label="API Key"
          placeholder="sk-..."
          density="compact"
          variant="outlined"
          :append-inner-icon="showInputKey ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showInputKey = !showInputKey"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <VSelect
          v-model="config.input_language"
          :items="languageOptions"
          label="识别语言"
          density="compact"
          variant="outlined"
        />
      </VCol>
    </VRow>
    <div class="d-flex justify-end mb-4">
      <VBtn
        color="info"
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

    </template>

    <VDivider class="my-4" />

    <!-- TTS 配置 -->
    <template v-if="config.enabled_output">
    <div class="text-subtitle-1 font-weight-bold mb-3">语音合成 (TTS)</div>
    <VRow>
      <VCol cols="12" sm="6">
        <VTextField
          v-model="config.output_base_url"
          label="API 地址"
          placeholder="https://api.openai.com/v1"
          hint="兼容 OpenAI 格式的 TTS 接口地址"
          persistent-hint
          density="compact"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <VTextField
          v-model="config.output_model"
          label="模型"
          placeholder="tts-1"
          density="compact"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <VTextField
          v-model="config.output_api_key"
          :type="showOutputKey ? 'text' : 'password'"
          label="API Key"
          placeholder="sk-..."
          density="compact"
          variant="outlined"
          :append-inner-icon="showOutputKey ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showOutputKey = !showOutputKey"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <VTextField
          v-model="config.output_voice"
          label="语音音色"
          placeholder="alloy"
          hint="音色名称，由供应商定义"
          persistent-hint
          density="compact"
          variant="outlined"
        />
      </VCol>
    </VRow>
    <div class="d-flex justify-end mb-4">
      <VBtn
        color="info"
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

    <!-- 语音回复附带文字 -->
    <VSwitch
      v-model="config.audio_reply_with_text"
      label="语音回复附带文字"
      color="primary"
      hint="开启后，Telegram 等渠道发送语音回复时将同时附带文字消息内容"
      persistent-hint
      hide-details
      class="mb-2"
    />
    </template>
  </div>
</template>
