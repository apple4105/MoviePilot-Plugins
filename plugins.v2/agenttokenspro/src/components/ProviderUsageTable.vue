<script setup>
import { computed } from 'vue'
import { formatTokens } from '../provider'

const props = defineProps({
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
})

const emit = defineEmits(['reset', 'select', 'open-vendor-edit'])

// 仅展示已启用的供应商，已停用供应商不显示在用量列表中
const displayRows = computed(() => (props.providerRows || []).filter(row => row.enabled !== false))

// 安全获取模型名称字符串，防止 VCombobox 返回对象导致显示 [object Object]
function getModelName(model) {
  if (!model) return ''
  if (typeof model === 'string') return model
  if (typeof model === 'object') {
    return model.value || model.name || model.label || model.title || ''
  }
  return String(model)
}

// 根据供应商状态返回 Vuetify 颜色。
function rowStatusColor(row) {
  if (!row.enabled) return 'default'
  if (row.usage?.exhausted) return 'error'
  if (row.usage?.failure_count >= 3) return 'warning'
  if (!row.api_key || !row.base_url || !row.model) return 'warning'
  return 'success'
}

// 根据供应商状态返回短标签。
function rowStatusText(row) {
  if (!row.enabled) return '停用'
  if (row.usage?.exhausted) return '耗尽'
  if (row.usage?.failure_count >= 3) return '故障'
  if (!row.api_key || !row.base_url || !row.model) return '缺配置'
  return '可用'
}

// 格式化最后使用时间，保留完整日期时间便于核对。
function formatTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').replace(/\.\d+$/, '')
}

function isActive(row) {
  return row.id === props.activeProviderId
}

function isFailed(row) {
  return (props.failedProviderIds || []).includes(row.id)
}

// 点击 ○ 切换活跃供应商（仅启用状态可点击）
function handleSelect(row) {
  if (!row.enabled) return
  if (row.usage?.failure_count >= 3) return
  emit('select', row.id)
}

// 判断是否为故障状态（失败次数 >= 3）
function isFaulty(row) {
  return row.usage?.failure_count >= 3
}

// 点击名称列：通知父组件切换到供应商 Tab 并打开编辑弹窗
function handleNameClick(row) {
  emit('open-vendor-edit', row)
}
</script>

<template>
  <VSheet border rounded class="provider-table-shell">
    <div class="provider-table-scroll">
      <VTable density="comfortable">
        <thead>
          <tr>
            <th class="select-col"></th>
            <th>名称</th>
            <th>模型</th>
            <th>已用</th>
            <th>余量</th>
            <th>进度</th>
            <th>调用</th>
            <th>成功/失败</th>
            <th>最后错误</th>
            <th>最后使用</th>
            <th>状态</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in displayRows"
            :key="row.id || index"
            :class="{
              'provider-row--active': row.id === activeProviderId,
              'provider-row--failed': isFailed(row),
            }"
          >
            <td class="select-col text-center">
              <span
                v-if="row.enabled && isFaulty(row)"
                class="provider-faulty"
                title="故障中，无法切换"
              >
                <VIcon icon="mdi-cancel" size="small" color="error" />
              </span>
              <span
                v-else
                :class="{
                  'provider-lightning': row.enabled && row.id === activeProviderId,
                  'provider-selectable': row.enabled && row.id !== activeProviderId,
                  'provider-disabled': !row.enabled,
                }"
                :title="row.enabled ? '点击设为活跃' : '已停用'"
                @click="handleSelect(row)"
              >
                {{ row.enabled && row.id === activeProviderId ? '⚡' : '○' }}
              </span>
            </td>
            <td class="name-cell">
              <span class="name-link" @click="handleNameClick(row)">{{ row.name }}</span>
            </td>
            <td>{{ getModelName(row.model) }}</td>
            <td>{{ formatTokens(row.usage?.total_tokens) }}</td>
            <td>
              {{ row.usage?.remaining_tokens === null ? '不限' : formatTokens(row.usage?.remaining_tokens) }}
            </td>
            <td class="progress-cell">
              <VProgressLinear
                :model-value="row.usage?.usage_percent || 0"
                :color="rowStatusColor(row)"
                height="8"
                rounded
              />
            </td>
            <td>{{ row.usage?.runs || 0 }}</td>
            <td>
              <span class="text-success">{{ row.usage?.success_count || 0 }}</span>
              /
              <span :class="{ 'text-error': (row.usage?.failure_count || 0) > 0 }">
                {{ row.usage?.failure_count || 0 }}
              </span>
            </td>
            <td class="error-cell">
              <VTooltip v-if="row.usage?.last_error" location="top">
                <template #activator="{ props: tooltipProps }">
                  <span v-bind="tooltipProps" class="text-error text-truncate d-inline-block error-text">
                    {{ row.usage.last_error }}
                  </span>
                </template>
                {{ row.usage.last_error }}
              </VTooltip>
              <span v-else class="text-medium-emphasis">-</span>
            </td>
            <td class="time-cell">
              <span v-if="row.usage?.last_used_at">
                {{ formatTime(row.usage.last_used_at) }}
              </span>
              <span v-else class="text-medium-emphasis">-</span>
            </td>
            <td>
              <VChip size="small" :color="rowStatusColor(row)" variant="tonal">{{ rowStatusText(row) }}</VChip>
            </td>
            <td class="text-right">
              <VBtn icon="mdi-backup-restore" size="small" variant="text" @click="emit('reset', row.id, index)" />
            </td>
          </tr>
          <tr v-if="!displayRows.length">
            <td colspan="13" class="text-center text-medium-emphasis py-8">暂无已启用供应商</td>
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
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.provider-table-scroll :deep(table) {
  min-width: 1000px;
}

