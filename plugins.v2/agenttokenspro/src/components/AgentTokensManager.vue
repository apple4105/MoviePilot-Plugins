<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import ProviderConfigTable from './ProviderConfigTable.vue'
import ProviderEditorDialog from './ProviderEditorDialog.vue'
import ProviderUsageTable from './ProviderUsageTable.vue'
import UsageOverviewCard from './UsageOverviewCard.vue'
import {
  buildProviderRows,
  buildProviderSummary,
  createProvider,
  formatTokens,
  getNextProviderPriority,
  normalizeProvider,
} from '../provider'

const props = defineProps({
  config: {
    type: Object,
    default: () => ({ enabled: false, show_sidebar_nav: true, max_failures: 3, providers: [] }),
  },
  providerRows: {
    type: Array,
    default: () => [],
  },
  summary: {
    type: Object,
    default: () => ({}),
  },
  activeProviderId: {
    type: String,
    default: null,
  },
  error: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  hideTitle: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'refresh',
  'save',
  'auto-save',
  'reset-usage',
  'reset-all-usage',
  'query-models',
  'test-connection',
  'select-provider',
])

const activeTab = ref('usage')
const showEditor = ref(false)
const editorIndex = ref(-1)
const editedProvider = ref(createProvider())
const failedProviderIds = ref([])
const testFeedback = ref({ type: '', message: '', show: false })
const dragMode = ref(false)
// 单一数据源：表格始终绑定此数组，拖拽/编辑都直接操作它
const localProviders = ref([])
// 记录进入排序模式时的快照，用于退出时比对是否有变化
let dragSnapshot = []

const configValue = computed(() => props.config || { enabled: false, show_sidebar_nav: true, max_failures: 3, providers: [] })
const providers = computed(() => (Array.isArray(configValue.value.providers) ? configValue.value.providers : []))
const displayProviderRows = computed(() => (
  props.providerRows.length ? props.providerRows : buildProviderRows(providers.value)
))
const displaySummary = computed(() => (
  Object.keys(props.summary || {}).length ? props.summary : buildProviderSummary(displayProviderRows.value)
))
const limitedUsed = computed(() => Number(displaySummary.value.limited_used ?? displaySummary.value.total_used ?? 0))
const unlimitedUsed = computed(() => Number(displaySummary.value.unlimited_used || 0))

// 非拖拽模式下，providers 变化时同步到 localProviders
// 关键：只比较内容，内容一致时直接跳过，防止服务器/父组件回包覆盖
watch(providers, (next) => {
  if (dragMode.value) return
  const nextStr = JSON.stringify(next)
  const curStr = JSON.stringify(localProviders.value)
  if (nextStr === curStr) return
  localProviders.value = next.map(p => ({ ...p }))
}, { immediate: true })

function showTestFeedback(type, message) {
  testFeedback.value = { type, message, show: true }
  setTimeout(() => { testFeedback.value.show = false }, 3000)
}

// 重置弹窗表单为默认值，关闭弹窗。
function resetForm() {
  editedProvider.value = createProvider()
  editorIndex.value = -1
  showEditor.value = false
}

// 打开新增供应商弹窗。
function addProvider() {
  editedProvider.value = { ...createProvider(), priority: getNextProviderPriority(localProviders.value) }
  editorIndex.value = -1
  showEditor.value = true
}

// 打开编辑供应商弹窗。
function editProvider(index) {
  editedProvider.value = { ...localProviders.value[index] }
  editorIndex.value = index
  showEditor.value = true
}

