<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ProviderConfigTable from './ProviderConfigTable.vue'
import ProviderEditorDialog from './ProviderEditorDialog.vue'
import ProviderUsageTable from './ProviderUsageTable.vue'
import UsageOverviewCard from './UsageOverviewCard.vue'
import VendorManager from './VendorManager.vue'
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
  vendors: {
    type: Array,
    default: () => [],
  },
  api: {
    type: Object,
    required: true,
  },
  pluginBase: {
    type: String,
    default: 'plugin/AgentTokensPro',
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
  'reset-failures',
  'query-models',
  'test-connection',
  'select-provider',
  'test-provider',
])

const activeTab = ref('usage')
const showEditor = ref(false)
const editorIndex = ref(-1)
const editedProvider = ref(createProvider())
const failedProviderIds = ref([])
const testFeedback = ref({ type: '', message: '', show: false })

defineExpose({ failedProviderIds, testFeedback })
const dragMode = ref(false)
const importFileInput = ref(null)
const showDeleteProviderConfirm = ref(false)
const deleteProviderIndex = ref(-1)
const deleteProviderName = ref('')
// 单一数据源：表格始终绑定此数组，拖拽/编辑都直接操作它
const localProviders = ref([])
// 记录进入排序模式时的快照，用于退出时比对是否有变化
let dragSnapshot = []
// 厂商管理 ref
const vendorRef = ref(null)
// 厂商拖拽模式状态（镜像 VendorManager 内部状态）
const vendorDragMode = ref(false)
// 移动端判定：UA + 触控 + 窗口宽度
const isMobile = ref(false)
// 移动端 Tab 列表
const mobileTabs = [
  { value: 'usage', label: '总览' },
  { value: 'config', label: '供应商' },
  { value: 'vendors', label: '厂商' },
]

function checkMobile() {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth <= 768
    || ('ontouchstart' in window)
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
})

const configValue = computed(() => props.config || { enabled: false, show_sidebar_nav: true, max_failures: 3, max_retries: 2, providers: [] })
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

// 切换离开厂商 Tab 时清理未填写数据的临时新增行
// 使用 flush: 'post' 确保 DOM 更新完成后执行，避免 VWindow 过渡动画期间 ref 不可用
watch(activeTab, async (newTab, oldTab) => {
  if (oldTab === 'vendors' && newTab !== 'vendors') {
    await nextTick()
    if (vendorRef.value?.cleanupEmptyVendors) {
      vendorRef.value.cleanupEmptyVendors()
    }
  }
}, { flush: 'post' })

