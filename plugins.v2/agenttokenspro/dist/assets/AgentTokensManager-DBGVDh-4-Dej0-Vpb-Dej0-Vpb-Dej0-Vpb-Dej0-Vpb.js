import { importShared } from './__federation_fn_import-JrT3xvdd.js';
import { _ as _export_sfc, f as formatTokens, P as PROVIDER_TYPE_OPTIONS, n as normalizeModelOptions, a as createProvider, b as buildProviderRows, d as buildProviderSummary, e as normalizeProvider, g as getNextProviderPriority } from './_plugin-vue_export-helper-BYTvrSm4.js';

const {createElementVNode:_createElementVNode$5,openBlock:_openBlock$5,createElementBlock:_createElementBlock$4,createCommentVNode:_createCommentVNode$4,renderList:_renderList$3,Fragment:_Fragment$4,resolveComponent:_resolveComponent$5,createVNode:_createVNode$5,normalizeClass:_normalizeClass$3,withModifiers:_withModifiers$2,toDisplayString:_toDisplayString$5,createTextVNode:_createTextVNode$5,withCtx:_withCtx$5,unref:_unref$4,createBlock:_createBlock$5} = await importShared('vue');


const _hoisted_1$5 = {
  key: 0,
  class: "col-url"
};
const _hoisted_2$5 = {
  key: 1,
  class: "col-key"
};
const _hoisted_3$5 = ["draggable", "onClick", "onDragstart", "onDragover", "onDrop"];
const _hoisted_4$5 = { class: "drag-col text-center" };
const _hoisted_5$5 = ["onClick"];
const _hoisted_6$5 = { class: "status-toggle-cell" };
const _hoisted_7$5 = { class: "col-name" };
const _hoisted_8$5 = { class: "col-type" };
const _hoisted_9$4 = {
  key: 0,
  class: "col-url"
};
const _hoisted_10$4 = {
  key: 1,
  class: "col-key"
};
const _hoisted_11$4 = { class: "col-proxy" };
const _hoisted_12$4 = { class: "col-model" };
const _hoisted_13$3 = { class: "col-limit" };
const _hoisted_14$3 = { key: 0 };
const _hoisted_15$2 = ["colspan"];

const {ref: ref$3} = await importShared('vue');


const _sfc_main$5 = {
  __name: 'ProviderConfigTable',
  props: {
  providers: {
    type: Array,
    default: () => [],
  },
  providerRows: {
    type: Array,
    default: () => [],
  },
  activeProviderId: {
    type: String,
    default: null,
  },
  failedProviderIds: {
    type: Array,
    default: () => [],
  },
  showCredentials: {
    type: Boolean,
    default: false,
  },
  dragMode: {
    type: Boolean,
    default: false,
  },
},
  emits: ['edit', 'remove', 'select', 'toggle', 'reorder'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

ref$3(null);
ref$3(null);
const dragIndex = ref$3(-1);
const dragOverIndex = ref$3(-1);

// 安全获取模型名称字符串，防止 VCombobox 返回对象导致显示 [object Object]
function getModelName(model) {
  if (!model) return ''
  if (typeof model === 'string') return model
  if (typeof model === 'object') {
    return model.value || model.name || model.label || model.title || ''
  }
  return String(model)
}

// 获取管理页服务端返回的脱敏 Key。
// providerRows 按原始顺序（与 props.providers 同步），直接用 index 即可
function getMaskedApiKey(row) {
  // 优先按 id 精确匹配，避免排序后 index 错位
  const matched = props.providerRows.find(r => r.id === row.id);
  return matched?.masked_api_key || row.masked_api_key || '****'
}

function isActive(row) {
  return row.id === props.activeProviderId
}

function isFailed(row) {
  return props.failedProviderIds.includes(row.id)
}

// 点击行切换活跃供应商
function handleRowClick(index) {
  const row = props.providers[index];
  if (!row) return
  emit('select', row.id);
}

function handleToggle(index) {
  emit('toggle', index);
}

function rowClasses(row) {
  const idx = props.providers.indexOf(row);
  return {
    'provider-row--active': isActive(row),
    'provider-row--failed': isFailed(row),
    'provider-row--drag-over': props.dragMode && idx === dragOverIndex.value && dragOverIndex.value !== dragIndex.value,
    'provider-row--dragging': props.dragMode && idx === dragIndex.value,
  }
}

function onDragStart(index, e) {
  if (!props.dragMode) return
  dragIndex.value = index;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(index));
}

function onDragOver(index, e) {
  if (!props.dragMode) return
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  dragOverIndex.value = index;
}

function onDragLeave() {
  dragOverIndex.value = -1;
}

function onDrop(index, e) {
  e.preventDefault();
  if (!props.dragMode || dragIndex.value < 0) return
  const from = dragIndex.value;
  const to = index;
  if (from !== to) {
    emit('reorder', from, to);
  }
  dragIndex.value = -1;
  dragOverIndex.value = -1;
}

function onDragEnd() {
  dragIndex.value = -1;
  dragOverIndex.value = -1;
}

return (_ctx, _cache) => {
  const _component_VIcon = _resolveComponent$5("VIcon");
  const _component_VChip = _resolveComponent$5("VChip");
  const _component_VBtn = _resolveComponent$5("VBtn");
  const _component_VTable = _resolveComponent$5("VTable");
  const _component_VSheet = _resolveComponent$5("VSheet");

  return (_openBlock$5(), _createBlock$5(_component_VSheet, {
    border: "",
    rounded: "",
    class: "provider-table-shell"
  }, {
    default: _withCtx$5(() => [
      _createElementVNode$5("div", {
        class: _normalizeClass$3(["provider-table-scroll", { 'is-drag-mode': __props.dragMode }])
      }, [
        _createVNode$5(_component_VTable, { density: "comfortable" }, {
          default: _withCtx$5(() => [
            _createElementVNode$5("thead", null, [
              _createElementVNode$5("tr", null, [
                _cache[1] || (_cache[1] = _createElementVNode$5("th", { class: "drag-col" }, null, -1)),
                _cache[2] || (_cache[2] = _createElementVNode$5("th", { class: "col-enable" }, "启用", -1)),
                _cache[3] || (_cache[3] = _createElementVNode$5("th", { class: "col-name" }, "名称", -1)),
                _cache[4] || (_cache[4] = _createElementVNode$5("th", { class: "col-type" }, "类型", -1)),
                (__props.showCredentials)
                  ? (_openBlock$5(), _createElementBlock$4("th", _hoisted_1$5, "地址"))
                  : _createCommentVNode$4("", true),
                (__props.showCredentials)
                  ? (_openBlock$5(), _createElementBlock$4("th", _hoisted_2$5, "Key"))
                  : _createCommentVNode$4("", true),
                _cache[5] || (_cache[5] = _createElementVNode$5("th", { class: "col-proxy" }, "代理", -1)),
                _cache[6] || (_cache[6] = _createElementVNode$5("th", { class: "col-model" }, "模型", -1)),
                _cache[7] || (_cache[7] = _createElementVNode$5("th", { class: "col-limit" }, "额度", -1)),
                _cache[8] || (_cache[8] = _createElementVNode$5("th", { class: "col-actions" }, "操作", -1))
              ])
            ]),
            _createElementVNode$5("tbody", null, [
              (_openBlock$5(true), _createElementBlock$4(_Fragment$4, null, _renderList$3(__props.providers, (row, index) => {
                return (_openBlock$5(), _createElementBlock$4("tr", {
                  key: row.id || index,
                  draggable: __props.dragMode,
                  class: _normalizeClass$3([rowClasses(row), "clickable-row"]),
                  onClick: $event => (handleRowClick(index)),
                  onDragstart: $event => (onDragStart(index, $event)),
                  onDragover: $event => (onDragOver(index, $event)),
                  onDragleave: onDragLeave,
                  onDrop: $event => (onDrop(index, $event)),
                  onDragend: onDragEnd
                }, [
                  _createElementVNode$5("td", _hoisted_4$5, [
                    _createVNode$5(_component_VIcon, {
                      icon: "mdi-drag-vertical",
                      size: "small",
                      color: __props.dragMode ? 'primary' : 'disabled'
                    }, null, 8, ["color"])
                  ]),
                  _createElementVNode$5("td", {
                    class: "col-enable",
                    onClick: _withModifiers$2($event => (handleToggle(index)), ["stop"])
                  }, [
                    _createElementVNode$5("div", _hoisted_6$5, [
                      _createElementVNode$5("span", {
                        class: _normalizeClass$3(['status-dot', row.enabled ? 'active' : 'inactive'])
                      }, null, 2)
                    ])
                  ], 8, _hoisted_5$5),
                  _createElementVNode$5("td", _hoisted_7$5, _toDisplayString$5(row.name), 1),
                  _createElementVNode$5("td", _hoisted_8$5, _toDisplayString$5(row.provider), 1),
                  (__props.showCredentials)
                    ? (_openBlock$5(), _createElementBlock$4("td", _hoisted_9$4, _toDisplayString$5(row.base_url), 1))
                    : _createCommentVNode$4("", true),
                  (__props.showCredentials)
                    ? (_openBlock$5(), _createElementBlock$4("td", _hoisted_10$4, _toDisplayString$5(getMaskedApiKey(row)), 1))
                    : _createCommentVNode$4("", true),
                  _createElementVNode$5("td", _hoisted_11$4, [
                    _createVNode$5(_component_VChip, {
                      size: "small",
                      color: row.use_proxy === false ? 'default' : 'primary',
                      variant: "tonal"
                    }, {
                      default: _withCtx$5(() => [
                        _createTextVNode$5(_toDisplayString$5(row.use_proxy === false ? '直连' : '代理'), 1)
                      ]),
                      _: 2
                    }, 1032, ["color"])
                  ]),
                  _createElementVNode$5("td", _hoisted_12$4, _toDisplayString$5(getModelName(row.model)), 1),
                  _createElementVNode$5("td", _hoisted_13$3, _toDisplayString$5(row.token_limit > 0 ? _unref$4(formatTokens)(row.token_limit) : '不限'), 1),
                  _createElementVNode$5("td", {
                    class: "col-actions",
                    onClick: _cache[0] || (_cache[0] = _withModifiers$2(() => {}, ["stop"]))
                  }, [
                    _createVNode$5(_component_VBtn, {
                      icon: "mdi-pencil",
                      size: "small",
                      variant: "text",
                      disabled: isActive(row),
                      onClick: $event => (emit('edit', index))
                    }, null, 8, ["disabled", "onClick"]),
                    _createVNode$5(_component_VBtn, {
                      icon: "mdi-delete",
                      size: "small",
                      variant: "text",
                      color: "error",
                      disabled: isActive(row),
                      onClick: $event => (emit('remove', index))
                    }, null, 8, ["disabled", "onClick"])
                  ])
                ], 42, _hoisted_3$5))
              }), 128)),
              (!__props.providers.length)
                ? (_openBlock$5(), _createElementBlock$4("tr", _hoisted_14$3, [
                    _createElementVNode$5("td", {
                      colspan: __props.showCredentials ? 10 : 8,
                      class: "text-center text-medium-emphasis py-8"
                    }, "暂无供应商", 8, _hoisted_15$2)
                  ]))
                : _createCommentVNode$4("", true)
            ])
          ]),
          _: 1
        })
      ], 2)
    ]),
    _: 1
  }))
}
}

};
const ProviderConfigTable = /*#__PURE__*/_export_sfc(_sfc_main$5, [['__scopeId',"data-v-75b8ba5d"]]);

const {toDisplayString:_toDisplayString$4,createElementVNode:_createElementVNode$4,resolveComponent:_resolveComponent$4,createVNode:_createVNode$4,createTextVNode:_createTextVNode$4,withModifiers:_withModifiers$1,withCtx:_withCtx$4,unref:_unref$3,openBlock:_openBlock$4,createBlock:_createBlock$4,createCommentVNode:_createCommentVNode$3,createElementBlock:_createElementBlock$3,Fragment:_Fragment$3} = await importShared('vue');


const _hoisted_1$4 = { class: "form-item" };
const _hoisted_2$4 = { class: "form-item" };
const _hoisted_3$4 = { class: "form-item" };
const _hoisted_4$4 = { class: "form-item" };
const _hoisted_5$4 = { class: "form-label" };
const _hoisted_6$4 = { class: "input-group" };
const _hoisted_7$4 = { class: "form-item" };
const _hoisted_8$4 = { class: "input-group" };
const _hoisted_9$3 = { class: "form-item" };
const _hoisted_10$3 = { class: "form-item" };
const _hoisted_11$3 = { class: "form-item form-item--merged" };
const _hoisted_12$3 = { class: "form-item__half" };
const _hoisted_13$2 = { class: "form-item__half" };
const _hoisted_14$2 = {
  key: 0,
  class: "px-4 pb-3"
};

const {computed: computed$4,ref: ref$2,watch: watch$2} = await importShared('vue');