// 将弹窗中的供应商写回配置列表并自动保存。
function commitProvider() {
  const nextProviders = [...localProviders.value]
  const normalized = normalizeProvider(editedProvider.value, nextProviders.length + 1)
  normalized.enabled = true

  // API Key 前三后四查重
  const newKey = (normalized.api_key || '').trim()
  if (newKey && newKey.length >= 7) {
    const newFp = newKey.slice(0, 3) + '...' + newKey.slice(-4)
    const duplicate = nextProviders.find((p, i) => {
      if (editorIndex.value >= 0 && i === editorIndex.value) return false
      const k = (p.api_key || '').trim()
      if (!k || k.length < 7) return false
      const fp = k.slice(0, 3) + '...' + k.slice(-4)
      return fp === newFp
    })
    if (duplicate) {
      const dupFp = (duplicate.api_key || '').trim().slice(0, 3) + '...' + (duplicate.api_key || '').trim().slice(-4)
      showTestFeedback('error', `已存在相同 Key (${dupFp})，供应商「${duplicate.name || duplicate.id}」，禁止重复添加`)
      return
    }
  }

  if (editorIndex.value >= 0) {
    nextProviders.splice(editorIndex.value, 1, normalized)
  } else {
    nextProviders.push(normalized)
  }
  configValue.value.providers = nextProviders
  showEditor.value = false
  emit('auto-save')
}

// 从配置列表中移除一个供应商。
function removeProvider(index) {
  const nextProviders = [...localProviders.value]
  nextProviders.splice(index, 1)
  configValue.value.providers = nextProviders
  emit('auto-save')
}

// 切换供应商启用状态并自动保存。
function toggleProvider(index) {
  const provider = localProviders.value[index]
  if (!provider) return
  provider.enabled = !provider.enabled
  configValue.value.providers = [...localProviders.value]
  emit('auto-save')
}

// 选择供应商为默认，将其置顶并触发连通性测试。
function selectProvider(providerId) {
  // 兼容 index 和 providerId 两种入参
  let resolvedId = providerId
  if (typeof providerId === 'number') {
    const provider = localProviders.value[providerId]
    if (!provider || !provider.id) return
    resolvedId = provider.id
  }

  // 检查供应商是否处于故障状态（连续失败达到阈值）
  const providerWithUsage = displayProviderRows.value.find(p => p.id === resolvedId)
  const failureCount = providerWithUsage?.usage?.failure_count || 0
  const maxFailures = configValue.value.max_failures || 3
  if (failureCount >= maxFailures) {
    showTestFeedback('error', `供应商 [${providerWithUsage?.name || resolvedId}] 已连续失败 ${failureCount} 次，处于故障状态，无法直接启用。请先测试连通性确认恢复后再启用。`)
    return
  }

  // 将选中供应商移到列表首位（置顶）
  const idx = localProviders.value.findIndex(p => p.id === resolvedId)
  if (idx > 0) {
    const nextProviders = [...localProviders.value]
    const [moved] = nextProviders.splice(idx, 1)
    nextProviders.unshift(moved)
    configValue.value.providers = nextProviders
  }
  emit('select-provider', resolvedId)
}

// 拖拽排序：将 from 位置的供应商移到 to 位置（操作 localProviders）。
function reorderProvider(from, to) {
  const src = localProviders.value
  const [moved] = src.splice(from, 1)
  src.splice(to, 0, moved)
  // 清除拖拽高亮状态，防止浏览器残留 DOM 样式与 Vue patch 冲突
  // 通过传递特殊标记让子组件自行清除（或由子组件在 onDrop 中已清除）
}

// 切换拖拽模式：进入时拍快照，退出时一次性提交。
// 核心保障：退出前先同步更新父组件数据，确保 Vue 渲染时拿到新数据
function toggleDragMode() {
  if (dragMode.value) {
    // 退出排序：localProviders 已是最新顺序
    // ① 先同步将最新排序写回父组件数据源
    const target = configValue.value.providers
    if (Array.isArray(target)) {
      target.splice(0, target.length, ...localProviders.value)
    }
    // ② 发起静默保存请求（异步，不阻塞数据更新）
    emit('auto-save')
    // ③ 最后再设置 dragMode = false，此时父组件数据已是最新
    dragMode.value = false
  } else {
    // 进入排序：拍快照（用于比对是否有变化）
    dragSnapshot = localProviders.value.map(p => ({ ...p }))
    dragMode.value = true
  }
}

// 请求重置单个供应商用量并自动保存。
function resetUsage(providerId, index) {
  emit('reset-usage', providerId, index)
}

