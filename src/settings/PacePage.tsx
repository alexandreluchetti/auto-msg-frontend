import { useEffect, useState, type FormEvent } from 'react';
import type { Humanization } from '../api/types';
import { DraftBadge } from './DraftBadge';
import { useSettings } from './useSettings';

const STATUS = { DRAFT: 'Rascunho', PUBLISHED: 'Publicada', ARCHIVED: 'Anterior' } as const;
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** Seconds a typical 80-character answer takes to arrive with these settings. */
export function typicalDelaySeconds(pace: Humanization): number {
  const ms = Math.min(Math.max(pace.msPerChar * 80, pace.minDelayMs), Math.max(pace.minDelayMs, pace.maxDelayMs));
  return Math.round(ms / 100) / 10;
}

/**
 * The human pace of the answers (ADR-011), the handoff pause and the message outside opening hours,
 * edited in the draft; publishing makes the draft (persona included) what WhatsApp uses.
 */
export function PacePage() {
  const { settings, error, saving, saveDraft, publish } = useSettings();
  const [pace, setPace] = useState<Humanization | null>(null);
  const [pauseHours, setPauseHours] = useState(4);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setPace(settings.effective.humanization);
      setPauseHours(Math.round((settings.effective.handoff.pauseMinutes / 60) * 10) / 10);
    }
  }, [settings]);

  if (!settings || !pace) {
    return <p className="centered">{error ?? 'Carregando…'}</p>;
  }

  function set<K extends keyof Humanization>(key: K, value: Humanization[K]) {
    setPace((current) => (current ? { ...current, [key]: value } : current));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const humanization: Humanization = { ...pace! };
    if (!humanization.closedMessage?.trim()) {
      delete humanization.closedMessage;
    }
    setNotice(await saveDraft({ humanization, handoff: { pauseMinutes: Math.round(pauseHours * 60) } }));
  }

  async function onPublish() {
    if (window.confirm('Publicar o rascunho? O WhatsApp passa a usar a persona e o ritmo do rascunho.')) {
      setNotice(await publish());
    }
  }

  return (
    <section className="settings" aria-label="Ritmo e publicação">
      <header className="topbar">
        <h1>Ritmo e publicação</h1>
        <div className="actions">
          <DraftBadge settings={settings} />
          <button type="button" className="on" disabled={saving || !settings.draft} onClick={onPublish}>
            Publicar
          </button>
        </div>
      </header>
      <div className="settings-body">
        <form onSubmit={submit} className="form">
          <label>
            Mensagens por resposta
            <select value={pace.maxBubbles} onChange={(e) => set('maxBubbles', Number(e.target.value))}>
              <option value={1}>1 (mais barato)</option>
              <option value={2}>Até 2, quando ficar natural</option>
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={pace.typingIndicator}
              onChange={(e) => set('typingIndicator', e.target.checked)}
            />
            Mostrar “digitando…” antes de responder
          </label>
          <label>
            Tempo por letra (ms)
            <input type="number" min={0} max={200} value={pace.msPerChar} onChange={(e) => set('msPerChar', Number(e.target.value))} />
          </label>
          <label>
            Espera mínima (ms)
            <input type="number" min={0} max={10000} value={pace.minDelayMs} onChange={(e) => set('minDelayMs', Number(e.target.value))} />
          </label>
          <label>
            Espera máxima (ms)
            <input type="number" min={0} max={20000} value={pace.maxDelayMs} onChange={(e) => set('maxDelayMs', Number(e.target.value))} />
          </label>
          <label>
            Esperar o cliente terminar de escrever (segundos)
            <input
              type="number"
              min={2}
              max={15}
              value={pace.groupingSeconds}
              onChange={(e) => set('groupingSeconds', Number(e.target.value))}
            />
          </label>
          <label>
            Mensagem fora do horário de funcionamento
            <textarea
              rows={2}
              maxLength={300}
              value={pace.closedMessage ?? ''}
              onChange={(e) => set('closedMessage', e.target.value)}
            />
          </label>
          <label>
            Depois de passar para a equipe, o assistente volta sozinho após (horas sem resposta da equipe)
            <input
              type="number"
              min={0.5}
              max={24}
              step={0.5}
              value={pauseHours}
              onChange={(e) => setPauseHours(Number(e.target.value))}
            />
          </label>
          <p className="muted">Uma resposta típica chega em cerca de {typicalDelaySeconds(pace)} s.</p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          <button type="submit" disabled={saving}>
            Salvar rascunho
          </button>
        </form>
        <aside className="preview" aria-label="Versões">
          <h2>Versões</h2>
          <table>
            <thead>
              <tr>
                <th>Versão</th>
                <th>Situação</th>
                <th>Quando</th>
              </tr>
            </thead>
            <tbody>
              {settings.versions.map((version) => (
                <tr key={version.version}>
                  <td>{version.version}</td>
                  <td>{STATUS[version.status]}</td>
                  <td>{dateTime.format(new Date(version.publishedAt ?? version.createdAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      </div>
    </section>
  );
}
