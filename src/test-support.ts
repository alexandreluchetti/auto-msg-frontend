import type { Order } from './api/types';

/** A fake backend for component tests: routes by method and path, records every call. */
export function fakeApi(routes: Record<string, (body: unknown) => unknown>) {
  const calls: { method: string; path: string; body: unknown; headers: Record<string, string> }[] = [];
  const fetchMock = vi.fn(async (path: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, path, body, headers: (init.headers ?? {}) as Record<string, string> });
    const route = routes[`${method} ${path}`];
    if (!route) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    }
    const result = route(body);
    if (result instanceof Response) {
      return result;
    }
    return result === undefined
      ? new Response(null, { status: 204 })
      : new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

/** EventSource stand-in: tests push events with `emit`. */
export class FakeEventSource {
  static last: FakeEventSource | null = null;
  readonly listeners = new Map<string, ((event: MessageEvent) => void)[]>();
  closed = false;

  constructor(readonly url: string) {
    FakeEventSource.last = this;
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  emit(type: string, data: unknown) {
    this.listeners.get(type)?.forEach((listener) => listener(new MessageEvent(type, { data: JSON.stringify(data) })));
  }

  close() {
    this.closed = true;
  }
}

export function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o-1',
    number: 1,
    status: 'RECEIVED',
    createdAt: '2026-10-28T23:00:00Z',
    updatedAt: '2026-10-28T23:00:00Z',
    customerName: 'Ana Souza',
    customerPhone: '5516990000001',
    fulfillment: 'DELIVERY',
    address: 'Rua A, 1',
    neighborhood: 'Centro',
    deliveryFee: 5,
    paymentMethod: 'cash',
    changeFor: 100,
    subtotal: 74.9,
    total: 79.9,
    items: [
      { name: 'Pizza Calabresa', quantity: 1, unitPrice: 61.9, options: ['Tamanho: Grande'], notes: 'sem cebola', lineTotal: 61.9 },
      { name: 'Refrigerante Lata', quantity: 2, unitPrice: 6.5, options: [], notes: null, lineTotal: 13 },
    ],
    ...overrides,
  };
}
