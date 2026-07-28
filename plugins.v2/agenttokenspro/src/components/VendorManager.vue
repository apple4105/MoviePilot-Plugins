<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  vendors: {
    type: Array,
    default: () => [],
  },
  api: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  pluginBase: {
    type: String,
    default: 'plugin/AgentTokensPro',
  },
})

const emit = defineEmits(['refresh', 'error', 'drag-mode-change'])

// 本地厂商列表
const localVendors = ref([])
const dragMode = ref(false)
const dragIndex = ref(-1)
const dragOverIndex = ref(-1)
const editingId = ref(null)
const editBuffer = ref({})
const saving = ref(false)
const feedback = ref({ type: '', message: '', show: false })
// 标记是否有本地未保存的变更（新增/编辑中），防止 watcher 覆盖
const hasLocalChanges = ref(false)

// 同步 props.vendors 到 localVendors（仅在无本地变更时同步）
watch(() => props.vendors, (next) => {
  if (dragMode.value) return
  // 有本地未保存的变更时，禁止 watcher 覆盖
  if (hasLocalChanges.value) return
  const nextStr = JSON.stringify(next)
  const curStr = JSON.stringify(localVendors.value)
  if (nextStr === curStr) return
  localVendors.value = next.map(v => ({ ...v }))
}, { immediate: true })

const displayVendors = computed(() => {
  return [...localVendors.value].sort((a, b) => {
    const ao = a.sort_order ?? 0
    const bo = b.sort_order ?? 0
    return ao - bo
  })
})

function showFeedback(type, message) {
  feedback.value = { type, message, show: true }
  setTimeout(() => { feedback.value.show = false }, 3000)
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function addVendor() {
  // 纯前端行为：不发起任何 API 请求，直接 push 空对象到本地列表
  const newVendor = {
    id: 'temp_' + Date.now(),
    name: '',
    url: '',
    enabled: true,
    sort_order: localVendors.value.length,
    isEditing: true,
  }
  localVendors.value = [...localVendors.value, newVendor]
  editingId.value = newVendor.id
  editBuffer.value = { ...newVendor }
  // 标记有本地变更，防止 watcher 覆盖
  hasLocalChanges.value = true
}

function startEdit(vendor) {
  editingId.value = vendor.id
  editBuffer.value = { ...vendor }
}

function cancelEdit() {
  // 如果是新增的行（临时 ID），从列表中移除
  if (editBuffer.value.id && String(editBuffer.value.id).startsWith('temp_')) {
    localVendors.value = localVendors.value.filter(v => v.id !== editBuffer.value.id)
  }
  editingId.value = null
  editBuffer.value = {}
  // 清除本地变更标记
  hasLocalChanges.value = false
}

async function saveEdit() {
  if (!editBuffer.value.name?.trim()) {
    showFeedback('error', '厂商名称不能为空')
    return
  }
  saving.value = true
  try {
    const response = await props.api.post(`${props.pluginBase}/vendors`, editBuffer.value)
    if (response?.success) {
      localVendors.value = response.data.vendors || localVendors.value.map(v =>
        v.id === editBuffer.value.id ? { ...editBuffer.value } : v
      )
      editingId.value = null
      editBuffer.value = {}
      // 保存成功，清除本地变更标记，允许 watcher 同步
      hasLocalChanges.value = false
      showFeedback('success', '保存成功')
    } else {
      showFeedback('error', response?.message || '保存失败')
    }
  } catch (err) {
    showFeedback('error', `保存失败: ${err.message}`)
  } finally {
    saving.value = false
  }
}

async function removeVendor(vendor) {
  if (!confirm(`确定删除厂商「${vendor.name}」？`)) return
  saving.value = true
  try {
    const response = await props.api.post(`${props.pluginBase}/vendors/delete`, { id: vendor.id })
    if (response?.success) {
      localVendors.value = response.data.vendors || localVendors.value.filter(v => v.id !== vendor.id)
      showFeedback('success', '删除成功')
    } else {
      showFeedback('error', response?.message || '删除失败')
    }
  } catch (err) {
    showFeedback('error', `删除失败: ${err.message}`)
  } finally {
    saving.value = false
  }
}

async function toggleEnabled(vendor) {
  const updated = { ...vendor, enabled: !vendor.enabled }
  // 乐观更新
  const oldVendors = [...localVendors.value]
  localVendors.value = localVendors.value.map(v => v.id === vendor.id ? updated : v)
  try {
    const response = await props.api.post(`${props.pluginBase}/vendors`, updated)
    if (response?.success) {
      localVendors.value = response.data.vendors || localVendors.value
    } else {
      // 回滚
      localVendors.value = oldVendors
      showFeedback('error', response?.message || '切换失败')
    }
  } catch (err) {
    localVendors.value = oldVendors
    showFeedback('error', `切换失败: ${err.message}`)
  }
}

// 拖拽排序
function toggleDragMode() {
  if (dragMode.value) {
    // 退出排序模式，保存排序
    saveOrder()
  } else {
    dragMode.value = true
  }
  emit('drag-mode-change', dragMode.value)
}

async function saveOrder() {
  const orderedIds = displayVendors.value.map(v => v.id)
  saving.value = true
  try {
    const response = await props.api.post(`${props.pluginBase}/vendors/reorder`, { vendor_ids: orderedIds })
    if (response?.success) {
      localVendors.value = response.data.vendors || displayVendors.value.map((v, i) => ({ ...v, sort_order: i }))
      dragMode.value = false
      showFeedback('success', '排序已保存')
    } else {
      showFeedback('error', response?.message || '排序保存失败')
    }
  } catch (err) {
    showFeedback('error', `排序保存失败: ${err.message}`)
  } finally {
    saving.value = false
  }
}

function onDragStart(index, e) {
  if (!dragMode.value) return
  dragIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(index))
}

