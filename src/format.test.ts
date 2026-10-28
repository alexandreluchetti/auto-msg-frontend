import { formatMoney, formatPhone } from './format';
import { nextActions } from './orders/transitions';

describe('formatting', () => {
  it('formats amounts the Brazilian way', () => {
    expect(formatMoney(79.9)).toBe('R$ 79,90');
    expect(formatMoney(1234.5)).toBe('R$ 1.234,50');
  });

  it('formats Brazilian WhatsApp numbers', () => {
    expect(formatPhone('5516990000001')).toBe('(16) 99000-0001');
    expect(formatPhone('14155550100')).toBe('14155550100');
  });
});

describe('next actions', () => {
  it('follows the backend transitions for delivery and pickup', () => {
    expect(nextActions({ status: 'RECEIVED', fulfillment: 'DELIVERY' }).map((a) => a.status)).toEqual([
      'PREPARING',
      'OUT_FOR_DELIVERY',
      'CANCELLED',
    ]);
    expect(nextActions({ status: 'PREPARING', fulfillment: 'PICKUP' }).map((a) => a.status)).toEqual([
      'READY_FOR_PICKUP',
      'CANCELLED',
    ]);
    expect(nextActions({ status: 'OUT_FOR_DELIVERY', fulfillment: 'DELIVERY' }).map((a) => a.status)).toEqual([
      'COMPLETED',
      'CANCELLED',
    ]);
    expect(nextActions({ status: 'COMPLETED', fulfillment: 'DELIVERY' })).toEqual([]);
  });
});
