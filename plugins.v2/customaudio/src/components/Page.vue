<script setup>
import { ref } from 'vue'
import AppPage from './AppPage.vue'

defineProps({
  api: {
    type: Object,
    default: () => ({}),
  },
})
const emit = defineEmits(['close'])

const pageRef = ref(null)
const confirmDialog = ref(false)

function handleRefresh() {
  if (pageRef.value?.hasUnsavedChanges()) {
    confirmDialog.value = true
  } else {
    pageRef.value?.loadStatus()
  }
}

function confirmRefresh() {
  confirmDialog.value = false
  pageRef.value?.loadStatus()
}
</script>

<template>
  <div class="customaudio-page-wrapper">
    <VToolbar density="comfortable" class="sticky-toolbar">
      <div class="text-h6 ms-3">语音识别与合成</div>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" :loading="pageRef?.loading" @click="handleRefresh" />
      <VBtn icon="mdi-content-save" variant="text" color="primary" :loading="pageRef?.saving" @click="pageRef?.saveConfig()" />
      <VBtn icon="mdi-close" variant="text" @click="emit('close')" />
    </VToolbar>
    <VDivider />

    <AppPage ref="pageRef" :api="api" plugin-id="CustomAudio" hide-title />

    <VDialog v-model="confirmDialog" max-width="360">
      <VCard>
        <VCardTitle class="text-h6">确认刷新</VCardTitle>
        <VCardText>检测到未保存的更改，刷新将丢失当前修改。是否继续？</VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="confirmDialog = false">取消</VBtn>
          <VBtn color="primary" variant="text" @click="confirmRefresh">确认刷新</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.sticky-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgb(var(--v-theme-surface));
}
</style>
