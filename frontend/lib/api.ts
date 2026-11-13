import axios, { type InternalAxiosRequestConfig } from "axios";
import { mapParams } from "@/lib/api-contract";
import type { ApiErrorBody, ApiSuccess, PageMeta, Paged } from "@/types/api";

/** Dilayani proxy Next.js (lihat next.config.ts), jadi same-origin. */
export const API_BASE = "/api/v1";

/* ---------- Token: disimpan di memori, bukan localStorage ---------- */
let accessToken: string | null = null;
export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
};

let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: (() => void) | null) {
  onSessionExpired = fn;
}

/* ---------- Error ---------- */
export class ApiError extends Error {
  code: string;
  status: number;
  details: unknown;
  requestId?: string;

  constructor(code: string, message: string, status: number, details: unknown = null, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as Partial<ApiErrorBody> | undefined;
    const status = err.response?.status ?? 0;
    if (body?.error) {
      return new ApiError(body.error.code, body.error.message, status, body.error.details, body.error.requestId);
    }
    if (status === 429) return new ApiError("RATE_LIMITED", "Terlalu banyak permintaan. Coba lagi sebentar lagi.", 429);
    if (!err.response || status === 502 || status === 503 || status === 504 || (status === 500 && !body)) {
      return new ApiError("NETWORK_ERROR", "Backend tidak dapat dihubungi. Pastikan backend (atau `npm run mock`) berjalan di port 6318.", 0);
    }
    return new ApiError("HTTP_ERROR", err.message, status);
  }
  return new ApiError("UNKNOWN", err instanceof Error ? err.message : "Terjadi kesalahan", 0);
}

/** Pesan siap tampil untuk pengguna. */
export function describeError(err: unknown): string {
  const e = toApiError(err);
  if (e.code === "VALIDATION_ERROR" && Array.isArray(e.details) && e.details.length > 0) {
    const lines = e.details.slice(0, 3).map((d) => {
      if (typeof d === "string") return d;
      const o = (d ?? {}) as Record<string, unknown>;
      return [o.path ?? o.field, o.message].filter(Boolean).join(": ");
    });
    return `${e.message} (${lines.join("; ")})`;
  }
  return e.message;
}

/* ---------- Axios instances ---------- */
export const publicApi = axios.create({ baseURL: API_BASE, withCredentials: true });
publicApi.interceptors.response.use(
  (r) => r,
  (e) => Promise.reject(toApiError(e)),
);

export const api = axios.create({ baseURL: API_BASE, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Satu refresh pada satu waktu: refresh token dirotasi, jadi pemanggilan ganda akan mencabut sesi. */
let refreshing: Promise<string> | null = null;
export function refreshAccessToken(): Promise<string> {
  refreshing ??= publicApi
    .post<ApiSuccess<{ accessToken: string }>>("/auth/refresh")
    .then((res) => {
      const token = res.data.data.accessToken;
      tokenStore.set(token);
      return token;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type Retriable = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (r) => r,
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const original = error.config as Retriable | undefined;
      const isAuthCall = original?.url?.startsWith("/auth/");
      if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
        original._retried = true;
        let token: string;
        try {
          token = await refreshAccessToken();
        } catch (refreshError) {
          const e = toApiError(refreshError);
          if (e.status !== 0) {
            tokenStore.set(null);
            onSessionExpired?.();
          }
          return Promise.reject(e);
        }
        original.headers.Authorization = `Bearer ${token}`;
        return api.request(original);
      }
    }
    return Promise.reject(toApiError(error));
  },
);

/* ---------- Helper request: mengembalikan `data` ---------- */
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<ApiSuccess<T>>(url, { params: mapParams(params) });
  return res.data.data;
}
export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post<ApiSuccess<T>>(url, body);
  return res.data.data;
}
export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<ApiSuccess<T>>(url, body);
  return res.data.data;
}
export async function apiDelete<T = unknown>(url: string): Promise<T> {
  const res = await api.delete<ApiSuccess<T>>(url);
  return res.data.data;
}

function toPageMeta(raw: unknown, count: number): PageMeta {
  const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const m = (root.pagination && typeof root.pagination === "object" ? root.pagination : root) as Record<string, unknown>;
  const num = (...keys: string[]) => {
    for (const k of keys) if (typeof m[k] === "number") return m[k] as number;
    return undefined;
  };
  const page = num("page", "currentPage") ?? 1;
  const limit = num("limit", "perPage", "pageSize") ?? (count || 1);
  const total = num("total", "totalItems", "totalCount") ?? count;
  const totalPages = num("totalPages", "pageCount") ?? Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages };
}

/** Daftar: menerima `data: []` maupun `data: { items: [] }`, meta di `meta`. */
export async function apiList<T>(url: string, params?: Record<string, unknown>): Promise<Paged<T>> {
  const res = await api.get<ApiSuccess<unknown>>(url, { params: mapParams(params) });
  const body = res.data;
  const data = body.data as unknown;
  const obj = (data && typeof data === "object" && !Array.isArray(data) ? data : {}) as Record<string, unknown>;
  const items = (Array.isArray(data) ? data : Array.isArray(obj.items) ? obj.items : []) as T[];
  return { items, meta: toPageMeta(body.meta ?? obj.meta ?? obj.pagination, items.length) };
}
