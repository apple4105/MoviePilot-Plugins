import { importShared } from './__federation_fn_import-JrT3xvdd.js';
import { A as AgentTokensManager } from './AgentTokensManager-BvKqzIwi.js';
import { _ as _export_sfc, u as unwrapResponse } from './_plugin-vue_export-helper-MUdERlsH.js';

const {createVNode:_createVNode,createTextVNode:_createTextVNode,resolveComponent:_resolveComponent,withCtx:_withCtx,toDisplayString:_toDisplayString,openBlock:_openBlock,createElementBlock:_createElementBlock} = await importShared('vue');


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
const vendors = ref([]);
const status = ref({
  config: { enabled: false, show_sidebar_nav: true, max_failures: 3, max_retries: 2, providers: [] },
  providers: [],
  summary: {},
  active_provider_id: null,
});
const showRefreshConfirm = ref(false);
const refreshToast = ref({ show: false, message: '', color: 'success' });

// 构造 API 基础路径。
const pluginBase = computed(() => `plugin/${props.pluginId || 'AgentTokensPro'}`);
const config = computed(() => status.value.config || { enabled: false, show_sidebar_nav: true, max_failures: 3, max_retries: 2, providers: [] });
const providerRows = computed(() => status.value.providers || []);
const summary = computed(() => status.value.summary || {});
const activeProviderId = computed(() => status.value.active_provider_id || null);
const vendorsData = computed(() => vendors.value || []);

// 从插件 API 拉取厂商列表。
async function loadVendors() {
  try {
    const response = await props.api.get(`${pluginBase.value}/vendors`);
    const data = unwrapResponse(response);
    vendors.value = data?.vendors || data || [];
  } catch (err) {
    // 厂商接口可能不存在，静默忽略
    vendors.value = [];
  }
}

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
      // 先更新服务器快照，再更新 status，避免 watch 误触发 dirty
      lastServerConfig.value = JSON.parse(JSON.stringify(nextStatus.config || {}));
      status.value = nextStatus;
    }
    // 同时加载厂商列表
    await loadVendors();
  } catch (err) {
    error.value = err?.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

// 手动刷新：若检测到未保存更改，先弹确认弹窗。
function handleRefresh() {
  if (configDirty.value) {
    showRefreshConfirm.value = true;
    return
  }
  doRefresh();
}

// 确认弹窗"确定"回调：丢弃未保存更改，强制拉取。
function confirmRefresh() {
  showRefreshConfirm.value = false;
  configDirty.value = false;
  doRefresh();
}

// 实际执行刷新并展示 Toast。
async function doRefresh() {
  await loadStatus();
  if (!error.value) {
    refreshToast.value = { show: true, message: '配置已重新加载', color: 'success' };
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
      max_retries: Number(config.value.max_retries ?? 2),
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

// 选择默认供应商并自动测试连通性。
async function selectProvider(providerId) {
  if (!providerId) return
  const providers = config.value.providers || [];
  const provider = providers.find(p => p.id === providerId);
  if (!provider) return

  // 检查供应商是否处于故障状态（连续失败达到阈值或硬禁用）
  const providerWithUsage = status.value.providers?.find(p => p.id === providerId);
  const failureCount = providerWithUsage?.usage?.failure_count || 0;
  const maxFailures = config.value.max_failures || 3;
  const isHardDisabled = !!providerWithUsage?.usage?.hard_disabled;
  if (isHardDisabled) {
    showFeedback('error', `供应商 [${provider.name}] 已被硬禁用（鉴权失败），无法直接启用。请先检查 API Key 并测试连通性。`);
    return
  }
  if (failureCount >= maxFailures) {
    const isCooldown = !!providerWithUsage?.usage?.disabled_at;
    const statusLabel = isCooldown ? '冷却中' : '故障';
    showFeedback('error', `供应商 [${provider.name}] 当前处于${statusLabel}状态（连续失败 ${failureCount} 次），无法直接启用。请先测试连通性确认恢复后再启用。`);
    return
  }

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
      provider_id: providerId,
    });
    const result = unwrapResponse(response);
    if (result && result.success) {
      // 测试成功：重置失败计数，刷新状态
      try {
        await props.api.post(`${pluginBase.value}/usage/reset_failures`, { provider_id: providerId });
      } catch (_) { /* 忽略重置失败 */ }
      await loadStatus();
      showFeedback('success', `供应商连通测试成功`);
    } else {
      // 测试失败：后端已标记故障，刷新状态
      await loadStatus();
      handleTestFailure(providerId, result?.message || '测试失败');
    }
  } catch (err) {
    // 网络异常等：刷新状态
    await loadStatus();
    handleTestFailure(providerId, err?.message || '测试失败');
  }
}

