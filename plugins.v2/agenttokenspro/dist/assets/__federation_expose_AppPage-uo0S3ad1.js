import { importShared } from './__federation_fn_import-JrT3xvdd.js';
import { A as AgentTokensManager } from './AgentTokensManager-7P23G4Td.js';
import { _ as _export_sfc, u as unwrapResponse } from './_plugin-vue_export-helper-dmbiuH_o.js';

const {createVNode:_createVNode,openBlock:_openBlock,createElementBlock:_createElementBlock} = await importShared('vue');


const _hoisted_1 = { class: "agenttokens-app-container" };

const {computed,onMounted,onUnmounted,ref,watch} = await importShared('vue');


const _sfc_main = {
  __name: 'AppPage',
  props: {
  api: {
    type: Object,
    default: () => ({}),
  },
  pluginId: {
    type: String,
    default: 'AgentTokensPro',
  },
  hideTitle: {
    type: Boolean,
    default: false,
  },
},
  setup(__props, { expose: __expose }) {

const props = __props;

const loading = ref(false);
const saving = ref(false);
const error = ref('');
const configDirty = ref(false);
const lastServerConfig = ref(null);
let refreshTimer = null;
const managerRef = ref(null);
const status = ref({
  config: { enabled: false, show_sidebar_nav: true, max_failures: 3, providers: [] },
  providers: [],
  summary: {},
  active_provider_id: null,
});

// 构造 API 基础路径。
const pluginBase = computed(() => `plugin/${props.pluginId || 'AgentTokensPro'}`);
const config = computed(() => status.value.config || { enabled: false, show_sidebar_nav: true, max_failures: 3, providers: [] });
const providerRows = computed(() => status.value.providers || []);
const summary = computed(() => status.value.summary || {});
const activeProviderId = computed(() => status.value.active_provider_id || null);

// 从插件 API 拉取当前配置和用量状态。
async function loadStatus() {
  loading.value = true;
  error.value = '';
  try {
    const response = await props.api.get(`${pluginBase.value}/status`);
    const nextStatus = unwrapResponse(response) || status.value;
    if (configDirty.value && lastServerConfig.value) {
      status.value = {
        ...nextStatus,
        config: status.value.config || lastServerConfig.value,
      };
    } else {
      status.value = nextStatus;
      lastServerConfig.value = JSON.parse(JSON.stringify(nextStatus.config || {}));
    }
  } catch (err) {
    error.value = err?.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

// 保存完整插件配置并刷新服务端标准化后的状态。
async function saveConfig() {
  saving.value = true;
  error.value = '';
  try {
    const payload = {
      enabled: Boolean(config.value.enabled),
      show_sidebar_nav: Boolean(config.value.show_sidebar_nav),
      max_failures: Number(config.value.max_failures) || 3,
      providers: [...(config.value.providers || [])],
      active_provider_id: status.value.active_provider_id || null,
    };
    const response = await props.api.post(`${pluginBase.value}/config`, payload);
    status.value = unwrapResponse(response) || status.value;
    lastServerConfig.value = JSON.parse(JSON.stringify(status.value.config || {}));
    configDirty.value = false;
  } catch (err) {
    error.value = err?.message || '保存失败';
  } finally {
    saving.value = false;
  }
}

// 自动保存：在增删改、切换启用、选择默认供应商、重置用量后触发。
async function autoSave() {
  await saveConfig();
}

// 更新供应商列表（用于子组件修改供应商后同步到状态）
function updateProviders(nextProviders) {
  if (!status.value.config) return
  status.value.config = {
    ...status.value.config,
    providers: nextProviders,
  };
}

// 选择默认供应商并自动测试连通性。
async function selectProvider(providerId) {
  if (!providerId) return
  const providers = config.value.providers || [];
  const provider = providers.find(p => p.id === providerId);
  if (!provider) return

  // 标记为默认活跃供应商
  status.value.active_provider_id = providerId;

  // 自动保存
  await autoSave();

  // 触发连通性测试
  await testProviderConnectivity(providerId);
}

// 测试供应商连通性。
async function testProviderConnectivity(providerId) {
  if (!managerRef.value) return
  managerRef.value;

  const provider = (config.value.providers || []).find(p => p.id === providerId);
  if (!provider) {
    showFeedback('error', '未找到该供应商');
    return
  }

  try {
    const response = await props.api.post(`${pluginBase.value}/test-connection`, {
      base_url: provider.base_url,
      api_key: provider.api_key,
      model: provider.model,
      provider: provider.provider,
    });
    const result = unwrapResponse(response);
    if (result && result.success) {
      showFeedback('success', `供应商连通测试成功`);
    } else {
      handleTestFailure(providerId, result?.message || '测试失败');
    }
  } catch (err) {
    handleTestFailure(providerId, err?.message || '测试失败');
  }
}

// 弹窗中测试连接：用提供的 base_url/api_key/model 发送真实请求验证连通性。
async function testConnection({ payload, resolve, reject }) {
  try {
    const response = await props.api.post(`${pluginBase.value}/test-connection`, payload);
    const result = unwrapResponse(response);
    if (result && result.success) {
      resolve(result);
    } else {
      reject(new Error(result?.message || '连接失败'));
    }
  } catch (err) {
    reject(err);
  }
}

// 处理测试失败：红闪1.5秒 + 自动切换到下一个供应商。
function handleTestFailure(providerId, message) {
  if (!managerRef.value) return
  const manager = managerRef.value;
  manager.failedProviderIds = [...manager.failedProviderIds, providerId];
  showFeedback('error', `${message}，自动切换到下一个供应商`);

  setTimeout(() => {
    manager.failedProviderIds = manager.failedProviderIds.filter(id => id !== providerId);
  }, 1500);

  // 自动切换到下一个可用供应商
  const providers = config.value.providers || [];
  const nextProvider = providers.find(p =>
    p.id !== providerId && p.enabled && p.api_key && p.base_url && p.model,
  );
  if (nextProvider) {
    setTimeout(async () => {
      status.value.active_provider_id = nextProvider.id;
      // 保存到后端，防止轮询覆盖
      await autoSave();
    }, 500);
  }
}

function showFeedback(type, message) {
  if (!managerRef.value) return
  managerRef.value.testFeedback = { type, message, show: true };
  setTimeout(() => {
    if (managerRef.value) managerRef.value.testFeedback.show = false;
  }, 3000);
}

// 重置指定供应商的运行记录并自动保存。
async function resetUsage(providerId) {
  if (!providerId) return
  loading.value = true;
  try {
    const response = await props.api.post(`${pluginBase.value}/usage/reset`, { provider_id: providerId });
    status.value = unwrapResponse(response) || status.value;
    await autoSave();
  } finally {
    loading.value = false;
  }
}

// 重置全部供应商的运行记录并自动保存。
async function resetAllUsage() {
  loading.value = true;
  try {
    const response = await props.api.post(`${pluginBase.value}/usage/reset_all`, {});
    status.value = unwrapResponse(response) || status.value;
    await autoSave();
  } finally {
    loading.value = false;
  }
}

// 使用后端代理读取模型列表，避免浏览器跨域和鉴权问题。
async function queryModels({ provider, resolve, reject }) {
  try {
    const response = await props.api.post(`${pluginBase.value}/models`, provider || {});
    const data = unwrapResponse(response);
    resolve(data);
  } catch (err) {
    reject(err);
  }
}

__expose({
  loadStatus,
  saveConfig,
  autoSave,
  loading,
  saving,
});

watch(
  () => config.value,
  () => {
    if (lastServerConfig.value) configDirty.value = true;
  },
  { deep: true },
);

onMounted(() => {
  loadStatus();
  refreshTimer = window.setInterval(loadStatus, 5000);
});

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer);
});

return (_ctx, _cache) => {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createVNode(AgentTokensManager, {
      ref_key: "managerRef",
      ref: managerRef,
      config: config.value,
      "provider-rows": providerRows.value,
      summary: summary.value,
      "active-provider-id": activeProviderId.value,
      error: error.value,
      loading: loading.value,
      saving: saving.value,
      "hide-title": __props.hideTitle,
      onRefresh: loadStatus,
      onSave: saveConfig,
      onAutoSave: autoSave,
      onResetUsage: resetUsage,
      onResetAllUsage: resetAllUsage,
      onQueryModels: queryModels,
      onTestConnection: testConnection,
      onSelectProvider: selectProvider,
      onUpdateProviders: updateProviders
    }, null, 8, ["config", "provider-rows", "summary", "active-provider-id", "error", "loading", "saving", "hide-title"])
  ]))
}
}

};
const AppPage = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-bdd892c9"]]);

export { AppPage as default };
