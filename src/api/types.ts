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
  role: Role;
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

export type HandoffReason = 'STAFF_REPLY' | 'STAFF_TAKEOVER' | 'CUSTOMER_REQUEST' | 'BOT_REQUEST' | 'REPEATED_FAILURES';

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

export type Role = 'ADMIN' | 'STAFF';

export type Tone = 'friendly' | 'formal' | 'casual';

export interface Persona {
  name: string;
  tone: Tone;
  formality: number;
  emojis: 'none' | 'low' | 'moderate';
  expressions?: string[];
  greeting?: string;
  farewell?: string;
  sampleReplies?: string[];
}

export interface Humanization {
  maxBubbles: number;
  typingIndicator: boolean;
  msPerChar: number;
  minDelayMs: number;
  maxDelayMs: number;
  groupingSeconds: number;
  closedMessage?: string;
}

/** The business's own settings; anything left out comes from the segment defaults. */
export interface TenantConfig {
  persona?: Persona;
  humanization?: Humanization;
  handoff?: { pauseMinutes: number };
  [key: string]: unknown;
}

export interface ConfigVersion {
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  publishedAt: string | null;
}

export interface Settings {
  published: TenantConfig;
  draft: TenantConfig | null;
  effective: TenantConfig & { persona: Persona; humanization: Humanization; handoff: { pauseMinutes: number } };
  defaults: TenantConfig;
  schema: unknown;
  versions: ConfigVersion[];
}

export interface Choice {
  id: string;
  title: string;
}

export interface SimulatorBubble {
  text: string;
  atMs: number;
  choices: Choice[];
  asButtons: boolean;
}

export interface SimulatorReply {
  bubbles: SimulatorBubble[];
  typingAtMs: number[];
  outcome: 'ANSWERED' | 'CHECKOUT' | 'HANDOFF' | 'REFUSED' | 'FALLBACK' | 'CONFIRMED';
  toolsCalled: string[];
}

export interface SimulatorLine {
  author: 'CUSTOMER' | 'BOT';
  text: string;
  sentAt: string;
}

export type Author = 'CUSTOMER' | 'BOT' | 'STAFF';

export interface ConversationSummary {
  id: string;
  customerName: string | null;
  customerPhone: string;
  state: 'BOT' | 'HUMAN';
  handoffReason: HandoffReason | null;
  pausedUntil: string | null;
  lastMessage: string | null;
  lastAuthor: Author | null;
  lastMessageAt: string | null;
}

export interface ConversationMessage {
  direction: 'IN' | 'OUT';
  author: Author;
  text: string;
  sentAt: string;
}

export interface CartLine {
  code: string;
  quantity: number;
  options: string[];
  notes: string | null;
}

export interface ConversationDetail {
  conversation: ConversationSummary;
  messages: ConversationMessage[];
  /** The segment's conversation state; the restaurant keeps the order in progress in `cart`. */
  state: { cart?: { lines?: CartLine[]; fulfillment?: string | null; address?: string | null; neighborhood?: string | null; paymentMethod?: string | null } };
}
