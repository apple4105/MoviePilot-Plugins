import { importShared } from './__federation_fn_import-JrT3xvdd.js';
import { _ as _export_sfc, f as formatTokens, P as PROVIDER_TYPE_OPTIONS, n as normalizeModelOptions, a as createProvider, b as buildProviderRows, d as buildProviderSummary, g as getNextProviderPriority, e as normalizeProvider } from './_plugin-vue_export-helper-D-4vgHBx.js';

const {createElementVNode:_createElementVNode$4,openBlock:_openBlock$4,createElementBlock:_createElementBlock$3,createCommentVNode:_createCommentVNode$3,renderList:_renderList$1,Fragment:_Fragment$1,toDisplayString:_toDisplayString$4,withModifiers:_withModifiers$1,normalizeClass:_normalizeClass$1,resolveComponent:_resolveComponent$4,createVNode:_createVNode$4,createTextVNode:_createTextVNode$4,withCtx:_withCtx$4,unref:_unref$4,createBlock:_createBlock$4} = await importShared('vue');


const _hoisted_1$4 = { class: "provider-table-scroll" };
const _hoisted_2$4 = { key: 0 };
const _hoisted_3$4 = { key: 1 };
const _hoisted_4$4 = ["onClick"];
const _hoisted_5$4 = ["title", "onClick"];
const _hoisted_6$4 = {
  key: 0,
  class: "truncate-cell"
};
const _hoisted_7$4 = { key: 1 };
const _hoisted_8$4 = { key: 0 };
const _hoisted_9$3 = ["colspan"];

const {ref: ref$2} = await importShared('vue');


