import type { Order, OrderStatus } from '../api/types';

/** A move staff can make next, as the backend allows it (OrderBoard). */
export interface Action {
  status: OrderStatus;
  label: string;
  danger?: boolean;
}

export function nextActions(order: Pick<Order, 'status' | 'fulfillment'>): Action[] {
  const ready: Action =
    order.fulfillment === 'DELIVERY'
      ? { status: 'OUT_FOR_DELIVERY', label: 'Saiu para entrega' }
      : { status: 'READY_FOR_PICKUP', label: 'Pronto para retirada' };
  const cancel: Action = { status: 'CANCELLED', label: 'Cancelar', danger: true };
  switch (order.status) {
    case 'RECEIVED':
      return [{ status: 'PREPARING', label: 'Começar preparo' }, ready, cancel];
    case 'PREPARING':
      return [ready, cancel];
    case 'OUT_FOR_DELIVERY':
    case 'READY_FOR_PICKUP':
      return [{ status: 'COMPLETED', label: 'Concluir' }, cancel];
    default:
      return [];
  }
}

/** Board columns, in the order the work flows. */
export const COLUMNS: { title: string; statuses: OrderStatus[] }[] = [
  { title: 'Novos', statuses: ['RECEIVED'] },
  { title: 'Em preparo', statuses: ['PREPARING'] },
  { title: 'Saindo / prontos', statuses: ['OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'] },
];
