import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api/client';
import type { Author, ConversationDetail, ConversationSummary } from '../api/types';
import { type PanelEvent, usePanelEvents } from '../events';
import { HANDOFF_LABELS, PAYMENT_LABELS, formatPhone, formatTime } from '../format';

const AUTHORS: Record<Author, string> = { CUSTOMER: 'Cliente', BOT: 'Assistente', STAFF: 'Equipe' };

/**
 * Conversations (D-013): the latest ones, who is answering each (assistant or staff), the messages
 * of the bot, staff and customer, the order in progress, and taking over or handing back.
 */
export function ConversationsPage() {
  const [list, setList] = useState<ConversationSummary[]>([]);
  const [onlyStaff, setOnlyStaff] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    try {
      setList(await api.conversations({ state: onlyStaff ? 'HUMAN' : undefined, q: query.trim() || undefined }));
      setError(null);
    } catch {
      setError('Sem conexão com o servidor. Tentando de novo…');
    }
  }, [onlyStaff, query]);

  const loadDetail = useCallback(async () => {
    if (selected) {
      try {
        setDetail(await api.conversation(selected));
      } catch {
        setDetail(null);
      }
    }
  }, [selected]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const reload = useCallback(() => {
    void loadList();
    void loadDetail();
  }, [loadList, loadDetail]);

  const onEvent = useCallback(
    (event: PanelEvent) => {
      if (event.type.startsWith('conversation.')) {
        reload();
      }
    },
    [reload],
  );
  usePanelEvents(onEvent, reload);

  async function act(action: (id: string) => Promise<void>) {
    if (!detail) {
      return;
    }
    setBusy(true);
    try {
      await action(detail.conversation.id);
      reload();
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Não foi possível mudar a conversa.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="conversations" aria-label="Conversas">
      <header className="topbar">
        <h1>Conversas</h1>
        <div className="actions">
          <label className="check">
            <input type="checkbox" checked={onlyStaff} onChange={(event) => setOnlyStaff(event.target.checked)} />
            Só com a equipe
          </label>
          <input
            type="search"
            aria-label="Buscar por nome ou telefone"
            placeholder="Buscar por nome ou telefone"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </header>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="split">
        <ul className="conversation-list" aria-label="Lista de conversas">
          {list.length === 0 && <li className="muted">Nenhuma conversa.</li>}
          {list.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={item.id === selected ? 'selected' : undefined}
                onClick={() => setSelected(item.id)}
              >
                <strong>{item.customerName ?? 'Cliente'}</strong>
                <span className={`badge ${item.state === 'HUMAN' ? 'staff' : ''}`}>
                  {item.state === 'HUMAN' ? 'Equipe' : 'Assistente'}
                </span>
                {item.lastMessage && (
                  <span className="muted last">
                    {item.lastAuthor ? `${AUTHORS[item.lastAuthor]}: ` : ''}
                    {item.lastMessage}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        {detail ? <Detail detail={detail} busy={busy} onTakeOver={() => act(api.takeOver)} onResume={() => act(api.resume)} /> : (
          <p className="muted placeholder">Escolha uma conversa.</p>
        )}
      </div>
    </section>
  );
}

interface DetailProps {
  detail: ConversationDetail;
  busy: boolean;
  onTakeOver: () => void;
  onResume: () => void;
}

function Detail({ detail, busy, onTakeOver, onResume }: DetailProps) {
  const { conversation, messages } = detail;
  const cart = detail.state.cart;
  const human = conversation.state === 'HUMAN';
  return (
    <article className="conversation" aria-label={`Conversa com ${conversation.customerName ?? 'cliente'}`}>
      <header>
        <div>
          <h2>{conversation.customerName ?? 'Cliente'}</h2>
          <a href={`https://wa.me/${conversation.customerPhone}`}>{formatPhone(conversation.customerPhone)}</a>
          <p className="muted">
            {human
              ? `Com a equipe${conversation.handoffReason ? ` · ${HANDOFF_LABELS[conversation.handoffReason]}` : ''}${
                  conversation.pausedUntil ? ` · assistente volta às ${formatTime(conversation.pausedUntil)}` : ''
                }`
              : 'O assistente está respondendo'}
          </p>
        </div>
        {human ? (
          <button type="button" disabled={busy} onClick={onResume}>
            Devolver ao bot
          </button>
        ) : (
          <button type="button" className="on" disabled={busy} onClick={onTakeOver}>
            Assumir conversa
          </button>
        )}
      </header>
      {human && (
        <p className="muted">Responda pelo app WhatsApp Business; o assistente fica em silêncio até você devolver.</p>
      )}
      <ol className="chat" aria-label="Mensagens">
        {messages.map((message, index) => (
          <li key={index} className={`bubble ${message.author.toLowerCase()}`}>
            <span className="author">{AUTHORS[message.author]}</span>
            <p>{message.text}</p>
            <time className="muted">{formatTime(message.sentAt)}</time>
          </li>
        ))}
      </ol>
      {cart?.lines && cart.lines.length > 0 && (
        <section className="cart" aria-label="Pedido em andamento">
          <h3>Pedido em andamento</h3>
          <ul>
            {cart.lines.map((line, index) => (
              <li key={index}>
                {line.quantity}x {line.code}
                {line.options.length > 0 && ` (${line.options.join(', ')})`}
                {line.notes && <span className="notes">{line.notes}</span>}
              </li>
            ))}
          </ul>
          <p className="muted">
            {cart.fulfillment === 'delivery' ? `Entrega: ${cart.address ?? '?'} - ${cart.neighborhood ?? '?'}` : ''}
            {cart.fulfillment === 'pickup' ? 'Retirada' : ''}
            {cart.paymentMethod && cart.paymentMethod in PAYMENT_LABELS
              ? ` · ${PAYMENT_LABELS[cart.paymentMethod as keyof typeof PAYMENT_LABELS]}`
              : ''}
          </p>
        </section>
      )}
    </article>
  );
}