// 请求重置全部供应商用量并自动保存。
function resetAllUsage() {
  emit('reset-all-usage')
}
</script>

<template>
  <div class="agenttokens-page">
    <div v-if="!hideTitle" class="agenttokens-header">
      <h2 class="text-2xl font-bold leading-7 text-gray-100 truncate sm:text-3xl sm:leading-9">
        <span class="text-moviepilot">Agent Tokens 管理</span>
      </h2>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" :loading="loading" @click="emit('refresh')" />
      <VBtn icon="mdi-content-save" variant="text" color="primary" :loading="saving" @click="emit('save')" />
    </div>

    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</VAlert>

    <VSlideYTransition>
      <VAlert
        v-if="testFeedback.show"
        :type="testFeedback.type"
        variant="tonal"
        density="compact"
        class="mb-3"
        closable
        @click:close="testFeedback.show = false"
      >
        {{ testFeedback.message }}
      </VAlert>
    </VSlideYTransition>

    <VSheet border rounded class="agenttokens-control-panel">
      <!-- 第一行：开关区 -->
      <div class="agenttokens-control-panel__row">
        <div class="agenttokens-control-panel__cell agenttokens-control-panel__cell--left">
          <span class="switch-label">启用插件</span>
          <VSwitch v-model="configValue.enabled" color="primary" hide-details inset />
        </div>
        <div class="agenttokens-control-panel__cell">
          <span class="switch-label">侧边栏入口</span>
          <VSwitch v-model="configValue.show_sidebar_nav" color="primary" hide-details inset />
        </div>
      </div>
      <!-- 第二行：配置区 -->
      <div class="agenttokens-control-panel__row">
        <div class="agenttokens-control-panel__cell agenttokens-control-panel__cell--left">
          <div class="config-label">
            <VIcon icon="mdi-database-outline" color="info" size="small" />
            <span>限量总额度</span>
          </div>
          <span class="agenttokens-control-panel__limit-value">
            {{ displaySummary.total_limit ? formatTokens(displaySummary.total_limit) : '不限' }}
          </span>
        </div>
        <div class="agenttokens-control-panel__cell">
          <span class="config-label">失败切换阈值</span>
          <VTextField
            v-model.number="configValue.max_failures"
            type="number"
            min="1"
            max="100"
            density="compact"
            hide-details
            variant="outlined"
            style="max-width: 72px;"
          />
        </div>
      </div>
    </VSheet>

    <div class="agenttokens-overview-grid">
      <UsageOverviewCard class="agenttokens-overview-card" :summary="displaySummary" />
      <VSheet border rounded class="agenttokens-stat-card">
        <VIcon icon="mdi-check-decagram-outline" color="success" />
        <div>
          <div class="text-caption text-medium-emphasis">可用供应商</div>
          <div class="agenttokens-stat-card__value">
            {{ displaySummary.available_count || 0 }} / {{ displaySummary.enabled_count || 0 }}
          </div>
        </div>
      </VSheet>
      <VSheet border rounded class="agenttokens-stat-card">
        <VIcon icon="mdi-chart-timeline-variant" color="primary" />
        <div>
          <div class="text-caption text-medium-emphasis">累计使用</div>
          <div class="agenttokens-stat-card__value">{{ formatTokens(displaySummary.total_used) }}</div>
          <div class="agenttokens-stat-card__hint">
            限量 {{ formatTokens(limitedUsed) }} / 不限量 {{ formatTokens(unlimitedUsed) }}
          </div>
        </div>
      </VSheet>
    </div>

    <VSheet border rounded class="agenttokens-content-panel">
      <div class="agenttokens-tabs-row">
        <VTabs v-model="activeTab" density="comfortable">
          <VTab value="usage">用量</VTab>
          <VTab value="config">配置</VTab>
        </VTabs>
      </div>

      <VDivider />

      <VWindow v-model="activeTab" :touch="false" class="agenttokens-window">
        <VWindowItem value="usage">
          <ProviderUsageTable
            :provider-rows="displayProviderRows"
            :active-provider-id="activeProviderId"
            :failed-provider-ids="failedProviderIds"
            @reset="resetUsage"
            @select="selectProvider"
          />
        </VWindowItem>

        <VWindowItem value="config">
          <div class="agenttokens-table-actions">
            <VBtn prepend-icon="mdi-plus" color="primary" variant="tonal" @click="addProvider">新增</VBtn>
            <VBtn
              prepend-icon="mdi-sort"
              :color="dragMode ? 'warning' : 'default'"
              :variant="dragMode ? 'flat' : 'tonal'"
              @click="toggleDragMode"
            >
              {{ dragMode ? '完成排序' : '排序' }}
            </VBtn>
            <VBtn prepend-icon="mdi-backup-restore" color="warning" variant="tonal" @click="resetAllUsage">
              重置用量
            </VBtn>
          </div>
          <ProviderConfigTable
            :providers="localProviders"
            :provider-rows="displayProviderRows"
            :active-provider-id="activeProviderId"
            :failed-provider-ids="failedProviderIds"
            :drag-mode="dragMode"
            show-credentials
            @edit="editProvider"
            @remove="removeProvider"
            @select="selectProvider"
            @toggle="toggleProvider"
            @reorder="reorderProvider"
          />
        </VWindowItem>
      </VWindow>
    </VSheet>

    <ProviderEditorDialog
      v-model="showEditor"
      :retain-focus="false"
      :provider="editedProvider"
      :editor-index="editorIndex"
      @after-leave="resetForm"
      @commit="commitProvider"
      @query-models="payload => emit('query-models', payload)"
      @test-connection="payload => emit('test-connection', payload)"
    />
  </div>
