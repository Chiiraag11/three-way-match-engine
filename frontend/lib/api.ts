const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const TOKEN_KEY = 'twm_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/**
 * Central fetch wrapper: attaches the bearer token, throws ApiError on
 * non-2xx responses, and JSON-parses bodies. Used by every API call so the
 * token attachment and error handling live in one place.
 */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit & { isForm?: boolean } = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };

  if (!options.isForm) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const message = (isJson && (body as any)?.error) || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, isJson ? (body as any)?.details : undefined);
  }

  return body as T;
}

export function fileUrl(id: string): string {
  const token = getToken();
  return `${API_BASE_URL}/documents/${id}/file${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

export { API_BASE_URL };
