<script setup>
import { ref, computed } from 'vue'
import { formatTokens } from '../provider'

const props = defineProps({
  providers: {
    type: Array,
    default: () => [],
  },
  providerRows: {
    type: Array,
    default: () => [],
  },
  activeProviderId: {
    type: String,
    default: null,
  },
  failedProviderIds: {
    type: Array,
    default: () => [],
  },
  showCredentials: {
    type: Boolean,
    default: false,
  },
  dragMode: {
    type: Boolean,
    default: false,
  },
  maxFailures: {
    type: Number,
    default: 3,
  },
})

const emit = defineEmits(['edit', 'remove', 'select', 'toggle', 'reorder', 'reset-failures'])

const dragIndex = ref(-1)
const dragOverIndex = ref(-1)

// 排序：正常(0) > 缺配置(1) > 故障/耗尽(2) > 冷却中(3) > 硬禁用(4)，同组保持原始顺序
// 拖拽模式下不排序，保持用户拖拽顺序
const sortedProviders = computed(() => {
  if (props.dragMode) return [...props.providers]
  return [...props.providers].sort((a, b) => {
    const aRank = isHardDisabled(a) ? 4 : (isCooldown(a) ? 3 : (isFaulty(a) ? 2 : (isMisconfigured(a) ? 1 : 0)))
    const bRank = isHardDisabled(b) ? 4 : (isCooldown(b) ? 3 : (isFaulty(b) ? 2 : (isMisconfigured(b) ? 1 : 0)))
    return aRank - bRank
  })
})

// 安全获取模型名称字符串，防止 VCombobox 返回对象导致显示 [object Object]
function getModelName(model) {
  if (!model) return ''
  if (typeof model === 'string') return model
  if (typeof model === 'object') {
    return model.value || model.name || model.label || model.title || ''
  }
  return String(model)
}

// 获取管理页服务端返回的脱敏 Key。
// providerRows 按原始顺序（与 props.providers 同步），直接用 index 即可
function getMaskedApiKey(row) {
  // 优先按 id 精确匹配，避免排序后 index 错位
  const matched = props.providerRows.find(r => r.id === row.id)
  return matched?.masked_api_key || row.masked_api_key || '****'
}

function isActive(row) {
  return row.id === props.activeProviderId
}

function isFailed(row) {
  return props.failedProviderIds.includes(row.id)
}

// 判断供应商是否处于故障状态（连续失败达到阈值或额度耗尽或已停用或硬禁用）
// 冷却中（disabled_at 存在）不算硬故障，名称不标红
function isFaulty(row) {
  if (!row.enabled) return true
  const matched = props.providerRows.find(r => r.id === row.id)
  if (matched?.usage?.hard_disabled) return true
  if (matched?.usage?.exhausted) return true
  if ((matched?.usage?.failure_count || 0) >= props.maxFailures) return !matched?.usage?.disabled_at
  return false
}

// 判断供应商是否处于冷却中（失败达阈值且 disabled_at 存在，且非硬禁用）
function isCooldown(row) {
  if (!row.enabled) return false
  const matched = props.providerRows.find(r => r.id === row.id)
  if (matched?.usage?.hard_disabled) return false
  if (matched?.usage?.exhausted) return false
  if ((matched?.usage?.failure_count || 0) >= props.maxFailures) return !!matched?.usage?.disabled_at
  return false
}

// 判断供应商是否被硬禁用（401/402/403/404/429 致命错误）
function isHardDisabled(row) {
  const matched = props.providerRows.find(r => r.id === row.id)
  return !!matched?.usage?.hard_disabled
}

// 判断供应商是否缺少必要配置（无 api_key / base_url / model）
function isMisconfigured(row) {
  return !row?.api_key || !row?.base_url || !row?.model
}

function handleToggle(row) {
  emit('toggle', row.id)
}

