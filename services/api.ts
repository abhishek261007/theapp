import { type AxiosRequestConfig, type AxiosResponse, create as createAxios } from 'axios';
import useAuthStore from '../store/authStore';

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

/* ── Inject JWT token if available ── */
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* wrap GET so repeated requests within the TTL return instantly */
const origGet = api.get.bind(api);
api.get = (async (url: string, config?: AxiosRequestConfig) => {
  const key = cacheKey(url, config?.params as Record<string, unknown> | undefined);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.timestamp < CACHE_TTL) {
    return { data: hit.data, status: 200, statusText: 'OK', headers: {}, config: config ?? {} } as AxiosResponse;
  }
  const res = await origGet(url, config);
  cache.set(key, { data: res.data, timestamp: Date.now() });
  return res;
}) as typeof api.get;

export default api;
