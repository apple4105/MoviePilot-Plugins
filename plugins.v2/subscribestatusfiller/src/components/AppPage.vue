<script setup>
import { onMounted, ref } from 'vue'

const props = defineProps({
  api: {
    type: Object,
    default: () => ({}),
  },
  pluginId: {
    type: String,
    default: 'SubscribeStatusFiller',
  },
  hideTitle: {
    type: Boolean,
    default: false,
  },
})

const loading = ref(false)
const savingId = ref(null)
const notice = ref({ show: false, text: '', type: 'success' })
const subscribes = ref([])
const editingMap = ref({})

let noticeTimer = null
function showNotice(text, type = 'success', duration = 4000) {
  if (noticeTimer) clearTimeout(noticeTimer)
  notice.value = { show: true, text, type }
  noticeTimer = setTimeout(() => {
    notice.value.show = false
  }, duration)
}

const STATUS_MAP = {
  'Returning Series': { text: '连载中', color: 'info' },
  Ended: { text: '已完结', color: 'success' },
  'In Production': { text: '制作中', color: 'warning' },
  Pilot: { text: '试播', color: 'warning' },
}

function statusInfo(status) {
  return STATUS_MAP[status] || { text: status || '未知', color: 'grey' }
}

function episodeOptions(sub) {
  const max = Math.max(sub.aired || 1, 1)
  const arr = []
  for (let i = 1; i <= max; i++) {
    arr.push(i)
  }
  return arr
}

function isDirty(sub) {
  const cur = editingMap.value[sub.subscribe_id]
  return cur !== undefined && cur !== sub.start_episode
}

async function loadSubscribes(showNoticeOnSuccess = false) {
  if (!props.api?.get) {
    showNotice('开发预览模式：请在 MoviePilot 插件页面中查看', 'info')
    return
  }
  loading.value = true
  try {
    const res = await props.api.get(`plugin/${props.pluginId}/subscribes`)
    if (res?.success) {
      subscribes.value = res?.data?.subscribes || []
      const map = {}
      for (const s of subscribes.value) {
        map[s.subscribe_id] = s.start_episode
      }
      editingMap.value = map
      if (showNoticeOnSuccess) {
        showNotice('订阅列表已刷新')
      }
    } else {
      showNotice(res?.message || '加载订阅列表失败', 'error')
    }
  } catch {
    showNotice('加载订阅列表失败，请确认插件已启用', 'error')
  } finally {
    loading.value = false
  }
}

async function saveStartEpisode(sub) {
  const start_episode = editingMap.value[sub.subscribe_id]
  if (start_episode === undefined || start_episode === sub.start_episode) {
    return
  }
  savingId.value = sub.subscribe_id
  try {
    const res = await props.api.post(`plugin/${props.pluginId}/set_start_episode`, {
      subscribe_id: sub.subscribe_id,
      start_episode,
    })
    if (res?.success) {
      if (res?.data?.subscribes) {
        subscribes.value = res.data.subscribes
        const map = {}
        for (const s of subscribes.value) {
          map[s.subscribe_id] = s.start_episode
        }
        editingMap.value = map
      }
      showNotice(`《${sub.name}》起始集数已更新为 ${start_episode}`)
    } else {
      showNotice(res?.message || '保存失败', 'error')
    }
  } catch {
    showNotice('保存失败，请检查插件状态', 'error')
  } finally {
    savingId.value = null
  }
}

onMounted(() => loadSubscribes())
</script>

<template>
  <div class="ssf-page-content">
    <VAlert
      v-if="notice.show"
      :type="notice.type"
      density="compact"
      class="mb-2"
      variant="tonal"
    >
      {{ notice.text }}
    </VAlert>

    <VTable hover class="ssf-table">
      <thead>
        <tr>
          <th>剧集</th>
          <th class="text-center">季</th>
          <th class="text-center">状态</th>
          <th class="text-center">已播</th>
          <th class="text-center">缺失</th>
          <th class="text-center" style="width: 150px">起始集数</th>
          <th class="text-center" style="width: 90px">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="sub in subscribes" :key="sub.subscribe_id">
          <td>
            <div class="font-weight-medium">{{ sub.name }}</div>
            <div class="text-caption text-medium-emphasis">
              <template v-if="sub.best_version">最佳版本</template>
              <template v-if="sub.best_version_full">&nbsp;·&nbsp;全集洗版</template>
            </div>
          </td>
          <td class="text-center">{{ sub.season || 1 }}</td>
          <td class="text-center">
            <VChip size="small" :color="statusInfo(sub.status).color">
              {{ statusInfo(sub.status).text }}
            </VChip>
          </td>
          <td class="text-center">{{ sub.aired ?? '-' }}</td>
          <td class="text-center">{{ sub.lack_episode ?? '-' }}</td>
          <td class="text-center">
            <VSelect
              :model-value="editingMap[sub.subscribe_id]"
              :items="episodeOptions(sub)"
              density="compact"
              variant="outlined"
              hide-details
              class="ssf-select"
              @update:model-value="editingMap[sub.subscribe_id] = $event"
            />
          </td>
          <td class="text-center">
            <VBtn
              size="small"
              color="primary"
              variant="tonal"
              :disabled="!isDirty(sub) || savingId === sub.subscribe_id"
              :loading="savingId === sub.subscribe_id"
              @click="saveStartEpisode(sub)"
            >
              保存
            </VBtn>
          </td>
        </tr>
        <tr v-if="!loading && subscribes.length === 0">
          <td colspan="7" class="text-center text-medium-emphasis py-6">
            暂无连载剧订阅，或插件尚未启用
          </td>
        </tr>
      </tbody>
    </VTable>
  </div>
</template>

<style scoped>
.ssf-page-content {
  padding-bottom: 56px;
}
.ssf-select {
  max-width: 110px;
  margin: 0 auto;
}
.ssf-table :deep(table) {
  min-width: 760px;
}
.ssf-table :deep(.v-table__wrapper td),
.ssf-table :deep(.v-table__wrapper th) {
  white-space: nowrap;
  padding-top: 14px;
  padding-bottom: 14px;
  vertical-align: middle;
}
</style>