function onDragOver(index, e) {
  if (!dragMode.value) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = index
}

function onDragLeave() {
  dragOverIndex.value = -1
}

function onDrop(index, e) {
  e.preventDefault()
  if (!dragMode.value || dragIndex.value < 0) return
  const from = dragIndex.value
  const to = index
  if (from !== to) {
    const arr = [...displayVendors.value]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    // 更新 sort_order
    arr.forEach((v, i) => { v.sort_order = i })
    localVendors.value = arr
  }
  dragIndex.value = -1
  dragOverIndex.value = -1
}

function onDragEnd() {
  dragIndex.value = -1
  dragOverIndex.value = -1
}

function rowClasses(index) {
  return {
    'vendor-row--drag-over': dragMode.value && index === dragOverIndex.value && dragOverIndex.value !== dragIndex.value,
    'vendor-row--dragging': dragMode.value && index === dragIndex.value,
  }
}

// 暴露方法供父组件调用
defineExpose({
  addVendor,
  toggleDragMode,
})
</script>

<template>
  <div class="vendor-manager">
    <VSlideYTransition>
      <VAlert
        v-if="feedback.show"
        :type="feedback.type"
        variant="tonal"
        density="compact"
        class="mb-3"
        closable
        @click:close="feedback.show = false"
      >
        {{ feedback.message }}
      </VAlert>
    </VSlideYTransition>

    <VSheet border rounded class="vendor-table-shell">
      <div class="vendor-table-scroll" :class="{ 'is-drag-mode': dragMode }">
        <VTable density="comfortable">
          <thead>
            <tr>
              <th v-if="dragMode" class="drag-col"></th>
              <th class="enable-col">启用</th>
              <th class="name-col">名称</th>
              <th class="url-col">API 地址</th>
              <th class="action-col text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(vendor, index) in displayVendors"
              :key="vendor.id"
              :draggable="dragMode"
              :class="rowClasses(index)"
              @dragstart="onDragStart(index, $event)"
              @dragover="onDragOver(index, $event)"
              @dragleave="onDragLeave"
              @drop="onDrop(index, $event)"
              @dragend="onDragEnd"
            >
              <td v-if="dragMode" class="drag-col text-center">
                <VIcon icon="mdi-drag-vertical" size="small" color="primary" />
              </td>
              <td class="enable-col" @click.stop="editingId !== vendor.id && toggleEnabled(vendor)">
                <div class="status-toggle-cell">
                  <span v-if="editingId !== vendor.id" :class="['status-dot', vendor.enabled ? 'active' : 'inactive']"></span>
                  <span v-else :class="['status-dot', editBuffer.enabled ? 'active' : 'inactive']" @click.stop="editBuffer.enabled = !editBuffer.enabled"></span>
                </div>
              </td>
              <td class="name-col">
                <VTextField
                  v-if="editingId === vendor.id"
                  v-model="editBuffer.name"
                  variant="outlined"
                  density="compact"
                  hide-details
                  single-line
                />
                <span v-else>{{ vendor.name }}</span>
              </td>
              <td class="url-col">
                <VTextField
                  v-if="editingId === vendor.id"
                  v-model="editBuffer.url"
                  variant="outlined"
                  density="compact"
                  hide-details
                  single-line
                  placeholder="https://api.example.com/v1"
                />
                <span v-else class="url-text">{{ vendor.url }}</span>
              </td>
              <td class="action-col text-right" @click.stop>
                <template v-if="editingId === vendor.id">
                  <VBtn icon="mdi-check" size="small" variant="text" color="success" :loading="saving" @click="saveEdit" />
                  <VBtn icon="mdi-close" size="small" variant="text" :disabled="saving" @click="cancelEdit" />
                </template>
                <template v-else>
                  <VBtn icon="mdi-pencil" size="small" variant="text" @click="startEdit(vendor)" />
                  <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="removeVendor(vendor)" />
                </template>
              </td>
            </tr>
            <tr v-if="!displayVendors.length">
              <td :colspan="dragMode ? 5 : 4" class="text-center text-medium-emphasis py-8">
                暂无厂商，点击"新增"添加
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </VSheet>
  </div>
