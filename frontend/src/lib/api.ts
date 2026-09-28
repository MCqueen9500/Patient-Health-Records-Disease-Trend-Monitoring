import { API_BASE } from '@/lib/utils';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface FetchOptions extends RequestInit {
  body?: BodyInit | null;
}

/**
 * Generic fetch wrapper that:
 * - Prepends API_BASE to the path
 * - Sends credentials (HTTP-only cookies) with every request
 * - Sets Content-Type: application/json by default
 * - Throws ApiError with the server message on non-OK responses
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { headers: customHeaders, body, ...rest } = options;

  const isFormData = body instanceof FormData;

  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(customHeaders as Record<string, string>),
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
      body,
      credentials: 'include',
    });
  } catch (error) {
    // Basic 1-time retry on network failure
    console.warn(`[Network] Retrying ${path}...`);
    response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
      body,
      credentials: 'include',
    });
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      message = errJson?.message || errJson?.error || message;
    } catch {
      // ignore parse errors, keep default message
    }
    throw new ApiError(message, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/* ── Convenience methods ─────────────────────────────────────────────── */

export const api = {
  get: <T = unknown>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { method: 'GET', ...options }),

  post: <T = unknown>(path: string, data?: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
      ...options,
    }),

  put: <T = unknown>(path: string, data?: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
      ...options,
    }),

  patch: <T = unknown>(path: string, data?: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, {
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
      ...options,
    }),

  delete: <T = unknown>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { method: 'DELETE', ...options }),
};