// 弹窗中测试连接：用提供的 base_url/api_key/model 发送真实请求验证连通性。
async function testConnection({ payload, resolve, reject }) {
  try {
    const response = await props.api.post(`${pluginBase.value}/test-connection`, payload);
    const result = unwrapResponse(response);
    if (result && result.success) {
      // 测试成功：若有 provider_id，重置失败计数并刷新状态
      if (payload.provider_id) {
        try {
          await props.api.post(`${pluginBase.value}/usage/reset_failures`, { provider_id: payload.provider_id });
        } catch (_) { /* 忽略重置失败 */ }
        await loadStatus();
      }
      resolve(result);
    } else {
      // 测试失败：后端已标记故障，刷新状态
      await loadStatus();
      reject(new Error(result?.message || '连接失败'));
    }
  } catch (err) {
    await loadStatus();
    reject(err);
  }
}

// 用量表格中测试供应商连通性：测试成功时重置失败计数并刷新状态。
async function testProvider({ providerId, resolve, reject }) {
  const provider = (config.value.providers || []).find(p => p.id === providerId);
  if (!provider) {
    reject(new Error('未找到该供应商'));
    return
  }
  try {
    const response = await props.api.post(`${pluginBase.value}/test-connection`, {
      base_url: provider.base_url,
      api_key: provider.api_key,
      model: provider.model,
      provider: provider.provider,
      provider_id: providerId,
    });
    const result = unwrapResponse(response);
    if (result && result.success) {
      // 测试成功：重置失败计数，刷新状态
      try {
        await props.api.post(`${pluginBase.value}/usage/reset_failures`, { provider_id: providerId });
      } catch (_) { /* 忽略重置失败 */ }
      await loadStatus();
      showFeedback('success', result?.message || '供应商连通测试成功');
      resolve(result);
    } else {
      // 测试失败：后端已标记故障，刷新状态
      await loadStatus();
      flashProviderFailure(providerId);
      showFeedback('error', result?.message || '测试失败');
      reject(new Error(result?.message || '测试失败'));
    }
  } catch (err) {
    await loadStatus();
    flashProviderFailure(providerId);
    showFeedback('error', err?.message || '测试失败');
    reject(err);
  }
}

// 红闪指定供应商行（不触发顶部提示，由调用方自行处理消息）
function flashProviderFailure(providerId) {
  if (!managerRef.value) return
  const manager = managerRef.value;
  manager.failedProviderIds = [...manager.failedProviderIds, providerId];
  setTimeout(() => {
    if (managerRef.value) {
      managerRef.value.failedProviderIds = managerRef.value.failedProviderIds.filter(id => id !== providerId);
    }
  }, 1500);
}

// 处理测试失败：红闪1.5秒 + 显示错误提示（不自动切换，由用户手动选择）
function handleTestFailure(providerId, message) {
  if (!managerRef.value) return
  const manager = managerRef.value;
  manager.failedProviderIds = [...manager.failedProviderIds, providerId];
  showFeedback('error', message);

  setTimeout(() => {
    manager.failedProviderIds = manager.failedProviderIds.filter(id => id !== providerId);
  }, 1500);
}

function showFeedback(type, message) {
  if (!managerRef.value) return
  managerRef.value.testFeedback = { type, message, show: true };
  setTimeout(() => {
    if (managerRef.value) managerRef.value.testFeedback.show = false;
  }, 5000);
}

