import type { Order, OrderStatus } from './api/types';
import { PAYMENT_LABELS, STATUS_LABELS, formatMoney, formatPhone, formatTime } from './format';
import { nextActions } from './orders/transitions';

interface Props {
  order: Order;
  fresh: boolean;
  busy: boolean;
  onMove: (order: Order, status: OrderStatus) => void;
}

export function OrderCard({ order, fresh, busy, onMove }: Props) {
  return (
    <article className={`card${fresh ? ' fresh' : ''}`} aria-label={`Pedido ${order.number}`}>
      <header>
        <strong>#{order.number}</strong>
        <span className="muted">{formatTime(order.createdAt)}</span>
        <span className={`badge ${order.status.toLowerCase()}`}>{STATUS_LABELS[order.status]}</span>
      </header>
      <p className="customer">
        {order.customerName ?? 'Cliente'} · <a href={`https://wa.me/${order.customerPhone}`}>{formatPhone(order.customerPhone)}</a>
      </p>
      <ul className="items">
        {order.items.map((item, index) => (
          <li key={index}>
            <span>
              {item.quantity}x {item.name}
              {item.options.length > 0 && <span className="muted"> ({item.options.join(', ')})</span>}
              {item.notes && <em className="notes">Obs.: {item.notes}</em>}
            </span>
            <span>{formatMoney(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="totals">
        {order.fulfillment === 'DELIVERY' && (
          <>
            <dt>Entrega ({order.neighborhood})</dt>
            <dd>{formatMoney(order.deliveryFee)}</dd>
          </>
        )}
        <dt>Total</dt>
        <dd>
          <strong>{formatMoney(order.total)}</strong>
        </dd>
      </dl>
      <p>
        {order.fulfillment === 'DELIVERY' ? `Entregar em: ${order.address} - ${order.neighborhood}` : 'Retirada no balcão'}
      </p>
      <p>
        {PAYMENT_LABELS[order.paymentMethod]}
        {order.changeFor !== null && ` · troco para ${formatMoney(order.changeFor)}`}
      </p>
      <footer>
        {nextActions(order).map((action) => (
          <button
            key={action.status}
            type="button"
            className={action.danger ? 'danger' : undefined}
            disabled={busy}
            onClick={() => {
              if (!action.danger || window.confirm(`Cancelar o pedido #${order.number}? O cliente será avisado.`)) {
                onMove(order, action.status);
              }
            }}
          >
            {action.label}
          </button>
        ))}
      </footer>
    </article>
  );
}
