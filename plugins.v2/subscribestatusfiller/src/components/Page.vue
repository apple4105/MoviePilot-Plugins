<script setup>
import { ref } from 'vue'
import AppPage from './AppPage.vue'

defineProps({
  api: {
    type: Object,
    default: () => ({}),
  },
  nativeSubscribe: {
    type: Object,
    default: null,
  },
  showSwitch: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['action', 'switch'])

const pageRef = ref(null)

function handleRefresh() {
  pageRef.value?.loadSubscribes(true)
}

function handleSettings() {
  pageRef.value?.openSettings?.()
}
</script>

<template>
  <div class="ssf-page-wrapper">
    <VToolbar density="comfortable" class="sticky-toolbar">
      <VToolbarTitle class="text-subtitle-1 font-weight-bold">连载剧订阅状态</VToolbarTitle>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" :loading="pageRef?.loading" @click="handleRefresh" />
      <VBtn icon="mdi-cog-outline" variant="text" @click="handleSettings" />
    </VToolbar>
    <VDivider />

    <AppPage ref="pageRef" :api="api" hide-title />
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