function rowClasses(row) {
  const idx = sortedProviders.value.indexOf(row)
  return {
    'provider-row--active': isActive(row),
    'provider-row--failed': isFailed(row),
    'provider-row--drag-over': props.dragMode && idx === dragOverIndex.value && dragOverIndex.value !== dragIndex.value,
    'provider-row--dragging': props.dragMode && idx === dragIndex.value,
  }
}

function onDragStart(index, e) {
  if (!props.dragMode) return
  dragIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(index))
}

function onDragOver(index, e) {
  if (!props.dragMode) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = index
}

function onDragLeave() {
  dragOverIndex.value = -1
}

function onDrop(index, e) {
  e.preventDefault()
  if (!props.dragMode || dragIndex.value < 0) return
  const from = dragIndex.value
  const to = index
  if (from !== to) {
    emit('reorder', from, to)
  }
  dragIndex.value = -1
  dragOverIndex.value = -1
}

function onDragEnd() {
  dragIndex.value = -1
  dragOverIndex.value = -1
}

// 状态 Chip 颜色
function rowStatusColor(row) {
  if (!row.enabled) return 'default'
  if (isHardDisabled(row)) return 'error'
  if (isCooldown(row)) return 'info'
  if (isFaulty(row)) return 'error'
  if (isMisconfigured(row)) return 'warning'
  return 'success'
}

// 状态 Chip 文本
function rowStatusText(row) {
  if (!row.enabled) return '已停用'
  if (isHardDisabled(row)) return '硬禁用'
  if (isCooldown(row)) return '冷却中'
  if (isFaulty(row)) return '故障'
  if (isMisconfigured(row)) return '缺配置'
  return '正常'
}

// 冷却剩余时间
function cooldownRemaining(row) {
  const matched = props.providerRows.find(r => r.id === row.id)
  const cooldownUntil = matched?.usage?.cooldown_until
  if (!cooldownUntil) return null
  const target = new Date(cooldownUntil.replace(' ', 'T'))
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return null
  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  if (minutes > 0) return `${minutes}m${String(seconds).padStart(2, '0')}s`
  return `${seconds}s`
}
</script>