const _sfc_main$4 = {
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
},
  emits: ['edit', 'remove', 'select', 'toggle'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

ref$2(null);
ref$2(null);

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
function getMaskedApiKey(index) {
  return props.providerRows[index]?.masked_api_key || '****'
}

function isActive(row) {
  return row.id === props.activeProviderId
}

function isFailed(row) {
  return props.failedProviderIds.includes(row.id)
}

function handleRowClick(index) {
  const row = props.providers[index];
  if (!row) return
  // 点击行也触发活跃供应商切换
  emit('select', row.id);
}

function handleToggle(index) {
  emit('toggle', index);
}

// 点击 ○ 切换活跃供应商
function handleSelect(providerId) {
  emit('select', providerId);
}

function rowClasses(row) {
  return {
    'provider-row--active': isActive(row),
    'provider-row--failed': isFailed(row),
  }
}

return (_ctx, _cache) => {
  const _component_VSwitch = _resolveComponent$4("VSwitch");
  const _component_VChip = _resolveComponent$4("VChip");
  const _component_VBtn = _resolveComponent$4("VBtn");
  const _component_VTable = _resolveComponent$4("VTable");
  const _component_VSheet = _resolveComponent$4("VSheet");

  return (_openBlock$4(), _createBlock$4(_component_VSheet, {
    border: "",
    rounded: "",
    class: "provider-table-shell"
  }, {
    default: _withCtx$4(() => [
      _createElementVNode$4("div", _hoisted_1$4, [
        _createVNode$4(_component_VTable, { density: "comfortable" }, {
          default: _withCtx$4(() => [
            _createElementVNode$4("thead", null, [
              _createElementVNode$4("tr", null, [
                _cache[3] || (_cache[3] = _createElementVNode$4("th", { class: "select-col" }, null, -1)),
                _cache[4] || (_cache[4] = _createElementVNode$4("th", null, "启用", -1)),
                _cache[5] || (_cache[5] = _createElementVNode$4("th", null, "优先级", -1)),
                _cache[6] || (_cache[6] = _createElementVNode$4("th", null, "名称", -1)),
                _cache[7] || (_cache[7] = _createElementVNode$4("th", null, "类型", -1)),
                (__props.showCredentials)
                  ? (_openBlock$4(), _createElementBlock$3("th", _hoisted_2$4, "地址"))
                  : _createCommentVNode$3("", true),
                (__props.showCredentials)
                  ? (_openBlock$4(), _createElementBlock$3("th", _hoisted_3$4, "Key"))
                  : _createCommentVNode$3("", true),
                _cache[8] || (_cache[8] = _createElementVNode$4("th", null, "代理", -1)),
                _cache[9] || (_cache[9] = _createElementVNode$4("th", null, "模型", -1)),
                _cache[10] || (_cache[10] = _createElementVNode$4("th", null, "额度", -1)),
                _cache[11] || (_cache[11] = _createElementVNode$4("th", { class: "text-right" }, "操作", -1))
              ])
            ]),
            _createElementVNode$4("tbody", null, [
              (_openBlock$4(true), _createElementBlock$3(_Fragment$1, null, _renderList$1(__props.providers, (row, index) => {
                return (_openBlock$4(), _createElementBlock$3("tr", {
                  key: row.id || index,
                  class: _normalizeClass$1([rowClasses(row), "clickable-row"]),
                  onClick: $event => (handleRowClick(index))
                }, [
                  _createElementVNode$4("td", {
                    class: "select-col text-center",
                    onClick: _cache[0] || (_cache[0] = _withModifiers$1(() => {}, ["stop"]))
                  }, [
                    _createElementVNode$4("span", {
                      class: _normalizeClass$1({
                  'provider-lightning': row.enabled && isActive(row),
                  'provider-selectable': row.enabled && !isActive(row),
                  'provider-disabled': !row.enabled,
                }),
                      title: row.enabled ? '点击设为活跃' : '已停用',
                      onClick: _withModifiers$1($event => (row.enabled && handleSelect(row.id)), ["stop"])
                    }, _toDisplayString$4(row.enabled && isActive(row) ? '⚡' : '○'), 11, _hoisted_5$4)
                  ]),
                  _createElementVNode$4("td", {
                    onClick: _cache[1] || (_cache[1] = _withModifiers$1(() => {}, ["stop"]))
                  }, [
                    _createVNode$4(_component_VSwitch, {
                      "model-value": row.enabled,
                      color: "primary",
                      "hide-details": "",
                      density: "compact",
                      "onUpdate:modelValue": $event => (handleToggle(index))
                    }, null, 8, ["model-value", "onUpdate:modelValue"])
                  ]),
                  _createElementVNode$4("td", null, _toDisplayString$4(row.priority), 1),
                  _createElementVNode$4("td", null, _toDisplayString$4(row.name), 1),
                  _createElementVNode$4("td", null, _toDisplayString$4(row.provider), 1),
                  (__props.showCredentials)
                    ? (_openBlock$4(), _createElementBlock$3("td", _hoisted_6$4, _toDisplayString$4(row.base_url), 1))
                    : _createCommentVNode$3("", true),
                  (__props.showCredentials)
                    ? (_openBlock$4(), _createElementBlock$3("td", _hoisted_7$4, _toDisplayString$4(getMaskedApiKey(index)), 1))
                    : _createCommentVNode$3("", true),
                  _createElementVNode$4("td", null, [
                    _createVNode$4(_component_VChip, {
                      size: "small",
                      color: row.use_proxy === false ? 'default' : 'primary',
                      variant: "tonal"
                    }, {
                      default: _withCtx$4(() => [
                        _createTextVNode$4(_toDisplayString$4(row.use_proxy === false ? '直连' : '代理'), 1)
                      ]),
                      _: 2
                    }, 1032, ["color"])
                  ]),
                  _createElementVNode$4("td", null, _toDisplayString$4(getModelName(row.model)), 1),
                  _createElementVNode$4("td", null, _toDisplayString$4(row.token_limit > 0 ? _unref$4(formatTokens)(row.token_limit) : '不限'), 1),
                  _createElementVNode$4("td", {
                    class: "text-right",
                    onClick: _cache[2] || (_cache[2] = _withModifiers$1(() => {}, ["stop"]))
                  }, [
                    _createVNode$4(_component_VBtn, {
                      icon: "mdi-pencil",
                      size: "small",
                      variant: "text",
                      onClick: $event => (emit('edit', index))
                    }, null, 8, ["onClick"]),
                    _createVNode$4(_component_VBtn, {
                      icon: "mdi-delete",
                      size: "small",
                      variant: "text",
                      color: "error",
                      onClick: $event => (emit('remove', index))
                    }, null, 8, ["onClick"])
                  ])
                ], 10, _hoisted_4$4))
              }), 128)),
              (!__props.providers.length)
                ? (_openBlock$4(), _createElementBlock$3("tr", _hoisted_8$4, [
                    _createElementVNode$4("td", {
                      colspan: __props.showCredentials ? 11 : 9,
                      class: "text-center text-medium-emphasis py-8"
                    }, "暂无供应商", 8, _hoisted_9$3)
                  ]))
                : _createCommentVNode$3("", true)
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
const ProviderConfigTable = /*#__PURE__*/_export_sfc(_sfc_main$4, [['__scopeId',"data-v-ac0cae0b"]]);

const {toDisplayString:_toDisplayString$3,createElementVNode:_createElementVNode$3,resolveComponent:_resolveComponent$3,createVNode:_createVNode$3,withCtx:_withCtx$3,unref:_unref$3,openBlock:_openBlock$3,createBlock:_createBlock$3,createCommentVNode:_createCommentVNode$2,withModifiers:_withModifiers,createElementBlock:_createElementBlock$2,createTextVNode:_createTextVNode$3} = await importShared('vue');


const _hoisted_1$3 = { class: "form-item" };
const _hoisted_2$3 = { class: "form-item" };
const _hoisted_3$3 = { class: "form-item" };
const _hoisted_4$3 = { class: "form-item" };
const _hoisted_5$3 = { class: "form-label" };
const _hoisted_6$3 = { class: "input-group" };
const _hoisted_7$3 = { class: "form-item" };
const _hoisted_8$3 = { class: "form-item" };
const _hoisted_9$2 = {
  key: 0,
  class: "input-group"
};
const _hoisted_10$2 = { class: "form-item" };
const _hoisted_11$2 = { class: "form-item" };
const _hoisted_12$2 = { class: "form-item form-item--merged" };
const _hoisted_13$1 = { class: "form-item__half" };
const _hoisted_14$1 = { class: "form-item__half" };
const _hoisted_15$1 = {
  key: 0,
  class: "px-4 pb-3"
};

const {computed: computed$3,ref: ref$1,watch} = await importShared('vue');


const _sfc_main$3 = {
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
},
  emits: ['update:modelValue', 'commit', 'query-models', 'test-connection'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

const modelOptions = ref$1([]);
const loadingModels = ref$1(false);
const testingConnection = ref$1(false);
const modelError = ref$1('');
const testResult = ref$1(null);
const showApiKey = ref$1(false);

const dialogVisible = computed$3({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const isEdit = computed$3(() => props.editorIndex >= 0);

// 模型数量提示
const modelCountText = computed$3(() => {
  const count = modelOptions.value?.length || 0;
  return count > 0 ? `模型 (${count})` : '模型'
});

// 是否显示下拉箭头（模型数 > 1）
const showDropdownArrow = computed$3(() => (modelOptions.value?.length || 0) > 1);

// 测试按钮颜色：成功绿色、失败红色、默认紫色
const testButtonColor = computed$3(() => {
  if (testResult.value?.success === true) return 'success'
  if (testResult.value?.success === false) return 'error'
  return 'primary'
});

watch(dialogVisible, (val) => {
  if (val) {
    showApiKey.value = false;
    modelError.value = '';
    testResult.value = null;
    // 弹窗打开时清空模型列表，防止上次残留
    modelOptions.value = [];
  }
});

// 测试当前弹窗中供应商的 API 连通性（发送真实请求验证 Key+地址+模型）。
async function testConnection() {
  testResult.value = null;
  testingConnection.value = true;
  const testPayload = {
    base_url: props.provider.base_url,
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
    testResult.value = { success: true, message: result?.message || '连接成功' };
    // 测试成功时自动启用供应商
    props.provider.enabled = true;
  } catch (err) {
    testResult.value = { success: false, message: err?.message || '连接失败' };
  } finally {
    testingConnection.value = false;
  }
}

// 提交当前弹窗编辑的供应商配置。
function commitProvider() {
  // 强制 model 为字符串，防止 VCombobox 返回对象
  const model = props.provider.model;
  if (model && typeof model === 'object') {
    // 从 { title, value } 对象中提取 value
    props.provider.model = model.value || model.name || model.label || model.title || '';
  } else if (typeof model !== 'string') {
    props.provider.model = model != null ? String(model) : '';
  }
  if (!props.provider.model?.trim()) {
    props.provider.model = '';
  }
  emit('commit');
}

// 拉取当前 API Key 可用模型并更新下拉选项。
async function queryModels() {
  modelError.value = '';
  loadingModels.value = true;
  try {
    const result = await new Promise((resolve, reject) => {
      emit('query-models', { provider: props.provider, resolve, reject });
    });
    modelOptions.value = normalizeModelOptions(result);
    if (!modelOptions.value.length) {
      modelError.value = '未获取到模型';
    }
  } catch (err) {
    modelError.value = err?.message || '未获取到模型';
  } finally {
    loadingModels.value = false;
  }
}

return (_ctx, _cache) => {
  const _component_VSpacer = _resolveComponent$3("VSpacer");
  const _component_VBtn = _resolveComponent$3("VBtn");
  const _component_VCardTitle = _resolveComponent$3("VCardTitle");
  const _component_VTextField = _resolveComponent$3("VTextField");
  const _component_VSelect = _resolveComponent$3("VSelect");
  const _component_VIcon = _resolveComponent$3("VIcon");
  const _component_VCombobox = _resolveComponent$3("VCombobox");
  const _component_VSwitch = _resolveComponent$3("VSwitch");
  const _component_VCardText = _resolveComponent$3("VCardText");
  const _component_VCardActions = _resolveComponent$3("VCardActions");
  const _component_VAlert = _resolveComponent$3("VAlert");
  const _component_VCard = _resolveComponent$3("VCard");
  const _component_VDialog = _resolveComponent$3("VDialog");

  return (_openBlock$3(), _createBlock$3(_component_VDialog, {
    modelValue: dialogVisible.value,
    "onUpdate:modelValue": _cache[14] || (_cache[14] = $event => ((dialogVisible).value = $event)),
    "max-width": "760",
    "max-height": "85vh",
    scrollable: ""
  }, {
    default: _withCtx$3(() => [
      _createVNode$3(_component_VCard, null, {
        default: _withCtx$3(() => [
          _createVNode$3(_component_VCardTitle, { class: "d-flex align-center" }, {
            default: _withCtx$3(() => [
              _createElementVNode$3("span", null, _toDisplayString$3(isEdit.value ? '编辑供应商' : '新增供应商'), 1),
              _createVNode$3(_component_VSpacer),
              _createVNode$3(_component_VBtn, {
                icon: "mdi-close",
                size: "small",
                variant: "text",
                onClick: _cache[0] || (_cache[0] = $event => (dialogVisible.value = false))
              })
            ]),
            _: 1
          }),
          _createVNode$3(_component_VCardText, null, {
            default: _withCtx$3(() => [
              _createElementVNode$3("div", _hoisted_1$3, [
                _cache[15] || (_cache[15] = _createElementVNode$3("span", { class: "form-label" }, "名称", -1)),
                _createVNode$3(_component_VTextField, {
                  modelValue: __props.provider.name,
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ((__props.provider.name) = $event)),
                  variant: "outlined",
                  density: "comfortable",
                  "hide-details": ""
                }, null, 8, ["modelValue"])
              ]),
              _createElementVNode$3("div", _hoisted_2$3, [
                _cache[16] || (_cache[16] = _createElementVNode$3("span", { class: "form-label" }, "优先级", -1)),
                _createVNode$3(_component_VTextField, {
                  modelValue: __props.provider.priority,
                  "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((__props.provider.priority) = $event)),
                  modelModifiers: { number: true },
                  type: "number",
                  variant: "outlined",
                  "hide-details": ""
                }, null, 8, ["modelValue"])
              ]),
              _createElementVNode$3("div", _hoisted_3$3, [
                _cache[17] || (_cache[17] = _createElementVNode$3("span", { class: "form-label" }, "类型", -1)),
                _createVNode$3(_component_VSelect, {
                  modelValue: __props.provider.provider,
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((__props.provider.provider) = $event)),
                  items: _unref$3(PROVIDER_TYPE_OPTIONS),
                  variant: "outlined",
                  "hide-details": ""
                }, null, 8, ["modelValue", "items"])
              ]),
              _createElementVNode$3("div", _hoisted_4$3, [
                _createElementVNode$3("span", _hoisted_5$3, _toDisplayString$3(modelCountText.value), 1),
                _createElementVNode$3("div", _hoisted_6$3, [
                  _createVNode$3(_component_VCombobox, {
                    modelValue: __props.provider.model,
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((__props.provider.model) = $event)),
                    items: modelOptions.value,
                    loading: loadingModels.value,
                    "error-messages": modelError.value,
                    variant: "outlined",
                    clearable: "",
                    "hide-details": "",
                    class: "model-combobox"
                  }, {
                    "append-inner": _withCtx$3(() => [
                      (showDropdownArrow.value)
                        ? (_openBlock$3(), _createBlock$3(_component_VIcon, {
                            key: 0,
                            icon: "mdi-chevron-down",
                            size: "small",
                            class: "dropdown-arrow"
                          }))
                        : _createCommentVNode$2("", true)
                    ]),
                    _: 1
                  }, 8, ["modelValue", "items", "loading", "error-messages"]),
                  _createVNode$3(_component_VBtn, {
                    icon: "mdi-refresh",
                    size: "small",
                    variant: "tonal",
                    loading: loadingModels.value,
                    class: "input-action-btn",
                    onClick: _withModifiers(queryModels, ["stop"])
                  }, null, 8, ["loading"])
                ])
              ]),
              _createElementVNode$3("div", _hoisted_7$3, [
                _cache[18] || (_cache[18] = _createElementVNode$3("span", { class: "form-label" }, "API 地址", -1)),
                _createVNode$3(_component_VTextField, {
                  modelValue: __props.provider.base_url,
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((__props.provider.base_url) = $event)),
                  variant: "outlined",
                  "hide-details": ""
                }, null, 8, ["modelValue"])
              ]),
              _createElementVNode$3("div", _hoisted_8$3, [
                _cache[19] || (_cache[19] = _createElementVNode$3("span", { class: "form-label" }, "API Key", -1)),
                (isEdit.value)
                  ? (_openBlock$3(), _createElementBlock$2("div", _hoisted_9$2, [
                      _createVNode$3(_component_VTextField, {
                        modelValue: __props.provider.api_key,
                        "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((__props.provider.api_key) = $event)),
                        type: showApiKey.value ? 'text' : 'password',
                        variant: "outlined",
                        "hide-details": "",
                        class: "apikey-field"
                      }, null, 8, ["modelValue", "type"]),
                      _createVNode$3(_component_VBtn, {
                        icon: showApiKey.value ? 'mdi-eye-off' : 'mdi-eye',
                        size: "small",
                        variant: "tonal",
                        class: "input-action-btn",
                        onClick: _cache[7] || (_cache[7] = _withModifiers($event => (showApiKey.value = !showApiKey.value), ["stop"]))
                      }, null, 8, ["icon"])
                    ]))
                  : (_openBlock$3(), _createBlock$3(_component_VTextField, {
                      key: 1,
                      modelValue: __props.provider.api_key,
                      "onUpdate:modelValue": _cache[8] || (_cache[8] = $event => ((__props.provider.api_key) = $event)),
                      type: "password",
                      variant: "outlined",
                      "hide-details": "",
                      class: "apikey-field"
                    }, null, 8, ["modelValue"]))
              ]),
              _createElementVNode$3("div", _hoisted_10$2, [
                _cache[20] || (_cache[20] = _createElementVNode$3("span", { class: "form-label" }, "User-Agent", -1)),
                _createVNode$3(_component_VTextField, {
                  modelValue: __props.provider.user_agent,
                  "onUpdate:modelValue": _cache[9] || (_cache[9] = $event => ((__props.provider.user_agent) = $event)),
                  variant: "outlined",
                  "hide-details": ""
                }, null, 8, ["modelValue"])
              ]),
              _createElementVNode$3("div", _hoisted_11$2, [
                _cache[21] || (_cache[21] = _createElementVNode$3("span", { class: "form-label" }, "使用代理", -1)),
                _createVNode$3(_component_VSwitch, {
                  modelValue: __props.provider.use_proxy,
                  "onUpdate:modelValue": _cache[10] || (_cache[10] = $event => ((__props.provider.use_proxy) = $event)),
                  color: "primary",
                  "hide-details": "",
                  density: "compact"
                }, null, 8, ["modelValue"])
              ]),
              _createElementVNode$3("div", _hoisted_12$2, [
                _createElementVNode$3("div", _hoisted_13$1, [
                  _cache[22] || (_cache[22] = _createElementVNode$3("span", { class: "form-label" }, "Token 额度", -1)),
                  _createVNode$3(_component_VTextField, {
                    modelValue: __props.provider.token_limit,
                    "onUpdate:modelValue": _cache[11] || (_cache[11] = $event => ((__props.provider.token_limit) = $event)),
                    modelModifiers: { number: true },
                    type: "number",
                    variant: "outlined",
                    "hide-details": ""
                  }, null, 8, ["modelValue"])
                ]),
                _createElementVNode$3("div", _hoisted_14$1, [
                  _cache[23] || (_cache[23] = _createElementVNode$3("span", { class: "form-label" }, "初始已用", -1)),
                  _createVNode$3(_component_VTextField, {
                    modelValue: __props.provider.used_tokens,
                    "onUpdate:modelValue": _cache[12] || (_cache[12] = $event => ((__props.provider.used_tokens) = $event)),
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
          _createVNode$3(_component_VCardActions, { class: "d-flex justify-end ga-2" }, {
            default: _withCtx$3(() => [
              _createVNode$3(_component_VBtn, {
                color: testButtonColor.value,
                loading: testingConnection.value,
                onClick: testConnection
              }, {
                default: _withCtx$3(() => [...(_cache[24] || (_cache[24] = [
                  _createTextVNode$3(" 测试 ", -1)
                ]))]),
                _: 1
              }, 8, ["color", "loading"]),
              _createVNode$3(_component_VBtn, {
                color: "primary",
                onClick: commitProvider
              }, {
                default: _withCtx$3(() => [...(_cache[25] || (_cache[25] = [
                  _createTextVNode$3("确定", -1)
                ]))]),
                _: 1
              })
            ]),
            _: 1
          }),
          (testResult.value)
            ? (_openBlock$3(), _createElementBlock$2("div", _hoisted_15$1, [
                _createVNode$3(_component_VAlert, {
                  type: testResult.value.success ? 'success' : 'error',
                  variant: "tonal",
                  density: "compact",
                  closable: "",
                  "onClick:close": _cache[13] || (_cache[13] = $event => (testResult.value = null))
                }, {
                  default: _withCtx$3(() => [
                    _createTextVNode$3(_toDisplayString$3(testResult.value.message), 1)
                  ]),
                  _: 1
                }, 8, ["type"])
              ]))
            : _createCommentVNode$2("", true)
        ]),
        _: 1
      })
    ]),
    _: 1
  }, 8, ["modelValue"]))
}
}

};
const ProviderEditorDialog = /*#__PURE__*/_export_sfc(_sfc_main$3, [['__scopeId',"data-v-f42aa08c"]]);

const {createElementVNode:_createElementVNode$2,renderList:_renderList,Fragment:_Fragment,openBlock:_openBlock$2,createElementBlock:_createElementBlock$1,toDisplayString:_toDisplayString$2,normalizeClass:_normalizeClass,unref:_unref$2,resolveComponent:_resolveComponent$2,createVNode:_createVNode$2,createTextVNode:_createTextVNode$2,mergeProps:_mergeProps,withCtx:_withCtx$2,createBlock:_createBlock$2,createCommentVNode:_createCommentVNode$1} = await importShared('vue');


const _hoisted_1$2 = { class: "provider-table-scroll" };
const _hoisted_2$2 = { class: "select-col text-center" };
const _hoisted_3$2 = ["title", "onClick"];
const _hoisted_4$2 = { class: "progress-cell" };
const _hoisted_5$2 = { class: "text-success" };
const _hoisted_6$2 = { class: "error-cell" };
const _hoisted_7$2 = {
  key: 1,
  class: "text-medium-emphasis"
};
const _hoisted_8$2 = { class: "time-cell" };
const _hoisted_9$1 = { key: 0 };
const _hoisted_10$1 = {
  key: 1,
  class: "text-medium-emphasis"
};
const _hoisted_11$1 = { class: "text-right" };
const _hoisted_12$1 = { key: 0 };

const {computed: computed$2} = await importShared('vue');


const _sfc_main$2 = {
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
  emits: ['reset', 'select'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

// 仅展示已启用的供应商，已停用供应商不显示在用量列表中
const displayRows = computed$2(() => (props.providerRows || []).filter(row => row.enabled !== false));

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
  emit('select', row.id);
}

return (_ctx, _cache) => {
  const _component_VProgressLinear = _resolveComponent$2("VProgressLinear");
  const _component_VTooltip = _resolveComponent$2("VTooltip");
  const _component_VChip = _resolveComponent$2("VChip");
  const _component_VBtn = _resolveComponent$2("VBtn");
  const _component_VTable = _resolveComponent$2("VTable");
  const _component_VSheet = _resolveComponent$2("VSheet");

  return (_openBlock$2(), _createBlock$2(_component_VSheet, {
    border: "",
    rounded: "",
    class: "provider-table-shell"
  }, {
    default: _withCtx$2(() => [
      _createElementVNode$2("div", _hoisted_1$2, [
        _createVNode$2(_component_VTable, { density: "comfortable" }, {
          default: _withCtx$2(() => [
            _cache[2] || (_cache[2] = _createElementVNode$2("thead", null, [
              _createElementVNode$2("tr", null, [
                _createElementVNode$2("th", { class: "select-col" }),
                _createElementVNode$2("th", null, "优先级"),
                _createElementVNode$2("th", null, "名称"),
                _createElementVNode$2("th", null, "模型"),
                _createElementVNode$2("th", null, "已用"),
                _createElementVNode$2("th", null, "余量"),
                _createElementVNode$2("th", null, "进度"),
                _createElementVNode$2("th", null, "调用"),
                _createElementVNode$2("th", null, "成功/失败"),
                _createElementVNode$2("th", null, "最后错误"),
                _createElementVNode$2("th", null, "最后使用"),
                _createElementVNode$2("th", null, "状态"),
                _createElementVNode$2("th", { class: "text-right" }, "操作")
              ])
            ], -1)),
            _createElementVNode$2("tbody", null, [
              (_openBlock$2(true), _createElementBlock$1(_Fragment, null, _renderList(displayRows.value, (row, index) => {
                return (_openBlock$2(), _createElementBlock$1("tr", {
                  key: row.id || index,
                  class: _normalizeClass({
              'provider-row--active': row.id === __props.activeProviderId,
              'provider-row--failed': isFailed(row),
            })
                }, [
                  _createElementVNode$2("td", _hoisted_2$2, [
                    _createElementVNode$2("span", {
                      class: _normalizeClass({
                  'provider-lightning': row.enabled && row.id === __props.activeProviderId,
                  'provider-selectable': row.enabled && row.id !== __props.activeProviderId,
                  'provider-disabled': !row.enabled,
                }),
                      title: row.enabled ? '点击设为活跃' : '已停用',
                      onClick: $event => (handleSelect(row))
                    }, _toDisplayString$2(row.enabled && row.id === __props.activeProviderId ? '⚡' : '○'), 11, _hoisted_3$2)
                  ]),
                  _createElementVNode$2("td", null, _toDisplayString$2(row.priority), 1),
                  _createElementVNode$2("td", null, _toDisplayString$2(row.name), 1),
                  _createElementVNode$2("td", null, _toDisplayString$2(getModelName(row.model)), 1),
                  _createElementVNode$2("td", null, _toDisplayString$2(_unref$2(formatTokens)(row.usage?.total_tokens)), 1),
                  _createElementVNode$2("td", null, _toDisplayString$2(row.usage?.remaining_tokens === null ? '不限' : _unref$2(formatTokens)(row.usage?.remaining_tokens)), 1),
                  _createElementVNode$2("td", _hoisted_4$2, [
                    _createVNode$2(_component_VProgressLinear, {
                      "model-value": row.usage?.usage_percent || 0,
                      color: rowStatusColor(row),
                      height: "8",
                      rounded: ""
                    }, null, 8, ["model-value", "color"])
                  ]),
                  _createElementVNode$2("td", null, _toDisplayString$2(row.usage?.runs || 0), 1),
                  _createElementVNode$2("td", null, [
                    _createElementVNode$2("span", _hoisted_5$2, _toDisplayString$2(row.usage?.success_count || 0), 1),
                    _cache[0] || (_cache[0] = _createTextVNode$2(" / ", -1)),
                    _createElementVNode$2("span", {
                      class: _normalizeClass({ 'text-error': (row.usage?.failure_count || 0) > 0 })
                    }, _toDisplayString$2(row.usage?.failure_count || 0), 3)
                  ]),
                  _createElementVNode$2("td", _hoisted_6$2, [
                    (row.usage?.last_error)
                      ? (_openBlock$2(), _createBlock$2(_component_VTooltip, {
                          key: 0,
                          location: "top"
                        }, {
                          activator: _withCtx$2(({ props: tooltipProps }) => [
                            _createElementVNode$2("span", _mergeProps({ ref_for: true }, tooltipProps, { class: "text-error text-truncate d-inline-block error-text" }), _toDisplayString$2(row.usage.last_error), 17)
                          ]),
                          default: _withCtx$2(() => [
                            _createTextVNode$2(" " + _toDisplayString$2(row.usage.last_error), 1)
                          ]),
                          _: 2
                        }, 1024))
                      : (_openBlock$2(), _createElementBlock$1("span", _hoisted_7$2, "-"))
                  ]),
                  _createElementVNode$2("td", _hoisted_8$2, [
                    (row.usage?.last_used_at)
                      ? (_openBlock$2(), _createElementBlock$1("span", _hoisted_9$1, _toDisplayString$2(formatTime(row.usage.last_used_at)), 1))
                      : (_openBlock$2(), _createElementBlock$1("span", _hoisted_10$1, "-"))
                  ]),
                  _createElementVNode$2("td", null, [
                    _createVNode$2(_component_VChip, {
                      size: "small",
                      color: rowStatusColor(row),
                      variant: "tonal"
                    }, {
                      default: _withCtx$2(() => [
                        _createTextVNode$2(_toDisplayString$2(rowStatusText(row)), 1)
                      ]),
                      _: 2
                    }, 1032, ["color"])
                  ]),
                  _createElementVNode$2("td", _hoisted_11$1, [
                    _createVNode$2(_component_VBtn, {
                      icon: "mdi-backup-restore",
                      size: "small",
                      variant: "text",
                      onClick: $event => (emit('reset', row.id, index))
                    }, null, 8, ["onClick"])
                  ])
                ], 2))
              }), 128)),
              (!displayRows.value.length)
                ? (_openBlock$2(), _createElementBlock$1("tr", _hoisted_12$1, [...(_cache[1] || (_cache[1] = [
                    _createElementVNode$2("td", {
                      colspan: "13",
                      class: "text-center text-medium-emphasis py-8"
                    }, "暂无已启用供应商", -1)
                  ]))]))
                : _createCommentVNode$1("", true)
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
const ProviderUsageTable = /*#__PURE__*/_export_sfc(_sfc_main$2, [['__scopeId',"data-v-64047801"]]);

const {toDisplayString:_toDisplayString$1,createElementVNode:_createElementVNode$1,resolveComponent:_resolveComponent$1,withCtx:_withCtx$1,createVNode:_createVNode$1,unref:_unref$1,createTextVNode:_createTextVNode$1,openBlock:_openBlock$1,createBlock:_createBlock$1} = await importShared('vue');


const _hoisted_1$1 = { class: "usage-overview-card__content" };
const _hoisted_2$1 = { class: "usage-overview-card__chart" };
const _hoisted_3$1 = { class: "usage-overview-card__percent" };
const _hoisted_4$1 = { class: "usage-overview-card__body" };
const _hoisted_5$1 = { class: "usage-overview-card__title-row" };
const _hoisted_6$1 = { class: "usage-overview-card__headline" };
const _hoisted_7$1 = { class: "text-medium-emphasis" };
const _hoisted_8$1 = { class: "usage-overview-card__meta" };

const {computed: computed$1} = await importShared('vue');


const _sfc_main$1 = {
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
const totalUsed = computed$1(() => Number(props.summary.limited_used ?? props.summary.total_used ?? 0));
const totalLimit = computed$1(() => Number(props.summary.total_limit || 0));
const usagePercent = computed$1(() => {
  if (props.summary.limited_usage_percent !== undefined) {
    return Number(props.summary.limited_usage_percent || 0)
  }
  if (totalLimit.value <= 0) return 0
  return Math.min((totalUsed.value * 100) / totalLimit.value, 100)
});
const usagePercentText = computed$1(() => `${Math.round(usagePercent.value)}%`);
const remainingTokens = computed$1(() => {
  if (props.summary.limited_remaining !== undefined) return props.summary.limited_remaining
  if (totalLimit.value <= 0) return null
  return Math.max(totalLimit.value - totalUsed.value, 0)
});
const progressColor = computed$1(() => {
  if (totalLimit.value <= 0) return 'primary'
  if (usagePercent.value >= 90) return 'error'
  if (usagePercent.value >= 70) return 'warning'
  return 'success'
});

return (_ctx, _cache) => {
  const _component_VProgressCircular = _resolveComponent$1("VProgressCircular");
  const _component_VProgressLinear = _resolveComponent$1("VProgressLinear");
  const _component_VSheet = _resolveComponent$1("VSheet");

  return (_openBlock$1(), _createBlock$1(_component_VSheet, {
    border: "",
    rounded: "",
    class: "usage-overview-card"
  }, {
    default: _withCtx$1(() => [
      _createElementVNode$1("div", _hoisted_1$1, [
        _createElementVNode$1("div", _hoisted_2$1, [
          _createVNode$1(_component_VProgressCircular, {
            "model-value": usagePercent.value,
            color: progressColor.value,
            "bg-color": "surface-variant",
            size: 132,
            width: 12
          }, {
            default: _withCtx$1(() => [
              _createElementVNode$1("div", _hoisted_3$1, _toDisplayString$1(totalLimit.value > 0 ? usagePercentText.value : '不限'), 1)
            ]),
            _: 1
          }, 8, ["model-value", "color"])
        ]),
        _createElementVNode$1("div", _hoisted_4$1, [
          _createElementVNode$1("div", _hoisted_5$1, [
            _cache[0] || (_cache[0] = _createElementVNode$1("div", { class: "text-caption text-medium-emphasis" }, "限量模型使用进度", -1)),
            _createElementVNode$1("div", _hoisted_6$1, [
              _createTextVNode$1(_toDisplayString$1(_unref$1(formatTokens)(totalUsed.value)) + " ", 1),
              _createElementVNode$1("span", _hoisted_7$1, "/ " + _toDisplayString$1(totalLimit.value > 0 ? _unref$1(formatTokens)(totalLimit.value) : '不限'), 1)
            ])
          ]),
          _createVNode$1(_component_VProgressLinear, {
            "model-value": usagePercent.value,
            color: progressColor.value,
            height: "8",
            rounded: "",
            class: "my-4"
          }, null, 8, ["model-value", "color"]),
          _createElementVNode$1("div", _hoisted_8$1, [
            _createElementVNode$1("span", null, "可用 " + _toDisplayString$1(__props.summary.available_count || 0) + " / " + _toDisplayString$1(__props.summary.enabled_count || 0), 1),
            _createElementVNode$1("span", null, "剩余 " + _toDisplayString$1(remainingTokens.value === null ? '不限' : _unref$1(formatTokens)(remainingTokens.value)), 1)
          ])
        ])
      ])
    ]),
    _: 1
  }))
}
}

};
const UsageOverviewCard = /*#__PURE__*/_export_sfc(_sfc_main$1, [['__scopeId',"data-v-435e5c32"]]);

const {createElementVNode:_createElementVNode,resolveComponent:_resolveComponent,createVNode:_createVNode,openBlock:_openBlock,createElementBlock:_createElementBlock,createCommentVNode:_createCommentVNode,toDisplayString:_toDisplayString,createTextVNode:_createTextVNode,withCtx:_withCtx,createBlock:_createBlock,unref:_unref} = await importShared('vue');


const _hoisted_1 = { class: "agenttokens-page" };
const _hoisted_2 = {
  key: 0,
  class: "agenttokens-header"
};
const _hoisted_3 = { class: "agenttokens-control-panel__row" };
const _hoisted_4 = { class: "agenttokens-control-panel__cell agenttokens-control-panel__cell--left" };
const _hoisted_5 = { class: "agenttokens-control-panel__cell" };
const _hoisted_6 = { class: "agenttokens-control-panel__row" };
const _hoisted_7 = { class: "agenttokens-control-panel__cell agenttokens-control-panel__cell--left" };
const _hoisted_8 = { class: "config-label" };
const _hoisted_9 = { class: "agenttokens-control-panel__limit-value" };
const _hoisted_10 = { class: "agenttokens-control-panel__cell" };
const _hoisted_11 = { class: "agenttokens-overview-grid" };
const _hoisted_12 = { class: "agenttokens-stat-card__value" };
const _hoisted_13 = { class: "agenttokens-stat-card__value" };
const _hoisted_14 = { class: "agenttokens-stat-card__hint" };
const _hoisted_15 = { class: "agenttokens-tabs-row" };
const _hoisted_16 = { class: "agenttokens-table-actions" };

const {computed,ref} = await importShared('vue');


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

// 重置弹窗表单为默认值，关闭弹窗。
function resetForm() {
  editedProvider.value = createProvider();
  editorIndex.value = -1;
  showEditor.value = false;
}

// 打开新增供应商弹窗。
function addProvider() {
  editedProvider.value = { ...createProvider(), priority: getNextProviderPriority(providers.value) };
  editorIndex.value = -1;
  showEditor.value = true;
}

// 打开编辑供应商弹窗。
function editProvider(index) {
  editedProvider.value = { ...providers.value[index] };
  editorIndex.value = index;
  showEditor.value = true;
}

// 将弹窗中的供应商写回配置列表并自动保存。
function commitProvider() {
  const nextProviders = [...providers.value];
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

// 从配置列表中移除一个供应商。
function removeProvider(index) {
  const nextProviders = [...providers.value];
  nextProviders.splice(index, 1);
  configValue.value.providers = nextProviders;
  emit('auto-save');
}

// 切换供应商启用状态并自动保存。
function toggleProvider(index) {
  const provider = providers.value[index];
  if (!provider) return
  provider.enabled = !provider.enabled;
  emit('auto-save');
}

// 选择供应商为默认并触发连通性测试。
function selectProvider(providerId) {
  // 兼容 index 和 providerId 两种入参
  if (typeof providerId === 'number') {
    const provider = providers.value[providerId];
    if (!provider || !provider.id) return
    emit('select-provider', provider.id);
  } else {
    const provider = providers.value.find(p => p.id === providerId);
    if (!provider) return
    emit('select-provider', provider.id);
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

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    (!__props.hideTitle)
      ? (_openBlock(), _createElementBlock("div", _hoisted_2, [
          _cache[11] || (_cache[11] = _createElementVNode("h2", { class: "text-2xl font-bold leading-7 text-gray-100 truncate sm:text-3xl sm:leading-9" }, [
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
        _createElementVNode("div", _hoisted_3, [
          _createElementVNode("div", _hoisted_4, [
            _cache[12] || (_cache[12] = _createElementVNode("span", { class: "switch-label" }, "启用插件", -1)),
            _createVNode(_component_VSwitch, {
              modelValue: configValue.value.enabled,
              "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((configValue.value.enabled) = $event)),
              color: "primary",
              "hide-details": "",
              inset: ""
            }, null, 8, ["modelValue"])
          ]),
          _createElementVNode("div", _hoisted_5, [
            _cache[13] || (_cache[13] = _createElementVNode("span", { class: "switch-label" }, "侧边栏入口", -1)),
            _createVNode(_component_VSwitch, {
              modelValue: configValue.value.show_sidebar_nav,
              "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((configValue.value.show_sidebar_nav) = $event)),
              color: "primary",
              "hide-details": "",
              inset: ""
            }, null, 8, ["modelValue"])
          ])
        ]),
        _createElementVNode("div", _hoisted_6, [
          _createElementVNode("div", _hoisted_7, [
            _createElementVNode("div", _hoisted_8, [
              _createVNode(_component_VIcon, {
                icon: "mdi-database-outline",
                color: "info",
                size: "small"
              }),
              _cache[14] || (_cache[14] = _createElementVNode("span", null, "限量总额度", -1))
            ]),
            _createElementVNode("span", _hoisted_9, _toDisplayString(displaySummary.value.total_limit ? _unref(formatTokens)(displaySummary.value.total_limit) : '不限'), 1)
          ]),
          _createElementVNode("div", _hoisted_10, [
            _cache[15] || (_cache[15] = _createElementVNode("span", { class: "config-label" }, "失败切换阈值", -1)),
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
              style: {"max-width":"72px"}
            }, null, 8, ["modelValue"])
          ])
        ])
      ]),
      _: 1
    }),
    _createElementVNode("div", _hoisted_11, [
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
            _cache[16] || (_cache[16] = _createElementVNode("div", { class: "text-caption text-medium-emphasis" }, "可用供应商", -1)),
            _createElementVNode("div", _hoisted_12, _toDisplayString(displaySummary.value.available_count || 0) + " / " + _toDisplayString(displaySummary.value.enabled_count || 0), 1)
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
            _cache[17] || (_cache[17] = _createElementVNode("div", { class: "text-caption text-medium-emphasis" }, "累计使用", -1)),
            _createElementVNode("div", _hoisted_13, _toDisplayString(_unref(formatTokens)(displaySummary.value.total_used)), 1),
            _createElementVNode("div", _hoisted_14, " 限量 " + _toDisplayString(_unref(formatTokens)(limitedUsed.value)) + " / 不限量 " + _toDisplayString(_unref(formatTokens)(unlimitedUsed.value)), 1)
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
        _createElementVNode("div", _hoisted_15, [
          _createVNode(_component_VTabs, {
            modelValue: activeTab.value,
            "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((activeTab).value = $event)),
            density: "comfortable"
          }, {
            default: _withCtx(() => [
              _createVNode(_component_VTab, { value: "usage" }, {
                default: _withCtx(() => [...(_cache[18] || (_cache[18] = [
                  _createTextVNode("用量", -1)
                ]))]),
                _: 1
              }),
              _createVNode(_component_VTab, { value: "config" }, {
                default: _withCtx(() => [...(_cache[19] || (_cache[19] = [
                  _createTextVNode("配置", -1)
                ]))]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["modelValue"])
        ]),
        _createVNode(_component_VDivider),
        _createVNode(_component_VWindow, {
          modelValue: activeTab.value,
          "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((activeTab).value = $event)),
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
                  onSelect: selectProvider
                }, null, 8, ["provider-rows", "active-provider-id", "failed-provider-ids"])
              ]),
              _: 1
            }),
            _createVNode(_component_VWindowItem, { value: "config" }, {
              default: _withCtx(() => [
                _createElementVNode("div", _hoisted_16, [
                  _createVNode(_component_VBtn, {
                    "prepend-icon": "mdi-plus",
                    color: "primary",
                    variant: "tonal",
                    onClick: addProvider
                  }, {
                    default: _withCtx(() => [...(_cache[20] || (_cache[20] = [
                      _createTextVNode("新增", -1)
                    ]))]),
                    _: 1
                  }),
                  _createVNode(_component_VBtn, {
                    "prepend-icon": "mdi-backup-restore",
                    color: "warning",
                    variant: "tonal",
                    onClick: resetAllUsage
                  }, {
                    default: _withCtx(() => [...(_cache[21] || (_cache[21] = [
                      _createTextVNode(" 重置用量 ", -1)
                    ]))]),
                    _: 1
                  })
                ]),
                _createVNode(ProviderConfigTable, {
                  providers: providers.value,
                  "provider-rows": displayProviderRows.value,
                  "active-provider-id": __props.activeProviderId,
                  "failed-provider-ids": failedProviderIds.value,
                  "show-credentials": "",
                  onEdit: editProvider,
                  onRemove: removeProvider,
                  onSelect: selectProvider,
                  onToggle: toggleProvider
                }, null, 8, ["providers", "provider-rows", "active-provider-id", "failed-provider-ids"])
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
      "onUpdate:modelValue": _cache[8] || (_cache[8] = $event => ((showEditor).value = $event)),
      "retain-focus": false,
      provider: editedProvider.value,
      "editor-index": editorIndex.value,
      onAfterLeave: resetForm,
      onCommit: commitProvider,
      onQueryModels: _cache[9] || (_cache[9] = payload => emit('query-models', payload)),
      onTestConnection: _cache[10] || (_cache[10] = payload => emit('test-connection', payload))
    }, null, 8, ["modelValue", "provider", "editor-index"])
  ]))
}
}

};
const AgentTokensManager = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-4c10ab7b"]]);

export { AgentTokensManager as A };
