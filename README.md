# auto-msg-frontend

Orders panel of the auto-msg WhatsApp customer-service platform: restaurant staff sign in, see
orders arrive live with a sound alert, move them through their stages (the customer is notified on
WhatsApp) and hand conversations back to the bot. The backend lives in
[`auto-msg-backend`](https://github.com/alexandreluchetti/auto-msg-backend); its API contract is
[`docs/api/openapi.yaml`](https://github.com/alexandreluchetti/auto-msg-backend/blob/dev/docs/api/openapi.yaml).

## Stack

React 19 + Vite + TypeScript (D-010), tested with Vitest and Testing Library. No UI library, no
state library: `fetch` for the REST API, `EventSource` for live events (SSE).

## How it talks to the backend

- **Same origin.** The panel is served from the same origin as `/api`: Vite proxies `/api` to the
  backend in development; Caddy serves the build and proxies `/api` in production.
- **Session.** Signing in (`POST /api/v1/auth/login`) sets the HttpOnly cookie
  `CONVERSA_SESSION`; the panel never sees a token.
- **CSRF.** Before signing in the panel calls `GET /api/v1/auth/csrf`; every `POST` repeats the
  `XSRF-TOKEN` cookie in the `X-XSRF-TOKEN` header (`src/api/client.ts`).
- **Live.** `GET /api/v1/events` sends `order.created`, `order.updated`, `conversation.handoff`
  and `conversation.resumed`; the board refetches what changed and, for new orders, plays a chime
  (after staff turn the sound on, as browsers require).

## Development

```bash
npm ci
npm run dev        # http://localhost:5173, proxies /api to http://localhost:8081
npm test           # unit and component tests
npm run build      # type check + production build in dist/
```

Run the backend with a panel user (`BOOTSTRAP_STAFF_EMAIL` / `BOOTSTRAP_STAFF_PASSWORD`, see the
backend README). Point the proxy elsewhere with `BACKEND_URL=http://host:port npm run dev`.

## Layout

| Path | What |
|---|---|
| `src/api/` | Contract types and the API client (session cookie, CSRF header) |
| `src/App.tsx` | Sign-in check, then the board |
| `src/LoginPage.tsx` | E-mail and password |
| `src/Board.tsx` | Columns by stage, live events, sound, last 24 hours |
| `src/OrderCard.tsx` | One order: items, total, address, payment, next moves |
| `src/HandoffList.tsx` | Conversations staff are handling; "Devolver ao bot" |
| `src/orders/transitions.ts` | Moves allowed from each status (mirrors the backend) |
| `src/events.ts` | SSE subscription |
| `src/sound.ts` | New-order chime (Web Audio, no file) |

## Branches

Same flow as the backend ([`CONTRIBUTING.md`](CONTRIBUTING.md)): work on `feat/`, `fix/`,
`refactor/` or `chore/` branches from `dev`, pull requests into `dev`, and `main` only receives
pull requests from `dev`.

## Production image

`Dockerfile` builds the panel and packs it in Caddy with [`Caddyfile`](Caddyfile): Caddy gets the
TLS certificate for `DOMAIN`, serves the panel and proxies `/api`, `/webhooks` and
`/actuator/health` to `APP_UPSTREAM` (SSE unbuffered). The backend's
`deploy/docker-compose.prod.yml` builds it from this repository's `main` branch (see the backend's
`docs/DEPLOY.md`).
