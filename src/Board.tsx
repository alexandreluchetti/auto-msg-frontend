import { useCallback, useEffect, useState } from 'react';
import { api } from './api/client';
import type { Handoff, Order, OrderStatus } from './api/types';
import { type PanelEvent, usePanelEvents } from './events';
import { HandoffList } from './HandoffList';
import { OrderCard } from './OrderCard';
import { COLUMNS } from './orders/transitions';
import { STATUS_LABELS } from './format';
import { enableSound, playNewOrderAlert } from './sound';

const FRESH_MS = 60_000;

/**
 * The orders board: open orders by stage, live (SSE) with a sound alert for new ones, and the
 * conversations staff are handling.
 */
export function Board() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [recent, setRecent] = useState<Order[] | null>(null);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sound, setSound] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await api.orders('open'));
      setError(null);
    } catch {
      setError('Sem conexão com o servidor. Tentando de novo…');
    }
  }, []);

  const loadHandoffs = useCallback(async () => {
    try {
      setHandoffs(await api.handoffs());
    } catch {
      // the next event or reconnection refreshes it
    }
  }, []);

  const reload = useCallback(() => {
    void loadOrders();
    void loadHandoffs();
  }, [loadOrders, loadHandoffs]);

  useEffect(reload, [reload]);

  const onEvent = useCallback(
    (event: PanelEvent) => {
      if (event.type === 'order.created') {
        playNewOrderAlert();
        setFresh((current) => new Set(current).add(event.id));
        window.setTimeout(() => setFresh((current) => {
          const next = new Set(current);
          next.delete(event.id);
          return next;
        }), FRESH_MS);
      }
      if (event.type.startsWith('order.')) {
        void loadOrders();
      } else {
        void loadHandoffs();
      }
    },
    [loadOrders, loadHandoffs],
  );
  usePanelEvents(onEvent, reload);

  async function move(order: Order, status: OrderStatus) {
    setBusy(order.id);
    try {
      await api.moveOrder(order.id, status);
      await loadOrders();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível mudar o pedido.');
    } finally {
      setBusy(null);
    }
  }

  async function resume(handoff: Handoff) {
    await api.resume(handoff.id);
    await loadHandoffs();
  }

  return (
    <div className="board">
      <header className="topbar">
        <h1>Pedidos</h1>
        <div className="actions">
          <button
            type="button"
            className={sound ? 'on' : undefined}
            onClick={() => setSound(enableSound())}
            aria-pressed={sound}
          >
            {sound ? 'Som ligado' : 'Ligar som de novo pedido'}
          </button>
          <button type="button" onClick={async () => setRecent(recent ? null : await api.orders('recent'))}>
            {recent ? 'Ver em andamento' : 'Últimas 24 horas'}
          </button>
        </div>
      </header>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {recent ? (
        <section aria-label="Últimas 24 horas" className="recent">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((order) => (
                <tr key={order.id}>
                  <td>{order.number}</td>
                  <td>{order.customerName ?? 'Cliente'}</td>
                  <td>{STATUS_LABELS[order.status]}</td>
                  <td>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <main className="columns">
          {COLUMNS.map((column) => {
            const cards = orders.filter((order) => column.statuses.includes(order.status));
            return (
              <section key={column.title} aria-label={column.title} className="column">
                <h2>
                  {column.title} <span className="count">{cards.length}</span>
                </h2>
                {cards.map((order) => (
                  <OrderCard key={order.id} order={order} fresh={fresh.has(order.id)} busy={busy === order.id} onMove={move} />
                ))}
              </section>
            );
          })}
        </main>
      )}
      <HandoffList handoffs={handoffs} onResume={resume} />
    </div>
  );
}
