export type User = {
  id: string;
  fullName: string;
  email: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMINISTRATOR';
  status: 'ACTIVE';
};

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3101/api/v1';
const TOKEN_KEY = 'accessToken';
let authFailureHandler: (() => void) | undefined;

export function setAuthFailureHandler(handler: () => void) {
  authFailureHandler = handler;
  return () => { if (authFailureHandler === handler) authFailureHandler = undefined; };
}

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (path !== '/auth/login' && (response.status === 401 || body.code === 'ACCOUNT_DISABLED')) authFailureHandler?.();
    throw new ApiError(response.status, body.code ?? 'REQUEST_FAILED', body.message ?? 'Không thể xử lý yêu cầu.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
