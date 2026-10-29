import type { HandoffReason, Order, OrderStatus } from './api/types';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** R$ 1.234,50 */
export function formatMoney(amount: number): string {
  return money.format(amount).replace(/ /g, ' ');
}

export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

/** 5516990000001 → (16) 99000-0001; other numbers stay as they are. */
export function formatPhone(waId: string): string {
  const match = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(waId);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : waId;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: 'Recebido',
  PREPARING: 'Em preparo',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  READY_FOR_PICKUP: 'Pronto para retirada',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

export const PAYMENT_LABELS: Record<Order['paymentMethod'], string> = {
  cash: 'Dinheiro',
  card_on_delivery: 'Cartão (maquininha)',
  pix_on_delivery: 'Pix na entrega/retirada',
};

export const HANDOFF_LABELS: Record<HandoffReason, string> = {
  STAFF_REPLY: 'A equipe respondeu pelo app',
  STAFF_TAKEOVER: 'A equipe assumiu pelo painel',
  CUSTOMER_REQUEST: 'Cliente pediu atendente',
  BOT_REQUEST: 'Assistente pediu ajuda',
  REPEATED_FAILURES: 'Assistente não conseguiu responder',
};
