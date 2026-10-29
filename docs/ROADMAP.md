# Roadmap — panel

The product roadmap is the backend's `docs/ROADMAP.md`; this file lists the panel's share. Each
step lands after its backend API, with tests and its own pull request.

| Step | Delivery | Status |
|---|---|---|
| M8 | Sign-in, live orders board with sound alert, last 24 hours, conversations with staff (hand back) | ✅ |
| M9 | Production image: Caddy with TLS serving the panel and proxying the backend | ✅ |
| H9a | Side navigation; admin and staff roles | |
| H9b | Persona screen with preview (draft) | |
| H9c | Human pace and opening-hours message (draft); publish and versions | |
| H9d | Simulator: WhatsApp-like chat against the draft over SSE | |
| H9e | Conversations: list, detail (customer/bot/staff), order in progress, take over / hand back | |

Depends on backend steps H2 (persona), H3–H4 (pace), H7 (takeover) and H8 (settings and simulator
API).
