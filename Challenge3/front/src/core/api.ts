import { authStorage } from './auth-storage';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function rawRequest<T>(path: string, options: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {};
  // Fastify rechaza un body vacío si Content-Type: application/json está
  // presente (FST_ERR_CTP_EMPTY_JSON_BODY) — solo lo mandamos cuando hay body.
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.auth !== false) {
    const token = authStorage.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => undefined);

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? res.statusText);
  }

  return data as T;
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) throw new ApiError(401, 'No hay sesión activa');

  const { accessToken } = await rawRequest<{ accessToken: string }>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    auth: false,
  });
  authStorage.setAccessToken(accessToken);
  return accessToken;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (error) {
    const isAuthed = options.auth !== false;
    const canRetry = path !== '/auth/refresh';
    if (isAuthed && canRetry && error instanceof ApiError && error.status === 401) {
      await refreshAccessToken();
      return rawRequest<T>(path, options);
    }
    throw error;
  }
}
