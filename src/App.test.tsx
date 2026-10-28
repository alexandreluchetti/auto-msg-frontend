import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { FakeEventSource, fakeApi, order } from './test-support';

const ME = { email: 'ana@cantina.test', name: 'Ana', tenantId: 't-1' };

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeEventSource);
  document.cookie = 'XSRF-TOKEN=token-123';
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sign-in', () => {
  it('signs in with e-mail and password, sending the CSRF token', async () => {
    const calls = fakeApi({
      'GET /api/v1/auth/me': () => new Response(null, { status: 401 }),
      'GET /api/v1/auth/csrf': () => ({ headerName: 'X-XSRF-TOKEN' }),
      'POST /api/v1/auth/login': () => ME,
      'GET /api/v1/orders?scope=open': () => [],
      'GET /api/v1/conversations/handoffs': () => [],
    });
    render(<App />);

    await userEvent.type(await screen.findByLabelText('E-mail'), 'ana@cantina.test');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-forte-123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
    const login = calls.find((call) => call.path === '/api/v1/auth/login')!;
    expect(login.body).toEqual({ email: 'ana@cantina.test', password: 'senha-forte-123' });
    expect(login.headers['X-XSRF-TOKEN']).toBe('token-123');
  });

  it('says when the password is wrong', async () => {
    fakeApi({
      'GET /api/v1/auth/me': () => new Response(null, { status: 401 }),
      'GET /api/v1/auth/csrf': () => ({ headerName: 'X-XSRF-TOKEN' }),
      'POST /api/v1/auth/login': () => new Response(JSON.stringify({ error: 'x' }), { status: 401 }),
    });
    render(<App />);

    await userEvent.type(await screen.findByLabelText('E-mail'), 'ana@cantina.test');
    await userEvent.type(screen.getByLabelText('Senha'), 'errada');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
  });
});

describe('board', () => {
  it('shows the order with its items, total, address and payment', async () => {
    fakeApi({
      'GET /api/v1/auth/me': () => ME,
      'GET /api/v1/orders?scope=open': () => [order()],
      'GET /api/v1/conversations/handoffs': () => [],
    });
    render(<App />);

    const card = await screen.findByRole('article', { name: 'Pedido 1' });
    expect(within(screen.getByRole('region', { name: 'Novos' })).getByRole('article')).toBe(card);
    expect(card).toHaveTextContent('1x Pizza Calabresa (Tamanho: Grande)');
    expect(card).toHaveTextContent('Obs.: sem cebola');
    expect(card).toHaveTextContent('R$ 79,90');
    expect(card).toHaveTextContent('Entregar em: Rua A, 1 - Centro');
    expect(card).toHaveTextContent('Dinheiro · troco para R$ 100,00');
    expect(card).toHaveTextContent('(16) 99000-0001');
  });

  it('moves an order and refreshes the board', async () => {
    let status = 'RECEIVED';
    const calls = fakeApi({
      'GET /api/v1/auth/me': () => ME,
      'GET /api/v1/orders?scope=open': () => [order({ status: status as never })],
      'GET /api/v1/conversations/handoffs': () => [],
      'POST /api/v1/orders/o-1/status': (body) => {
        status = (body as { status: string }).status;
        return order({ status: status as never });
      },
    });
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Começar preparo' }));

    await waitFor(() =>
      expect(within(screen.getByRole('region', { name: 'Em preparo' })).getByRole('article')).toBeInTheDocument(),
    );
    const move = calls.find((call) => call.method === 'POST' && call.path === '/api/v1/orders/o-1/status')!;
    expect(move.body).toEqual({ status: 'PREPARING' });
    expect(move.headers['X-XSRF-TOKEN']).toBe('token-123');
  });

  it('shows a new order as soon as the live event arrives', async () => {
    let orders = [order()];
    fakeApi({
      'GET /api/v1/auth/me': () => ME,
      'GET /api/v1/orders?scope=open': () => orders,
      'GET /api/v1/conversations/handoffs': () => [],
    });
    render(<App />);
    await screen.findByRole('article', { name: 'Pedido 1' });

    orders = [order({ id: 'o-2', number: 2 }), ...orders];
    FakeEventSource.last!.emit('order.created', { type: 'order.created', id: 'o-2' });

    const card = await screen.findByRole('article', { name: 'Pedido 2' });
    expect(card).toHaveClass('fresh');
    expect(FakeEventSource.last!.url).toBe('/api/v1/events');
  });

  it('hands a conversation back to the bot', async () => {
    let handoffs = [
      {
        id: 'c-1',
        customerName: 'Bia',
        customerPhone: '5516990000002',
        handoffReason: 'CUSTOMER_REQUEST',
        handoffAt: '2026-10-28T23:00:00Z',
        pausedUntil: '2026-10-29T00:00:00Z',
        lastMessage: 'Quero falar com um atendente',
      },
    ];
    const calls = fakeApi({
      'GET /api/v1/auth/me': () => ME,
      'GET /api/v1/orders?scope=open': () => [],
      'GET /api/v1/conversations/handoffs': () => handoffs,
      'POST /api/v1/conversations/c-1/resume': () => {
        handoffs = [];
        return undefined;
      },
    });
    render(<App />);

    const list = await screen.findByRole('region', { name: 'Atendimentos com a equipe' });
    expect(await within(list).findByText('Bia')).toBeInTheDocument();
    expect(list).toHaveTextContent('Cliente pediu atendente');
    await userEvent.click(within(list).getByRole('button', { name: 'Devolver ao bot' }));

    expect(await within(list).findByText('Nenhuma conversa com a equipe agora.')).toBeInTheDocument();
    expect(calls.some((call) => call.method === 'POST' && call.path === '/api/v1/conversations/c-1/resume')).toBe(true);
  });
});
