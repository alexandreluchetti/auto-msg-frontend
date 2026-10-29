import { useEffect, useState } from 'react';
import { api } from './api/client';
import type { Me } from './api/types';
import { Board } from './Board';
import { ConversationsPage } from './conversations/ConversationsPage';
import { LoginPage } from './LoginPage';
import { PacePage } from './settings/PacePage';
import { PersonaPage } from './settings/PersonaPage';
import { Shell, usePage } from './Shell';
import { SimulatorPage } from './simulator/SimulatorPage';

/** Shows the panel for a signed-in staff member, the sign-in page otherwise. */
export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <p className="centered">Carregando…</p>;
  }
  if (!me) {
    return <LoginPage onSignedIn={setMe} />;
  }
  return <Panel me={me} onSignedOut={() => void api.logout().finally(() => setMe(null))} />;
}

function Panel({ me, onSignedOut }: { me: Me; onSignedOut: () => void }) {
  const [page, navigate] = usePage(me);
  return (
    <Shell me={me} page={page} onNavigate={navigate} onSignedOut={onSignedOut}>
      {page === 'pedidos' && <Board />}
      {page === 'conversas' && <ConversationsPage />}
      {page === 'assistente' && <PersonaPage />}
      {page === 'ritmo' && <PacePage />}
      {page === 'simulador' && <SimulatorPage />}
    </Shell>
  );
}
