import type { Handoff, Me, Order, OrderStatus } from './types';

/** The API answered with an error; `status` is the HTTP status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function csrfToken(): string | undefined {
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
    ?.substring('XSRF-TOKEN='.length);
}

/**
 * Calls the backend on the same origin. The session travels in its HttpOnly cookie; state-changing
 * requests repeat the XSRF-TOKEN cookie in the X-XSRF-TOKEN header (Spring Security for SPAs).
 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (method !== 'GET') {
    const token = csrfToken();
    if (token) {
      headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
    }
  }
  const response = await fetch(path, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      const error = (await response.json()) as { error?: string };
      if (error.error) {
        message = error.error;
      }
    } catch {
      // body without JSON
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  /** Sets the CSRF cookie; called before signing in. */
  csrf: () => request<{ headerName: string }>('GET', '/api/v1/auth/csrf'),
  login: async (email: string, password: string) => {
    await api.csrf();
    return request<Me>('POST', '/api/v1/auth/login', { email, password });
  },
  me: () => request<Me>('GET', '/api/v1/auth/me'),
  logout: () => request<void>('POST', '/api/v1/auth/logout'),
  orders: (scope: 'open' | 'recent' = 'open') => request<Order[]>('GET', `/api/v1/orders?scope=${scope}`),
  moveOrder: (id: string, status: OrderStatus) => request<Order>('POST', `/api/v1/orders/${id}/status`, { status }),
  handoffs: () => request<Handoff[]>('GET', '/api/v1/conversations/handoffs'),
  resume: (id: string) => request<void>('POST', `/api/v1/conversations/${id}/resume`),
};
