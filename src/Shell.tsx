import { useEffect, useState, type ReactNode } from 'react';
import type { Me } from './api/types';

export type Page = 'pedidos' | 'conversas' | 'assistente' | 'ritmo' | 'simulador';

interface Item {
  page: Page;
  label: string;
  adminOnly: boolean;
}

const ITEMS: Item[] = [
  { page: 'pedidos', label: 'Pedidos', adminOnly: false },
  { page: 'conversas', label: 'Conversas', adminOnly: false },
  { page: 'assistente', label: 'Assistente', adminOnly: true },
  { page: 'ritmo', label: 'Ritmo e publicação', adminOnly: true },
  { page: 'simulador', label: 'Simulador', adminOnly: true },
];

/** Pages this staff member may open: admins also edit the assistant and use the simulator. */
export function pagesFor(me: Me): Item[] {
  return ITEMS.filter((item) => !item.adminOnly || me.role === 'ADMIN');
}

function pageFromHash(me: Me): Page {
  const wanted = window.location.hash.replace(/^#\/?/, '');
  return pagesFor(me).find((item) => item.page === wanted)?.page ?? 'pedidos';
}

/** The page in the address (#/conversas), so a reload stays on it. */
export function usePage(me: Me): [Page, (page: Page) => void] {
  const [page, setPage] = useState<Page>(() => pageFromHash(me));
  useEffect(() => {
    const onHash = () => setPage(pageFromHash(me));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [me]);
  return [
    page,
    (next) => {
      window.location.hash = `/${next}`;
      setPage(next);
    },
  ];
}

interface Props {
  me: Me;
  page: Page;
  onNavigate: (page: Page) => void;
  onSignedOut: () => void;
  children: ReactNode;
}

/** Side navigation of the panel, with the signed-in staff member. */
export function Shell({ me, page, onNavigate, onSignedOut, children }: Props) {
  return (
    <div className="shell">
      <nav className="sidenav" aria-label="Menu">
        <strong className="brand">Painel</strong>
        <ul>
          {pagesFor(me).map((item) => (
            <li key={item.page}>
              <a
                href={`#/${item.page}`}
                aria-current={item.page === page ? 'page' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(item.page);
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="who">
          <span>{me.name}</span>
          <span className="muted">{me.role === 'ADMIN' ? 'Administrador' : 'Equipe'}</span>
          <button type="button" onClick={onSignedOut}>
            Sair
          </button>
        </div>
      </nav>
      <div className="page">{children}</div>
    </div>
  );
}
