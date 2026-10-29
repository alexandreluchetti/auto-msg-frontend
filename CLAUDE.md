# auto-msg-frontend — Instruções para Claude

Painel da plataforma auto-msg (React 19 + Vite + TypeScript, D-010): pedidos e, na trilha H
(D-012/D-013, ADR-011 do backend), persona, ritmo humano, simulador e conversas. O backend e as
decisões do produto ficam em `../auto-msg-backend` (`docs/decisions.md`, `docs/adr/`,
`docs/ROADMAP.md`); o contrato da API é `../auto-msg-backend/docs/api/openapi.yaml`. Visão e
estrutura: [`README.md`](README.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); próximo trabalho:
[`docs/ROADMAP.md`](docs/ROADMAP.md).

## Regras de trabalho

- Só implemente o que estiver aprovado no `docs/decisions.md` do backend ou nos ADRs aceitos.
- Mudou algo da API? A mudança nasce no backend (contrato OpenAPI + testes) e depois chega aqui;
  mantenha `src/api/types.ts` igual ao contrato e `src/orders/transitions.ts` igual ao
  `OrderBoard` do backend.
- Commits somente quando o usuário pedir. Nunca commitar direto em `dev` ou `main`: branches
  `feat/`, `fix/`, `refactor/` ou `chore/` a partir da `dev`, PR para a `dev`; a `main` só recebe
  PR da `dev` ([`CONTRIBUTING.md`](CONTRIBUTING.md)).
- Antes de afirmar que algo funciona, rode `npm run typecheck && npm test && npm run build` e
  mostre o resultado real.
- Idiomas: conversa com o usuário em pt-BR; código, comentários, commits, PRs e README em inglês;
  textos da interface (rótulos, mensagens) em pt-BR.
- Versões de dependências fixas (sem `^`), publicadas há pelo menos duas semanas.

## Convenções

- Sem biblioteca de UI ou de estado: componentes de função, `useState`/`useEffect`, `fetch` em
  `src/api/client.ts` (cookie de sessão HttpOnly + cabeçalho `X-XSRF-TOKEN`), `EventSource` em
  `src/events.ts`. Nada de token no navegador.
- Valores em reais com `formatMoney`; o painel nunca recalcula totais, mostra o que o backend envia.
- Acessibilidade: regiões e cartões com `aria-label`; os testes buscam por papel e rótulo.
- Testes com Vitest + Testing Library; a API e o SSE são simulados com `fakeApi` e
  `FakeEventSource` (`src/test-support.ts`). Nunca chame o backend real nos testes.
- Atendimento humanizado: as telas de persona e ritmo editam sempre o **rascunho**; só "Publicar"
  muda o que o WhatsApp usa. O simulador nunca envia WhatsApp e cada mensagem dele tem custo de
  LLM: deixe isso visível na tela. Só o papel `admin` edita e publica configurações.
