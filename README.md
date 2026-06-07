# ez-rc

Tools to make life easier for Race Committee duties.

**ez-rc** is a Progressive Web App that helps sailing race committees set a square
course. Multiple phones/tablets on different boats join the same session and see
each other's live positions, drop marks, enter wind, and read distances/bearings —
all oriented to the wind.

## Features (proof of concept)

- 📍 **Live positions** — high-accuracy device geolocation shared in real time over
  WebSockets; every boat in a session sees every other boat.
- ⛵ **Flag boat** — designate one device as the flag boat (boat end of the
  start/finish line). It's drawn with a boat icon and anchors the course.
- 🧭 **Wind-up map** — enter the wind direction (compass heading it blows **from**)
  and the map rotates so the wind comes down from the top of the screen.
- 🟡🔴🟢 **Marks** — drop **pin**, **windward**, and **leeward** marks at your
  current location.
- 📏 **Distances & bearings** — each non-flag boat shows its distance and compass
  bearing from the flag boat; when both windward and leeward marks exist, the
  course leg distance is shown.
- 🗒️ **Replayable log** — every mark drop, wind entry, flag-boat change, and
  join/leave is recorded with a server timestamp so a course can be reconstructed
  later for analysis.

## Tech stack

| Layer       | Choice                                                                         |
| ----------- | ------------------------------------------------------------------------------ |
| Client      | Vite + React + TypeScript, MapLibre GL JS (OSM raster tiles), Zustand, Turf.js |
| Server      | Node.js + Express + `ws`                                                       |
| Realtime    | WebSocket relay with simple room/session codes                                 |
| Persistence | Append-only JSONL event log per session (`data/events-<CODE>.jsonl`)           |
| PWA         | `vite-plugin-pwa` (manifest + Workbox app-shell caching)                       |

Monorepo via npm workspaces: `shared/` (wire protocol + model types), `server/`,
`client/`.

## Develop

```bash
npm install
npm run dev          # runs the WS server (:8080) and Vite dev server together
```

Open the Vite URL it prints (e.g. http://localhost:5173). The Vite dev server
proxies `/ws`, `/api`, and `/replay` to the backend, so everything is one origin.

`http://localhost` counts as a secure context, so geolocation works in dev without
HTTPS. To test on a real phone you need HTTPS — see below.

Other scripts:

```bash
npm run typecheck    # type-check all workspaces
npm test             # Vitest unit tests (client + server/shared)
npm run build        # build the client PWA into client/dist
npm start            # run the server, serving the built PWA + WS on :8080
npm run test:e2e     # Playwright e2e (builds + starts the server itself)
```

## Tests & CI

- **Unit tests** (Vitest): geospatial math, store reducers, selectors
  (`client/`), plus the session registry, event log, and protocol parsing
  (`server/`/`shared/`). Run with `npm test`.
- **End-to-end tests** (Playwright, `e2e/`): a full course-setting flow (flag
  boat → marks → course leg → wind-up rotation) with mocked geolocation, and a
  two-device WebSocket sync test. Run with `npm run test:e2e` (needs
  `npx playwright install chromium` once).
- **CI** (`.github/workflows/ci.yml`) runs typecheck, unit tests, build, and e2e
  on every push/PR, and uploads the Playwright report + screenshots as artifacts.

## Contributing / AI agents

See [`AGENTS.md`](./AGENTS.md) for architecture, conventions, and the rule that
**UI changes must include screenshots** in the PR. Agent-specific entry points:
[`CLAUDE.md`](./CLAUDE.md) and
[`.github/copilot-instructions.md`](./.github/copilot-instructions.md). A
SessionStart hook (`.claude/`) installs dependencies for Claude Code on the web.

## Testing with multiple devices

1. `npm run build && npm start` (one origin on :8080 serving the PWA + WebSocket).
2. Expose it over HTTPS so phones can use geolocation:
   ```bash
   cloudflared tunnel --url http://localhost:8080
   # or: ngrok http 8080
   ```
3. Open the HTTPS URL on each device, enter the same **session code** (the first
   device can tap **Create new session** to mint one), grant location permission,
   and designate one device as the flag boat.

> Two-tab smoke test: open the app in two browser tabs with the same code and use
> Chrome DevTools → **Sensors** to give each tab different coordinates.

## Deploy

The server is a small stateful Node process needing WebSocket support and a disk
for the JSONL logs (Fly.io / Render / Railway, or a small VPS behind Caddy for
auto-HTTPS). It serves both the static PWA (`client/dist`) and `wss://` on one
port, so a single deploy is enough.

If you host the client and server separately, point the client at the server with
`VITE_WS_URL` (see `client/.env.example`).

## Course analysis / replay

Each session's durable events are at `data/events-<CODE>.jsonl`, and
`GET /replay/<CODE>` returns them as ordered JSON. Replaying the entries in `seq`
order reconstructs the full course state at any point in time.
