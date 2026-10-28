import { type FormEvent, useState } from 'react';
import { ApiError, api } from './api/client';
import type { Me } from './api/types';

export function LoginPage({ onSignedIn }: { onSignedIn: (me: Me) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      onSignedIn(await api.login(email.trim(), password));
    } catch (failure) {
      setError(failure instanceof ApiError && failure.status === 401
        ? 'E-mail ou senha inválidos.'
        : 'Não foi possível entrar agora. Tente de novo.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="login">
      <form onSubmit={submit} aria-label="Entrar">
        <h1>Painel de pedidos</h1>
        <label>
          E-mail
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button type="submit" disabled={sending}>
          {sending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
