<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue'

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
  visible: {
    type: Boolean,
    default: true,
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
// 删除确认弹窗
const showDeleteConfirm = ref(false)
const deleteVendorId = ref(null)
const deleteVendorName = ref('')

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

// 当组件不可见时（切换到其他 tab），清理未填写数据的临时新增行
watch(() => props.visible, (visible) => {
  if (!visible) {
    cleanupEmptyVendors()
  }
})

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

// 清理未填写数据的临时新增行（切换 tab 时由父组件调用）
function cleanupEmptyVendors() {
  // 切换 tab 前，将编辑缓冲区同步回本地列表，保留用户已输入的内容
  if (editingId.value && editBuffer.value.id) {
    localVendors.value = localVendors.value.map(v =>
      v.id === editingId.value ? { ...v, ...editBuffer.value } : v
    )
  }

  const hadTemp = localVendors.value.some(v => String(v.id).startsWith('temp_'))
  if (!hadTemp) return

  localVendors.value = localVendors.value.filter(v => {
    if (!String(v.id).startsWith('temp_')) return true
    // 保留已填写名称或 URL 的临时行
    return v.name?.trim() || v.url?.trim()
  })

  // 如果正在编辑的行被移除，取消编辑状态
  if (editingId.value && !localVendors.value.find(v => v.id === editingId.value)) {
    editingId.value = null
    editBuffer.value = {}
  }

  // 没有临时行残留时清除本地变更标记，允许 watcher 恢复同步
  const hasRemainingTemp = localVendors.value.some(v => String(v.id).startsWith('temp_'))
  if (!hasRemainingTemp) {
    hasLocalChanges.value = false
  }
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

function requestDeleteVendor(vendor) {
  deleteVendorId.value = vendor.id
  deleteVendorName.value = vendor.name || '未命名'
  showDeleteConfirm.value = true
}

async function confirmDeleteVendor() {
  const id = deleteVendorId.value
  showDeleteConfirm.value = false
  if (!id) return
  saving.value = true
  try {
    const response = await props.api.post(`${props.pluginBase}/vendors/delete`, { id })
    if (response?.success) {
      localVendors.value = response.data.vendors || localVendors.value.filter(v => v.id !== id)
      showFeedback('success', '删除成功')
    } else {
      showFeedback('error', response?.message || '删除失败')
    }
  } catch (err) {
    showFeedback('error', `删除失败: ${err.message}`)
  } finally {
    saving.value = false
    deleteVendorId.value = null
    deleteVendorName.value = ''
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
  cleanupEmptyVendors,
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
                  <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="requestDeleteVendor(vendor)" />
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

    <!-- 厂商删除确认弹窗 -->
    <VDialog v-model="showDeleteConfirm" max-width="420" persistent>
      <VCard>
        <VCardTitle class="text-subtitle-1">确认删除</VCardTitle>
        <VCardText>
          确定要删除厂商「<strong>{{ deleteVendorName }}</strong>」吗？此操作不可撤销。
        </VCardText>
        <VCardActions class="d-flex justify-end ga-2">
          <VBtn variant="text" @click="showDeleteConfirm = false">取消</VBtn>
          <VBtn color="error" @click="confirmDeleteVendor">删除</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.vendor-manager {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100% !important;
  max-width: 100% !important;
}

.vendor-table-shell {
  overflow-x: auto;
  max-width: 100% !important;
  width: 100% !important;
  padding: 0 !important;
}

/* 强制消除 Vuetify 卡片及容器宽度与边距限制 */
:deep(.v-card),
:deep(.v-card__text),
:deep(.v-card__body),
:deep(.v-table__wrapper),
:deep(.v-data-table),
:deep(.v-data-table__wrapper) {
  width: 100% !important;
  max-width: 100% !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* 确保表格横向完全铺满 */
:deep(.v-table),
:deep(.v-data-table > .v-table__wrapper > table),
:deep(table) {
  width: 100% !important;
  max-width: 100% !important;
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

/* 表格撑满容器宽度 */
.vendor-table-scroll :deep(table) {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
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
  width: 60px;
  min-width: 60px;
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
  min-width: 260px;
  width: 45%;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

/* 名称列编辑态：VTextField 撑满列宽 */
.vendor-table-scroll :deep(.name-col .v-text-field),
.vendor-table-scroll :deep(.url-col .v-text-field) {
  width: 100% !important;
  max-width: 100% !important;
}

/* API 地址列：自动填充剩余空间，但限制最大宽度 */
.vendor-table-scroll :deep(.url-col) {
  width: auto !important;
  max-width: 35% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

/* 操作列：固定宽度，图标完整显示不截断，flex 布局 */
.vendor-table-scroll :deep(.action-col) {
  width: 100px;
  min-width: 100px !important;
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
    min-width: 140px !important;
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
