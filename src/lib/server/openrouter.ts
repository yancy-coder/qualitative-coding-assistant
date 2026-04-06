import { ProxyAgent } from "undici";

/**
 * Node.js 内置 fetch **不会**自动使用 HTTP_PROXY / HTTPS_PROXY。
 * Clash 等本地代理需在环境变量中设置，并由调用方把 `dispatcher` 传给 `undici` 的 fetch。
 */
export function getHttpsProxyUrl(): string | undefined {
  const p =
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.ALL_PROXY?.trim();
  return p || undefined;
}

/** 供 `import { fetch } from "undici"` 使用，与全局 fetch 二选一合并进请求参数 */
export function proxyDispatcherInit():
  | { dispatcher: ProxyAgent }
  | Record<string, never> {
  const url = getHttpsProxyUrl();
  if (!url) return {};
  return { dispatcher: new ProxyAgent(url) };
}

/**
 * OpenRouter API key：去 BOM、首尾空白、误带的 Bearer/引号（.env 里常见笔误）
 */
export function normalizeOpenRouterApiKey(raw: string | undefined): string | null {
  if (raw == null) return null;
  let k = raw.replace(/^\uFEFF/, "").trim();
  if (!k) return null;
  if (k.toLowerCase().startsWith("bearer ")) {
    k = k.slice(7).trim();
  }
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  return k || null;
}

/** 官方建议附带，部分环境缺失时仍建议带上 */
export function getOpenRouterDefaultHeaders(apiKey: string): Record<string, string> {
  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() || "http://localhost:3000";
  const title =
    process.env.OPENROUTER_APP_TITLE?.trim() || "qualitative-coding-assistant";

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": referer,
    "X-OpenRouter-Title": title,
  };
}

export function normalizeOpenRouterBaseUrl(raw: string | undefined): string {
  const u = (raw?.trim() || "https://openrouter.ai/api/v1").replace(/\/$/, "");
  return u;
}
