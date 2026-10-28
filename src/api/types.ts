// Types of the backend contract (auto-msg-backend/docs/api/openapi.yaml).

export type OrderStatus =
  | 'RECEIVED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Me {
  email: string;
  name: string;
  tenantId: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  options: string[];
  notes: string | null;
  lineTotal: number;
}

export interface Order {
  id: string;
  number: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  customerName: string | null;
  customerPhone: string;
  fulfillment: 'DELIVERY' | 'PICKUP';
  address: string | null;
  neighborhood: string | null;
  deliveryFee: number;
  paymentMethod: 'cash' | 'card_on_delivery' | 'pix_on_delivery';
  changeFor: number | null;
  subtotal: number;
  total: number;
  items: OrderItem[];
}

export type HandoffReason = 'STAFF_REPLY' | 'CUSTOMER_REQUEST' | 'BOT_REQUEST' | 'REPEATED_FAILURES';

export interface Handoff {
  id: string;
  customerName: string | null;
  customerPhone: string;
  handoffReason: HandoffReason;
  handoffAt: string;
  pausedUntil: string;
  lastMessage: string | null;
}

export type PanelEventType = 'order.created' | 'order.updated' | 'conversation.handoff' | 'conversation.resumed';
