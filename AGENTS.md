# Working on ez-rc with AI agents

This file is the shared source of truth for AI coding agents (Claude Code, GitHub
Copilot, Cursor, etc.). Tool-specific files (`CLAUDE.md`,
`.github/copilot-instructions.md`) point here.

## What this project is

**ez-rc** is a PWA that helps sailing race committees set a square course.
Multiple devices join a session over WebSockets and share live positions; one is
the **flag boat** (origin of the start/finish line), marks (pin/windward/leeward)
are dropped, wind is entered, and the map rotates so the wind comes from the top.

## Layout (npm workspaces monorepo)

| Path | Role |
|---|---|
| `shared/src/` | Wire protocol (`protocol.ts`) + domain model (`model.ts`). Imported by both client and server — **change here first** when adding a message or field. |
| `server/src/` | Node + Express + `ws`. `relay.ts` routes messages, `sessions.ts` is the in-memory room registry, `eventLog.ts` is the append-only JSONL log. |
| `client/src/` | Vite + React + TS PWA. `map/` (MapLibre), `state/` (Zustand store + selectors), `net/ws.ts`, `geo/` (geolocation + Turf math), `ui/` (screens/panels), `config.ts` (defaults). |
| `e2e/` | Playwright end-to-end specs. |

## Commands

```bash
npm install          # install everything (workspaces hoist to root)
npm run dev          # WS server (:8080) + Vite dev server together
npm run typecheck    # tsc --noEmit across shared/server/client
npm test             # Vitest unit tests (client + node projects)
npm run build        # build the client PWA into client/dist
npm start            # serve built PWA + WebSocket on :8080
npm run test:e2e     # Playwright (builds + starts the server itself)
```

Run `npm run typecheck && npm test` before committing. For UI work, also run
`npm run test:e2e`.

## Conventions that will bite you if ignored

- **TypeScript is strict with `verbatimModuleSyntax`.** Import types with
  `import type { ... }` (or inline `type`), and in **`server/`** (NodeNext
  resolution) relative imports must use a `.js` extension, e.g.
  `import { foo } from "./sessions.js"`. The client (bundler resolution) doesn't
  require the extension but it's harmless.
- **No tests emit build artifacts** — tsc is `noEmit`; Vite and `tsx` consume TS
  source directly. Don't add a TS build step.
- **Coordinates are always real WGS84 lat/lng.** Never compute screen-space
  rotation by hand — MapLibre's camera (`map.setBearing`) rotates all layers.
- **Wind direction is the heading the wind blows FROM** (sailing convention) and
  is used directly as the map bearing.
- **Distances are nautical** (meters under 1 km, else nm); wind speed in knots.
  Helpers live in `client/src/geo/math.ts`.
- **Durable vs live data:** mark/wind/flag/join-leave events are persisted to the
  JSONL log; high-frequency position pings are relayed but NOT logged.
- Default map view is Hamilton Creek Marina on Percy Priest Lake — see
  `client/src/config.ts`.

## Pull request expectations

- Keep `main` green: typecheck, unit tests, build, and e2e all pass in CI.
- **Screenshots are required for any PR with frontend/UI changes.** Add before/
  after images to the PR description. The e2e suite also captures
  `e2e/screenshots/course-set.png`, uploaded as a CI artifact you can attach.
- **This is a phone-first app: Playwright e2e and screenshots target a modern
  mobile viewport** (Pixel 7) via `MOBILE_DEVICE` in `e2e/helpers.ts`, used by
  both `playwright.config.ts` and the manually-created contexts in `sync.spec.ts`.
  Capture/verify UI at that mobile size, not a desktop window.
- Don't open a PR unless asked; push the branch and let the human decide.