function showTestFeedback(type, message) {
  testFeedback.value = { type, message, show: true }
  setTimeout(() => { testFeedback.value.show = false }, 5000)
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
function editProvider(providerId) {
  const index = localProviders.value.findIndex(p => p.id === providerId)
  if (index < 0) return
  editedProvider.value = { ...localProviders.value[index] }
  editorIndex.value = index
  showEditor.value = true
}

// 将弹窗中的供应商写回配置列表并自动保存。
function commitProvider() {
  const nextProviders = [...localProviders.value]
  const normalized = normalizeProvider(editedProvider.value, nextProviders.length + 1)
  normalized.enabled = true

  if (editorIndex.value >= 0) {
    nextProviders.splice(editorIndex.value, 1, normalized)
  } else {
    nextProviders.push(normalized)
  }
  configValue.value.providers = nextProviders
  showEditor.value = false
  emit('auto-save')
}

// 导出配置：将当前配置（enabled, show_sidebar_nav, max_failures, max_retries, providers）和厂商列表导出为 JSON 文件。
function handleExport() {
  const exportData = {
    version: 'agenttokenspro-export-v2',
    exported_at: new Date().toISOString(),
    config: {
      enabled: Boolean(configValue.value.enabled),
      show_sidebar_nav: Boolean(configValue.value.show_sidebar_nav),
      max_failures: Number(configValue.value.max_failures) || 3,
      max_retries: Number(configValue.value.max_retries) ?? 2,
      providers: (configValue.value.providers || []).map(p => ({ ...p })),
    },
    vendors: (props.vendors || []).map(v => ({ ...v })),
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
  a.download = `AgentTokensPro_config_${timestamp}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 触发文件选择对话框。
function handleImportClick() {
  if (importFileInput.value) {
    importFileInput.value.value = ''
    importFileInput.value.click()
  }
}

// 处理导入文件：读取 JSON 并验证格式后写入配置和厂商数据。
async function handleImportFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target?.result)
      // 验证格式
      const importConfig = data?.config || data
      if (!importConfig || !Array.isArray(importConfig.providers)) {
        alert('导入失败：文件格式不正确，缺少 providers 数组')
        return
      }
      const importVendors = Array.isArray(data?.vendors) ? data.vendors : []
      const totalCount = importConfig.providers.length + importVendors.length
      // 确认覆盖
      const ok = confirm(
        `即将导入 ${importConfig.providers.length} 个供应商和 ${importVendors.length} 个厂商配置，这将覆盖当前所有配置。\n\n确定要继续吗？`,
      )
      if (!ok) return

      // 写入配置（providers + 基础设置）
      configValue.value = {
        enabled: Boolean(importConfig.enabled ?? configValue.value.enabled),
        show_sidebar_nav: Boolean(importConfig.show_sidebar_nav ?? configValue.value.show_sidebar_nav),
        max_failures: Number(importConfig.max_failures) || 3,
        providers: importConfig.providers.map((p, idx) => normalizeProvider(p, idx + 1)),
      }
      localProviders.value = [...configValue.value.providers]
      emit('auto-save')

      // 写入厂商数据（通过 API 逐条保存，保持与前端厂商管理一致的逻辑）
      if (importVendors.length > 0) {
        try {
          // 先清空现有厂商：获取当前列表并逐条删除
          const currentResp = await props.api.get(`${props.pluginBase}/vendors`)
          const currentData = currentResp?.data?.vendors || currentResp?.data || []
          if (Array.isArray(currentData) && currentData.length > 0) {
            for (const v of currentData) {
              if (v?.id) {
                await props.api.post(`${props.pluginBase}/vendors/delete`, { id: v.id })
              }
            }
          }
          // 按 sort_order 排序后逐条新增
          const sortedVendors = [...importVendors].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          for (const vendor of sortedVendors) {
            const { id, ...vendorData } = vendor // 移除旧 ID，让后端生成新 ID
            await props.api.post(`${props.pluginBase}/vendors`, vendorData)
          }
        } catch (vendorErr) {
          console.warn('厂商数据导入失败:', vendorErr)
          alert('供应商配置已导入，但厂商数据导入失败，请手动检查厂商页。')
        }
      }

      // 刷新厂商列表
      emit('refresh')
      alert(`导入成功！已恢复 ${importConfig.providers.length} 个供应商和 ${importVendors.length} 个厂商配置。`)
    } catch (err) {
      alert(`导入失败：${err?.message || '文件解析错误'}`)
    }
  }
  reader.readAsText(file)
}

// 从配置列表中移除一个供应商（弹出二次确认）。
function removeProvider(providerId) {
  const index = localProviders.value.findIndex(p => p.id === providerId)
  if (index < 0) return
  const provider = localProviders.value[index]
  deleteProviderIndex.value = index
  deleteProviderName.value = provider?.name || '未命名'
  showDeleteProviderConfirm.value = true
}

// 确认删除供应商
function confirmDeleteProvider() {
  const index = deleteProviderIndex.value
  if (index < 0) return
  const nextProviders = [...localProviders.value]
  nextProviders.splice(index, 1)
  configValue.value.providers = nextProviders
  showDeleteProviderConfirm.value = false
  deleteProviderIndex.value = -1
  deleteProviderName.value = ''
  emit('auto-save')
}

// 切换供应商启用状态并自动保存。
function toggleProvider(providerId) {
  const index = localProviders.value.findIndex(p => p.id === providerId)
  if (index < 0) return
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

// 切换厂商拖拽排序模式
function toggleVendorDragMode() {
  vendorRef.value?.toggleDragMode()
}

// 从总览页点击名称跳转到供应商 Tab 并打开编辑弹窗
async function openVendorEditFromOverview(row) {
  if (!row || !row.id) {
    showTestFeedback('error', '供应商数据异常，无法编辑')
    return
  }
  // 切换到供应商 Tab
  activeTab.value = 'config'
  // 等待 Tab 切换完成后再打开弹窗
  await nextTick()
  // 在 localProviders 中查找对应供应商
  const index = localProviders.value.findIndex(p => p.id === row.id)
  if (index < 0) {
    showTestFeedback('error', `未找到供应商 [${row.name || row.id}]，可能已被删除`)
    return
  }
  editProvider(index)
}
</script>

<template>
  <div class="agenttokens-page" :class="{ 'is-mobile': isMobile }">
    <div v-if="!hideTitle" class="agenttokens-header">
      <h2 class="text-2xl font-bold leading-7 text-gray-100 truncate sm:text-3xl sm:leading-9">
        <span class="text-moviepilot">Agent Tokens 管理</span>
      </h2>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" :loading="loading" @click="emit('refresh')" />
      <VBtn icon="mdi-content-save" variant="text" color="primary" :loading="saving" @click="emit('save')" />
    </div>

    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</VAlert>

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
            class="center-input"
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

    <VSlideYTransition>
      <VAlert
        v-if="testFeedback.show"
        :type="testFeedback.type"
        variant="tonal"
        density="compact"
        class="my-2"
        closable
        @click:close="testFeedback.show = false"
      >
        {{ testFeedback.message }}
      </VAlert>
    </VSlideYTransition>

    <VSheet border rounded class="agenttokens-content-panel">
      <!-- 移动端：纯静态 Flex 导航条，彻底脱离 Vuetify 滑动引擎 -->
      <div v-if="isMobile" class="mobile-nav-bar">
        <div class="mobile-tabs">
          <button
            v-for="tab in mobileTabs"
            :key="tab.value"
            :class="['mobile-tab-btn', { active: activeTab === tab.value }]"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="mobile-actions">
          <template v-if="activeTab === 'usage'">
            <VBtn size="x-small" variant="text" color="primary" @click="handleExport" class="mobile-action-btn">
              <VIcon size="18">mdi-export</VIcon>
              <span>导出</span>
            </VBtn>
            <VBtn size="x-small" variant="text" color="primary" @click="handleImportClick" class="mobile-action-btn">
              <VIcon size="18">mdi-import</VIcon>
              <span>导入</span>
            </VBtn>
            <input
              ref="importFileInput"
              type="file"
              accept=".json"
              style="display: none"
              @change="handleImportFile"
            />
          </template>
          <template v-if="activeTab === 'config'">
            <VBtn size="x-small" variant="text" color="primary" @click="addProvider" class="mobile-action-btn">
              <VIcon size="18">mdi-plus</VIcon>
              <span>新增</span>
            </VBtn>
            <VBtn
              size="x-small"
              :variant="dragMode ? 'flat' : 'text'"
              :color="dragMode ? 'warning' : 'default'"
              @click="toggleDragMode"
              class="mobile-action-btn"
            >
              <VIcon size="18">mdi-sort</VIcon>
              <span>{{ dragMode ? '完成' : '排序' }}</span>
            </VBtn>
            <VBtn size="x-small" variant="text" color="warning" @click="resetAllUsage" class="mobile-action-btn">
              <VIcon size="18">mdi-backup-restore</VIcon>
              <span>重置</span>
            </VBtn>
          </template>
          <template v-if="activeTab === 'vendors'">
            <VBtn size="x-small" variant="text" color="primary" @click="vendorRef?.addVendor" class="mobile-action-btn">
              <VIcon size="18">mdi-plus</VIcon>
              <span>新增</span>
            </VBtn>
            <VBtn
              size="x-small"
              :variant="vendorDragMode ? 'flat' : 'text'"
              :color="vendorDragMode ? 'warning' : 'default'"
              @click="toggleVendorDragMode"
              class="mobile-action-btn"
            >
              <VIcon size="18">mdi-sort</VIcon>
              <span>{{ vendorDragMode ? '完成' : '排序' }}</span>
            </VBtn>
          </template>
        </div>
      </div>

      <!-- PC 端：保留原 Vuetify 组件 -->
      <div v-else class="agenttokens-tabs-row">
        <VTabs v-model="activeTab" density="comfortable">
          <VTab value="usage">总览</VTab>
          <VTab value="config">供应商</VTab>
          <VTab value="vendors">厂商</VTab>
        </VTabs>
        <div class="agenttokens-table-actions">
          <template v-if="activeTab === 'usage'">
            <VBtn prepend-icon="mdi-export" color="primary" variant="tonal" @click="handleExport">
              导出配置
            </VBtn>
            <VBtn prepend-icon="mdi-import" color="primary" variant="tonal" @click="handleImportClick">
              导入配置
            </VBtn>
            <input
              ref="importFileInput"
              type="file"
              accept=".json"
              style="display: none"
              @change="handleImportFile"
            />
          </template>
          <template v-if="activeTab === 'config'">
            <VBtn prepend-icon="mdi-plus" color="primary" variant="tonal" @click="addProvider">
              新增
            </VBtn>
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
          </template>
          <template v-if="activeTab === 'vendors'">
            <VBtn prepend-icon="mdi-plus" color="primary" variant="tonal" @click="vendorRef?.addVendor">
              新增
            </VBtn>
            <VBtn
              prepend-icon="mdi-sort"
              :color="vendorDragMode ? 'warning' : 'default'"
              :variant="vendorDragMode ? 'flat' : 'tonal'"
              @click="toggleVendorDragMode"
            >
              {{ vendorDragMode ? '完成排序' : '排序' }}
            </VBtn>
          </template>
        </div>
      </div>

      <VDivider />

      <VWindow v-model="activeTab" :touch="false" class="agenttokens-window">
        <VWindowItem value="usage">
          <ProviderUsageTable
            :provider-rows="displayProviderRows"
            :active-provider-id="activeProviderId"
            :failed-provider-ids="failedProviderIds"
            :max-failures="configValue.max_failures || 3"
            @reset="resetUsage"
            @select="selectProvider"
            @open-vendor-edit="openVendorEditFromOverview"
            @test="payload => emit('test-provider', payload)"
            @reset-failures="providerId => emit('reset-failures', providerId)"
          />
        </VWindowItem>

        <VWindowItem value="config">
          <ProviderConfigTable
            :providers="localProviders"
            :provider-rows="displayProviderRows"
            :active-provider-id="activeProviderId"
            :failed-provider-ids="failedProviderIds"
            :drag-mode="dragMode"
            :max-failures="configValue.max_failures || 3"
            show-credentials
            @edit="editProvider"
            @remove="removeProvider"
            @select="selectProvider"
            @toggle="toggleProvider"
            @reorder="reorderProvider"
            @reset-failures="providerId => emit('reset-failures', providerId)"
          />
        </VWindowItem>

        <VWindowItem value="vendors">
          <VendorManager
            ref="vendorRef"
            :vendors="props.vendors"
            :api="props.api"
            :plugin-base="props.pluginBase"
            :loading="loading"
            :visible="activeTab === 'vendors'"
            @refresh="emit('refresh')"
            @drag-mode-change="vendorDragMode = $event"
          />
        </VWindowItem>
      </VWindow>
    </VSheet>

    <ProviderEditorDialog
      v-model="showEditor"
      :retain-focus="false"
      :provider="editedProvider"
      :editor-index="editorIndex"
      :existing-providers="localProviders"
      :vendors="props.vendors"
      @after-leave="resetForm"
      @commit="commitProvider"
      @delete="removeProvider"
      @query-models="payload => emit('query-models', payload)"
      @test-connection="payload => emit('test-connection', payload)"
    />

    <!-- 供应商删除确认弹窗 -->
    <VDialog v-model="showDeleteProviderConfirm" max-width="420" persistent>
      <VCard>
        <VCardTitle class="text-subtitle-1">确认删除</VCardTitle>
        <VCardText>
          确定要删除供应商「<strong>{{ deleteProviderName }}</strong>」吗？此操作不可撤销。
        </VCardText>
        <VCardActions class="d-flex justify-end ga-2">
          <VBtn variant="text" @click="showDeleteProviderConfirm = false">取消</VBtn>
          <VBtn color="error" @click="confirmDeleteProvider">删除</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
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
  grid-template-columns: 2fr 1fr 1fr;
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
  overflow: visible;
  max-width: none !important;
  width: 100% !important;
}

/* 强制消除 Vuetify 卡片及容器宽度与边距限制 */
:deep(.v-sheet),
:deep(.v-card),
:deep(.v-card__text),
:deep(.v-card__body) {
  width: 100% !important;
  max-width: none !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* VWindow / VWindowItem 全链路宽度穿透 */
:deep(.v-window),
:deep(.v-window__container) {
  width: 100% !important;
  max-width: none !important;
  overflow: visible !important;
}

:deep(.v-window-item) {
  width: 100% !important;
  max-width: none !important;
  overflow: visible !important;
  flex: 1 1 100% !important;
}

:deep(.v-window-item > *) {
  width: 100% !important;
  max-width: 100% !important;
  flex: 1 1 auto !important;
}

/* 确保表格横向完全铺满 */
:deep(.v-table),
:deep(table) {
  width: 100% !important;
}

.agenttokens-tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  padding-inline: 8px;
  gap: 8px;
}

.agenttokens-tabs-row :deep(.v-tabs) {
  flex: 0 0 auto;
  min-width: 0;
}

.agenttokens-table-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  flex: 0 0 auto;
  min-width: 0;
}

.agenttokens-window {
  padding: 0;
}

.center-input :deep(input) {
  text-align: center;
}

@media (max-width: 1100px) {
  .agenttokens-overview-grid {
    grid-template-columns: 1fr 1fr;
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
}

/* ========== 移动端：纯静态 Flex 导航条 ========== */
.mobile-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 4px 8px;
  overflow: hidden;
}

.mobile-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-tab-btn {
  background: none;
  border: none;
  font-size: 14px;
  padding: 4px 6px;
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  white-space: nowrap;
  transition: color 0.2s;
}

.mobile-tab-btn.active {
  color: rgb(var(--v-theme-primary));
  font-weight: bold;
  border-bottom: 2px solid rgb(var(--v-theme-primary));
}

.mobile-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.mobile-action-btn {
  height: 28px !important;
  min-width: 0 !important;
  padding: 0 6px !important;
  font-size: 12px !important;
  white-space: nowrap !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 2px !important;
}

.mobile-action-btn :deep(.v-btn__content) {
  display: inline-flex !important;
  align-items: center !important;
  gap: 2px !important;
  font-size: 12px !important;
}
</style>
