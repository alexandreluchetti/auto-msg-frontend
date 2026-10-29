import { useEffect, useState, type FormEvent } from 'react';
import type { Persona, Tone } from '../api/types';
import { DraftBadge } from './DraftBadge';
import { useSettings } from './useSettings';

const TONES: Record<Tone, string> = {
  friendly: 'Simpático',
  casual: 'Descontraído',
  formal: 'Formal',
};

const EMOJIS: Record<Persona['emojis'], string> = {
  none: 'Nenhum',
  low: 'Poucos',
  moderate: 'Com moderação',
};

const FORMALITY = ['', 'Bem informal', 'Informal', 'Equilibrado', 'Cuidadoso', 'Formal'];

/** What the customer would read first, to get a feel for the persona before trying the simulator. */
export function previewGreeting(persona: Persona, business: string): string {
  if (persona.greeting?.trim()) {
    return persona.greeting.trim();
  }
  const emoji = persona.emojis === 'none' ? '' : ' 😊';
  if (persona.tone === 'formal') {
    return `Olá! Aqui é ${persona.name}, do ${business}. Como posso ajudar?`;
  }
  if (persona.tone === 'casual') {
    return `Opa! Aqui é ${persona.name}, do ${business}. Manda aí!${emoji}`;
  }
  return `Oi! Aqui é ${persona.name}, do ${business}.${emoji} Em que posso ajudar?`;
}

function lines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** The assistant's persona (D-013): how it talks, edited in the draft with a live preview. */
export function PersonaPage() {
  const { settings, error, saving, saveDraft } = useSettings();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [expressions, setExpressions] = useState('');
  const [samples, setSamples] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      const current = settings.effective.persona;
      setPersona(current);
      setExpressions((current.expressions ?? []).join('\n'));
      setSamples((current.sampleReplies ?? []).join('\n'));
    }
  }, [settings]);

  if (!settings || !persona) {
    return <p className="centered">{error ?? 'Carregando…'}</p>;
  }
  const business = String((settings.effective.business as { name?: string } | undefined)?.name ?? 'restaurante');
  const edited: Persona = { ...persona, expressions: lines(expressions), sampleReplies: lines(samples) };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean: Persona = { ...edited };
    if (!clean.greeting?.trim()) {
      delete clean.greeting;
    }
    if (!clean.farewell?.trim()) {
      delete clean.farewell;
    }
    setNotice(await saveDraft({ persona: clean }));
  }

  function set<K extends keyof Persona>(key: K, value: Persona[K]) {
    setPersona((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <section className="settings" aria-label="Assistente">
      <header className="topbar">
        <h1>Assistente</h1>
        <DraftBadge settings={settings} />
      </header>
      <div className="settings-body">
        <form onSubmit={submit} className="form">
          <label>
            Nome
            <input value={persona.name} maxLength={40} required minLength={2} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label>
            Tom
            <select value={persona.tone} onChange={(e) => set('tone', e.target.value as Tone)}>
              {Object.entries(TONES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Formalidade: {FORMALITY[persona.formality]}
            <input
              type="range"
              min={1}
              max={5}
              value={persona.formality}
              onChange={(e) => set('formality', Number(e.target.value))}
            />
          </label>
          <label>
            Emojis
            <select value={persona.emojis} onChange={(e) => set('emojis', e.target.value as Persona['emojis'])}>
              {Object.entries(EMOJIS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Expressões típicas (uma por linha)
            <textarea rows={3} value={expressions} onChange={(e) => setExpressions(e.target.value)} />
          </label>
          <label>
            Saudação
            <input value={persona.greeting ?? ''} maxLength={120} onChange={(e) => set('greeting', e.target.value)} />
          </label>
          <label>
            Despedida
            <input value={persona.farewell ?? ''} maxLength={120} onChange={(e) => set('farewell', e.target.value)} />
          </label>
          <label>
            Exemplos de respostas da equipe (um por linha; só para o tom, nunca como fonte de preços)
            <textarea rows={4} value={samples} onChange={(e) => setSamples(e.target.value)} />
          </label>
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
        <aside className="preview" aria-label="Prévia">
          <h2>Prévia</h2>
          <div className="chat">
            <p className="bubble bot">{previewGreeting(edited, business)}</p>
            {edited.expressions && edited.expressions.length > 0 && (
              <p className="muted">Pode usar: {edited.expressions.join(', ')}</p>
            )}
          </div>
          <p className="muted">
            O assistente nunca diz que é uma pessoa: se perguntarem, conta que é o assistente virtual e oferece chamar
            alguém da equipe.
          </p>
        </aside>
      </div>
    </section>
  );
}