<template>
  <VSheet border rounded class="provider-table-shell">
    <div class="provider-table-scroll" :class="{ 'is-drag-mode': dragMode }">
      <VTable density="comfortable">
        <thead>
          <tr>
            <th class="drag-col"></th>
            <th class="col-enable">启用</th>
            <th class="col-name">名称</th>
            <th class="col-type">类型</th>
            <th v-if="showCredentials" class="col-url">地址</th>
            <th v-if="showCredentials" class="col-key">Key</th>
            <th class="col-proxy">代理</th>
            <th class="col-model">模型</th>
            <th class="col-limit">额度</th>
            <th class="col-status">状态</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in sortedProviders"
            :key="row.id || index"
            :draggable="dragMode"
            :class="rowClasses(row)"
            class="provider-row"
            @dragstart="onDragStart(index, $event)"
            @dragover="onDragOver(index, $event)"
            @dragleave="onDragLeave"
            @drop="onDrop(index, $event)"
            @dragend="onDragEnd"
          >
            <td class="drag-col text-center">
              <VIcon icon="mdi-drag-vertical" size="small" :color="dragMode ? 'primary' : 'disabled'" />
            </td>
            <td class="col-enable" @click.stop="handleToggle(row)">
              <div class="status-toggle-cell">
                <span :class="['status-dot', row.enabled ? 'active' : 'inactive']"></span>
              </div>
            </td>
            <td class="col-name">
              <span :class="{
                'provider-name--faulty': isFaulty(row),
                'provider-name--cooldown': isCooldown(row),
                'provider-name--misconfigured': !isFaulty(row) && !isCooldown(row) && isMisconfigured(row),
              }">{{ row.name }}</span>
            </td>
            <td class="col-type">{{ row.provider }}</td>
            <td v-if="showCredentials" class="col-url">{{ row.base_url }}</td>
            <td v-if="showCredentials" class="col-key">{{ getMaskedApiKey(row) }}</td>
            <td class="col-proxy">
              <VChip size="small" :color="row.use_proxy === false ? 'default' : 'primary'" variant="tonal">
                {{ row.use_proxy === false ? '直连' : '代理' }}
              </VChip>
            </td>
            <td class="col-model">{{ getModelName(row.model) }}</td>
            <td class="col-limit">{{ row.token_limit > 0 ? formatTokens(row.token_limit) : '不限' }}</td>
            <td class="col-status">
              <VChip size="small" :color="rowStatusColor(row)" variant="tonal">
                {{ rowStatusText(row) }}
                <span v-if="isCooldown(row) && cooldownRemaining(row)" class="cooldown-countdown">
                  ({{ cooldownRemaining(row) }})
                </span>
              </VChip>
            </td>
            <td class="col-actions" @click.stop>
              <VTooltip location="top">
                <template #activator="{ props: tooltipProps }">
                  <VBtn
                    v-bind="tooltipProps"
                    :icon="isHardDisabled(row) ? 'mdi-lock-open-variant-outline' : 'mdi-refresh'"
                    size="small"
                    :variant="isHardDisabled(row) ? 'tonal' : 'text'"
                    :color="isHardDisabled(row) ? 'warning' : undefined"
                    @click="emit('reset-failures', row.id)"
                  />
                </template>
                {{ isHardDisabled(row) ? '解除硬禁用并重置失败计数' : '重置失败计数与冷却状态' }}
              </VTooltip>
              <VBtn icon="mdi-pencil" size="small" variant="text" :disabled="isActive(row)" @click="emit('edit', row.id)" />
              <VBtn icon="mdi-delete" size="small" variant="text" color="error" :disabled="isActive(row)" @click="emit('remove', row.id)" />
            </td>
          </tr>
          <tr v-if="!sortedProviders.length">
            <td :colspan="showCredentials ? 11 : 9" class="text-center text-medium-emphasis py-8">暂无供应商</td>
          </tr>
        </tbody>
      </VTable>
    </div>
  </VSheet>
</template>

<style scoped>
.provider-table-shell {
  overflow-x: auto;
  max-width: 100% !important;
  width: 100% !important;
  min-width: 0 !important;
}

.provider-table-scroll {
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch;
}

/* Vuetify VTable 内部滚动容器 */
.provider-table-scroll :deep(.v-table__wrapper) {
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch;
}