</template>

<style scoped>
.agenttokens-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.agenttokens-header {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 16px 0;
}

@media (max-width: 768px) {
  .agenttokens-header {
    padding: 8px 0;
  }
  .agenttokens-header h2 {
    font-size: 1.1rem !important;
    line-height: 1.3 !important;
  }
}

.agenttokens-control-panel {
  display: flex;
  flex-direction: column;
  padding: 0;
  gap: 0;
}

.agenttokens-control-panel__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
}

.agenttokens-control-panel__row + .agenttokens-control-panel__row {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.agenttokens-control-panel__cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  gap: 8px;
}

.agenttokens-control-panel__cell--left {
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.switch-label {
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
}

.config-label {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.agenttokens-control-panel__limit-value {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .agenttokens-control-panel__cell {
    padding: 8px 10px;
    gap: 6px;
  }

  .switch-label {
    font-size: 13px;
  }

  .config-label {
    font-size: 13px;
  }

  .agenttokens-control-panel__limit-value {
    font-size: 13px;
  }
}

.agenttokens-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) repeat(3, minmax(10rem, 1fr));
  gap: 12px;
}

.agenttokens-overview-card {
  min-block-size: 172px;
}

.agenttokens-stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-block-size: 104px;
  padding: 16px;
}

.agenttokens-stat-card__value {
  margin-block-start: 2px;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.agenttokens-stat-card__hint {
  margin-block-start: 2px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.78rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.agenttokens-content-panel {
  overflow: hidden;
}

.agenttokens-tabs-row {
  padding-inline: 8px;
}

.agenttokens-window {
  padding: 12px;
}

.agenttokens-table-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-block-end: 12px;
}

@media (max-width: 1100px) {
  .agenttokens-overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agenttokens-overview-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .agenttokens-overview-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .agenttokens-overview-card {
    grid-column: 1 / -1;
    min-block-size: auto;
  }

  .agenttokens-stat-card {
    min-block-size: auto;
    padding: 10px 12px;
    gap: 8px;
  }

  .agenttokens-stat-card__value {
    font-size: 1.15rem;
    line-height: 1.3;
  }

  .agenttokens-stat-card__hint {
    font-size: 0.72rem;
    line-height: 1.3;
    margin-block-start: 1px;
  }
}

@media (max-width: 700px) {
  .agenttokens-page {
    padding: 12px;
  }

  .agenttokens-table-actions > :deep(.v-btn) {
    flex: 1 1 10rem;
  }
}
</style>
