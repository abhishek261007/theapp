import { type AxiosRequestConfig, type AxiosResponse, create as createAxios } from 'axios';

/* ── Mild in-memory cache for GET responses (60 s TTL) ── */
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60_000;

function cacheKey(url: string, params?: Record<string, unknown>): string {
  return params ? `${url}?${JSON.stringify(params)}` : url;
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

  const key = cacheKey(url, params);
  const hit = cache.get(key);
  if (!bypass && hit && Date.now() - hit.timestamp < CACHE_TTL) {
    return { data: hit.data, status: 200, statusText: 'OK', headers: {}, config: cfg } as AxiosResponse;
  }
  const res = await origGet(url, cfg);
  cache.set(key, { data: res.data, timestamp: Date.now() });
  return res;
}) as typeof api.get;

export default api;
