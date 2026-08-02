<script setup>
import { onMounted, ref } from 'vue'
import AppPage from './AppPage.vue'

const props = defineProps({
  api: {
    type: Object,
    default: () => ({}),
  },
  initialConfig: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['save', 'close'])

const pageRef = ref(null)

async function saveConfig() {
  if (pageRef.value) {
    const success = await pageRef.value.saveConfig()
    if (success) {
      emit('save', pageRef.value.getConfig())
    }
  }
}

onMounted(() => {
  // Config.vue 在插件设置对话框中渲染
  // initialConfig 由宿主传入，AppPage 内部会使用它
})
</script>

<template>
  <div class="customaudio-config">
    <VToolbar density="comfortable" color="transparent">
      <div class="text-h6 ms-3">语音识别与合成配置</div>
      <VSpacer />
      <VBtn icon="mdi-content-save" variant="text" color="primary" @click="saveConfig" />
      <VBtn icon="mdi-close" variant="text" @click="emit('close')" />
    </VToolbar>
    <VDivider />

    <AppPage
      ref="pageRef"
      :api="api"
      :initial-config="initialConfig"
      hide-title
      config-mode
    />
  </div>
</template>
