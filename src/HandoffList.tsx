import type { Handoff } from './api/types';
import { HANDOFF_LABELS, formatPhone, formatTime } from './format';

interface Props {
  handoffs: Handoff[];
  onResume: (handoff: Handoff) => void;
}

/** Conversations staff are handling in the WhatsApp Business app; the bot is paused in them. */
export function HandoffList({ handoffs, onResume }: Props) {
  return (
    <section className="handoffs" aria-label="Atendimentos com a equipe">
      <h2>Atendimento humano ({handoffs.length})</h2>
      {handoffs.length === 0 && <p className="muted">Nenhuma conversa com a equipe agora.</p>}
      <ul>
        {handoffs.map((handoff) => (
          <li key={handoff.id}>
            <div>
              <strong>{handoff.customerName ?? 'Cliente'}</strong>{' '}
              <a href={`https://wa.me/${handoff.customerPhone}`}>{formatPhone(handoff.customerPhone)}</a>
              <p className="muted">
                {HANDOFF_LABELS[handoff.handoffReason]} · desde {formatTime(handoff.handoffAt)} · bot volta às{' '}
                {formatTime(handoff.pausedUntil)}
              </p>
              {handoff.lastMessage && <p className="last">“{handoff.lastMessage}”</p>}
            </div>
            <button type="button" onClick={() => onResume(handoff)}>
              Devolver ao bot
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
