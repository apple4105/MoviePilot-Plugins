<script setup>
import { ref } from 'vue'
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
})

const emit = defineEmits(['edit', 'remove', 'select', 'toggle', 'reorder'])

const testingRowId = ref(null)
const testResult = ref(null)
const dragIndex = ref(-1)
const dragOverIndex = ref(-1)

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

// 点击行切换活跃供应商
function handleRowClick(index) {
  const row = props.providers[index]
  if (!row) return
  emit('select', row.id)
}

function handleToggle(index) {
  emit('toggle', index)
}

function rowClasses(row) {
  const idx = props.providers.indexOf(row)
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
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in providers"
            :key="row.id || index"
            :draggable="dragMode"
            :class="rowClasses(row)"
            class="clickable-row"
            @click="handleRowClick(index)"
            @dragstart="onDragStart(index, $event)"
            @dragover="onDragOver(index, $event)"
            @dragleave="onDragLeave"
            @drop="onDrop(index, $event)"
            @dragend="onDragEnd"
          >
            <td class="drag-col text-center">
              <VIcon icon="mdi-drag-vertical" size="small" :color="dragMode ? 'primary' : 'disabled'" />
            </td>
            <td class="col-enable" @click.stop="handleToggle(index)">
              <div class="status-toggle-cell">
                <span :class="['status-dot', row.enabled ? 'active' : 'inactive']"></span>
              </div>
            </td>
            <td class="col-name">{{ row.name }}</td>
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
            <td class="col-actions" @click.stop>
              <VBtn icon="mdi-pencil" size="small" variant="text" :disabled="isActive(row)" @click="emit('edit', index)" />
              <VBtn icon="mdi-delete" size="small" variant="text" color="error" :disabled="isActive(row)" @click="emit('remove', index)" />
            </td>
          </tr>
          <tr v-if="!providers.length">
            <td :colspan="showCredentials ? 10 : 8" class="text-center text-medium-emphasis py-8">暂无供应商</td>
          </tr>
        </tbody>
      </VTable>
    </div>
  </VSheet>
</template>

<style scoped>
.provider-table-shell {
  overflow-x: auto;
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

/* 强行撑开表格真实宽度，突破容器 100% 限制 */
.provider-table-scroll :deep(table) {
  min-width: 850px !important;
  width: max-content !important;
  table-layout: auto !important;
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

/* 操作列 */
.provider-table-scroll :deep(.col-actions) {
  width: 88px !important;
  min-width: 88px !important;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clickable-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

/* 仅拖拽模式下行可抓取，非拖拽模式保持普通指针 */
.clickable-row[draggable="true"] {
  cursor: grab;
}

.clickable-row[draggable="true"]:active {
  cursor: grabbing;
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
