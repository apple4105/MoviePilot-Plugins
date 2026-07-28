<script setup>
import { computed, ref, watch } from 'vue'
import { normalizeModelOptions, PROVIDER_TYPE_OPTIONS } from '../provider'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  provider: {
    type: Object,
    default: () => ({}),
  },
  editorIndex: {
    type: Number,
    default: -1,
  },
  existingProviders: {
    type: Array,
    default: () => [],
  },
  vendors: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue', 'commit', 'query-models', 'test-connection'])

const modelOptions = ref([])
const loadingModels = ref(false)
const testingConnection = ref(false)
const modelError = ref('')
const testResult = ref(null)
const connectionTestState = ref(null)
const showApiKey = ref(false)
const clipboardHint = ref('')
const clipboardHintColor = ref('info')
const showPasteDialog = ref(false)
const pasteText = ref('')
let resultTimer = null

const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const isEdit = computed(() => props.editorIndex >= 0)

// 提取纯 URL：若输入包含 " - " 格式，提取后半段的 http/https 地址
function extractPureUrl(input) {
  if (!input || typeof input !== 'string') return input
  const trimmed = input.trim()
  // 检查是否包含 " - " 格式（厂商名称 - API地址）
  const separatorIndex = trimmed.indexOf(' - ')
  if (separatorIndex > 0) {
    const possibleUrl = trimmed.slice(separatorIndex + 3).trim()
    if (possibleUrl.startsWith('http://') || possibleUrl.startsWith('https://')) {
      return possibleUrl
    }
  }
  // 直接返回纯 URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  // 尝试从字符串中提取 URL
  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/)
  if (urlMatch) {
    return urlMatch[0]
  }
  return trimmed
}

// 厂商 API 地址列表，用于下拉选择（仅展示已启用的厂商）
const vendorUrlOptions = computed(() => {
  return props.vendors
    .filter(v => v.enabled !== false && v.url)
    .map(v => ({
      title: v.name ? `${v.name} - ${v.url}` : v.url,
      value: v.url,
    }))
})

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

// 模型数量提示
const modelCountText = computed(() => {
  const count = modelOptions.value?.length || 0
  return count > 0 ? `模型 (${count})` : '模型'
})

// 测试按钮颜色：仅绑定连通性测试结果（成功绿色、失败红色、默认紫色）
const testButtonColor = computed(() => {
  if (connectionTestState.value === true) return 'success'
  if (connectionTestState.value === false) return 'error'
  return 'primary'
})

watch(dialogVisible, (val) => {
  if (val) {
    showApiKey.value = false
    modelError.value = ''
    testResult.value = null
    connectionTestState.value = null
    modelOptions.value = []
  }
})

// testResult 变化时，3 秒后自动清空
watch(testResult, (val) => {
  if (resultTimer) clearTimeout(resultTimer)
  if (val) {
    resultTimer = setTimeout(() => { testResult.value = null }, 3000)
  }
})

// 监听 API 地址变化：若选中预置厂商，自动填充名称
watch(
  () => props.provider.base_url,
  (newUrl) => {
    if (!newUrl) return
    const cleanUrl = extractPureUrl(newUrl)
    const matchedVendor = props.vendors.find(v => v.url === cleanUrl)
    if (matchedVendor && matchedVendor.name) {
      // 仅在名称为空或未修改时自动填充
      if (!props.provider.name || props.provider.name.trim() === '') {
        props.provider.name = matchedVendor.name
      }
    }
  }
)

// 显示剪贴板提示
function showClipboard(msg, color = 'info', duration = 3000) {
  clipboardHint.value = msg
  clipboardHintColor.value = color
  setTimeout(() => { clipboardHint.value = '' }, duration)
}

// 测试当前弹窗中供应商的 API 连通性。
async function testConnection() {
  testResult.value = null
  testingConnection.value = true
  // 清洗 URL，确保传给后端的是纯 API 地址
  const cleanUrl = extractPureUrl(props.provider.base_url)
  props.provider.base_url = cleanUrl

  // Base64 智能解码：自动检测并解码 API Key
  if (props.provider.api_key) {
    const decoded = decodeBase64Smart(props.provider.api_key)
    if (decoded !== props.provider.api_key) {
      props.provider.api_key = decoded
      showClipboard('API Key 已自动从 Base64 解码', 'info')
    }
  }

  // 若模型为空，自动触发模型刷新
  if (!props.provider.model || (typeof props.provider.model === 'string' && !props.provider.model.trim())) {
    try {
      await queryModels()
      if (!props.provider.model || (typeof props.provider.model === 'string' && !props.provider.model.trim())) {
        testResult.value = { success: false, message: '获取模型列表失败，无法执行测试' }
        testingConnection.value = false
        return
      }
    } catch {
      testResult.value = { success: false, message: '获取模型列表失败，无法执行测试' }
      testingConnection.value = false
      return
    }
  }

  const testPayload = {
    base_url: cleanUrl,
    api_key: props.provider.api_key,
    model: props.provider.model,
    provider: props.provider.provider,
  }
  try {
    const result = await new Promise((resolve, reject) => {
      emit('test-connection', {
        payload: testPayload,
        resolve,
        reject,
      })
    })
    connectionTestState.value = true
    testResult.value = { success: true, message: result?.message || '连接成功' }
    props.provider.enabled = true
  } catch (err) {
    connectionTestState.value = false
    testResult.value = { success: false, message: err?.message || '连接失败' }
  } finally {
    testingConnection.value = false
  }
}

