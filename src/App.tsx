import { useEffect, useState } from 'react';
import { api } from './api/client';
import type { Me } from './api/types';
import { Board } from './Board';
import { LoginPage } from './LoginPage';

/** Shows the board for a signed-in staff member, the sign-in page otherwise. */
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
  return (
    <Board
      me={me}
      onSignedOut={() => {
        void api.logout().finally(() => setMe(null));
      }}
    />
  );
}