.provider-table-scroll :deep(table),
.provider-table-scroll :deep(tr),
.provider-table-scroll :deep(th),
.provider-table-scroll :deep(td) {
  vertical-align: middle !important;
}

.provider-table-scroll :deep(td),
.provider-table-scroll :deep(th) {
  white-space: nowrap;
}

/* 表头居中对齐 */
.provider-table-scroll :deep(th) {
  text-align: center;
}

.select-col {
  width: 36px;
  min-width: 36px;
  max-width: 36px;
  padding: 0 8px 0 4px;
  text-align: center;
}

.select-col span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 20px;
  line-height: 1;
}

/* 闪电图标样式 */
.provider-lightning {
  font-size: 20px !important;
  animation: lightning-pulse 1.5s ease-in-out infinite;
  cursor: default;
}

/* 空心圈图标样式 */
.provider-selectable {
  font-size: 18px !important;
  color: #999;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.provider-selectable:hover {
  opacity: 1;
}

/* 停用状态图标 */
.provider-disabled {
  font-size: 18px !important;
  color: #bbb;
  cursor: not-allowed;
  opacity: 0.3;
}

/* 名称列：避免硬折行，超出显示省略号 */
.provider-table-scroll :deep(th:nth-child(4)),
.provider-table-scroll :deep(td:nth-child(4)) {
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 名称列可点击样式 */
.name-cell {
  max-width: 120px;
}

.name-link {
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  transition: opacity 0.15s ease;
}

.name-link:hover {
  opacity: 0.7;
  text-decoration: underline;
}

/* 模型列：避免挤压错位 */
.provider-table-scroll :deep(th:nth-child(5)),
.provider-table-scroll :deep(td:nth-child(5)) {
  max-width: 110px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-cell {
  min-width: 100px;
}

.error-cell {
  max-width: 160px;
}

.error-text {
  max-width: 140px;
  font-size: 0.8rem;
  cursor: help;
}

.time-cell {
  white-space: nowrap;
  font-size: 0.82rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
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

@keyframes lightning-pulse {
  0% { opacity: 0.6; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 0.6; transform: scale(0.9); }
}

.provider-faulty {
  cursor: not-allowed;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .provider-table-scroll :deep(table) {
    font-size: 0.78rem;
    min-width: 700px;
  }

  .provider-table-scroll :deep(td),
  .provider-table-scroll :deep(th) {
    padding: 8px 6px;
    font-size: 0.78rem;
  }

  .select-col {
    width: 32px;
    min-width: 32px;
    max-width: 32px;
    padding: 0 6px 0 2px;
  }

  .select-col span {
    width: 22px;
    height: 22px;
    font-size: 18px !important;
  }

  .provider-table-scroll :deep(th:nth-child(4)),
  .provider-table-scroll :deep(td:nth-child(4)) {
    max-width: 80px;
  }

  .provider-table-scroll :deep(th:nth-child(5)),
  .provider-table-scroll :deep(td:nth-child(5)) {
    max-width: 70px;
  }
}
</style>
