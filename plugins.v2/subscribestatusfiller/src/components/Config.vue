<script setup>
import { computed, onMounted, ref } from 'vue'

const props = defineProps({
  api: { type: Object, default: () => ({}) },
  initialConfig: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: '' },
})
const emit = defineEmits(['save', 'close'])

// 兼容两种传入方式：插件详情页通过 api.pluginId 传入，侧栏页面通过独立 pluginId prop 传入
const effectivePluginId = computed(() => props.pluginId || props.api?.pluginId || '')

const saving = ref(false)
const notice = ref({ show: false, text: '', type: 'success' })

const config = ref({
  enable: true,
  overwrite: true,
  ended_best_version: true,
  returning_lock_aired: true,
  show_sidebar: true,
  check_interval: 6,
})

onMounted(async () => {
  if (props.api?.get && effectivePluginId.value) {
    try {
      const res = await props.api.get(`plugin/${effectivePluginId.value}/config`)
      if (res?.config) {
        config.value = { ...config.value, ...res.config }
      }
    } catch {
      // fallback to initialConfig
      if (props.initialConfig && Object.keys(props.initialConfig).length) {
        config.value = { ...config.value, ...props.initialConfig }
      }
    }
  } else if (props.initialConfig && Object.keys(props.initialConfig).length) {
    config.value = { ...config.value, ...props.initialConfig }
  }
})

function showNotice(text, type = 'success') {
  notice.value = { show: true, text, type }
  setTimeout(() => { notice.value.show = false }, 4000)
}

async function handleSave() {
  saving.value = true
  try {
    if (props.api?.post && effectivePluginId.value) {
      const res = await props.api.post(
        `plugin/${effectivePluginId.value}/config`,
        config.value,
      )
      if (res?.success) {
        showNotice('配置已保存')
        emit('save', config.value)
      } else {
        showNotice(res?.message || '保存失败', 'error')
      }
    } else {
      emit('save', config.value)
    }
  } catch {
    showNotice('保存失败', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="ssf-config-content pa-4">
    <VAlert
      v-if="notice.show"
      :type="notice.type"
      density="compact"
      class="mb-3"
      variant="tonal"
    >
      {{ notice.text }}
    </VAlert>

    <VRow>
      <VCol cols="12" md="6">
        <VSwitch
          v-model="config.enable"
          label="启用插件"
          hint="开启后，新添加的电视剧订阅会自动根据完结状态调整下载策略"
          persistent-hint
        />
      </VCol>
      <VCol cols="12" md="6">
        <VSwitch
          v-model="config.overwrite"
          label="覆盖已有策略"
          hint="开启后，已设置过策略的订阅也会重新调整"
          persistent-hint
        />
      </VCol>
    </VRow>

    <VRow>
      <VCol cols="12" md="6">
        <VSwitch
          v-model="config.ended_best_version"
          label="已完结剧自动开启全集洗版"
          hint="已完结的剧只会下载完整覆盖整季的剧集包"
          persistent-hint
        />
      </VCol>
      <VCol cols="12" md="6">
        <VSwitch
          v-model="config.returning_lock_aired"
          label="连载剧只追已播集数"
          hint="连载中的剧不下含未播剧集的合集包"
          persistent-hint
        />
      </VCol>
    </VRow>

    <VRow>
      <VCol cols="12" md="6">
        <VSwitch
          v-model="config.show_sidebar"
          label="显示侧边栏入口"
          hint="关闭后，主界面侧边栏「订阅」分区不再显示本插件入口（插件仍在运行，可从插件详情页进入）"
          persistent-hint
        />
      </VCol>
      <VCol cols="12" md="6">
        <VTextField
          v-model.number="config.check_interval"
          label="连载剧检查间隔（小时）"
          type="number"
          min="1"
          max="72"
          hint="每隔几小时检查一次连载剧是否有新集播出"
          persistent-hint
        />
      </VCol>
    </VRow>

    <VRow class="mt-2">
      <VCol cols="12">
        <VAlert type="info" variant="tonal" density="compact">
          本插件根据 TMDB 剧集状态自动调整订阅下载策略。连载剧的起始集数请在详情页中设置。
        </VAlert>
      </VCol>
    </VRow>

    <div class="d-flex justify-end mt-4">
      <VBtn variant="text" @click="emit('close')">取消</VBtn>
      <VBtn color="primary" :loading="saving" class="ml-2" @click="handleSave">
        保存
      </VBtn>
    </div>
  </div>
</template>
