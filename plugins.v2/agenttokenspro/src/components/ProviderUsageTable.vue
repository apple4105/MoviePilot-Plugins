<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
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
  maxFailures: {
    type: Number,
    default: 3,
  },
})

const emit = defineEmits(['reset', 'select', 'open-vendor-edit', 'test', 'reset-failures'])

const testingId = ref(null)

// 冷却倒计时：每秒更新的时间基准，驱动 cooldownRemaining 响应式刷新
const now = ref(Date.now())
let _nowTimer = null
onMounted(() => {
  _nowTimer = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => {
  if (_nowTimer) { clearInterval(_nowTimer); _nowTimer = null }
})

async function handleTest(row) {
  if (testingId.value) return
  testingId.value = row.id
  try {
    await new Promise((resolve, reject) => {
      emit('test', { providerId: row.id, resolve, reject })
    })
    // 测试结果提示由父组件统一处理
  } catch (_) {
    // 错误提示由父组件统一处理
  } finally {
    testingId.value = null
  }
}

// 仅展示已启用的供应商，已停用供应商不显示在用量列表中
// 排序：活跃供应商(置顶) > 正常(0) > 缺配置(1) > 故障/耗尽(2) > 冷却中(3) > 硬禁用(4)，同组保持原始顺序
const displayRows = computed(() => {
  const rows = (props.providerRows || []).filter(row => row.enabled !== false)
  return [...rows].sort((a, b) => {
    // 活跃供应商始终置顶（仅视图层排序，不修改原始数据，避免 dirty check 误触发）
    const aActive = a.id === props.activeProviderId ? 0 : 1
    const bActive = b.id === props.activeProviderId ? 0 : 1
    if (aActive !== bActive) return aActive - bActive
    const aHard = !!a.usage?.hard_disabled
    const bHard = !!b.usage?.hard_disabled
    const aCooldown = !aHard && (a.usage?.failure_count || 0) >= props.maxFailures && !!a.usage?.disabled_at && !a.usage?.exhausted
    const bCooldown = !bHard && (b.usage?.failure_count || 0) >= props.maxFailures && !!b.usage?.disabled_at && !b.usage?.exhausted
    const aFaulty = !aHard && ((a.usage?.failure_count || 0) >= props.maxFailures || a.usage?.exhausted)
    const bFaulty = !bHard && ((b.usage?.failure_count || 0) >= props.maxFailures || b.usage?.exhausted)
    const aMisconf = !a.api_key || !a.base_url || !a.model
    const bMisconf = !b.api_key || !b.base_url || !b.model
    const aRank = aHard ? 4 : (aCooldown ? 3 : (aFaulty ? 2 : (aMisconf ? 1 : 0)))
    const bRank = bHard ? 4 : (bCooldown ? 3 : (bFaulty ? 2 : (bMisconf ? 1 : 0)))
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

// 根据供应商状态返回 Vuetify 颜色。
function rowStatusColor(row) {
  if (!row.enabled) return 'default'
  if (row.usage?.hard_disabled) return 'error'
  if (row.usage?.exhausted) return 'error'
  if ((row.usage?.failure_count || 0) >= props.maxFailures) return row.usage?.disabled_at ? 'info' : 'error'
  if (!row.api_key || !row.base_url || !row.model) return 'warning'
  return 'success'
}

// 根据供应商状态返回短标签。
function rowStatusText(row) {
  if (!row.enabled) return '停用'
  if (row.usage?.hard_disabled) return '硬禁用'
  if (row.usage?.exhausted) return '耗尽'
  if ((row.usage?.failure_count || 0) >= props.maxFailures) return row.usage?.disabled_at ? '冷却中' : '故障'
  if (!row.api_key || !row.base_url || !row.model) return '缺配置'
  return '可用'
}

// 格式化最后使用时间，保留完整日期时间便于核对。
function formatTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').replace(/\.\d+$/, '')
}

function isFailed(row) {
  return (props.failedProviderIds || []).includes(row.id)
}

// 点击闪电列切换活跃供应商（故障/冷却/缺配置/停用状态不可点击）
function handleSelect(row) {
  if (!row.enabled) return
  if (isFaulty(row)) return
  if (isCooldown(row)) return
  if (isMisconfigured(row)) return
  emit('select', row.id)
}

// 判断是否为故障状态（连续失败达到阈值或额度耗尽或已停用或硬禁用）
// 冷却中（disabled_at 存在）不算硬故障
function isFaulty(row) {
  if (!row.enabled) return true
  if (row.usage?.hard_disabled) return true
  if (row.usage?.exhausted) return true
  if ((row.usage?.failure_count || 0) >= props.maxFailures) return !row.usage?.disabled_at
  return false
}

// 判断供应商是否处于冷却中（失败达阈值且 disabled_at 存在，且非硬禁用）
function isCooldown(row) {
  if (!row.enabled) return false
  if (row.usage?.hard_disabled) return false
  if (row.usage?.exhausted) return false
  if ((row.usage?.failure_count || 0) >= props.maxFailures) return !!row.usage?.disabled_at
  return false
}

// 判断供应商是否缺少必要配置（无 api_key / base_url / model）
function isMisconfigured(row) {
  return !row?.api_key || !row?.base_url || !row?.model
}

// 点击名称列：通知父组件切换到供应商 Tab 并打开编辑弹窗
function handleNameClick(row) {
  emit('open-vendor-edit', row)
}

// 计算冷却剩余时间文本，返回 null 表示不在冷却中或已过期
// 依赖响应式 now，每秒自动刷新
function cooldownRemaining(row) {
  void now.value // 让 Vue 追踪依赖，每秒触发重新计算
  const cooldownUntil = row.usage?.cooldown_until
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
    <div class="provider-table-scroll">
      <VTable density="comfortable" fixed-header>
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
            <th class="text-right col-actions-header">操作</th>
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
                v-else-if="row.enabled && isCooldown(row)"
                class="provider-cooldown"
                title="冷却中，无法切换"
              >🧊</span>
              <span
                v-else-if="row.enabled && isMisconfigured(row)"
                class="provider-misconfigured-icon"
                title="缺少配置，无法切换"
              >📄</span>
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
              <span
                class="name-link"
                :class="{
                  'name-link--faulty': isFaulty(row),
                  'name-link--cooldown': isCooldown(row),
                  'name-link--misconfigured': !isFaulty(row) && !isCooldown(row) && isMisconfigured(row),
                }"
                @click="handleNameClick(row)"
              >{{ row.name }}</span>
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
              <VChip size="small" :color="rowStatusColor(row)" variant="tonal">
                {{ rowStatusText(row) }}
                <span v-if="isCooldown(row) && cooldownRemaining(row)" class="cooldown-countdown">
                  ({{ cooldownRemaining(row) }})
                </span>
              </VChip>
            </td>
            <td class="text-right col-actions">
              <div class="col-actions-inner">
                <VBtn icon="mdi-connection" size="small" variant="text" :loading="testingId === row.id" :disabled="testingId !== null" @click.stop="handleTest(row)" />
                <VTooltip location="top">
                  <template #activator="{ props: tooltipProps }">
                    <VBtn
                      v-bind="tooltipProps"
                      :icon="row.usage?.hard_disabled ? 'mdi-lock-open-variant-outline' : 'mdi-refresh'"
                      size="small"
                      :variant="row.usage?.hard_disabled ? 'tonal' : 'text'"
                      :color="row.usage?.hard_disabled ? 'warning' : undefined"
                      @click.stop="emit('reset-failures', row.id)"
                    />
                  </template>
                  {{ row.usage?.hard_disabled ? '解除硬禁用并重置失败计数' : '重置失败计数与冷却状态' }}
                </VTooltip>
              </div>
            </td>
          </tr>
          <tr v-if="!displayRows.length">
            <td colspan="12" class="text-center text-medium-emphasis py-8">暂无已启用供应商</td>
          </tr>
        </tbody>
      </VTable>
    </div>
  </VSheet>
</template>

<style scoped>
.provider-table-shell.provider-table-shell {
  overflow: hidden;
  max-width: 100% !important;
  width: 100% !important;
  min-width: 0 !important;
  flex: 1 1 auto;
  display: block;
  position: relative;
}

/* 强制消除 Vuetify 卡片及容器宽度与边距限制 */
:deep(.v-card),
:deep(.v-card__text),
:deep(.v-card__body) {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* Vuetify wrapper 不自行滚动，由 .provider-table-scroll 统一管理滚动 */
:deep(.v-table__wrapper),
:deep(.v-data-table__wrapper) {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  overflow: visible !important;
  max-height: none !important;
}

/* 确保表格横向铺满，但允许 min-width 触发横向溢出 */
:deep(.v-table),
:deep(.v-data-table > .v-table__wrapper > table),
:deep(table) {
  width: 100% !important;
}

.provider-table-scroll {
  overflow-x: auto !important;
  overflow-y: visible !important;
  position: relative;
  -webkit-overflow-scrolling: touch;
}

.provider-table-scroll :deep(.v-table__wrapper) {
  overflow: visible !important;
  max-height: none !important;
}

.provider-table-scroll :deep(table) {
  min-width: 1000px !important;
  width: 100% !important;
  table-layout: auto;
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

/* 冷却中图标 */
.provider-cooldown {
  cursor: not-allowed;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
}

/* 缺配置图标 */
.provider-misconfigured-icon {
  cursor: not-allowed;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
}

/* 名称列：弹性宽度，超出显示省略号 */
.provider-table-scroll :deep(th:nth-child(2)),
.provider-table-scroll :deep(td:nth-child(2)) {
  min-width: 80px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 名称列可点击样式 */
.name-cell {
  min-width: 80px;
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

.name-link--faulty {
  color: #ef4444 !important;
}

.name-link--cooldown {
  color: #3b82f6 !important;
}

.name-link--misconfigured {
  color: #eab308 !important;
}

/* 模型列：避免挤压错位 */
.provider-table-scroll :deep(th:nth-child(3)),
.provider-table-scroll :deep(td:nth-child(3)) {
  min-width: 100px;
  max-width: 130px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-cell {
  min-width: 100px;
}

.error-cell {
  min-width: 100px;
}

.error-text {
  max-width: 140px;
  font-size: 0.8rem;
  cursor: help;
}

.time-cell {
  white-space: nowrap;
  min-width: 140px;
  font-size: 0.82rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* 状态列：普通列，跟随表格整体横向滚动 */
.provider-table-scroll :deep(th:nth-child(11)),
.provider-table-scroll :deep(td:nth-child(11)) {
  min-width: 80px;
  white-space: nowrap;
}

.col-actions {
  width: 80px;
  min-width: 80px;
  white-space: nowrap;
  text-align: right;
}

.col-actions-inner {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}

.cooldown-countdown {
  font-size: 11px;
  opacity: 0.85;
  margin-left: 2px;
}

/* active 行背景 */
.provider-table-scroll :deep(tr.provider-row--active) {
  background: rgba(var(--v-theme-primary), 0.06);
}

/* hover 行背景 */
.provider-table-scroll :deep(tr:hover) {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.col-actions-header {
  width: 80px;
  min-width: 80px;
}

/* 表头固定（配合 VTable fixed-header） */
.provider-table-scroll :deep(thead th) {
  position: sticky !important;
  top: 0 !important;
  z-index: 2 !important;
  background: rgb(var(--v-theme-surface)) !important;
}

.provider-table-scroll :deep(tr) {
  background: rgb(var(--v-theme-surface));
}

.provider-table-scroll :deep(tr:hover) {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.provider-row--active {
  background: rgba(var(--v-theme-primary), 0.06) !important;
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
    min-width: 900px;
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

  .provider-table-scroll :deep(th:nth-child(2)),
  .provider-table-scroll :deep(td:nth-child(2)) {
    min-width: 70px;
    max-width: 100px;
  }

  .provider-table-scroll :deep(th:nth-child(3)),
  .provider-table-scroll :deep(td:nth-child(3)) {
    min-width: 90px;
    max-width: 110px;
  }

  /* 移动端保持时间列宽度，防止折行 */
  .time-cell {
    min-width: 130px;
  }

  /* 移动端保持状态列宽度 */
  .provider-table-scroll :deep(th:nth-child(11)),
  .provider-table-scroll :deep(td:nth-child(11)) {
    min-width: 70px;
  }
}
</style>