// 重置指定供应商的失败计数和冷却状态（解冻），保留用量统计。
async function resetFailures(providerId) {
  if (!providerId) return
  loading.value = true;
  try {
    const response = await props.api.post(`${pluginBase.value}/usage/reset_failures`, { provider_id: providerId });
    status.value = unwrapResponse(response) || status.value;
    showFeedback('success', '已重置失败计数');
  } finally {
    loading.value = false;
  }
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

// 仅重置限量总量显示（圆弧图归零），保留各供应商用量记录。
async function resetTotalUsage() {
  loading.value = true;
  try {
    const response = await props.api.post(`${pluginBase.value}/usage/reset_total`, {});
    status.value = unwrapResponse(response) || status.value;
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
  loadVendors,
  saveConfig,
  autoSave,
  loading,
  saving,
});

watch(
  () => config.value,
  () => {
    if (!lastServerConfig.value) return
    // 深比较：只有当前配置与服务器快照真正不同时才标记 dirty
    // 避免 loadStatus 更新 status 时误触发 dirty 状态
    try {
      const currentStr = JSON.stringify(config.value);
      const serverStr = JSON.stringify(lastServerConfig.value);
      if (currentStr !== serverStr) {
        configDirty.value = true;
      }
    } catch (e) {
      // 序列化失败时回退到标记 dirty
      configDirty.value = true;
    }
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
  const _component_VCardTitle = _resolveComponent("VCardTitle");
  const _component_VCardText = _resolveComponent("VCardText");
  const _component_VBtn = _resolveComponent("VBtn");
  const _component_VCardActions = _resolveComponent("VCardActions");
  const _component_VCard = _resolveComponent("VCard");
  const _component_VDialog = _resolveComponent("VDialog");
  const _component_VSnackbar = _resolveComponent("VSnackbar");

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createVNode(AgentTokensManager, {
      ref_key: "managerRef",
      ref: managerRef,
      config: config.value,
      "provider-rows": providerRows.value,
      summary: summary.value,
      "active-provider-id": activeProviderId.value,
      vendors: vendorsData.value,
      api: props.api,
      "plugin-base": pluginBase.value,
      error: error.value,
      loading: loading.value,
      saving: saving.value,
      "hide-title": __props.hideTitle,
      onRefresh: handleRefresh,
      onSave: saveConfig,
      onAutoSave: autoSave,
      onResetUsage: resetUsage,
      onResetAllUsage: resetAllUsage,
      onResetTotal: resetTotalUsage,
      onResetFailures: resetFailures,
      onQueryModels: queryModels,
      onTestConnection: testConnection,
      onSelectProvider: selectProvider,
      onTestProvider: testProvider
    }, null, 8, ["config", "provider-rows", "summary", "active-provider-id", "vendors", "api", "plugin-base", "error", "loading", "saving", "hide-title"]),
    _createVNode(_component_VDialog, {
      modelValue: showRefreshConfirm.value,
      "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ((showRefreshConfirm).value = $event)),
      "max-width": "420",
      persistent: ""
    }, {
      default: _withCtx(() => [
        _createVNode(_component_VCard, null, {
          default: _withCtx(() => [
            _createVNode(_component_VCardTitle, { class: "text-subtitle-1" }, {
              default: _withCtx(() => [...(_cache[3] || (_cache[3] = [
                _createTextVNode("确认刷新", -1)
              ]))]),
              _: 1
            }),
            _createVNode(_component_VCardText, null, {
              default: _withCtx(() => [...(_cache[4] || (_cache[4] = [
                _createTextVNode(" 检测到未保存的更改，刷新将丢弃当前修改，是否继续？ ", -1)
              ]))]),
              _: 1
            }),
            _createVNode(_component_VCardActions, { class: "d-flex justify-end ga-2" }, {
              default: _withCtx(() => [
                _createVNode(_component_VBtn, {
                  variant: "text",
                  onClick: _cache[0] || (_cache[0] = $event => (showRefreshConfirm.value = false))
                }, {
                  default: _withCtx(() => [...(_cache[5] || (_cache[5] = [
                    _createTextVNode("取消", -1)
                  ]))]),
                  _: 1
                }),
                _createVNode(_component_VBtn, {
                  color: "primary",
                  onClick: confirmRefresh
                }, {
                  default: _withCtx(() => [...(_cache[6] || (_cache[6] = [
                    _createTextVNode("确定", -1)
                  ]))]),
                  _: 1
                })
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_VSnackbar, {
      modelValue: refreshToast.value.show,
      "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((refreshToast.value.show) = $event)),
      color: refreshToast.value.color,
      timeout: "2500",
      location: "bottom"
    }, {
      default: _withCtx(() => [
        _createTextVNode(_toDisplayString(refreshToast.value.message), 1)
      ]),
      _: 1
    }, 8, ["modelValue", "color"])
  ]))
}
}

};
const AppPage = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-039e03a5"]]);

export { AppPage as default };
