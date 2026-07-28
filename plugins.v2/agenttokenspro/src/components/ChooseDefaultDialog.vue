<script setup>
import { computed, ref, watch } from 'vue'
import { formatTokens } from '../provider'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  model: {
    type: String,
    default: '',
  },
  providers: {
    type: Array,
    default: () => [],
  },
  activeProviderId: {
    type: String,
    default: null,
  },
  failedProviderIds: {
    type: Set,
    default: () => new Set(),
  },
})

const emit = defineEmits(['update:modelValue', 'select'])

const testingIndex = ref(-1)
const testResults = ref({})

const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

// 筛选出当前模型的供应商。
const modelProviders = computed(() => {
  return props.providers
    .map((p, index) => ({ ...p, _index: index }))
    .filter(p => (p.model || '未指定模型') === props.model)
})

// 打开弹窗时清除测试状态。
watch(
  () => props.modelValue,
  open => {
    if (open) {
      testingIndex.value = -1
      testResults.value = {}
    }
  },
)

function isActive(row) {
  if (!props.activeProviderId) return false
  return (row.id || row.name) === props.activeProviderId
}

function isFailed(row) {
  return props.failedProviderIds.has(row.id || row.name)
}

function handleSelect(index) {
  emit('select', index)
  dialogVisible.value = false
}

function closeDialog() {
  dialogVisible.value = false
}
</script>

<template>
  <VDialog v-model="dialogVisible" max-width="640" max-height="80vh" scrollable>
    <VCard>
      <VCardTitle>
        选择默认供应商
        <div class="text-caption text-medium-emphasis mt-1">模型：{{ model }}</div>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <div v-if="!modelProviders.length" class="text-center text-medium-emphasis py-6">
          该模型下暂无供应商
        </div>
        <VList v-else lines="three" density="comfortable">
          <VListItem
            v-for="item in modelProviders"
            :key="item.id || item._index"
            :class="{ 'v-list-item--active': isActive(item) }"
            @click="handleSelect(item._index)"
          >
            <template #prepend>
              <VIcon v-if="isActive(item)" icon="mdi-check-circle" color="primary" />
              <VIcon v-else-if="isFailed(item)" icon="mdi-alert-circle" color="error" />
              <VIcon v-else icon="mdi-circle-outline" color="default" />
            </template>
            <VListItemTitle>
              {{ item.name || '未命名' }}
              <VChip v-if="isActive(item)" size="x-small" color="primary" variant="tonal" class="ml-2">当前活跃</VChip>
            </VListItemTitle>
            <VListItemSubtitle>
              <span>{{ item.provider }}</span>
              <span v-if="item.base_url"> · {{ item.base_url }}</span>
              <span> · 优先级 {{ item.priority }}</span>
              <span v-if="item.token_limit > 0"> · 额度 {{ formatTokens(item.token_limit) }}</span>
              <span v-else> · 不限量</span>
            </VListItemSubtitle>
            <template #append>
              <VChip size="small" :color="item.enabled === false ? 'default' : 'success'" variant="tonal">
                {{ item.enabled === false ? '已禁用' : '启用' }}
              </VChip>
            </template>
          </VListItem>
        </VList>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="closeDialog">关闭</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
