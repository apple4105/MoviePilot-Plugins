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
})

const emit = defineEmits(['update:modelValue', 'commit', 'query-models', 'test-connection'])

const modelOptions = ref([])
const loadingModels = ref(false)
const testingConnection = ref(false)
const modelError = ref('')
const testResult = ref(null)
const showApiKey = ref(false)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const isEdit = computed(() => props.editorIndex >= 0)

// 模型数量提示
const modelCountText = computed(() => {
  const count = modelOptions.value?.length || 0
  return count > 0 ? `模型 (${count})` : '模型'
})

// 是否显示下拉箭头（模型数 > 1）
const showDropdownArrow = computed(() => (modelOptions.value?.length || 0) > 1)

// 测试按钮颜色：成功绿色、失败红色、默认紫色
const testButtonColor = computed(() => {
  if (testResult.value?.success === true) return 'success'
  if (testResult.value?.success === false) return 'error'
  return 'primary'
})

watch(dialogVisible, (val) => {
  if (val) {
    showApiKey.value = false
    modelError.value = ''
    testResult.value = null
    // 弹窗打开时清空模型列表，防止上次残留
    modelOptions.value = []
  }
})

// 测试当前弹窗中供应商的 API 连通性（发送真实请求验证 Key+地址+模型）。
async function testConnection() {
  testResult.value = null
  testingConnection.value = true
  const testPayload = {
    base_url: props.provider.base_url,
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
    testResult.value = { success: true, message: result?.message || '连接成功' }
    // 测试成功时自动启用供应商
    props.provider.enabled = true
  } catch (err) {
    testResult.value = { success: false, message: err?.message || '连接失败' }
  } finally {
    testingConnection.value = false
  }
}

// 提交当前弹窗编辑的供应商配置。
function commitProvider() {
  // 强制 model 为字符串，防止 VCombobox 返回对象
  const model = props.provider.model
  if (model && typeof model === 'object') {
    // 从 { title, value } 对象中提取 value
    props.provider.model = model.value || model.name || model.label || model.title || ''
  } else if (typeof model !== 'string') {
    props.provider.model = model != null ? String(model) : ''
  }
  if (!props.provider.model?.trim()) {
    props.provider.model = ''
  }
  emit('commit')
}

// 拉取当前 API Key 可用模型并更新下拉选项。
async function queryModels() {
  modelError.value = ''
  loadingModels.value = true
  try {
    const result = await new Promise((resolve, reject) => {
      emit('query-models', { provider: props.provider, resolve, reject })
    })
    modelOptions.value = normalizeModelOptions(result)
    if (!modelOptions.value.length) {
      modelError.value = '未获取到模型'
    }
  } catch (err) {
    modelError.value = err?.message || '未获取到模型'
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
        <VBtn icon="mdi-close" size="small" variant="text" @click="dialogVisible = false" />
      </VCardTitle>
      <VCardText>
        <div class="form-item">
          <span class="form-label">名称</span>
          <VTextField v-model="provider.name" variant="outlined" density="comfortable" hide-details />
        </div>
        <div class="form-item">
          <span class="form-label">优先级</span>
          <VTextField v-model.number="provider.priority" type="number" variant="outlined" hide-details />
        </div>
        <div class="form-item">
          <span class="form-label">类型</span>
          <VSelect v-model="provider.provider" :items="PROVIDER_TYPE_OPTIONS" variant="outlined" hide-details />
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
            >
              <template #append-inner>
                <VIcon v-if="showDropdownArrow" icon="mdi-chevron-down" size="small" class="dropdown-arrow" />
              </template>
            </VCombobox>
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
          <span class="form-label">API 地址</span>
          <VTextField v-model="provider.base_url" variant="outlined" hide-details />
        </div>
        <div class="form-item">
          <span class="form-label">API Key</span>
          <div v-if="isEdit" class="input-group">
            <VTextField
              v-model="provider.api_key"
              :type="showApiKey ? 'text' : 'password'"
              variant="outlined"
              hide-details
              class="apikey-field"
            />
            <VBtn
              :icon="showApiKey ? 'mdi-eye-off' : 'mdi-eye'"
              size="small"
              variant="tonal"
              class="input-action-btn"
              @click.stop="showApiKey = !showApiKey"
            />
          </div>
          <VTextField
            v-else
            v-model="provider.api_key"
            type="password"
            variant="outlined"
            hide-details
            class="apikey-field"
          />
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
