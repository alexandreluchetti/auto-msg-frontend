import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, api } from '../api/client';
import type { Choice, SimulatorReply } from '../api/types';

interface Line {
  key: string;
  author: 'CUSTOMER' | 'BOT';
  text: string;
  choices: Choice[];
  asButtons: boolean;
}

const OUTCOMES: Partial<Record<SimulatorReply['outcome'], string>> = {
  CHECKOUT: 'Resumo do pedido: no WhatsApp o cliente confirma pelo botão ou escrevendo "pode mandar".',
  HANDOFF: 'Aqui a conversa iria para a equipe.',
  REFUSED: 'O assistente recusou um assunto fora do restaurante.',
  FALLBACK: 'O assistente não conseguiu responder (no WhatsApp, a equipe seria avisada se repetir).',
  CONFIRMED: 'Pedido simulado: nada foi criado nem enviado.',
};

let sequence = 0;
const nextKey = () => `l${++sequence}`;

/**
 * WhatsApp-like chat with the assistant using the draft settings (ADR-011, H8). Answers come with
 * their human pace, played back here with "digitando…". Nothing is sent to WhatsApp, but every
 * message calls the real model and costs like a customer's.
 *
 * @param speed multiplies the pace (tests use 0)
 */
export function SimulatorPage({ speed = 1 }: { speed?: number }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    api
      .simulatorHistory()
      .then((history) =>
        setLines(history.map((line) => ({ key: nextKey(), author: line.author, text: line.text, choices: [], asButtons: false }))),
      )
      .catch(() => setError('Não foi possível carregar o simulador.'));
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function later(ms: number, action: () => void) {
    timers.current.push(window.setTimeout(action, ms * speed));
  }

  function play(reply: SimulatorReply) {
    reply.typingAtMs.forEach((at) => later(at, () => setTyping(true)));
    reply.bubbles.forEach((bubble, index) =>
      later(bubble.atMs, () => {
        setTyping(false);
        setLines((current) => [
          ...current,
          { key: nextKey(), author: 'BOT', text: bubble.text, choices: bubble.choices, asButtons: bubble.asButtons },
        ]);
        if (index === reply.bubbles.length - 1) {
          setWaiting(false);
          setNote(OUTCOMES[reply.outcome] ?? null);
        }
      }),
    );
    if (reply.bubbles.length === 0) {
      setWaiting(false);
    }
  }

  async function say(message: string, replyId?: string) {
    if (!message.trim() || waiting) {
      return;
    }
    setLines((current) => [...current, { key: nextKey(), author: 'CUSTOMER', text: message, choices: [], asButtons: false }]);
    setText('');
    setNote(null);
    setError(null);
    setWaiting(true);
    try {
      play(await api.simulate(message, replyId));
    } catch (failure) {
      setWaiting(false);
      setError(failure instanceof ApiError ? failure.message : 'O simulador não respondeu.');
    }
  }

  async function reset() {
    await api.resetSimulator();
    setLines([]);
    setNote(null);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void say(text);
  }

  return (
    <section className="simulator" aria-label="Simulador">
      <header className="topbar">
        <h1>Simulador</h1>
        <div className="actions">
          <button type="button" onClick={() => void reset()}>
            Recomeçar conversa
          </button>
        </div>
      </header>
      <p className="muted warning">
        Usa o rascunho da persona e do ritmo, com o cardápio e as ferramentas de verdade. Nada é enviado pelo WhatsApp e
        nenhum pedido é criado, mas cada mensagem usa o modelo de IA e tem custo.
      </p>
      <div className="chat phone" aria-label="Conversa simulada" aria-live="polite">
        {lines.map((line) => (
          <div key={line.key} className={`bubble ${line.author === 'CUSTOMER' ? 'customer' : 'bot'}`}>
            <p>{line.text}</p>
            {line.choices.length > 0 && (
              <div className={line.asButtons ? 'choices buttons' : 'choices list'}>
                {line.choices.map((choice) => (
                  <button key={choice.id} type="button" disabled={waiting} onClick={() => void say(choice.title, choice.id)}>
                    {choice.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {typing && <p className="typing">digitando…</p>}
      </div>
      {note && <p role="status">{note}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <form className="composer" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="simulator-text">
          Mensagem do cliente
        </label>
        <input
          id="simulator-text"
          value={text}
          placeholder="Escreva como um cliente…"
          maxLength={4096}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" disabled={waiting || !text.trim()}>
          Enviar
        </button>
      </form>
    </section>
  );
}
