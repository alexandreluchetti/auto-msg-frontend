import { useEffect } from 'react';
import type { PanelEventType } from './api/types';

export interface PanelEvent {
  type: PanelEventType;
  id: string;
}

const TYPES: PanelEventType[] = ['order.created', 'order.updated', 'conversation.handoff', 'conversation.resumed'];

/**
 * Listens to the backend's live events (SSE). EventSource sends the session cookie on the same
 * origin and reconnects by itself; `onReconnect` lets the board refetch what it may have missed.
 */
export function usePanelEvents(onEvent: (event: PanelEvent) => void, onReconnect: () => void): void {
  useEffect(() => {
    const source = new EventSource('/api/v1/events');
    let opened = false;
    source.addEventListener('ready', () => {
      if (opened) {
        onReconnect();
      }
      opened = true;
    });
    const listener = (message: Event) => onEvent(JSON.parse((message as MessageEvent<string>).data) as PanelEvent);
    TYPES.forEach((type) => source.addEventListener(type, listener));
    return () => source.close();
  }, [onEvent, onReconnect]);
}
