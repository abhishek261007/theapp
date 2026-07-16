import { type AxiosRequestConfig, type AxiosResponse, create as createAxios } from 'axios';

/* ── Bounded in-memory cache for GET responses (60 s TTL, max 100 entries) ── */
const MAX_CACHE_SIZE = 100;
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60_000;

function stableCacheKey(url: string, params?: Record<string, unknown>): string {
  if (!params) return url;
  const sorted = Object.keys(params)
    .filter((k) => k !== '_no_cache')
    .sort()
    .map((k) => `${k}=${JSON.stringify(params[k])}`)
    .join('&');
  return sorted ? `${url}?${sorted}` : url;
}

const api = createAxios({
  baseURL: 'https://apis.27012610.xyz',
  timeout: 10000,
});

/* wrap GET so repeated requests within the TTL return instantly.
   Pass `{ headers: { 'x-bypass-cache': '1' } }` to force a fresh fetch
   (used by pull-to-refresh so updated content isn't served stale). */
const origGet = api.get.bind(api);
api.get = (async (url: string, config?: AxiosRequestConfig) => {
  const cfg = config ?? {};
  const headers = (cfg.headers ?? {}) as Record<string, unknown>;
  const params = cfg.params as Record<string, unknown> | undefined;
  const bypass =
    headers['x-bypass-cache'] === '1' || (params && params._no_cache);

  // Strip _no_cache from params before sending to server
  if (params && '_no_cache' in params) {
    const { _no_cache, ...rest } = params;
    cfg.params = Object.keys(rest).length > 0 ? rest : undefined;
  }

  const key = stableCacheKey(url, params);
  const hit = cache.get(key);
  if (!bypass && hit && Date.now() - hit.timestamp < CACHE_TTL) {
    return { data: hit.data, status: 200, statusText: 'OK', headers: {}, config: cfg } as AxiosResponse;
  }
  const res = await origGet(url, cfg);

  // Evict oldest entries if cache exceeds max size
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data: res.data, timestamp: Date.now() });
  return res;
}) as typeof api.get;

export default api;
