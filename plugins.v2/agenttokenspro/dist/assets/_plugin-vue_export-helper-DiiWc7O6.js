const PROVIDER_TYPE_OPTIONS = [
  { title: 'OpenAI Compatible', value: 'openai' },
  { title: 'Anthropic Compatible', value: 'anthropic' },
];

// 构建一个新的供应商默认配置。
function createProvider() {
  return {
    id: '',
    enabled: true,
    name: '',
    provider: 'openai',
    base_url: '',
    api_key: '',
    user_agent: '',
    use_proxy: false,
    model: '',
    token_limit: 0,
    used_tokens: 0,
    priority: 1,
  }
}

// 生成深拷贝配置，避免直接修改父组件传入对象。
function cloneConfig(config) {
  return JSON.parse(JSON.stringify(config || { enabled: false, show_sidebar_nav: true, max_failures: 3, providers: [] }))
}

// 格式化 token 数字，保持表格和统计展示可读。
function formatTokens(value) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue.toLocaleString() : '0'
}

// 兼容 MoviePilot API 包装器和原始响应两种返回形态。
// 注意：部分接口（如 test-connection）直接在 Response 根层级返回 success/message，
// data 字段可能为 null、空对象 {} 或不存在。此时应返回整个 response 对象供调用方直接读取 success/message。
function unwrapResponse(response) {
  if (response && Object.prototype.hasOwnProperty.call(response, 'data') && response.success !== undefined) {
    // data 为 null/undefined/空对象 时，说明接口使用根层级 message 而非 data 包装
    if (response.data == null || (typeof response.data === 'object' && Object.keys(response.data).length === 0)) {
      return response
    }
    return response.data
  }
  return response?.data ?? response
}

// 计算新增供应商的下一个优先级。
function getNextProviderPriority(providers) {
  return Math.max(0, ...(providers || []).map(item => Number(item.priority || 0))) + 1
}

// 标准化弹窗中写回的供应商数值字段。
function normalizeProvider(provider, fallbackPriority) {
  return {
    ...provider,
    enabled: provider.enabled !== false,
    use_proxy: provider.use_proxy !== false,
    token_limit: Number(provider.token_limit || 0),
    used_tokens: Number(provider.used_tokens || 0),
    priority: Number(provider.priority || fallbackPriority),
  }
}

// 按配置生成本地用量行，供配置弹窗复用管理页展示结构。
function buildProviderRow(provider) {
  const tokenLimit = Number(provider.token_limit || 0);
  const totalTokens = Number(provider.used_tokens || 0);
  const remainingTokens = tokenLimit <= 0 ? null : Math.max(tokenLimit - totalTokens, 0);
  const usagePercent = tokenLimit <= 0 ? 0 : Math.min((totalTokens * 100) / tokenLimit, 100);

  return {
    ...provider,
    masked_api_key: provider.api_key ? '****' : '',
    usage: {
      total_tokens: totalTokens,
      remaining_tokens: remainingTokens,
      usage_percent: usagePercent,
      exhausted: tokenLimit > 0 && remainingTokens === 0,
      runs: Number(provider.runs || 0),
      success_count: Number(provider.success_count || 0),
      failure_count: Number(provider.failure_count || 0),
      last_used_at: provider.last_used_at || null,
      last_error: provider.last_error || null,
    },
  }
}

// 批量生成本地供应商用量行。
function buildProviderRows(providers) {
  return (providers || []).map(provider => buildProviderRow(provider))
}

// 根据供应商行汇总限量配额进度和不限量调用量。
function buildProviderSummary(rows) {
  const providers = rows || [];
  const enabledRows = providers.filter(row => row.enabled);
  const limitedRows = providers.filter(row => Number(row.usage?.token_limit || row.token_limit || 0) > 0);
  const unlimitedRows = providers.filter(row => Number(row.usage?.token_limit || row.token_limit || 0) <= 0);
  const totalLimit = limitedRows.reduce((sum, row) => sum + Number(row.usage?.token_limit || row.token_limit || 0), 0);
  const limitedUsed = limitedRows.reduce(
    (sum, row) => sum + Number(row.usage?.total_tokens || row.used_tokens || 0),
    0,
  );
  const unlimitedUsed = unlimitedRows.reduce(
    (sum, row) => sum + Number(row.usage?.total_tokens || row.used_tokens || 0),
    0,
  );
  const limitedRemaining = totalLimit > 0 ? Math.max(totalLimit - limitedUsed, 0) : null;
  const limitedUsagePercent = totalLimit > 0 ? Math.min((limitedUsed * 100) / totalLimit, 100) : 0;

  const maxFailures = 3;
  const availableRows = enabledRows.filter(row => {
    if (row.usage?.exhausted) return false
    if (!row.api_key || !row.base_url || !row.model) return false
    if ((row.usage?.failure_count || 0) >= maxFailures) return false
    return true
  });

  return {
    available_count: availableRows.length,
    enabled_count: enabledRows.length,
    limited_provider_count: limitedRows.length,
    unlimited_provider_count: unlimitedRows.length,
    total_used: limitedUsed + unlimitedUsed,
    total_limit: totalLimit,
    limited_used: limitedUsed,
    unlimited_used: unlimitedUsed,
    limited_remaining: limitedRemaining,
    limited_usage_percent: limitedUsagePercent,
  }
}


// 将模型接口返回值标准化为 VSelect 可用选项。
function normalizeModelOptions(value) {
  const models = Array.isArray(value?.models) ? value.models : (Array.isArray(value) ? value : []);
  return models
    .map(item => (typeof item === 'string' ? item : (item?.id || item?.name || item?.model || '')))
    .filter(Boolean)
    .map(item => ({ title: item, value: item }))
}

const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};

export { PROVIDER_TYPE_OPTIONS as P, _export_sfc as _, createProvider as a, buildProviderRows as b, cloneConfig as c, buildProviderSummary as d, normalizeProvider as e, formatTokens as f, getNextProviderPriority as g, normalizeModelOptions as n, unwrapResponse as u };