/* 强制消除 Vuetify 卡片及容器宽度与边距限制 */
:deep(.v-card),
:deep(.v-card__text),
:deep(.v-card__body),
:deep(.v-data-table),
:deep(.v-data-table__wrapper) {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* 表格撑满容器宽度，窄屏时通过 min-width 保证横向滚动 */
.provider-table-scroll :deep(table) {
  min-width: 850px !important;
  width: 100% !important;
  max-width: 100% !important;
  table-layout: auto !important;
}

/* 确保表格横向完全铺满 */
:deep(.v-table),
:deep(.v-data-table > .v-table__wrapper > table) {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
}

.provider-table-scroll :deep(table),
.provider-table-scroll :deep(tr),
.provider-table-scroll :deep(th),
.provider-table-scroll :deep(td) {
  vertical-align: middle !important;
}

/* 全局：强制单行、溢出隐藏、省略号截断，确保单元格独立不重叠 */
.provider-table-scroll :deep(td),
.provider-table-scroll :deep(th) {
  transition-property: box-shadow, opacity, background;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

/* 表头居中对齐 */
.provider-table-scroll :deep(th) {
  text-align: center;
}

/* 拖拽 handle 列：非拖拽模式下不占位，消除左侧空洞 */
.provider-table-scroll :deep(.drag-col) {
  width: 0;
  min-width: 0;
  padding: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease, width 0.15s ease;
}

.provider-table-scroll.is-drag-mode :deep(.drag-col) {
  width: 36px;
  min-width: 36px;
  padding: 0 2px;
  opacity: 1;
  pointer-events: auto;
}

/* 启用列：固定 44px，居中显示 */
.provider-table-scroll :deep(.col-enable) {
  width: 44px !important;
  min-width: 44px !important;
  text-align: center !important;
}

.status-toggle-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

.status-dot {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.status-dot.active {
  background-color: #7c4dff;
  box-shadow: 0 0 6px rgba(124, 77, 255, 0.5);
}

.status-dot.inactive {
  border: 2px solid #ccc;
  background-color: transparent;
}

/* 名称列：完整显示不截断，移除任何 max-width 限制 */
.provider-table-scroll :deep(.col-name) {
  min-width: 130px !important;
  white-space: nowrap !important;
}

/* 类型列 */
.provider-table-scroll :deep(.col-type) {
  min-width: 80px !important;
  width: 80px !important;
}

/* 地址列：长文本省略号截断 */
.provider-table-scroll :deep(.col-url) {
  max-width: 140px !important;
  min-width: 80px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

/* Key 列：省略号截断 */
.provider-table-scroll :deep(.col-key) {
  max-width: 120px !important;
  min-width: 80px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

/* 代理列 */
.provider-table-scroll :deep(.col-proxy) {
  width: 64px !important;
  min-width: 64px !important;
}

/* 模型列：充足宽度保障完整显示，移除任何 max-width 限制 */
.provider-table-scroll :deep(.col-model) {
  min-width: 180px !important;
  white-space: nowrap !important;
}

/* 额度列 */
.provider-table-scroll :deep(.col-limit) {
  min-width: 80px !important;
  width: 80px !important;
}

/* 状态列 */
.provider-table-scroll :deep(.col-status) {
  min-width: 90px !important;
  width: 90px !important;
  text-align: center !important;
}

/* 操作列 */
.provider-table-scroll :deep(.col-actions) {
  width: 120px !important;
  min-width: 120px !important;
}

.provider-row {
  transition: background-color 0.15s ease;
}

.provider-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.provider-row--active {
  background: rgba(var(--v-theme-primary), 0.06);
}

.provider-row--active:hover {
  background: rgba(var(--v-theme-primary), 0.1) !important;
}

.provider-row--failed {
  animation: fail-flash 1.5s ease-in-out;
}

@keyframes fail-flash {
  0% { background: rgba(var(--v-theme-error), 0.18); }
  100% { background: transparent; }
}

.provider-row--drag-over {
  border-top: 2px solid rgb(var(--v-theme-primary)) !important;
}

.provider-row--dragging {
  opacity: 0.4;
  background: rgba(var(--v-theme-primary), 0.08);
}

/* 故障供应商名称红色高亮 */
.provider-name--faulty {
  color: #ef4444 !important;
}

/* 冷却中供应商名称蓝色高亮 */
.provider-name--cooldown {
  color: #3b82f6 !important;
}

/* 未配置供应商名称黄色高亮 */
.provider-name--misconfigured {
  color: #eab308 !important;
}

/* 冷却倒计时文字 */
.cooldown-countdown {
  font-size: 0.7rem;
  opacity: 0.8;
  margin-left: 2px;
}



@media (max-width: 700px) {
  .provider-table-scroll :deep(table) {
    font-size: 0.82rem;
    min-width: 500px;
  }

  .provider-table-scroll :deep(td),
  .provider-table-scroll :deep(th) {
    padding: 8px 6px;
  }

  /* 超窄屏隐去 Key 列，保留名称/类型/地址等核心列 */
  .provider-table-scroll :deep(.col-key) {
    display: none;
  }
}

@media (max-width: 600px) {
  /* 超窄屏也隐去代理列，进一步释放空间 */
  .provider-table-scroll :deep(.col-proxy) {
    display: none;
  }
}
</style>