const _sfc_main$4 = {
  __name: 'ProviderEditorDialog',
  props: {
  modelValue: {
    type: Boolean,
    default: false,
  },
  provider: {
    type: Object,
    default: () => ({}),
  },
  editorIndex: {
    type: Number,
    default: -1,
  },
  existingProviders: {
    type: Array,
    default: () => [],
  },
  vendors: {
    type: Array,
    default: () => [],
  },
},
  emits: ['update:modelValue', 'commit', 'query-models', 'test-connection'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

const modelOptions = ref$2([]);
const loadingModels = ref$2(false);
const testingConnection = ref$2(false);
const modelError = ref$2('');
const testResult = ref$2(null);
const connectionTestState = ref$2(null);
const showApiKey = ref$2(false);
const clipboardHint = ref$2('');
const clipboardHintColor = ref$2('info');
const showPasteDialog = ref$2(false);
const pasteText = ref$2('');
let resultTimer = null;

const dialogVisible = computed$4({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const isEdit = computed$4(() => props.editorIndex >= 0);

// 提取纯 URL：若输入包含 " - " 格式，提取后半段的 http/https 地址
function extractPureUrl(input) {
  if (!input || typeof input !== 'string') return input
  const trimmed = input.trim();
  // 检查是否包含 " - " 格式（厂商名称 - API地址）
  const separatorIndex = trimmed.indexOf(' - ');
  if (separatorIndex > 0) {
    const possibleUrl = trimmed.slice(separatorIndex + 3).trim();
    if (possibleUrl.startsWith('http://') || possibleUrl.startsWith('https://')) {
      return possibleUrl
    }
  }
  // 直接返回纯 URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  // 尝试从字符串中提取 URL
  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    return urlMatch[0]
  }
  return trimmed
}

// 厂商 API 地址列表，用于下拉选择（仅展示已启用的厂商）
const vendorUrlOptions = computed$4(() => {
  return props.vendors
    .filter(v => v.enabled !== false && v.url)
    .map(v => ({
      title: v.name ? `${v.name} - ${v.url}` : v.url,
      value: v.url,
    }))
});

// Base64 智能解码：检测是否为 Base64 编码，支持嵌套解码（最多 3 次）
function decodeBase64Smart(input) {
  if (!input || typeof input !== 'string') return input
  let current = input.trim();
  for (let i = 0; i < 3; i++) {
    // 检查是否为有效的 Base64 字符串（长度 >= 4，只含 Base64 字符，长度是 4 的倍数）
    if (current.length < 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(current) || current.length % 4 !== 0) {
      break
    }
    try {
      const decoded = atob(current);
      // 解码结果必须是可打印文本（排除二进制）
      if (!/^[\x20-\x7E\t\n\r]*$/.test(decoded)) {
        break
      }
      // 如果解码后与原始值相同，说明不是 Base64
      if (decoded === current) {
        break
      }
      current = decoded;
    } catch {
      break
    }
  }
  return current
}

// 模型数量提示
const modelCountText = computed$4(() => {
  const count = modelOptions.value?.length || 0;
  return count > 0 ? `模型 (${count})` : '模型'
});

// 测试按钮颜色：仅绑定连通性测试结果（成功绿色、失败红色、默认紫色）
const testButtonColor = computed$4(() => {
  if (connectionTestState.value === true) return 'success'
  if (connectionTestState.value === false) return 'error'
  return 'primary'
});

watch$2(dialogVisible, (val) => {
  if (val) {
    showApiKey.value = false;
    modelError.value = '';
    testResult.value = null;
    connectionTestState.value = null;
    modelOptions.value = [];
  }
});

// testResult 变化时，3 秒后自动清空
watch$2(testResult, (val) => {
  if (resultTimer) clearTimeout(resultTimer);
  if (val) {
    resultTimer = setTimeout(() => { testResult.value = null; }, 3000);
  }
});

// 监听 API 地址变化：若选中预置厂商，自动填充名称
watch$2(
  () => props.provider.base_url,
  (newUrl) => {
    if (!newUrl) return
    const cleanUrl = extractPureUrl(newUrl);
    const matchedVendor = props.vendors.find(v => v.url === cleanUrl);
    if (matchedVendor && matchedVendor.name) {
      // 仅在名称为空或未修改时自动填充
      if (!props.provider.name || props.provider.name.trim() === '') {
        props.provider.name = matchedVendor.name;
      }
    }
  }
);

// 显示剪贴板提示
function showClipboard(msg, color = 'info', duration = 3000) {
  clipboardHint.value = msg;
  clipboardHintColor.value = color;
  setTimeout(() => { clipboardHint.value = ''; }, duration);
}

// 测试当前弹窗中供应商的 API 连通性。
async function testConnection() {
  testResult.value = null;
  testingConnection.value = true;
  // 清洗 URL，确保传给后端的是纯 API 地址
  const cleanUrl = extractPureUrl(props.provider.base_url);
  props.provider.base_url = cleanUrl;

  // Base64 智能解码：自动检测并解码 API Key
  if (props.provider.api_key) {
    const decoded = decodeBase64Smart(props.provider.api_key);
    if (decoded !== props.provider.api_key) {
      props.provider.api_key = decoded;
      showClipboard('API Key 已自动从 Base64 解码', 'info');
    }
  }

  // 若模型为空，自动触发模型刷新
  if (!props.provider.model || (typeof props.provider.model === 'string' && !props.provider.model.trim())) {
    try {
      await queryModels();
      if (!props.provider.model || (typeof props.provider.model === 'string' && !props.provider.model.trim())) {
        testResult.value = { success: false, message: '获取模型列表失败，无法执行测试' };
        testingConnection.value = false;
        return
      }
    } catch {
      testResult.value = { success: false, message: '获取模型列表失败，无法执行测试' };
      testingConnection.value = false;
      return
    }
  }

  const testPayload = {
    base_url: cleanUrl,
    api_key: props.provider.api_key,
    model: props.provider.model,
    provider: props.provider.provider,
  };
  try {
    const result = await new Promise((resolve, reject) => {
      emit('test-connection', {
        payload: testPayload,
        resolve,
        reject,
      });
    });
    connectionTestState.value = true;
    testResult.value = { success: true, message: result?.message || '连接成功' };
    props.provider.enabled = true;
  } catch (err) {
    connectionTestState.value = false;
    testResult.value = { success: false, message: err?.message || '连接失败' };
  } finally {
    testingConnection.value = false;
  }
}

// 提交当前弹窗编辑的供应商配置。
function commitProvider() {
  const model = props.provider.model;
  if (model && typeof model === 'object') {
    props.provider.model = model.value || model.name || model.label || model.title || '';
  } else if (typeof model !== 'string') {
    props.provider.model = model != null ? String(model) : '';
  }
  if (!props.provider.model?.trim()) {
    props.provider.model = '';
  }
  // 清洗 URL，确保传给后端的是纯 API 地址
  props.provider.base_url = extractPureUrl(props.provider.base_url);

  // API Key 重名校验
  const currentKey = (props.provider.api_key || '').trim();
  if (currentKey) {
    const duplicate = props.existingProviders.find((p, i) => {
      if (props.editorIndex >= 0 && i === props.editorIndex) return false
      return (p.api_key || '').trim() === currentKey
    });
    if (duplicate) {
      testResult.value = { success: false, message: `API Key 已存在（供应商「${duplicate.name || duplicate.id}」），禁止重复添加` };
      return
    }
  }

  emit('commit');
}

// 解析文本并填入 URL、Key、Model（任意组合均可，至少 1 项）。
function parseAndFill(text) {
  if (!text || !text.trim()) return false

  const trimmed = text.trim();
  let url = '';
  let key = '';
  let model = '';

  // 1. 提取 URL（支持标签格式或裸 URL）
  const urlByLabel = trimmed.match(/Base\s*URL\s*[:：]\s*(https?:\/\/[^\s,;|&"'`]+)/i);
  if (urlByLabel) {
    url = urlByLabel[1].replace(/[,;|&"'`]+$/, '');
  } else {
    const urlByRegex = trimmed.match(/https?:\/\/[^\s,;|&"'`]+/);
    if (urlByRegex) {
      url = urlByRegex[0].replace(/[,;|&"'`]+$/, '');
    }
  }

  // 2. 提取 API Key（支持标签格式或裸 Key）
  const keyByLabel = trimmed.match(/API\s*Key\s*[:：]\s*([^\s,;|&"'`\n]+)/i);
  if (keyByLabel) {
    key = keyByLabel[1].replace(/[,;|&"'`]+$/, '');
  } else {
    // 匹配长字符串候选（排除 URL 和已识别的内容）
    const keyCandidates = trimmed.match(/(?:^|\n)\s*([a-zA-Z0-9_-]{20,})\s*(?:$|\n)/gm);
    if (keyCandidates) {
      for (const candidate of keyCandidates) {
        const cleaned = candidate.trim();
        if (cleaned && cleaned !== url && !cleaned.startsWith('http')) {
          key = cleaned;
          break
        }
      }
    }
  }

  // 3. 提取 Model（支持标签格式）
  const modelByLabel = trimmed.match(/Model\s*[:：]\s*([^\s,;|&"'`\n]+)/i);
  if (modelByLabel) {
    model = modelByLabel[1].replace(/[,;|&"'`]+$/, '');
  }

  // 4. 至少需要 1 项
  if (!url && !key && !model) {
    showClipboard('格式不正确，请确保文本包含 Base URL、API Key 或 Model', 'error', 4000);
    return false
  }

  // 5. 填入 URL（若匹配预置厂商，watch 会自动填充名称）
  if (url) {
    props.provider.base_url = url;
  }

  // 6. 填入 API Key
  if (key) {
    props.provider.api_key = key;
  }

  // 7. 填入 Model
  if (model) {
    props.provider.model = model;
  }

  return true
}

// 从剪贴板导入：优先自动读取，失败时弹出手动粘贴弹窗。
async function importFromClipboard() {
  clipboardHint.value = '';
  let text = '';

  try {
    text = await navigator.clipboard.readText();
  } catch {
    // 浏览器拦截：打开手动粘贴弹窗
    pasteText.value = '';
    showPasteDialog.value = true;
    return
  }

  if (!text || !text.trim()) {
    showClipboard('剪贴板为空', 'warning');
    return
  }

  if (parseAndFill(text)) {
    showClipboard('自动导入成功', 'success');
  }
}

// 手动粘贴弹窗：确认解析。
function confirmPasteImport() {
  if (parseAndFill(pasteText.value)) {
    showPasteDialog.value = false;
    pasteText.value = '';
    showClipboard('导入成功', 'success');
  }
}

// 拉取当前 API Key 可用模型并更新下拉选项。
async function queryModels() {
  modelError.value = '';
  loadingModels.value = true;
  try {
    // Base64 智能解码：自动检测并解码 API Key
    if (props.provider.api_key) {
      const decoded = decodeBase64Smart(props.provider.api_key);
      if (decoded !== props.provider.api_key) {
        props.provider.api_key = decoded;
        showClipboard('API Key 已自动从 Base64 解码', 'info');
      }
    }
    const result = await new Promise((resolve, reject) => {
      emit('query-models', { provider: props.provider, resolve, reject });
    });
    modelOptions.value = normalizeModelOptions(result);
    if (!modelOptions.value.length) {
      modelError.value = '未获取到模型';
      testResult.value = { success: false, message: '获取模型列表失败：未获取到模型' };
    } else if (modelOptions.value.length === 1) {
      // 只有一个模型时自动选中
      props.provider.model = modelOptions.value[0].value;
      testResult.value = { success: true, message: `获取模型列表成功，共 ${modelOptions.value.length} 个模型` };
    } else {
      // 多个模型时默认选中第一个
      props.provider.model = modelOptions.value[0].value;
      testResult.value = { success: true, message: `获取模型列表成功，共 ${modelOptions.value.length} 个模型` };
    }
  } catch (err) {
    modelError.value = err?.message || '未获取到模型';
    testResult.value = { success: false, message: `获取模型列表失败：${err?.message || '未知错误'}` };
  } finally {
    loadingModels.value = false;
  }
}

return (_ctx, _cache) => {
  const _component_VSpacer = _resolveComponent$4("VSpacer");
  const _component_VBtn = _resolveComponent$4("VBtn");
  const _component_VCardTitle = _resolveComponent$4("VCardTitle");
  const _component_VTextField = _resolveComponent$4("VTextField");
  const _component_VSelect = _resolveComponent$4("VSelect");
  const _component_VCombobox = _resolveComponent$4("VCombobox");
  const _component_VSwitch = _resolveComponent$4("VSwitch");
  const _component_VCardText = _resolveComponent$4("VCardText");
  const _component_VCardActions = _resolveComponent$4("VCardActions");
  const _component_VAlert = _resolveComponent$4("VAlert");
  const _component_VCard = _resolveComponent$4("VCard");
  const _component_VDialog = _resolveComponent$4("VDialog");
  const _component_VSnackbar = _resolveComponent$4("VSnackbar");
  const _component_VTextarea = _resolveComponent$4("VTextarea");

  return (_openBlock$4(), _createElementBlock$3(_Fragment$3, null, [
    _createVNode$4(_component_VDialog, {
      modelValue: dialogVisible.value,
      "onUpdate:modelValue": _cache[12] || (_cache[12] = $event => ((dialogVisible).value = $event)),
      "max-width": "760",
      "max-height": "85vh",
      scrollable: ""
    }, {
      default: _withCtx$4(() => [
        _createVNode$4(_component_VCard, null, {
          default: _withCtx$4(() => [
            _createVNode$4(_component_VCardTitle, { class: "d-flex align-center" }, {
              default: _withCtx$4(() => [
                _createElementVNode$4("span", null, _toDisplayString$4(isEdit.value ? '编辑供应商' : '新增供应商'), 1),
                _createVNode$4(_component_VSpacer),
                _createVNode$4(_component_VBtn, {
                  "prepend-icon": "mdi-clipboard-arrow-down",
                  size: "small",
                  variant: "tonal",
                  color: "primary",
                  class: "mr-2",
                  onClick: _withModifiers$1(importFromClipboard, ["stop"])
                }, {
                  default: _withCtx$4(() => [...(_cache[17] || (_cache[17] = [
                    _createTextVNode$4(" 剪贴板导入 ", -1)
                  ]))]),
                  _: 1
                }),
                _createVNode$4(_component_VBtn, {
                  icon: "mdi-close",
                  size: "small",
                  variant: "text",
                  onClick: _cache[0] || (_cache[0] = $event => (dialogVisible.value = false))
                })
              ]),
              _: 1
            }),
            _createVNode$4(_component_VCardText, null, {
              default: _withCtx$4(() => [
                _createElementVNode$4("div", _hoisted_1$4, [
                  _cache[18] || (_cache[18] = _createElementVNode$4("span", { class: "form-label" }, "名称", -1)),
                  _createVNode$4(_component_VTextField, {
                    modelValue: __props.provider.name,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ((__props.provider.name) = $event)),
                    variant: "outlined",
                    density: "comfortable",
                    "hide-details": ""
                  }, null, 8, ["modelValue"])
                ]),
                _createElementVNode$4("div", _hoisted_2$4, [
                  _cache[19] || (_cache[19] = _createElementVNode$4("span", { class: "form-label" }, "类型", -1)),
                  _createVNode$4(_component_VSelect, {
                    modelValue: __props.provider.provider,
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((__props.provider.provider) = $event)),
                    items: _unref$3(PROVIDER_TYPE_OPTIONS),
                    variant: "outlined",
                    "hide-details": ""
                  }, null, 8, ["modelValue", "items"])
                ]),
                _createElementVNode$4("div", _hoisted_3$4, [
                  _cache[20] || (_cache[20] = _createElementVNode$4("span", { class: "form-label" }, "厂商", -1)),
                  _createVNode$4(_component_VCombobox, {
                    modelValue: __props.provider.base_url,
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((__props.provider.base_url) = $event)),
                    items: vendorUrlOptions.value,
                    "item-title": "title",
                    "item-value": "value",
                    "return-object": false,
                    variant: "outlined",
                    "hide-details": "",
                    clearable: "",
                    placeholder: "选择或输入 API 地址"
                  }, null, 8, ["modelValue", "items"])
                ]),
                _createElementVNode$4("div", _hoisted_4$4, [
                  _createElementVNode$4("span", _hoisted_5$4, _toDisplayString$4(modelCountText.value), 1),
                  _createElementVNode$4("div", _hoisted_6$4, [
                    _createVNode$4(_component_VCombobox, {
                      modelValue: __props.provider.model,
                      "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((__props.provider.model) = $event)),
                      items: modelOptions.value,
                      loading: loadingModels.value,
                      "error-messages": modelError.value,
                      variant: "outlined",
                      clearable: "",
                      "hide-details": "",
                      class: "model-combobox"
                    }, null, 8, ["modelValue", "items", "loading", "error-messages"]),
                    _createVNode$4(_component_VBtn, {
                      icon: "mdi-refresh",
                      size: "small",
                      variant: "tonal",
                      loading: loadingModels.value,
                      class: "input-action-btn",
                      onClick: _withModifiers$1(queryModels, ["stop"])
                    }, null, 8, ["loading"])
                  ])
                ]),
                _createElementVNode$4("div", _hoisted_7$4, [
                  _cache[21] || (_cache[21] = _createElementVNode$4("span", { class: "form-label" }, "API Key", -1)),
                  _createElementVNode$4("div", _hoisted_8$4, [
                    _createVNode$4(_component_VTextField, {
                      modelValue: __props.provider.api_key,
                      "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((__props.provider.api_key) = $event)),
                      type: isEdit.value && !showApiKey.value ? 'password' : 'text',
                      variant: "outlined",
                      "hide-details": "",
                      class: "apikey-field"
                    }, null, 8, ["modelValue", "type"]),
                    (isEdit.value)
                      ? (_openBlock$4(), _createBlock$4(_component_VBtn, {
                          key: 0,
                          icon: showApiKey.value ? 'mdi-eye-off' : 'mdi-eye',
                          size: "small",
                          variant: "tonal",
                          class: "input-action-btn",
                          onClick: _cache[6] || (_cache[6] = _withModifiers$1($event => (showApiKey.value = !showApiKey.value), ["stop"]))
                        }, null, 8, ["icon"]))
                      : _createCommentVNode$3("", true)
                  ])
                ]),
                _createElementVNode$4("div", _hoisted_9$3, [
                  _cache[22] || (_cache[22] = _createElementVNode$4("span", { class: "form-label" }, "User-Agent", -1)),
                  _createVNode$4(_component_VTextField, {
                    modelValue: __props.provider.user_agent,
                    "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((__props.provider.user_agent) = $event)),
                    variant: "outlined",
                    "hide-details": ""
                  }, null, 8, ["modelValue"])
                ]),
                _createElementVNode$4("div", _hoisted_10$3, [
                  _cache[23] || (_cache[23] = _createElementVNode$4("span", { class: "form-label" }, "使用代理", -1)),
                  _createVNode$4(_component_VSwitch, {
                    modelValue: __props.provider.use_proxy,
                    "onUpdate:modelValue": _cache[8] || (_cache[8] = $event => ((__props.provider.use_proxy) = $event)),
                    color: "primary",
                    "hide-details": "",
                    density: "compact"
                  }, null, 8, ["modelValue"])
                ]),
                _createElementVNode$4("div", _hoisted_11$3, [
                  _createElementVNode$4("div", _hoisted_12$3, [
                    _cache[24] || (_cache[24] = _createElementVNode$4("span", { class: "form-label" }, "Token 额度", -1)),
                    _createVNode$4(_component_VTextField, {
                      modelValue: __props.provider.token_limit,
                      "onUpdate:modelValue": _cache[9] || (_cache[9] = $event => ((__props.provider.token_limit) = $event)),
                      modelModifiers: { number: true },
                      type: "number",
                      variant: "outlined",
                      "hide-details": ""
                    }, null, 8, ["modelValue"])
                  ]),
                  _createElementVNode$4("div", _hoisted_13$2, [
                    _cache[25] || (_cache[25] = _createElementVNode$4("span", { class: "form-label" }, "初始已用", -1)),
                    _createVNode$4(_component_VTextField, {
                      modelValue: __props.provider.used_tokens,
                      "onUpdate:modelValue": _cache[10] || (_cache[10] = $event => ((__props.provider.used_tokens) = $event)),
                      modelModifiers: { number: true },
                      type: "number",
                      variant: "outlined",
                      "hide-details": ""
                    }, null, 8, ["modelValue"])
                  ])
                ])
              ]),
              _: 1
            }),
            _createVNode$4(_component_VCardActions, { class: "d-flex justify-end ga-2" }, {
              default: _withCtx$4(() => [
                _createVNode$4(_component_VBtn, {
                  color: testButtonColor.value,
                  loading: testingConnection.value,
                  onClick: testConnection
                }, {
                  default: _withCtx$4(() => [...(_cache[26] || (_cache[26] = [
                    _createTextVNode$4(" 测试 ", -1)
                  ]))]),
                  _: 1
                }, 8, ["color", "loading"]),
                _createVNode$4(_component_VBtn, {
                  color: "primary",
                  onClick: commitProvider
                }, {
                  default: _withCtx$4(() => [...(_cache[27] || (_cache[27] = [
                    _createTextVNode$4("确定", -1)
                  ]))]),
                  _: 1
                })
              ]),
              _: 1
            }),
            (testResult.value)
              ? (_openBlock$4(), _createElementBlock$3("div", _hoisted_14$2, [
                  _createVNode$4(_component_VAlert, {
                    type: testResult.value.success ? 'success' : 'error',
                    variant: "tonal",
                    density: "compact",
                    closable: "",
                    "onClick:close": _cache[11] || (_cache[11] = $event => (testResult.value = null))
                  }, {
                    default: _withCtx$4(() => [
                      _createTextVNode$4(_toDisplayString$4(testResult.value.message), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])
                ]))
              : _createCommentVNode$3("", true)
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode$4(_component_VSnackbar, {
      "model-value": !!clipboardHint.value,
      timeout: 2500,
      location: "top",
      color: clipboardHintColor.value,
      variant: "tonal",
      "onUpdate:modelValue": _cache[13] || (_cache[13] = v => { if (!v) clipboardHint.value = ''; })
    }, {
      default: _withCtx$4(() => [
        _createTextVNode$4(_toDisplayString$4(clipboardHint.value), 1)
      ]),
      _: 1
    }, 8, ["model-value", "color"]),
    _createVNode$4(_component_VDialog, {
      modelValue: showPasteDialog.value,
      "onUpdate:modelValue": _cache[16] || (_cache[16] = $event => ((showPasteDialog).value = $event)),
      "max-width": "520",
      persistent: ""
    }, {
      default: _withCtx$4(() => [
        _createVNode$4(_component_VCard, null, {
          default: _withCtx$4(() => [
            _createVNode$4(_component_VCardTitle, { class: "text-subtitle-1" }, {
              default: _withCtx$4(() => [...(_cache[28] || (_cache[28] = [
                _createTextVNode$4("手动粘贴配置", -1)
              ]))]),
              _: 1
            }),
            _createVNode$4(_component_VCardText, null, {
              default: _withCtx$4(() => [
                _createVNode$4(_component_VAlert, {
                  type: "info",
                  variant: "tonal",
                  density: "compact",
                  class: "mb-3"
                }, {
                  default: _withCtx$4(() => [...(_cache[29] || (_cache[29] = [
                    _createTextVNode$4(" 浏览器已拦截剪贴板直接读取，请在下方粘贴配置文本 ", -1)
                  ]))]),
                  _: 1
                }),
                _createVNode$4(_component_VTextarea, {
                  modelValue: pasteText.value,
                  "onUpdate:modelValue": _cache[14] || (_cache[14] = $event => ((pasteText).value = $event)),
                  variant: "outlined",
                  placeholder: "Base URL: https://www.shiro-alice.live:62955/v1\nAPI Key : sk-xxx...\nModel   : xopglm52",
                  rows: "5",
                  "auto-grow": "",
                  "hide-details": ""
                }, null, 8, ["modelValue"])
              ]),
              _: 1
            }),
            _createVNode$4(_component_VCardActions, { class: "d-flex justify-end ga-2" }, {
              default: _withCtx$4(() => [
                _createVNode$4(_component_VBtn, {
                  variant: "text",
                  onClick: _cache[15] || (_cache[15] = $event => (showPasteDialog.value = false))
                }, {
                  default: _withCtx$4(() => [...(_cache[30] || (_cache[30] = [
                    _createTextVNode$4("取消", -1)
                  ]))]),
                  _: 1
                }),
                _createVNode$4(_component_VBtn, {
                  color: "primary",
                  disabled: !pasteText.value.trim(),
                  onClick: confirmPasteImport
                }, {
                  default: _withCtx$4(() => [...(_cache[31] || (_cache[31] = [
                    _createTextVNode$4("解析填入", -1)
                  ]))]),
                  _: 1
                }, 8, ["disabled"])
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["modelValue"])
  ], 64))
}
}

};
const ProviderEditorDialog = /*#__PURE__*/_export_sfc(_sfc_main$4, [['__scopeId',"data-v-a5025a9e"]]);

const {createElementVNode:_createElementVNode$3,renderList:_renderList$2,Fragment:_Fragment$2,openBlock:_openBlock$3,createElementBlock:_createElementBlock$2,resolveComponent:_resolveComponent$3,createVNode:_createVNode$3,createCommentVNode:_createCommentVNode$2,toDisplayString:_toDisplayString$3,normalizeClass:_normalizeClass$2,unref:_unref$2,createTextVNode:_createTextVNode$3,mergeProps:_mergeProps,withCtx:_withCtx$3,createBlock:_createBlock$3} = await importShared('vue');


const _hoisted_1$3 = { class: "provider-table-scroll" };
const _hoisted_2$3 = { class: "select-col text-center" };
const _hoisted_3$3 = {
  key: 0,
  class: "provider-faulty",
  title: "故障中，无法切换"
};
const _hoisted_4$3 = ["title", "onClick"];
const _hoisted_5$3 = { class: "name-cell" };
const _hoisted_6$3 = ["onClick"];
const _hoisted_7$3 = { class: "progress-cell" };
const _hoisted_8$3 = { class: "text-success" };
const _hoisted_9$2 = { class: "error-cell" };
const _hoisted_10$2 = {
  key: 1,
  class: "text-medium-emphasis"
};
const _hoisted_11$2 = { class: "time-cell" };
const _hoisted_12$2 = { key: 0 };
const _hoisted_13$1 = {
  key: 1,
  class: "text-medium-emphasis"
};
const _hoisted_14$1 = { class: "text-right" };
const _hoisted_15$1 = { key: 0 };

const {computed: computed$3} = await importShared('vue');


const _sfc_main$3 = {
  __name: 'ProviderUsageTable',
  props: {
  providerRows: {
    type: Array,
    default: () => [],
  },
  activeProviderId: {
    type: String,
    default: null,
  },
  failedProviderIds: {
    type: Array,
    default: () => [],
  },
},
  emits: ['reset', 'select', 'open-vendor-edit'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

// 仅展示已启用的供应商，已停用供应商不显示在用量列表中
// 排序：故障/被禁 Token 置底
const displayRows = computed$3(() => {
  const rows = (props.providerRows || []).filter(row => row.enabled !== false);
  return [...rows].sort((a, b) => {
    const aFaulty = (a.usage?.failure_count || 0) >= 3 || a.usage?.exhausted;
    const bFaulty = (b.usage?.failure_count || 0) >= 3 || b.usage?.exhausted;
    if (aFaulty && !bFaulty) return 1
    if (!aFaulty && bFaulty) return -1
    return 0
  })
});

// 安全获取模型名称字符串，防止 VCombobox 返回对象导致显示 [object Object]
function getModelName(model) {
  if (!model) return ''
  if (typeof model === 'string') return model
  if (typeof model === 'object') {
    return model.value || model.name || model.label || model.title || ''
  }
  return String(model)
}

// 根据供应商状态返回 Vuetify 颜色。
function rowStatusColor(row) {
  if (!row.enabled) return 'default'
  if (row.usage?.exhausted) return 'error'
  if (row.usage?.failure_count >= 3) return 'warning'
  if (!row.api_key || !row.base_url || !row.model) return 'warning'
  return 'success'
}

// 根据供应商状态返回短标签。
function rowStatusText(row) {
  if (!row.enabled) return '停用'
  if (row.usage?.exhausted) return '耗尽'
  if (row.usage?.failure_count >= 3) return '故障'
  if (!row.api_key || !row.base_url || !row.model) return '缺配置'
  return '可用'
}

// 格式化最后使用时间，保留完整日期时间便于核对。
function formatTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').replace(/\.\d+$/, '')
}

function isFailed(row) {
  return (props.failedProviderIds || []).includes(row.id)
}

// 点击 ○ 切换活跃供应商（仅启用状态可点击）
function handleSelect(row) {
  if (!row.enabled) return
  if (row.usage?.failure_count >= 3) return
  emit('select', row.id);
}

// 判断是否为故障状态（失败次数 >= 3）
function isFaulty(row) {
  return row.usage?.failure_count >= 3
}

// 点击名称列：通知父组件切换到供应商 Tab 并打开编辑弹窗
function handleNameClick(row) {
  emit('open-vendor-edit', row);
}

return (_ctx, _cache) => {
  const _component_VIcon = _resolveComponent$3("VIcon");
  const _component_VProgressLinear = _resolveComponent$3("VProgressLinear");
  const _component_VTooltip = _resolveComponent$3("VTooltip");
  const _component_VChip = _resolveComponent$3("VChip");
  const _component_VBtn = _resolveComponent$3("VBtn");
  const _component_VTable = _resolveComponent$3("VTable");
  const _component_VSheet = _resolveComponent$3("VSheet");

  return (_openBlock$3(), _createBlock$3(_component_VSheet, {
    border: "",
    rounded: "",
    class: "provider-table-shell"
  }, {
    default: _withCtx$3(() => [
      _createElementVNode$3("div", _hoisted_1$3, [
        _createVNode$3(_component_VTable, { density: "comfortable" }, {
          default: _withCtx$3(() => [
            _cache[2] || (_cache[2] = _createElementVNode$3("thead", null, [
              _createElementVNode$3("tr", null, [
                _createElementVNode$3("th", { class: "select-col" }),
                _createElementVNode$3("th", null, "名称"),
                _createElementVNode$3("th", null, "模型"),
                _createElementVNode$3("th", null, "已用"),
                _createElementVNode$3("th", null, "余量"),
                _createElementVNode$3("th", null, "进度"),
                _createElementVNode$3("th", null, "调用"),
                _createElementVNode$3("th", null, "成功/失败"),
                _createElementVNode$3("th", null, "最后错误"),
                _createElementVNode$3("th", null, "最后使用"),
                _createElementVNode$3("th", null, "状态"),
                _createElementVNode$3("th", { class: "text-right" }, "操作")
              ])
            ], -1)),
            _createElementVNode$3("tbody", null, [
              (_openBlock$3(true), _createElementBlock$2(_Fragment$2, null, _renderList$2(displayRows.value, (row, index) => {
                return (_openBlock$3(), _createElementBlock$2("tr", {
                  key: row.id || index,
                  class: _normalizeClass$2({
              'provider-row--active': row.id === __props.activeProviderId,
              'provider-row--failed': isFailed(row),
            })
                }, [
                  _createElementVNode$3("td", _hoisted_2$3, [
                    (row.enabled && isFaulty(row))
                      ? (_openBlock$3(), _createElementBlock$2("span", _hoisted_3$3, [
                          _createVNode$3(_component_VIcon, {
                            icon: "mdi-cancel",
                            size: "small",
                            color: "error"
                          })
                        ]))
                      : (_openBlock$3(), _createElementBlock$2("span", {
                          key: 1,
                          class: _normalizeClass$2({
                  'provider-lightning': row.enabled && row.id === __props.activeProviderId,
                  'provider-selectable': row.enabled && row.id !== __props.activeProviderId,
                  'provider-disabled': !row.enabled,
                }),
                          title: row.enabled ? '点击设为活跃' : '已停用',
                          onClick: $event => (handleSelect(row))
                        }, _toDisplayString$3(row.enabled && row.id === __props.activeProviderId ? '⚡' : '○'), 11, _hoisted_4$3))
                  ]),
                  _createElementVNode$3("td", _hoisted_5$3, [
                    _createElementVNode$3("span", {
                      class: "name-link",
                      onClick: $event => (handleNameClick(row))
                    }, _toDisplayString$3(row.name), 9, _hoisted_6$3)
                  ]),
                  _createElementVNode$3("td", null, _toDisplayString$3(getModelName(row.model)), 1),
                  _createElementVNode$3("td", null, _toDisplayString$3(_unref$2(formatTokens)(row.usage?.total_tokens)), 1),
                  _createElementVNode$3("td", null, _toDisplayString$3(row.usage?.remaining_tokens === null ? '不限' : _unref$2(formatTokens)(row.usage?.remaining_tokens)), 1),
                  _createElementVNode$3("td", _hoisted_7$3, [
                    _createVNode$3(_component_VProgressLinear, {
                      "model-value": row.usage?.usage_percent || 0,
                      color: rowStatusColor(row),
                      height: "8",
                      rounded: ""
                    }, null, 8, ["model-value", "color"])
                  ]),
                  _createElementVNode$3("td", null, _toDisplayString$3(row.usage?.runs || 0), 1),
                  _createElementVNode$3("td", null, [
                    _createElementVNode$3("span", _hoisted_8$3, _toDisplayString$3(row.usage?.success_count || 0), 1),
                    _cache[0] || (_cache[0] = _createTextVNode$3(" / ", -1)),
                    _createElementVNode$3("span", {
                      class: _normalizeClass$2({ 'text-error': (row.usage?.failure_count || 0) > 0 })
                    }, _toDisplayString$3(row.usage?.failure_count || 0), 3)
                  ]),
                  _createElementVNode$3("td", _hoisted_9$2, [
                    (row.usage?.last_error)
                      ? (_openBlock$3(), _createBlock$3(_component_VTooltip, {
                          key: 0,
                          location: "top"
                        }, {
                          activator: _withCtx$3(({ props: tooltipProps }) => [
                            _createElementVNode$3("span", _mergeProps({ ref_for: true }, tooltipProps, { class: "text-error text-truncate d-inline-block error-text" }), _toDisplayString$3(row.usage.last_error), 17)
                          ]),
                          default: _withCtx$3(() => [
                            _createTextVNode$3(" " + _toDisplayString$3(row.usage.last_error), 1)
                          ]),
                          _: 2
                        }, 1024))
                      : (_openBlock$3(), _createElementBlock$2("span", _hoisted_10$2, "-"))
                  ]),
                  _createElementVNode$3("td", _hoisted_11$2, [
                    (row.usage?.last_used_at)
                      ? (_openBlock$3(), _createElementBlock$2("span", _hoisted_12$2, _toDisplayString$3(formatTime(row.usage.last_used_at)), 1))
                      : (_openBlock$3(), _createElementBlock$2("span", _hoisted_13$1, "-"))
                  ]),
                  _createElementVNode$3("td", null, [
                    _createVNode$3(_component_VChip, {
                      size: "small",
                      color: rowStatusColor(row),
                      variant: "tonal"
                    }, {
                      default: _withCtx$3(() => [
                        _createTextVNode$3(_toDisplayString$3(rowStatusText(row)), 1)
                      ]),
                      _: 2
                    }, 1032, ["color"])
                  ]),
                  _createElementVNode$3("td", _hoisted_14$1, [
                    _createVNode$3(_component_VBtn, {
                      icon: "mdi-backup-restore",
                      size: "small",
                      variant: "text",
                      onClick: $event => (emit('reset', row.id, index))
                    }, null, 8, ["onClick"])
                  ])
                ], 2))
              }), 128)),
              (!displayRows.value.length)
                ? (_openBlock$3(), _createElementBlock$2("tr", _hoisted_15$1, [...(_cache[1] || (_cache[1] = [
                    _createElementVNode$3("td", {
                      colspan: "13",
                      class: "text-center text-medium-emphasis py-8"
                    }, "暂无已启用供应商", -1)
                  ]))]))
                : _createCommentVNode$2("", true)
            ])
          ]),
          _: 1
        })
      ])
    ]),
    _: 1
  }))
}
}

};
const ProviderUsageTable = /*#__PURE__*/_export_sfc(_sfc_main$3, [['__scopeId',"data-v-f7797d74"]]);

const {toDisplayString:_toDisplayString$2,createElementVNode:_createElementVNode$2,resolveComponent:_resolveComponent$2,withCtx:_withCtx$2,createVNode:_createVNode$2,unref:_unref$1,createTextVNode:_createTextVNode$2,openBlock:_openBlock$2,createBlock:_createBlock$2} = await importShared('vue');


const _hoisted_1$2 = { class: "usage-overview-card__content" };
const _hoisted_2$2 = { class: "usage-overview-card__chart" };
const _hoisted_3$2 = { class: "usage-overview-card__percent" };
const _hoisted_4$2 = { class: "usage-overview-card__body" };
const _hoisted_5$2 = { class: "usage-overview-card__title-row" };
const _hoisted_6$2 = { class: "usage-overview-card__headline" };
const _hoisted_7$2 = { class: "text-medium-emphasis" };
const _hoisted_8$2 = { class: "usage-overview-card__meta" };

const {computed: computed$2} = await importShared('vue');


const _sfc_main$2 = {
  __name: 'UsageOverviewCard',
  props: {
  summary: {
    type: Object,
    default: () => ({}),
  },
},
  setup(__props) {

const props = __props;

// 读取限量模型用量，兼容旧接口缺少 limited_used 的情况。
const totalUsed = computed$2(() => Number(props.summary.limited_used ?? props.summary.total_used ?? 0));
const totalLimit = computed$2(() => Number(props.summary.total_limit || 0));
const usagePercent = computed$2(() => {
  if (props.summary.limited_usage_percent !== undefined) {
    return Number(props.summary.limited_usage_percent || 0)
  }
  if (totalLimit.value <= 0) return 0
  return Math.min((totalUsed.value * 100) / totalLimit.value, 100)
});
const usagePercentText = computed$2(() => `${Math.round(usagePercent.value)}%`);
const remainingTokens = computed$2(() => {
  if (props.summary.limited_remaining !== undefined) return props.summary.limited_remaining
  if (totalLimit.value <= 0) return null
  return Math.max(totalLimit.value - totalUsed.value, 0)
});
const progressColor = computed$2(() => {
  if (totalLimit.value <= 0) return 'primary'
  if (usagePercent.value >= 90) return 'error'
  if (usagePercent.value >= 70) return 'warning'
  return 'success'
});

return (_ctx, _cache) => {
  const _component_VProgressCircular = _resolveComponent$2("VProgressCircular");
  const _component_VProgressLinear = _resolveComponent$2("VProgressLinear");
  const _component_VSheet = _resolveComponent$2("VSheet");

  return (_openBlock$2(), _createBlock$2(_component_VSheet, {
    border: "",
    rounded: "",
    class: "usage-overview-card"
  }, {
    default: _withCtx$2(() => [
      _createElementVNode$2("div", _hoisted_1$2, [
        _createElementVNode$2("div", _hoisted_2$2, [
          _createVNode$2(_component_VProgressCircular, {
            "model-value": usagePercent.value,
            color: progressColor.value,
            "bg-color": "surface-variant",
            size: 132,
            width: 12
          }, {
            default: _withCtx$2(() => [
              _createElementVNode$2("div", _hoisted_3$2, _toDisplayString$2(totalLimit.value > 0 ? usagePercentText.value : '不限'), 1)
            ]),
            _: 1
          }, 8, ["model-value", "color"])
        ]),
        _createElementVNode$2("div", _hoisted_4$2, [
          _createElementVNode$2("div", _hoisted_5$2, [
            _cache[0] || (_cache[0] = _createElementVNode$2("div", { class: "text-caption text-medium-emphasis" }, "限量模型使用进度", -1)),
            _createElementVNode$2("div", _hoisted_6$2, [
              _createTextVNode$2(_toDisplayString$2(_unref$1(formatTokens)(totalUsed.value)) + " ", 1),
              _createElementVNode$2("span", _hoisted_7$2, "/ " + _toDisplayString$2(totalLimit.value > 0 ? _unref$1(formatTokens)(totalLimit.value) : '不限'), 1)
            ])
          ]),
          _createVNode$2(_component_VProgressLinear, {
            "model-value": usagePercent.value,
            color: progressColor.value,
            height: "8",
            rounded: "",
            class: "my-4"
          }, null, 8, ["model-value", "color"]),
          _createElementVNode$2("div", _hoisted_8$2, [
            _createElementVNode$2("span", null, "可用 " + _toDisplayString$2(__props.summary.available_count || 0) + " / " + _toDisplayString$2(__props.summary.enabled_count || 0), 1),
            _createElementVNode$2("span", null, "剩余 " + _toDisplayString$2(remainingTokens.value === null ? '不限' : _unref$1(formatTokens)(remainingTokens.value)), 1)
          ])
        ])
      ])
    ]),
    _: 1
  }))
}
}

};
const UsageOverviewCard = /*#__PURE__*/_export_sfc(_sfc_main$2, [['__scopeId',"data-v-435e5c32"]]);

const {toDisplayString:_toDisplayString$1,createTextVNode:_createTextVNode$1,resolveComponent:_resolveComponent$1,withCtx:_withCtx$1,openBlock:_openBlock$1,createBlock:_createBlock$1,createCommentVNode:_createCommentVNode$1,createVNode:_createVNode$1,createElementBlock:_createElementBlock$1,createElementVNode:_createElementVNode$1,renderList:_renderList$1,Fragment:_Fragment$1,normalizeClass:_normalizeClass$1,withModifiers:_withModifiers} = await importShared('vue');


const _hoisted_1$1 = { class: "vendor-manager" };
const _hoisted_2$1 = {
  key: 0,
  class: "drag-col"
};
const _hoisted_3$1 = ["draggable", "onDragstart", "onDragover", "onDrop"];
const _hoisted_4$1 = {
  key: 0,
  class: "drag-col text-center"
};
const _hoisted_5$1 = ["onClick"];
const _hoisted_6$1 = { class: "status-toggle-cell" };
const _hoisted_7$1 = { class: "name-col" };
const _hoisted_8$1 = { key: 1 };
const _hoisted_9$1 = { class: "url-col" };
const _hoisted_10$1 = {
  key: 1,
  class: "url-text"
};
const _hoisted_11$1 = { key: 0 };
const _hoisted_12$1 = ["colspan"];

const {computed: computed$1,ref: ref$1,watch: watch$1} = await importShared('vue');



const _sfc_main$1 = {
  __name: 'VendorManager',
  props: {
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
},
  emits: ['refresh', 'error', 'drag-mode-change'],
  setup(__props, { expose: __expose, emit: __emit }) {

const props = __props;

const emit = __emit;

// 本地厂商列表
const localVendors = ref$1([]);
const dragMode = ref$1(false);
const dragIndex = ref$1(-1);
const dragOverIndex = ref$1(-1);
const editingId = ref$1(null);
const editBuffer = ref$1({});
const saving = ref$1(false);
const feedback = ref$1({ type: '', message: '', show: false });
// 标记是否有本地未保存的变更（新增/编辑中），防止 watcher 覆盖
const hasLocalChanges = ref$1(false);

// 同步 props.vendors 到 localVendors（仅在无本地变更时同步）
watch$1(() => props.vendors, (next) => {
  if (dragMode.value) return
  // 有本地未保存的变更时，禁止 watcher 覆盖
  if (hasLocalChanges.value) return
  const nextStr = JSON.stringify(next);
  const curStr = JSON.stringify(localVendors.value);
  if (nextStr === curStr) return
  localVendors.value = next.map(v => ({ ...v }));
}, { immediate: true });

const displayVendors = computed$1(() => {
  return [...localVendors.value].sort((a, b) => {
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    return ao - bo
  })
});

function showFeedback(type, message) {
  feedback.value = { type, message, show: true };
  setTimeout(() => { feedback.value.show = false; }, 3000);
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
  };
  localVendors.value = [...localVendors.value, newVendor];
  editingId.value = newVendor.id;
  editBuffer.value = { ...newVendor };
  // 标记有本地变更，防止 watcher 覆盖
  hasLocalChanges.value = true;
}

function startEdit(vendor) {
  editingId.value = vendor.id;
  editBuffer.value = { ...vendor };
}

function cancelEdit() {
  // 如果是新增的行（临时 ID），从列表中移除
  if (editBuffer.value.id && String(editBuffer.value.id).startsWith('temp_')) {
    localVendors.value = localVendors.value.filter(v => v.id !== editBuffer.value.id);
  }
  editingId.value = null;
  editBuffer.value = {};
  // 清除本地变更标记
  hasLocalChanges.value = false;
}

async function saveEdit() {
  if (!editBuffer.value.name?.trim()) {
    showFeedback('error', '厂商名称不能为空');
    return
  }
  saving.value = true;
  try {
    const response = await props.api.post(`${props.pluginBase}/vendors`, editBuffer.value);
    if (response?.success) {
      localVendors.value = response.data.vendors || localVendors.value.map(v =>
        v.id === editBuffer.value.id ? { ...editBuffer.value } : v
      );
      editingId.value = null;
      editBuffer.value = {};
      // 保存成功，清除本地变更标记，允许 watcher 同步
      hasLocalChanges.value = false;
      showFeedback('success', '保存成功');
    } else {
      showFeedback('error', response?.message || '保存失败');
    }
  } catch (err) {
    showFeedback('error', `保存失败: ${err.message}`);
  } finally {
    saving.value = false;
  }
}

async function removeVendor(vendor) {
  if (!confirm(`确定删除厂商「${vendor.name}」？`)) return
  saving.value = true;
  try {
    const response = await props.api.post(`${props.pluginBase}/vendors/delete`, { id: vendor.id });
    if (response?.success) {
      localVendors.value = response.data.vendors || localVendors.value.filter(v => v.id !== vendor.id);
      showFeedback('success', '删除成功');
    } else {
      showFeedback('error', response?.message || '删除失败');
    }
  } catch (err) {
    showFeedback('error', `删除失败: ${err.message}`);
  } finally {
    saving.value = false;
  }
}

async function toggleEnabled(vendor) {
  const updated = { ...vendor, enabled: !vendor.enabled };
  // 乐观更新
  const oldVendors = [...localVendors.value];
  localVendors.value = localVendors.value.map(v => v.id === vendor.id ? updated : v);
  try {
    const response = await props.api.post(`${props.pluginBase}/vendors`, updated);
    if (response?.success) {
      localVendors.value = response.data.vendors || localVendors.value;
    } else {
      // 回滚
      localVendors.value = oldVendors;
      showFeedback('error', response?.message || '切换失败');
    }
  } catch (err) {
    localVendors.value = oldVendors;
    showFeedback('error', `切换失败: ${err.message}`);
  }
}

// 拖拽排序
function toggleDragMode() {
  if (dragMode.value) {
    // 退出排序模式，保存排序
    saveOrder();
  } else {
    dragMode.value = true;
  }
  emit('drag-mode-change', dragMode.value);
}

async function saveOrder() {
  const orderedIds = displayVendors.value.map(v => v.id);
  saving.value = true;
  try {
    const response = await props.api.post(`${props.pluginBase}/vendors/reorder`, { vendor_ids: orderedIds });
    if (response?.success) {
      localVendors.value = response.data.vendors || displayVendors.value.map((v, i) => ({ ...v, sort_order: i }));
      dragMode.value = false;
      showFeedback('success', '排序已保存');
    } else {
      showFeedback('error', response?.message || '排序保存失败');
    }
  } catch (err) {
    showFeedback('error', `排序保存失败: ${err.message}`);
  } finally {
    saving.value = false;
  }
}

function onDragStart(index, e) {
  if (!dragMode.value) return
  dragIndex.value = index;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(index));
}

function onDragOver(index, e) {
  if (!dragMode.value) return
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  dragOverIndex.value = index;
}

function onDragLeave() {
  dragOverIndex.value = -1;
}

function onDrop(index, e) {
  e.preventDefault();
  if (!dragMode.value || dragIndex.value < 0) return
  const from = dragIndex.value;
  const to = index;
  if (from !== to) {
    const arr = [...displayVendors.value];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    // 更新 sort_order
    arr.forEach((v, i) => { v.sort_order = i; });
    localVendors.value = arr;
  }
  dragIndex.value = -1;
  dragOverIndex.value = -1;
}

function onDragEnd() {
  dragIndex.value = -1;
  dragOverIndex.value = -1;
}

function rowClasses(index) {
  return {
    'vendor-row--drag-over': dragMode.value && index === dragOverIndex.value && dragOverIndex.value !== dragIndex.value,
    'vendor-row--dragging': dragMode.value && index === dragIndex.value,
  }
}

// 暴露方法供父组件调用
__expose({
  addVendor,
  toggleDragMode,
});

return (_ctx, _cache) => {
  const _component_VAlert = _resolveComponent$1("VAlert");
  const _component_VSlideYTransition = _resolveComponent$1("VSlideYTransition");
  const _component_VIcon = _resolveComponent$1("VIcon");
  const _component_VTextField = _resolveComponent$1("VTextField");
  const _component_VBtn = _resolveComponent$1("VBtn");
  const _component_VTable = _resolveComponent$1("VTable");
  const _component_VSheet = _resolveComponent$1("VSheet");

  return (_openBlock$1(), _createElementBlock$1("div", _hoisted_1$1, [
    _createVNode$1(_component_VSlideYTransition, null, {
      default: _withCtx$1(() => [
        (feedback.value.show)
          ? (_openBlock$1(), _createBlock$1(_component_VAlert, {
              key: 0,
              type: feedback.value.type,
              variant: "tonal",
              density: "compact",
              class: "mb-3",
              closable: "",
              "onClick:close": _cache[0] || (_cache[0] = $event => (feedback.value.show = false))
            }, {
              default: _withCtx$1(() => [
                _createTextVNode$1(_toDisplayString$1(feedback.value.message), 1)
              ]),
              _: 1
            }, 8, ["type"]))
          : _createCommentVNode$1("", true)
      ]),
      _: 1
    }),
    _createVNode$1(_component_VSheet, {
      border: "",
      rounded: "",
      class: "vendor-table-shell"
    }, {
      default: _withCtx$1(() => [
        _createElementVNode$1("div", {
          class: _normalizeClass$1(["vendor-table-scroll", { 'is-drag-mode': dragMode.value }])
        }, [
          _createVNode$1(_component_VTable, { density: "comfortable" }, {
            default: _withCtx$1(() => [
              _createElementVNode$1("thead", null, [
                _createElementVNode$1("tr", null, [
                  (dragMode.value)
                    ? (_openBlock$1(), _createElementBlock$1("th", _hoisted_2$1))
                    : _createCommentVNode$1("", true),
                  _cache[5] || (_cache[5] = _createElementVNode$1("th", { class: "enable-col" }, "启用", -1)),
                  _cache[6] || (_cache[6] = _createElementVNode$1("th", { class: "name-col" }, "名称", -1)),
                  _cache[7] || (_cache[7] = _createElementVNode$1("th", { class: "url-col" }, "API 地址", -1)),
                  _cache[8] || (_cache[8] = _createElementVNode$1("th", { class: "action-col text-right" }, "操作", -1))
                ])
              ]),
              _createElementVNode$1("tbody", null, [
                (_openBlock$1(true), _createElementBlock$1(_Fragment$1, null, _renderList$1(displayVendors.value, (vendor, index) => {
                  return (_openBlock$1(), _createElementBlock$1("tr", {
                    key: vendor.id,
                    draggable: dragMode.value,
                    class: _normalizeClass$1(rowClasses(index)),
                    onDragstart: $event => (onDragStart(index, $event)),
                    onDragover: $event => (onDragOver(index, $event)),
                    onDragleave: onDragLeave,
                    onDrop: $event => (onDrop(index, $event)),
                    onDragend: onDragEnd
                  }, [
                    (dragMode.value)
                      ? (_openBlock$1(), _createElementBlock$1("td", _hoisted_4$1, [
                          _createVNode$1(_component_VIcon, {
                            icon: "mdi-drag-vertical",
                            size: "small",
                            color: "primary"
                          })
                        ]))
                      : _createCommentVNode$1("", true),
                    _createElementVNode$1("td", {
                      class: "enable-col",
                      onClick: _withModifiers($event => (editingId.value !== vendor.id && toggleEnabled(vendor)), ["stop"])
                    }, [
                      _createElementVNode$1("div", _hoisted_6$1, [
                        (editingId.value !== vendor.id)
                          ? (_openBlock$1(), _createElementBlock$1("span", {
                              key: 0,
                              class: _normalizeClass$1(['status-dot', vendor.enabled ? 'active' : 'inactive'])
                            }, null, 2))
                          : (_openBlock$1(), _createElementBlock$1("span", {
                              key: 1,
                              class: _normalizeClass$1(['status-dot', editBuffer.value.enabled ? 'active' : 'inactive']),
                              onClick: _cache[1] || (_cache[1] = _withModifiers($event => (editBuffer.value.enabled = !editBuffer.value.enabled), ["stop"]))
                            }, null, 2))
                      ])
                    ], 8, _hoisted_5$1),
                    _createElementVNode$1("td", _hoisted_7$1, [
                      (editingId.value === vendor.id)
                        ? (_openBlock$1(), _createBlock$1(_component_VTextField, {
                            key: 0,
                            modelValue: editBuffer.value.name,
                            "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((editBuffer.value.name) = $event)),
                            variant: "outlined",
                            density: "compact",
                            "hide-details": "",
                            "single-line": ""
                          }, null, 8, ["modelValue"]))
                        : (_openBlock$1(), _createElementBlock$1("span", _hoisted_8$1, _toDisplayString$1(vendor.name), 1))
                    ]),
                    _createElementVNode$1("td", _hoisted_9$1, [
                      (editingId.value === vendor.id)
                        ? (_openBlock$1(), _createBlock$1(_component_VTextField, {
                            key: 0,
                            modelValue: editBuffer.value.url,
                            "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((editBuffer.value.url) = $event)),
                            variant: "outlined",
                            density: "compact",
                            "hide-details": "",
                            "single-line": "",
                            placeholder: "https://api.example.com/v1"
                          }, null, 8, ["modelValue"]))
                        : (_openBlock$1(), _createElementBlock$1("span", _hoisted_10$1, _toDisplayString$1(vendor.url), 1))
                    ]),
                    _createElementVNode$1("td", {
                      class: "action-col text-right",
                      onClick: _cache[4] || (_cache[4] = _withModifiers(() => {}, ["stop"]))
                    }, [
                      (editingId.value === vendor.id)
                        ? (_openBlock$1(), _createElementBlock$1(_Fragment$1, { key: 0 }, [
                            _createVNode$1(_component_VBtn, {
                              icon: "mdi-check",
                              size: "small",
                              variant: "text",
                              color: "success",
                              loading: saving.value,
                              onClick: saveEdit
                            }, null, 8, ["loading"]),
                            _createVNode$1(_component_VBtn, {
                              icon: "mdi-close",
                              size: "small",
                              variant: "text",
                              disabled: saving.value,
                              onClick: cancelEdit
                            }, null, 8, ["disabled"])
                          ], 64))
                        : (_openBlock$1(), _createElementBlock$1(_Fragment$1, { key: 1 }, [
                            _createVNode$1(_component_VBtn, {
                              icon: "mdi-pencil",
                              size: "small",
                              variant: "text",
                              onClick: $event => (startEdit(vendor))
                            }, null, 8, ["onClick"]),
                            _createVNode$1(_component_VBtn, {
                              icon: "mdi-delete",
                              size: "small",
                              variant: "text",
                              color: "error",
                              onClick: $event => (removeVendor(vendor))
                            }, null, 8, ["onClick"])
                          ], 64))
                    ])
                  ], 42, _hoisted_3$1))
                }), 128)),
                (!displayVendors.value.length)
                  ? (_openBlock$1(), _createElementBlock$1("tr", _hoisted_11$1, [
                      _createElementVNode$1("td", {
                        colspan: dragMode.value ? 5 : 4,
                        class: "text-center text-medium-emphasis py-8"
                      }, " 暂无厂商，点击\"新增\"添加 ", 8, _hoisted_12$1)
                    ]))
                  : _createCommentVNode$1("", true)
              ])
            ]),
            _: 1
          })
        ], 2)
      ]),
      _: 1
    })
  ]))
}
}

};
const VendorManager = /*#__PURE__*/_export_sfc(_sfc_main$1, [['__scopeId',"data-v-8c2d85aa"]]);

const {createElementVNode:_createElementVNode,resolveComponent:_resolveComponent,createVNode:_createVNode,openBlock:_openBlock,createElementBlock:_createElementBlock,createCommentVNode:_createCommentVNode,toDisplayString:_toDisplayString,createTextVNode:_createTextVNode,withCtx:_withCtx,createBlock:_createBlock,unref:_unref,renderList:_renderList,Fragment:_Fragment,normalizeClass:_normalizeClass} = await importShared('vue');


const _hoisted_1 = {
  key: 0,
  class: "agenttokens-header"
};
const _hoisted_2 = { class: "agenttokens-control-panel__row" };
const _hoisted_3 = { class: "agenttokens-control-panel__cell agenttokens-control-panel__cell--left" };
const _hoisted_4 = { class: "agenttokens-control-panel__cell" };
const _hoisted_5 = { class: "agenttokens-control-panel__row" };
const _hoisted_6 = { class: "agenttokens-control-panel__cell agenttokens-control-panel__cell--left" };
const _hoisted_7 = { class: "config-label" };
const _hoisted_8 = { class: "agenttokens-control-panel__limit-value" };
const _hoisted_9 = { class: "agenttokens-control-panel__cell" };
const _hoisted_10 = { class: "agenttokens-overview-grid" };
const _hoisted_11 = { class: "agenttokens-stat-card__value" };
const _hoisted_12 = { class: "agenttokens-stat-card__value" };
const _hoisted_13 = { class: "agenttokens-stat-card__hint" };
const _hoisted_14 = {
  key: 0,
  class: "mobile-nav-bar"
};
const _hoisted_15 = { class: "mobile-tabs" };
const _hoisted_16 = ["onClick"];
const _hoisted_17 = { class: "mobile-actions" };
const _hoisted_18 = {
  key: 1,
  class: "agenttokens-tabs-row"
};
const _hoisted_19 = { class: "agenttokens-table-actions" };

const {computed,nextTick,onBeforeUnmount,onMounted,ref,watch} = await importShared('vue');


const _sfc_main = {
  __name: 'AgentTokensManager',
  props: {
  config: {
    type: Object,
    default: () => ({ enabled: false, show_sidebar_nav: true, max_failures: 3, providers: [] }),
  },
  providerRows: {
    type: Array,
    default: () => [],
  },
  summary: {
    type: Object,
    default: () => ({}),
  },
  activeProviderId: {
    type: String,
    default: null,
  },
  vendors: {
    type: Array,
    default: () => [],
  },
  api: {
    type: Object,
    required: true,
  },
  pluginBase: {
    type: String,
    default: 'plugin/AgentTokensPro',
  },
  error: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  hideTitle: {
    type: Boolean,
    default: false,
  },
},
  emits: [
  'refresh',
  'save',
  'auto-save',
  'reset-usage',
  'reset-all-usage',
  'query-models',
  'test-connection',
  'select-provider',
],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

const activeTab = ref('usage');
const showEditor = ref(false);
const editorIndex = ref(-1);
const editedProvider = ref(createProvider());
const failedProviderIds = ref([]);
const testFeedback = ref({ type: '', message: '', show: false });
const dragMode = ref(false);
const importFileInput = ref(null);
// 单一数据源：表格始终绑定此数组，拖拽/编辑都直接操作它
const localProviders = ref([]);
// 厂商管理 ref
const vendorRef = ref(null);
// 厂商拖拽模式状态（镜像 VendorManager 内部状态）
const vendorDragMode = ref(false);
// 移动端判定：UA + 触控 + 窗口宽度
const isMobile = ref(false);
// 移动端 Tab 列表
const mobileTabs = [
  { value: 'usage', label: '总览' },
  { value: 'config', label: '供应商' },
  { value: 'vendors', label: '厂商' },
];

function checkMobile() {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth <= 768
    || ('ontouchstart' in window);
}

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile);
});

const configValue = computed(() => props.config || { enabled: false, show_sidebar_nav: true, max_failures: 3, providers: [] });
const providers = computed(() => (Array.isArray(configValue.value.providers) ? configValue.value.providers : []));
const displayProviderRows = computed(() => (
  props.providerRows.length ? props.providerRows : buildProviderRows(providers.value)
));
const displaySummary = computed(() => (
  Object.keys(props.summary || {}).length ? props.summary : buildProviderSummary(displayProviderRows.value)
));
const limitedUsed = computed(() => Number(displaySummary.value.limited_used ?? displaySummary.value.total_used ?? 0));
const unlimitedUsed = computed(() => Number(displaySummary.value.unlimited_used || 0));

// 非拖拽模式下，providers 变化时同步到 localProviders
// 关键：只比较内容，内容一致时直接跳过，防止服务器/父组件回包覆盖
watch(providers, (next) => {
  if (dragMode.value) return
  const nextStr = JSON.stringify(next);
  const curStr = JSON.stringify(localProviders.value);
  if (nextStr === curStr) return
  localProviders.value = next.map(p => ({ ...p }));
}, { immediate: true });

function showTestFeedback(type, message) {
  testFeedback.value = { type, message, show: true };
  setTimeout(() => { testFeedback.value.show = false; }, 3000);
}

// 重置弹窗表单为默认值，关闭弹窗。
function resetForm() {
  editedProvider.value = createProvider();
  editorIndex.value = -1;
  showEditor.value = false;
}

// 打开新增供应商弹窗。
function addProvider() {
  editedProvider.value = { ...createProvider(), priority: getNextProviderPriority(localProviders.value) };
  editorIndex.value = -1;
  showEditor.value = true;
}

// 打开编辑供应商弹窗。
function editProvider(index) {
  editedProvider.value = { ...localProviders.value[index] };
  editorIndex.value = index;
  showEditor.value = true;
}

// 将弹窗中的供应商写回配置列表并自动保存。
function commitProvider() {
  const nextProviders = [...localProviders.value];
  const normalized = normalizeProvider(editedProvider.value, nextProviders.length + 1);
  normalized.enabled = true;

  if (editorIndex.value >= 0) {
    nextProviders.splice(editorIndex.value, 1, normalized);
  } else {
    nextProviders.push(normalized);
  }
  configValue.value.providers = nextProviders;
  showEditor.value = false;
  emit('auto-save');
}

// 导出配置：将当前配置（enabled, show_sidebar_nav, max_failures, providers）和厂商列表导出为 JSON 文件。
function handleExport() {
  const exportData = {
    version: 'agenttokenspro-export-v2',
    exported_at: new Date().toISOString(),
    config: {
      enabled: Boolean(configValue.value.enabled),
      show_sidebar_nav: Boolean(configValue.value.show_sidebar_nav),
      max_failures: Number(configValue.value.max_failures) || 3,
      providers: (configValue.value.providers || []).map(p => ({ ...p })),
    },
    vendors: (props.vendors || []).map(v => ({ ...v })),
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  a.download = `AgentTokensPro_config_${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 触发文件选择对话框。
function handleImportClick() {
  if (importFileInput.value) {
    importFileInput.value.value = '';
    importFileInput.value.click();
  }
}

// 处理导入文件：读取 JSON 并验证格式后写入配置和厂商数据。
async function handleImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) return

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target?.result);
      // 验证格式
      const importConfig = data?.config || data;
      if (!importConfig || !Array.isArray(importConfig.providers)) {
        alert('导入失败：文件格式不正确，缺少 providers 数组');
        return
      }
      const importVendors = Array.isArray(data?.vendors) ? data.vendors : [];
      const totalCount = importConfig.providers.length + importVendors.length;
      // 确认覆盖
      const ok = confirm(
        `即将导入 ${importConfig.providers.length} 个供应商和 ${importVendors.length} 个厂商配置，这将覆盖当前所有配置。\n\n确定要继续吗？`,
      );
      if (!ok) return

      // 写入配置（providers + 基础设置）
      configValue.value = {
        enabled: Boolean(importConfig.enabled ?? configValue.value.enabled),
        show_sidebar_nav: Boolean(importConfig.show_sidebar_nav ?? configValue.value.show_sidebar_nav),
        max_failures: Number(importConfig.max_failures) || 3,
        providers: importConfig.providers.map((p, idx) => normalizeProvider(p, idx + 1)),
      };
      localProviders.value = [...configValue.value.providers];
      emit('auto-save');

      // 写入厂商数据（通过 API 逐条保存，保持与前端厂商管理一致的逻辑）
      if (importVendors.length > 0) {
        try {
          // 先清空现有厂商：获取当前列表并逐条删除
          const currentResp = await props.api.get(`${props.pluginBase}/vendors`);
          const currentData = currentResp?.data?.vendors || currentResp?.data || [];
          if (Array.isArray(currentData) && currentData.length > 0) {
            for (const v of currentData) {
              if (v?.id) {
                await props.api.post(`${props.pluginBase}/vendors/delete`, { id: v.id });
              }
            }
          }
          // 按 sort_order 排序后逐条新增
          const sortedVendors = [...importVendors].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          for (const vendor of sortedVendors) {
            const { id, ...vendorData } = vendor; // 移除旧 ID，让后端生成新 ID
            await props.api.post(`${props.pluginBase}/vendors`, vendorData);
          }
        } catch (vendorErr) {
          console.warn('厂商数据导入失败:', vendorErr);
          alert('供应商配置已导入，但厂商数据导入失败，请手动检查厂商页。');
        }
      }

      // 刷新厂商列表
      emit('refresh');
      alert(`导入成功！已恢复 ${importConfig.providers.length} 个供应商和 ${importVendors.length} 个厂商配置。`);
    } catch (err) {
      alert(`导入失败：${err?.message || '文件解析错误'}`);
    }
  };
  reader.readAsText(file);
}

// 从配置列表中移除一个供应商。
function removeProvider(index) {
  const nextProviders = [...localProviders.value];
  nextProviders.splice(index, 1);
  configValue.value.providers = nextProviders;
  emit('auto-save');
}

// 切换供应商启用状态并自动保存。
function toggleProvider(index) {
  const provider = localProviders.value[index];
  if (!provider) return
  provider.enabled = !provider.enabled;
  configValue.value.providers = [...localProviders.value];
  emit('auto-save');
}

// 选择供应商为默认，将其置顶并触发连通性测试。
function selectProvider(providerId) {
  // 兼容 index 和 providerId 两种入参
  let resolvedId = providerId;
  if (typeof providerId === 'number') {
    const provider = localProviders.value[providerId];
    if (!provider || !provider.id) return
    resolvedId = provider.id;
  }

  // 检查供应商是否处于故障状态（连续失败达到阈值）
  const providerWithUsage = displayProviderRows.value.find(p => p.id === resolvedId);
  const failureCount = providerWithUsage?.usage?.failure_count || 0;
  const maxFailures = configValue.value.max_failures || 3;
  if (failureCount >= maxFailures) {
    showTestFeedback('error', `供应商 [${providerWithUsage?.name || resolvedId}] 已连续失败 ${failureCount} 次，处于故障状态，无法直接启用。请先测试连通性确认恢复后再启用。`);
    return
  }

  // 将选中供应商移到列表首位（置顶）
  const idx = localProviders.value.findIndex(p => p.id === resolvedId);
  if (idx > 0) {
    const nextProviders = [...localProviders.value];
    const [moved] = nextProviders.splice(idx, 1);
    nextProviders.unshift(moved);
    configValue.value.providers = nextProviders;
  }
  emit('select-provider', resolvedId);
}

// 拖拽排序：将 from 位置的供应商移到 to 位置（操作 localProviders）。
function reorderProvider(from, to) {
  const src = localProviders.value;
  const [moved] = src.splice(from, 1);
  src.splice(to, 0, moved);
  // 清除拖拽高亮状态，防止浏览器残留 DOM 样式与 Vue patch 冲突
  // 通过传递特殊标记让子组件自行清除（或由子组件在 onDrop 中已清除）
}

// 切换拖拽模式：进入时拍快照，退出时一次性提交。
// 核心保障：退出前先同步更新父组件数据，确保 Vue 渲染时拿到新数据
function toggleDragMode() {
  if (dragMode.value) {
    // 退出排序：localProviders 已是最新顺序
    // ① 先同步将最新排序写回父组件数据源
    const target = configValue.value.providers;
    if (Array.isArray(target)) {
      target.splice(0, target.length, ...localProviders.value);
    }
    // ② 发起静默保存请求（异步，不阻塞数据更新）
    emit('auto-save');
    // ③ 最后再设置 dragMode = false，此时父组件数据已是最新
    dragMode.value = false;
  } else {
    // 进入排序：拍快照（用于比对是否有变化）
    localProviders.value.map(p => ({ ...p }));
    dragMode.value = true;
  }
}

// 请求重置单个供应商用量并自动保存。
function resetUsage(providerId, index) {
  emit('reset-usage', providerId, index);
}

// 请求重置全部供应商用量并自动保存。
function resetAllUsage() {
  emit('reset-all-usage');
}

// 切换厂商拖拽排序模式
function toggleVendorDragMode() {
  vendorRef.value?.toggleDragMode();
}

// 从总览页点击名称跳转到供应商 Tab 并打开编辑弹窗
async function openVendorEditFromOverview(row) {
  if (!row || !row.id) {
    showTestFeedback('error', '供应商数据异常，无法编辑');
    return
  }
  // 切换到供应商 Tab
  activeTab.value = 'config';
  // 等待 Tab 切换完成后再打开弹窗
  await nextTick();
  // 在 localProviders 中查找对应供应商
  const index = localProviders.value.findIndex(p => p.id === row.id);
  if (index < 0) {
    showTestFeedback('error', `未找到供应商 [${row.name || row.id}]，可能已被删除`);
    return
  }
  editProvider(index);
}

return (_ctx, _cache) => {
  const _component_VSpacer = _resolveComponent("VSpacer");
  const _component_VBtn = _resolveComponent("VBtn");
  const _component_VAlert = _resolveComponent("VAlert");
  const _component_VSlideYTransition = _resolveComponent("VSlideYTransition");
  const _component_VSwitch = _resolveComponent("VSwitch");
  const _component_VIcon = _resolveComponent("VIcon");
  const _component_VTextField = _resolveComponent("VTextField");
  const _component_VSheet = _resolveComponent("VSheet");
  const _component_VTab = _resolveComponent("VTab");
  const _component_VTabs = _resolveComponent("VTabs");
  const _component_VDivider = _resolveComponent("VDivider");
  const _component_VWindowItem = _resolveComponent("VWindowItem");
  const _component_VWindow = _resolveComponent("VWindow");

  return (_openBlock(), _createElementBlock("div", {
    class: _normalizeClass(["agenttokens-page", { 'is-mobile': isMobile.value }])
  }, [
    (!__props.hideTitle)
      ? (_openBlock(), _createElementBlock("div", _hoisted_1, [
          _cache[13] || (_cache[13] = _createElementVNode("h2", { class: "text-2xl font-bold leading-7 text-gray-100 truncate sm:text-3xl sm:leading-9" }, [
            _createElementVNode("span", { class: "text-moviepilot" }, "Agent Tokens 管理")
          ], -1)),
          _createVNode(_component_VSpacer),
          _createVNode(_component_VBtn, {
            icon: "mdi-refresh",
            variant: "text",
            loading: __props.loading,
            onClick: _cache[0] || (_cache[0] = $event => (emit('refresh')))
          }, null, 8, ["loading"]),
          _createVNode(_component_VBtn, {
            icon: "mdi-content-save",
            variant: "text",
            color: "primary",
            loading: __props.saving,
            onClick: _cache[1] || (_cache[1] = $event => (emit('save')))
          }, null, 8, ["loading"])
        ]))
      : _createCommentVNode("", true),
    (__props.error)
      ? (_openBlock(), _createBlock(_component_VAlert, {
          key: 1,
          type: "error",
          variant: "tonal",
          class: "mb-4"
        }, {
          default: _withCtx(() => [
            _createTextVNode(_toDisplayString(__props.error), 1)
          ]),
          _: 1
        }))
      : _createCommentVNode("", true),
    _createVNode(_component_VSlideYTransition, null, {
      default: _withCtx(() => [
        (testFeedback.value.show)
          ? (_openBlock(), _createBlock(_component_VAlert, {
              key: 0,
              type: testFeedback.value.type,
              variant: "tonal",
              density: "compact",
              class: "mb-3",
              closable: "",
              "onClick:close": _cache[2] || (_cache[2] = $event => (testFeedback.value.show = false))
            }, {
              default: _withCtx(() => [
                _createTextVNode(_toDisplayString(testFeedback.value.message), 1)
              ]),
              _: 1
            }, 8, ["type"]))
          : _createCommentVNode("", true)
      ]),
      _: 1
    }),
    _createVNode(_component_VSheet, {
      border: "",
      rounded: "",
      class: "agenttokens-control-panel"
    }, {
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_2, [
          _createElementVNode("div", _hoisted_3, [
            _cache[14] || (_cache[14] = _createElementVNode("span", { class: "switch-label" }, "启用插件", -1)),
            _createVNode(_component_VSwitch, {
              modelValue: configValue.value.enabled,
              "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((configValue.value.enabled) = $event)),
              color: "primary",
              "hide-details": "",
              inset: ""
            }, null, 8, ["modelValue"])
          ]),
          _createElementVNode("div", _hoisted_4, [
            _cache[15] || (_cache[15] = _createElementVNode("span", { class: "switch-label" }, "侧边栏入口", -1)),
            _createVNode(_component_VSwitch, {
              modelValue: configValue.value.show_sidebar_nav,
              "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((configValue.value.show_sidebar_nav) = $event)),
              color: "primary",
              "hide-details": "",
              inset: ""
            }, null, 8, ["modelValue"])
          ])
        ]),
        _createElementVNode("div", _hoisted_5, [
          _createElementVNode("div", _hoisted_6, [
            _createElementVNode("div", _hoisted_7, [
              _createVNode(_component_VIcon, {
                icon: "mdi-database-outline",
                color: "info",
                size: "small"
              }),
              _cache[16] || (_cache[16] = _createElementVNode("span", null, "限量总额度", -1))
            ]),
            _createElementVNode("span", _hoisted_8, _toDisplayString(displaySummary.value.total_limit ? _unref(formatTokens)(displaySummary.value.total_limit) : '不限'), 1)
          ]),
          _createElementVNode("div", _hoisted_9, [
            _cache[17] || (_cache[17] = _createElementVNode("span", { class: "config-label" }, "失败切换阈值", -1)),
            _createVNode(_component_VTextField, {
              modelValue: configValue.value.max_failures,
              "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((configValue.value.max_failures) = $event)),
              modelModifiers: { number: true },
              type: "number",
              min: "1",
              max: "100",
              density: "compact",
              "hide-details": "",
              variant: "outlined",
              class: "center-input",
              style: {"max-width":"72px"}
            }, null, 8, ["modelValue"])
          ])
        ])
      ]),
      _: 1
    }),
    _createElementVNode("div", _hoisted_10, [
      _createVNode(UsageOverviewCard, {
        class: "agenttokens-overview-card",
        summary: displaySummary.value
      }, null, 8, ["summary"]),
      _createVNode(_component_VSheet, {
        border: "",
        rounded: "",
        class: "agenttokens-stat-card"
      }, {
        default: _withCtx(() => [
          _createVNode(_component_VIcon, {
            icon: "mdi-check-decagram-outline",
            color: "success"
          }),
          _createElementVNode("div", null, [
            _cache[18] || (_cache[18] = _createElementVNode("div", { class: "text-caption text-medium-emphasis" }, "可用供应商", -1)),
            _createElementVNode("div", _hoisted_11, _toDisplayString(displaySummary.value.available_count || 0) + " / " + _toDisplayString(displaySummary.value.enabled_count || 0), 1)
          ])
        ]),
        _: 1
      }),
      _createVNode(_component_VSheet, {
        border: "",
        rounded: "",
        class: "agenttokens-stat-card"
      }, {
        default: _withCtx(() => [
          _createVNode(_component_VIcon, {
            icon: "mdi-chart-timeline-variant",
            color: "primary"
          }),
          _createElementVNode("div", null, [
            _cache[19] || (_cache[19] = _createElementVNode("div", { class: "text-caption text-medium-emphasis" }, "累计使用", -1)),
            _createElementVNode("div", _hoisted_12, _toDisplayString(_unref(formatTokens)(displaySummary.value.total_used)), 1),
            _createElementVNode("div", _hoisted_13, " 限量 " + _toDisplayString(_unref(formatTokens)(limitedUsed.value)) + " / 不限量 " + _toDisplayString(_unref(formatTokens)(unlimitedUsed.value)), 1)
          ])
        ]),
        _: 1
      })
    ]),
    _createVNode(_component_VSheet, {
      border: "",
      rounded: "",
      class: "agenttokens-content-panel"
    }, {
      default: _withCtx(() => [
        (isMobile.value)
          ? (_openBlock(), _createElementBlock("div", _hoisted_14, [
              _createElementVNode("div", _hoisted_15, [
                (_openBlock(), _createElementBlock(_Fragment, null, _renderList(mobileTabs, (tab) => {
                  return _createElementVNode("button", {
                    key: tab.value,
                    class: _normalizeClass(['mobile-tab-btn', { active: activeTab.value === tab.value }]),
                    onClick: $event => (activeTab.value = tab.value)
                  }, _toDisplayString(tab.label), 11, _hoisted_16)
                }), 64))
              ]),
              _createElementVNode("div", _hoisted_17, [
                (activeTab.value === 'usage')
                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                      _createVNode(_component_VBtn, {
                        size: "x-small",
                        variant: "text",
                        color: "primary",
                        onClick: handleExport,
                        class: "mobile-action-btn"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_VIcon, { size: "18" }, {
                            default: _withCtx(() => [...(_cache[20] || (_cache[20] = [
                              _createTextVNode("mdi-export", -1)
                            ]))]),
                            _: 1
                          }),
                          _cache[21] || (_cache[21] = _createElementVNode("span", null, "导出", -1))
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_VBtn, {
                        size: "x-small",
                        variant: "text",
                        color: "primary",
                        onClick: handleImportClick,
                        class: "mobile-action-btn"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_VIcon, { size: "18" }, {
                            default: _withCtx(() => [...(_cache[22] || (_cache[22] = [
                              _createTextVNode("mdi-import", -1)
                            ]))]),
                            _: 1
                          }),
                          _cache[23] || (_cache[23] = _createElementVNode("span", null, "导入", -1))
                        ]),
                        _: 1
                      }),
                      _createElementVNode("input", {
                        ref_key: "importFileInput",
                        ref: importFileInput,
                        type: "file",
                        accept: ".json",
                        style: {"display":"none"},
                        onChange: handleImportFile
                      }, null, 544)
                    ], 64))
                  : _createCommentVNode("", true),
                (activeTab.value === 'config')
                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                      _createVNode(_component_VBtn, {
                        size: "x-small",
                        variant: "text",
                        color: "primary",
                        onClick: addProvider,
                        class: "mobile-action-btn"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_VIcon, { size: "18" }, {
                            default: _withCtx(() => [...(_cache[24] || (_cache[24] = [
                              _createTextVNode("mdi-plus", -1)
                            ]))]),
                            _: 1
                          }),
                          _cache[25] || (_cache[25] = _createElementVNode("span", null, "新增", -1))
                        ]),
                        _: 1
                      }),
                      _createVNode(_component_VBtn, {
                        size: "x-small",
                        variant: dragMode.value ? 'flat' : 'text',
                        color: dragMode.value ? 'warning' : 'default',
                        onClick: toggleDragMode,
                        class: "mobile-action-btn"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_VIcon, { size: "18" }, {
                            default: _withCtx(() => [...(_cache[26] || (_cache[26] = [
                              _createTextVNode("mdi-sort", -1)
                            ]))]),
                            _: 1
                          }),
                          _createElementVNode("span", null, _toDisplayString(dragMode.value ? '完成' : '排序'), 1)
                        ]),
                        _: 1
                      }, 8, ["variant", "color"]),
                      _createVNode(_component_VBtn, {
                        size: "x-small",
                        variant: "text",
                        color: "warning",
                        onClick: resetAllUsage,
                        class: "mobile-action-btn"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_VIcon, { size: "18" }, {
                            default: _withCtx(() => [...(_cache[27] || (_cache[27] = [
                              _createTextVNode("mdi-backup-restore", -1)
                            ]))]),
                            _: 1
                          }),
                          _cache[28] || (_cache[28] = _createElementVNode("span", null, "重置", -1))
                        ]),
                        _: 1
                      })
                    ], 64))
                  : _createCommentVNode("", true),
                (activeTab.value === 'vendors')
                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                      _createVNode(_component_VBtn, {
                        size: "x-small",
                        variant: "text",
                        color: "primary",
                        onClick: vendorRef.value?.addVendor,
                        class: "mobile-action-btn"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_VIcon, { size: "18" }, {
                            default: _withCtx(() => [...(_cache[29] || (_cache[29] = [
                              _createTextVNode("mdi-plus", -1)
                            ]))]),
                            _: 1
                          }),
                          _cache[30] || (_cache[30] = _createElementVNode("span", null, "新增", -1))
                        ]),
                        _: 1
                      }, 8, ["onClick"]),
                      _createVNode(_component_VBtn, {
                        size: "x-small",
                        variant: vendorDragMode.value ? 'flat' : 'text',
                        color: vendorDragMode.value ? 'warning' : 'default',
                        onClick: toggleVendorDragMode,
                        class: "mobile-action-btn"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_VIcon, { size: "18" }, {
                            default: _withCtx(() => [...(_cache[31] || (_cache[31] = [
                              _createTextVNode("mdi-sort", -1)
                            ]))]),
                            _: 1
                          }),
                          _createElementVNode("span", null, _toDisplayString(vendorDragMode.value ? '完成' : '排序'), 1)
                        ]),
                        _: 1
                      }, 8, ["variant", "color"])
                    ], 64))
                  : _createCommentVNode("", true)
              ])
            ]))
          : (_openBlock(), _createElementBlock("div", _hoisted_18, [
              _createVNode(_component_VTabs, {
                modelValue: activeTab.value,
                "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((activeTab).value = $event)),
                density: "comfortable"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_VTab, { value: "usage" }, {
                    default: _withCtx(() => [...(_cache[32] || (_cache[32] = [
                      _createTextVNode("总览", -1)
                    ]))]),
                    _: 1
                  }),
                  _createVNode(_component_VTab, { value: "config" }, {
                    default: _withCtx(() => [...(_cache[33] || (_cache[33] = [
                      _createTextVNode("供应商", -1)
                    ]))]),
                    _: 1
                  }),
                  _createVNode(_component_VTab, { value: "vendors" }, {
                    default: _withCtx(() => [...(_cache[34] || (_cache[34] = [
                      _createTextVNode("厂商", -1)
                    ]))]),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["modelValue"]),
              _createElementVNode("div", _hoisted_19, [
                (activeTab.value === 'usage')
                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                      _createVNode(_component_VBtn, {
                        "prepend-icon": "mdi-export",
                        color: "primary",
                        variant: "tonal",
                        onClick: handleExport
                      }, {
                        default: _withCtx(() => [...(_cache[35] || (_cache[35] = [
                          _createTextVNode(" 导出配置 ", -1)
                        ]))]),
                        _: 1
                      }),
                      _createVNode(_component_VBtn, {
                        "prepend-icon": "mdi-import",
                        color: "primary",
                        variant: "tonal",
                        onClick: handleImportClick
                      }, {
                        default: _withCtx(() => [...(_cache[36] || (_cache[36] = [
                          _createTextVNode(" 导入配置 ", -1)
                        ]))]),
                        _: 1
                      }),
                      _createElementVNode("input", {
                        ref_key: "importFileInput",
                        ref: importFileInput,
                        type: "file",
                        accept: ".json",
                        style: {"display":"none"},
                        onChange: handleImportFile
                      }, null, 544)
                    ], 64))
                  : _createCommentVNode("", true),
                (activeTab.value === 'config')
                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                      _createVNode(_component_VBtn, {
                        "prepend-icon": "mdi-plus",
                        color: "primary",
                        variant: "tonal",
                        onClick: addProvider
                      }, {
                        default: _withCtx(() => [...(_cache[37] || (_cache[37] = [
                          _createTextVNode(" 新增 ", -1)
                        ]))]),
                        _: 1
                      }),
                      _createVNode(_component_VBtn, {
                        "prepend-icon": "mdi-sort",
                        color: dragMode.value ? 'warning' : 'default',
                        variant: dragMode.value ? 'flat' : 'tonal',
                        onClick: toggleDragMode
                      }, {
                        default: _withCtx(() => [
                          _createTextVNode(_toDisplayString(dragMode.value ? '完成排序' : '排序'), 1)
                        ]),
                        _: 1
                      }, 8, ["color", "variant"]),
                      _createVNode(_component_VBtn, {
                        "prepend-icon": "mdi-backup-restore",
                        color: "warning",
                        variant: "tonal",
                        onClick: resetAllUsage
                      }, {
                        default: _withCtx(() => [...(_cache[38] || (_cache[38] = [
                          _createTextVNode(" 重置用量 ", -1)
                        ]))]),
                        _: 1
                      })
                    ], 64))
                  : _createCommentVNode("", true),
                (activeTab.value === 'vendors')
                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                      _createVNode(_component_VBtn, {
                        "prepend-icon": "mdi-plus",
                        color: "primary",
                        variant: "tonal",
                        onClick: vendorRef.value?.addVendor
                      }, {
                        default: _withCtx(() => [...(_cache[39] || (_cache[39] = [
                          _createTextVNode(" 新增 ", -1)
                        ]))]),
                        _: 1
                      }, 8, ["onClick"]),
                      _createVNode(_component_VBtn, {
                        "prepend-icon": "mdi-sort",
                        color: vendorDragMode.value ? 'warning' : 'default',
                        variant: vendorDragMode.value ? 'flat' : 'tonal',
                        onClick: toggleVendorDragMode
                      }, {
                        default: _withCtx(() => [
                          _createTextVNode(_toDisplayString(vendorDragMode.value ? '完成排序' : '排序'), 1)
                        ]),
                        _: 1
                      }, 8, ["color", "variant"])
                    ], 64))
                  : _createCommentVNode("", true)
              ])
            ])),
        _createVNode(_component_VDivider),
        _createVNode(_component_VWindow, {
          modelValue: activeTab.value,
          "onUpdate:modelValue": _cache[9] || (_cache[9] = $event => ((activeTab).value = $event)),
          touch: false,
          class: "agenttokens-window"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_VWindowItem, { value: "usage" }, {
              default: _withCtx(() => [
                _createVNode(ProviderUsageTable, {
                  "provider-rows": displayProviderRows.value,
                  "active-provider-id": __props.activeProviderId,
                  "failed-provider-ids": failedProviderIds.value,
                  onReset: resetUsage,
                  onSelect: selectProvider,
                  onOpenVendorEdit: openVendorEditFromOverview
                }, null, 8, ["provider-rows", "active-provider-id", "failed-provider-ids"])
              ]),
              _: 1
            }),
            _createVNode(_component_VWindowItem, { value: "config" }, {
              default: _withCtx(() => [
                _createVNode(ProviderConfigTable, {
                  providers: localProviders.value,
                  "provider-rows": displayProviderRows.value,
                  "active-provider-id": __props.activeProviderId,
                  "failed-provider-ids": failedProviderIds.value,
                  "drag-mode": dragMode.value,
                  "show-credentials": "",
                  onEdit: editProvider,
                  onRemove: removeProvider,
                  onSelect: selectProvider,
                  onToggle: toggleProvider,
                  onReorder: reorderProvider
                }, null, 8, ["providers", "provider-rows", "active-provider-id", "failed-provider-ids", "drag-mode"])
              ]),
              _: 1
            }),
            _createVNode(_component_VWindowItem, { value: "vendors" }, {
              default: _withCtx(() => [
                _createVNode(VendorManager, {
                  ref_key: "vendorRef",
                  ref: vendorRef,
                  vendors: props.vendors,
                  api: props.api,
                  "plugin-base": props.pluginBase,
                  loading: __props.loading,
                  onRefresh: _cache[7] || (_cache[7] = $event => (emit('refresh'))),
                  onDragModeChange: _cache[8] || (_cache[8] = $event => (vendorDragMode.value = $event))
                }, null, 8, ["vendors", "api", "plugin-base", "loading"])
              ]),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["modelValue"])
      ]),
      _: 1
    }),
    _createVNode(ProviderEditorDialog, {
      modelValue: showEditor.value,
      "onUpdate:modelValue": _cache[10] || (_cache[10] = $event => ((showEditor).value = $event)),
      "retain-focus": false,
      provider: editedProvider.value,
      "editor-index": editorIndex.value,
      "existing-providers": localProviders.value,
      vendors: props.vendors,
      onAfterLeave: resetForm,
      onCommit: commitProvider,
      onQueryModels: _cache[11] || (_cache[11] = payload => emit('query-models', payload)),
      onTestConnection: _cache[12] || (_cache[12] = payload => emit('test-connection', payload))
    }, null, 8, ["modelValue", "provider", "editor-index", "existing-providers", "vendors"])
  ], 2))
}
}

};
const AgentTokensManager = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-c5ded6a3"]]);

export { AgentTokensManager as A };
