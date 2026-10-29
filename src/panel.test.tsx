import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Settings } from './api/types';
import { App } from './App';
import { ConversationsPage } from './conversations/ConversationsPage';
import { PacePage, typicalDelaySeconds } from './settings/PacePage';
import { PersonaPage, previewGreeting } from './settings/PersonaPage';
import { SimulatorPage } from './simulator/SimulatorPage';
import { FakeEventSource, fakeApi } from './test-support';

const ADMIN = { email: 'dono@cantina.test', name: 'Dono', tenantId: 't-1', role: 'ADMIN' as const };
const STAFF = { email: 'ana@cantina.test', name: 'Ana', tenantId: 't-1', role: 'STAFF' as const };

const PERSONA = { name: 'Assistente', tone: 'friendly' as const, formality: 2, emojis: 'low' as const, expressions: [], sampleReplies: [] };
const PACE = { maxBubbles: 2, typingIndicator: true, msPerChar: 40, minDelayMs: 1200, maxDelayMs: 6000, groupingSeconds: 4 };

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    published: { business: { name: 'Cantina' } },
    draft: null,
    effective: { business: { name: 'Cantina' }, persona: PERSONA, humanization: PACE, handoff: { pauseMinutes: 240 } },
    defaults: {},
    schema: {},
    versions: [{ version: 1, status: 'PUBLISHED', createdAt: '2026-10-28T12:00:00Z', publishedAt: '2026-10-28T12:00:00Z' }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeEventSource);
  document.cookie = 'XSRF-TOKEN=token-123';
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  window.location.hash = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('navigation', () => {
  it('shows the assistant screens to admins only', async () => {
    fakeApi({
      'GET /api/v1/auth/me': () => STAFF,
      'GET /api/v1/orders?scope=open': () => [],
      'GET /api/v1/conversations/handoffs': () => [],
    });
    render(<App />);

    const menu = await screen.findByRole('navigation', { name: 'Menu' });
    expect(within(menu).getByRole('link', { name: 'Pedidos' })).toHaveAttribute('aria-current', 'page');
    expect(within(menu).getByRole('link', { name: 'Conversas' })).toBeInTheDocument();
    expect(within(menu).queryByRole('link', { name: 'Assistente' })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('link', { name: 'Simulador' })).not.toBeInTheDocument();
  });

  it('opens a page from the menu', async () => {
    fakeApi({
      'GET /api/v1/auth/me': () => ADMIN,
      'GET /api/v1/orders?scope=open': () => [],
      'GET /api/v1/conversations/handoffs': () => [],
      'GET /api/v1/settings': () => settings(),
    });
    render(<App />);

    await userEvent.click(await screen.findByRole('link', { name: 'Assistente' }));

    expect(await screen.findByRole('heading', { name: 'Assistente' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/assistente');
  });
});

describe('persona', () => {
  it('previews the greeting and saves the persona into the draft only', async () => {
    const calls = fakeApi({
      'GET /api/v1/settings': () => settings(),
      'PUT /api/v1/settings/draft': () => ({ version: 2 }),
    });
    render(<PersonaPage />);

    const name = await screen.findByLabelText('Nome');
    await userEvent.clear(name);
    await userEvent.type(name, 'Bia');
    await userEvent.selectOptions(screen.getByLabelText('Tom'), 'casual');
    await userEvent.type(screen.getByLabelText('Expressões típicas (uma por linha)'), 'Opa!{enter}Show!');

    expect(within(screen.getByRole('complementary', { name: 'Prévia' })).getByText(/Opa! Aqui é Bia, do Cantina/))
      .toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Rascunho salvo');
    const put = calls.find((call) => call.method === 'PUT')!;
    expect(put.body).toEqual({
      business: { name: 'Cantina' },
      persona: { ...PERSONA, name: 'Bia', tone: 'casual', expressions: ['Opa!', 'Show!'] },
    });
    expect(put.headers['X-XSRF-TOKEN']).toBe('token-123');
    expect(calls.some((call) => call.path === '/api/v1/settings/publish')).toBe(false);
  });

  it('uses the greeting the business wrote', () => {
    expect(previewGreeting({ ...PERSONA, greeting: 'Fala, chefe!' }, 'Cantina')).toBe('Fala, chefe!');
    expect(previewGreeting({ ...PERSONA, tone: 'formal' }, 'Cantina')).toBe(
      'Olá! Aqui é Assistente, do Cantina. Como posso ajudar?',
    );
  });
});

describe('pace and publishing', () => {
  it('saves the pace and the handoff pause, then publishes the draft', async () => {
    let draft = false;
    const calls = fakeApi({
      'GET /api/v1/settings': () => settings(draft ? { draft: { business: { name: 'Cantina' } } } : {}),
      'PUT /api/v1/settings/draft': () => {
        draft = true;
        return { version: 2 };
      },
      'POST /api/v1/settings/publish': () => {
        draft = false;
        return { version: 2 };
      },
    });
    render(<PacePage />);

    expect(await screen.findByRole('button', { name: 'Publicar' })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText('Mensagens por resposta'), '1');
    const pause = screen.getByLabelText(/o assistente volta sozinho/);
    await userEvent.clear(pause);
    await userEvent.type(pause, '2');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled());
    expect(screen.getByText('Rascunho com mudanças não publicadas')).toBeInTheDocument();
    const put = calls.find((call) => call.method === 'PUT')!;
    expect(put.body).toMatchObject({ humanization: { ...PACE, maxBubbles: 1 }, handoff: { pauseMinutes: 120 } });

    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Publicado!');
    expect(window.confirm).toHaveBeenCalled();
    expect(await screen.findByText('Igual ao publicado')).toBeInTheDocument();
  });

  it('estimates a typical answer delay', () => {
    expect(typicalDelaySeconds(PACE)).toBe(3.2);
    expect(typicalDelaySeconds({ ...PACE, msPerChar: 0 })).toBe(1.2);
  });
});

describe('simulator', () => {
  it('plays the answer back with its bubbles and taps a button', async () => {
    const calls = fakeApi({
      'GET /api/v1/simulator/messages': () => [],
      'POST /api/v1/simulator/messages': (body) =>
        (body as { replyId?: string }).replyId
          ? { bubbles: [{ text: 'Anotado!', atMs: 1500, choices: [], asButtons: false }], typingAtMs: [0], outcome: 'ANSWERED', toolsCalled: [] }
          : {
              bubbles: [
                { text: 'Oi! Aqui é a Bia 😊', atMs: 1500, choices: [], asButtons: false },
                { text: 'Qual tamanho?', atMs: 3000, choices: [{ id: 'option:1', title: 'Grande' }, { id: 'option:2', title: 'Média' }], asButtons: true },
              ],
              typingAtMs: [0, 2000],
              outcome: 'ANSWERED',
              toolsCalled: ['search_menu'],
            },
    });
    render(<SimulatorPage speed={0} />);

    expect(screen.getByText(/nenhum pedido é criado, mas cada mensagem usa o modelo de IA e tem custo/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Mensagem do cliente'), 'Oi, quero uma pizza');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    const chat = screen.getByLabelText('Conversa simulada');
    expect(await within(chat).findByText('Qual tamanho?')).toBeInTheDocument();
    expect(within(chat).getByText('Oi! Aqui é a Bia 😊')).toBeInTheDocument();
    await userEvent.click(within(chat).getByRole('button', { name: 'Grande' }));

    expect(await within(chat).findByText('Anotado!')).toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'POST').map((call) => call.body)).toEqual([
      { text: 'Oi, quero uma pizza' },
      { text: 'Grande', replyId: 'option:1' },
    ]);
  });

  it('starts over', async () => {
    const calls = fakeApi({
      'GET /api/v1/simulator/messages': () => [{ author: 'CUSTOMER', text: 'Oi', sentAt: '2026-10-29T12:00:00Z' }],
      'DELETE /api/v1/simulator/messages': () => undefined,
    });
    render(<SimulatorPage speed={0} />);
    expect(await screen.findByText('Oi')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Recomeçar conversa' }));

    await waitFor(() => expect(screen.queryByText('Oi')).not.toBeInTheDocument());
    expect(calls.some((call) => call.method === 'DELETE')).toBe(true);
  });
});

describe('conversations', () => {
  const summary = {
    id: 'c-1',
    customerName: 'Ana Souza',
    customerPhone: '5516990000001',
    state: 'BOT' as const,
    handoffReason: null,
    pausedUntil: null,
    lastMessage: 'Quero uma pizza',
    lastAuthor: 'CUSTOMER' as const,
    lastMessageAt: '2026-10-29T12:00:00Z',
  };

  it('shows the messages and the order in progress and takes the conversation over', async () => {
    let state: 'BOT' | 'HUMAN' = 'BOT';
    const calls = fakeApi({
      'GET /api/v1/conversations': () => [{ ...summary, state }],
      'GET /api/v1/conversations?state=HUMAN': () => (state === 'HUMAN' ? [{ ...summary, state }] : []),
      'GET /api/v1/conversations/c-1': () => ({
        conversation: { ...summary, state, handoffReason: state === 'HUMAN' ? 'STAFF_TAKEOVER' : null },
        messages: [
          { direction: 'IN', author: 'CUSTOMER', text: 'Quero uma pizza', sentAt: '2026-10-29T12:00:00Z' },
          { direction: 'OUT', author: 'BOT', text: 'Qual sabor?', sentAt: '2026-10-29T12:00:05Z' },
        ],
        state: { cart: { lines: [{ code: 'P01', quantity: 1, options: ['Grande'], notes: null }], fulfillment: 'pickup' } },
      }),
      'POST /api/v1/conversations/c-1/takeover': () => {
        state = 'HUMAN';
        return undefined;
      },
      'POST /api/v1/conversations/c-1/resume': () => {
        state = 'BOT';
        return undefined;
      },
    });
    render(<ConversationsPage />);

    await userEvent.click(await screen.findByRole('button', { name: /Ana Souza/ }));
    const conversation = await screen.findByRole('article', { name: 'Conversa com Ana Souza' });
    expect(within(conversation).getByText('Qual sabor?')).toBeInTheDocument();
    expect(within(conversation).getByRole('region', { name: 'Pedido em andamento' })).toHaveTextContent('1x P01 (Grande)');

    await userEvent.click(within(conversation).getByRole('button', { name: 'Assumir conversa' }));

    expect(await within(conversation).findByRole('button', { name: 'Devolver ao bot' })).toBeInTheDocument();
    expect(within(conversation).getByText(/A equipe assumiu pelo painel/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Só com a equipe'));
    await waitFor(() => expect(calls.some((call) => call.path === '/api/v1/conversations?state=HUMAN')).toBe(true));

    await userEvent.click(within(conversation).getByRole('button', { name: 'Devolver ao bot' }));
    expect(await within(conversation).findByRole('button', { name: 'Assumir conversa' })).toBeInTheDocument();
  });
});