// 提交当前弹窗编辑的供应商配置。
function commitProvider() {
  const model = props.provider.model
  if (model && typeof model === 'object') {
    props.provider.model = model.value || model.name || model.label || model.title || ''
  } else if (typeof model !== 'string') {
    props.provider.model = model != null ? String(model) : ''
  }
  if (!props.provider.model?.trim()) {
    props.provider.model = ''
  }
  // 清洗 URL，确保传给后端的是纯 API 地址
  props.provider.base_url = extractPureUrl(props.provider.base_url)

  // API Key 重名校验
  const currentKey = (props.provider.api_key || '').trim()
  if (currentKey) {
    const duplicate = props.existingProviders.find((p, i) => {
      if (props.editorIndex >= 0 && i === props.editorIndex) return false
      return (p.api_key || '').trim() === currentKey
    })
    if (duplicate) {
      testResult.value = { success: false, message: `API Key 已存在（供应商「${duplicate.name || duplicate.id}」），禁止重复添加` }
      return
    }
  }

  emit('commit')
}

// 解析文本并填入 URL、Key、Model（任意组合均可，至少 1 项）。
function parseAndFill(text) {
  if (!text || !text.trim()) return false

  const trimmed = text.trim()
  let url = ''
  let key = ''
  let model = ''

  // 1. 提取 URL（支持标签格式或裸 URL）
  const urlByLabel = trimmed.match(/Base\s*URL\s*[:：]\s*(https?:\/\/[^\s,;|&"'`]+)/i)
  if (urlByLabel) {
    url = urlByLabel[1].replace(/[,;|&"'`]+$/, '')
  } else {
    const urlByRegex = trimmed.match(/https?:\/\/[^\s,;|&"'`]+/)
    if (urlByRegex) {
      url = urlByRegex[0].replace(/[,;|&"'`]+$/, '')
    }
  }

  // 2. 提取 API Key（支持标签格式或裸 Key）
  const keyByLabel = trimmed.match(/API\s*Key\s*[:：]\s*([^\s,;|&"'`\n]+)/i)
  if (keyByLabel) {
    key = keyByLabel[1].replace(/[,;|&"'`]+$/, '')
  } else {
    // 匹配长字符串候选（排除 URL 和已识别的内容）
    const keyCandidates = trimmed.match(/(?:^|\n)\s*([a-zA-Z0-9_-]{20,})\s*(?:$|\n)/gm)
    if (keyCandidates) {
      for (const candidate of keyCandidates) {
        const cleaned = candidate.trim()
        if (cleaned && cleaned !== url && !cleaned.startsWith('http')) {
          key = cleaned
          break
        }
      }
    }
  }

  // 3. 提取 Model（支持标签格式）
  const modelByLabel = trimmed.match(/Model\s*[:：]\s*([^\s,;|&"'`\n]+)/i)
  if (modelByLabel) {
    model = modelByLabel[1].replace(/[,;|&"'`]+$/, '')
  }

  // 4. 至少需要 1 项
  if (!url && !key && !model) {
    showClipboard('格式不正确，请确保文本包含 Base URL、API Key 或 Model', 'error', 4000)
    return false
  }

  // 5. 填入 URL（若匹配预置厂商，watch 会自动填充名称）
  if (url) {
    props.provider.base_url = url
  }

  // 6. 填入 API Key
  if (key) {
    props.provider.api_key = key
  }

  // 7. 填入 Model
  if (model) {
    props.provider.model = model
  }

  return true
}

// 从剪贴板导入：优先自动读取，失败时弹出手动粘贴弹窗。
async function importFromClipboard() {
  clipboardHint.value = ''
  let text = ''

  try {
    text = await navigator.clipboard.readText()
  } catch {
    // 浏览器拦截：打开手动粘贴弹窗
    pasteText.value = ''
    showPasteDialog.value = true
    return
  }

  if (!text || !text.trim()) {
    showClipboard('剪贴板为空', 'warning')
    return
  }

  if (parseAndFill(text)) {
    showClipboard('自动导入成功', 'success')
  }
}

// 手动粘贴弹窗：确认解析。
function confirmPasteImport() {
  if (parseAndFill(pasteText.value)) {
    showPasteDialog.value = false
    pasteText.value = ''
    showClipboard('导入成功', 'success')
  }
}

// 拉取当前 API Key 可用模型并更新下拉选项。
async function queryModels() {
  modelError.value = ''
  loadingModels.value = true
  try {
    // Base64 智能解码：自动检测并解码 API Key
    if (props.provider.api_key) {
      const decoded = decodeBase64Smart(props.provider.api_key)
      if (decoded !== props.provider.api_key) {
        props.provider.api_key = decoded
        showClipboard('API Key 已自动从 Base64 解码', 'info')
      }
    }
    const result = await new Promise((resolve, reject) => {
      emit('query-models', { provider: props.provider, resolve, reject })
    })
    modelOptions.value = normalizeModelOptions(result)
    if (!modelOptions.value.length) {
      modelError.value = '未获取到模型'
      testResult.value = { success: false, message: '获取模型列表失败：未获取到模型' }
    } else if (modelOptions.value.length === 1) {
      // 只有一个模型时自动选中
      props.provider.model = modelOptions.value[0].value
      testResult.value = { success: true, message: `获取模型列表成功，共 ${modelOptions.value.length} 个模型` }
    } else {
      // 多个模型时默认选中第一个
      props.provider.model = modelOptions.value[0].value
      testResult.value = { success: true, message: `获取模型列表成功，共 ${modelOptions.value.length} 个模型` }
    }
  } catch (err) {
    modelError.value = err?.message || '未获取到模型'
    testResult.value = { success: false, message: `获取模型列表失败：${err?.message || '未知错误'}` }
  } finally {
    loadingModels.value = false
  }
}
</script>

<template>
  <VDialog v-model="dialogVisible" max-width="760" max-height="85vh" scrollable>
    <VCard>
      <VCardTitle class="d-flex align-center">
        <span>{{ isEdit ? '编辑供应商' : '新增供应商' }}</span>
        <VSpacer />
        <VBtn
          prepend-icon="mdi-clipboard-arrow-down"
          size="small"
          variant="tonal"
          color="primary"
          class="mr-2"
          @click.stop="importFromClipboard"
        >
          剪贴板导入
        </VBtn>
        <VBtn icon="mdi-close" size="small" variant="text" @click="dialogVisible = false" />
      </VCardTitle>
      <VCardText>
        <div class="form-item">
          <span class="form-label">名称</span>
          <VTextField v-model="provider.name" variant="outlined" density="comfortable" hide-details />
        </div>
        <div class="form-item">
          <span class="form-label">类型</span>
          <VSelect v-model="provider.provider" :items="PROVIDER_TYPE_OPTIONS" variant="outlined" hide-details />
        </div>
        <div class="form-item">
          <span class="form-label">厂商</span>
          <VCombobox
            v-model="provider.base_url"
            :items="vendorUrlOptions"
            item-title="title"
            item-value="value"
            :return-object="false"
            variant="outlined"
            hide-details
            clearable
            placeholder="选择或输入 API 地址"
          />
        </div>
        <div class="form-item">
          <span class="form-label">{{ modelCountText }}</span>
          <div class="input-group">
            <VCombobox
              v-model="provider.model"
              :items="modelOptions"
              :loading="loadingModels"
              :error-messages="modelError"
              variant="outlined"
              clearable
              hide-details
              class="model-combobox"
            />
            <VBtn
              icon="mdi-refresh"
              size="small"
              variant="tonal"
              :loading="loadingModels"
              class="input-action-btn"
              @click.stop="queryModels"
            />
          </div>
        </div>
        <div class="form-item">
          <span class="form-label">API Key</span>
          <div class="input-group">
            <VTextField
              v-model="provider.api_key"
              :type="isEdit && !showApiKey ? 'password' : 'text'"
              variant="outlined"
              hide-details
              class="apikey-field"
            />
            <VBtn
              v-if="isEdit"
              :icon="showApiKey ? 'mdi-eye-off' : 'mdi-eye'"
              size="small"
              variant="tonal"
              class="input-action-btn"
              @click.stop="showApiKey = !showApiKey"
            />
          </div>
        </div>
        <div class="form-item">
          <span class="form-label">User-Agent</span>
          <VTextField v-model="provider.user_agent" variant="outlined" hide-details />
        </div>
        <div class="form-item">
          <span class="form-label">使用代理</span>
          <VSwitch
            v-model="provider.use_proxy"
            color="primary"
            hide-details
            density="compact"
          />
        </div>
        <div class="form-item form-item--merged">
          <div class="form-item__half">
            <span class="form-label">Token 额度</span>
            <VTextField v-model.number="provider.token_limit" type="number" variant="outlined" hide-details />
          </div>
          <div class="form-item__half">
            <span class="form-label">初始已用</span>
            <VTextField v-model.number="provider.used_tokens" type="number" variant="outlined" hide-details />
          </div>
        </div>
      </VCardText>
      <VCardActions class="d-flex justify-end ga-2">
        <VBtn
          :color="testButtonColor"
          :loading="testingConnection"
          @click="testConnection"
        >
          测试
        </VBtn>
        <VBtn color="primary" @click="commitProvider">确定</VBtn>
      </VCardActions>
      <div v-if="testResult" class="px-4 pb-3">
        <VAlert
          :type="testResult.success ? 'success' : 'error'"
          variant="tonal"
          density="compact"
          closable
          @click:close="testResult = null"
        >
          {{ testResult.message }}
        </VAlert>
      </div>
    </VCard>
  </VDialog>
  <VSnackbar
    :model-value="!!clipboardHint"
    :timeout="2500"
    location="top"
    :color="clipboardHintColor"
    variant="tonal"
    @update:model-value="v => { if (!v) clipboardHint = '' }"
  >
    {{ clipboardHint }}
  </VSnackbar>

  <!-- 剪贴板读取失败时的手动粘贴弹窗 -->
  <VDialog v-model="showPasteDialog" max-width="520" persistent>
    <VCard>
      <VCardTitle class="text-subtitle-1">手动粘贴配置</VCardTitle>
      <VCardText>
        <VAlert type="info" variant="tonal" density="compact" class="mb-3">
          浏览器已拦截剪贴板直接读取，请在下方粘贴配置文本
        </VAlert>
        <VTextarea
          v-model="pasteText"
          variant="outlined"
          placeholder="Base URL: https://www.shiro-alice.live:62955/v1&#10;API Key : sk-xxx...&#10;Model   : xopglm52"
          rows="5"
          auto-grow
          hide-details
        />
      </VCardText>
      <VCardActions class="d-flex justify-end ga-2">
        <VBtn variant="text" @click="showPasteDialog = false">取消</VBtn>
        <VBtn color="primary" :disabled="!pasteText.trim()" @click="confirmPasteImport">解析填入</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
/* Label 固定宽度 */
.form-label {
  width: 95px;
  flex-shrink: 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  padding-right: 12px;
}

/* 表单项容器：底部边框贯穿全宽 */
.form-item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.form-item:last-child {
  border-bottom: none;
}

/* 合并行（Token 额度 + 初始已用） */
.form-item--merged {
  gap: 12px;
  padding: 10px 0;
}

.form-item__half {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}

.form-item__half .form-label {
  width: 72px;
  flex-shrink: 0;
}

.form-item__half > .v-input {
  flex: 1;
  min-width: 0;
}

/* 输入框 + 图标按钮组合 */
.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.input-group > .v-input {
  flex: 1;
  min-width: 0;
}

.input-action-btn {
  flex-shrink: 0;
  min-width: 36px !important;
  min-height: 36px !important;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

/* 下拉箭头 */
.dropdown-arrow {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  margin-right: 4px;
}

/* 防止移动端图标被挤出屏幕 */
:deep(.icon-shrink) {
  flex-shrink: 0 !important;
}
:deep(.apikey-field .v-field__append-inner),
:deep(.model-combobox .v-field__append-inner) {
  min-width: 0;
}
:deep(.apikey-field .v-field__input),
:deep(.model-combobox .v-field__input) {
  min-width: 0;
  text-overflow: ellipsis;
}

/* 移动端弹窗优化 */
@media (max-width: 768px) {
  :deep(.v-dialog) {
    width: 92vw !important;
    max-width: 92vw !important;
    margin: 0 auto;
  }

  :deep(.v-card) {
    max-height: 85vh;
    display: flex;
    flex-direction: column;
  }

  :deep(.v-card-title) {
    padding-top: 8px !important;
    padding-bottom: 8px !important;
    padding-left: 12px !important;
    padding-right: 8px !important;
    font-size: 1rem !important;
    flex-shrink: 0;
    gap: 4px;
  }

  :deep(.v-card-text) {
    padding-top: 8px !important;
    padding-bottom: 8px !important;
    padding-left: 12px !important;
    padding-right: 12px !important;
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  :deep(.v-card-actions) {
    padding: 8px 12px !important;
    flex-shrink: 0;
    position: sticky;
    bottom: 0;
    background: rgb(var(--v-theme-surface));
    border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  }

  :deep(.v-input) {
    margin-bottom: 4px;
  }

  /* 移动端 Label 宽度缩小 */
  .form-label {
    width: 72px;
    font-size: 0.8rem;
    padding-right: 8px;
  }

  .form-item__half .form-label {
    width: 60px;
  }
}
</style>