</template>

<style scoped>
.vendor-manager {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vendor-table-shell {
  overflow-x: auto;
}

.vendor-table-scroll {
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch;
}

/* Vuetify VTable 内部滚动容器 */
.vendor-table-scroll :deep(.v-table__wrapper) {
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch;
}

/* 强行撑开表格真实宽度 */
.vendor-table-scroll :deep(table) {
  min-width: 700px !important;
  width: max-content !important;
  table-layout: auto !important;
}

.vendor-table-scroll :deep(table),
.vendor-table-scroll :deep(tr),
.vendor-table-scroll :deep(th),
.vendor-table-scroll :deep(td) {
  vertical-align: middle !important;
}

.vendor-table-scroll :deep(td),
.vendor-table-scroll :deep(th) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vendor-table-scroll :deep(.drag-col) {
  width: 36px;
  min-width: 36px;
  padding: 0 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.vendor-table-scroll.is-drag-mode :deep(.drag-col) {
  opacity: 1;
  pointer-events: auto;
}

.vendor-table-scroll :deep(.enable-col) {
  width: 48px;
  min-width: 48px;
  text-align: center !important;
}

.vendor-table-scroll :deep(.enable-col) .status-toggle-cell {
  display: flex;
  align-items: center;
  justify-content: center;
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

.vendor-table-scroll :deep(.name-col) {
  min-width: 130px !important;
  white-space: nowrap !important;
}

/* API 地址列：URL 自然截断，把空间留给右侧操作图标 */
.vendor-table-scroll :deep(.url-col) {
  min-width: 260px !important;
  max-width: 300px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

/* 操作列：固定宽度，图标完整显示不截断，flex 布局 */
.vendor-table-scroll :deep(.action-col) {
  min-width: 90px !important;
  width: 90px !important;
  text-overflow: clip !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 8px !important;
}

/* 操作列内部按钮不压缩 */
.vendor-table-scroll :deep(.action-col) .v-btn {
  flex-shrink: 0;
}

.url-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.vendor-row--drag-over {
  border-top: 2px solid rgb(var(--v-theme-primary)) !important;
}

.vendor-row--dragging {
  opacity: 0.4;
  background: rgba(var(--v-theme-primary), 0.08);
}

[draggable="true"] {
  cursor: grab;
}

[draggable="true"]:active {
  cursor: grabbing;
}

@media (max-width: 700px) {
  .vendor-table-scroll :deep(table) {
    font-size: 0.82rem;
    min-width: 600px !important;
  }

  .vendor-table-scroll :deep(.name-col) {
    min-width: 100px !important;
  }

  .vendor-table-scroll :deep(.url-col) {
    min-width: 180px !important;
    max-width: 220px !important;
  }

  .vendor-table-scroll :deep(.action-col) {
    min-width: 90px !important;
    width: 90px !important;
  }
}
</style>
