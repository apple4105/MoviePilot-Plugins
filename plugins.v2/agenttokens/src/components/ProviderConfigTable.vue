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
})

const emit = defineEmits(['edit', 'remove', 'select', 'toggle'])

const testingRowId = ref(null)
const testResult = ref(null)

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
function getMaskedApiKey(index) {
  return props.providerRows[index]?.masked_api_key || '****'
}

function isActive(row) {
  return row.id === props.activeProviderId
}

function isFailed(row) {
  return props.failedProviderIds.includes(row.id)
}

function handleRowClick(index) {
  const row = props.providers[index]
  if (!row) return
  // 点击行也触发活跃供应商切换
  emit('select', row.id)
}

function handleToggle(index) {
  emit('toggle', index)
}

// 点击 ○ 切换活跃供应商
function handleSelect(providerId) {
  emit('select', providerId)
}

function rowClasses(row) {
  return {
    'provider-row--active': isActive(row),
    'provider-row--failed': isFailed(row),
  }
}
</script>

<template>
  <VSheet border rounded class="provider-table-shell">
    <div class="provider-table-scroll">
      <VTable density="comfortable">
        <thead>
          <tr>
            <th class="select-col"></th>
            <th>启用</th>
            <th>优先级</th>
            <th>名称</th>
            <th>类型</th>
            <th v-if="showCredentials">地址</th>
            <th v-if="showCredentials">Key</th>
            <th>代理</th>
            <th>模型</th>
            <th>额度</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in providers"
            :key="row.id || index"
            :class="rowClasses(row)"
            class="clickable-row"
            @click="handleRowClick(index)"
          >
            <td class="select-col text-center" @click.stop>
              <span
                :class="{
                  'provider-lightning': row.enabled && isActive(row),
                  'provider-selectable': row.enabled && !isActive(row),
                  'provider-disabled': !row.enabled,
                }"
                :title="row.enabled ? '点击设为活跃' : '已停用'"
                @click.stop="row.enabled && handleSelect(row.id)"
              >
                {{ row.enabled && isActive(row) ? '⚡' : '○' }}
              </span>
            </td>
            <td @click.stop>
              <VSwitch
                :model-value="row.enabled"
                color="primary"
                hide-details
                density="compact"
                @update:model-value="handleToggle(index)"
              />
            </td>
            <td>{{ row.priority }}</td>
            <td>{{ row.name }}</td>
            <td>{{ row.provider }}</td>
            <td v-if="showCredentials" class="truncate-cell">{{ row.base_url }}</td>
            <td v-if="showCredentials">{{ getMaskedApiKey(index) }}</td>
            <td>
              <VChip size="small" :color="row.use_proxy === false ? 'default' : 'primary'" variant="tonal">
                {{ row.use_proxy === false ? '直连' : '代理' }}
              </VChip>
            </td>
            <td>{{ getModelName(row.model) }}</td>
            <td>{{ row.token_limit > 0 ? formatTokens(row.token_limit) : '不限' }}</td>
            <td class="text-right" @click.stop>
              <VBtn icon="mdi-pencil" size="small" variant="text" @click="emit('edit', index)" />
              <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="emit('remove', index)" />
            </td>
          </tr>
          <tr v-if="!providers.length">
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
}

.provider-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.provider-table-scroll :deep(table) {
  min-width: 860px;
}

.select-col {
  width: 40px;
  min-width: 40px;
  padding: 0 4px;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clickable-row:hover {
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

.provider-lightning {
  animation: lightning-pulse 1.5s ease-in-out infinite;
  cursor: default;
}

@keyframes lightning-pulse {
  0% { opacity: 0.6; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 0.6; transform: scale(0.9); }
}

.provider-selectable {
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s ease;
}

.provider-selectable:hover {
  opacity: 1;
}

.provider-disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.truncate-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 700px) {
  .provider-table-scroll :deep(table) {
    font-size: 0.82rem;
    min-width: 600px;
  }

  .provider-table-scroll :deep(td),
  .provider-table-scroll :deep(th) {
    padding: 4px 6px;
  }
}
</style>
