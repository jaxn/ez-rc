# GitHub Copilot instructions

This repo's shared agent guidance lives in [`AGENTS.md`](../AGENTS.md) — follow
it. Key points for Copilot:

- **Monorepo (npm workspaces):** `shared/` (wire protocol + model — change first),
  `server/` (Node + Express + `ws`), `client/` (Vite + React + MapLibre PWA),
  `e2e/` (Playwright).
- **TypeScript is strict with `verbatimModuleSyntax`:** use `import type` for
  types; in `server/` use `.js` extensions on relative imports (NodeNext).
- **Coordinates stay real lat/lng;** rotation is done by MapLibre's camera, not by
  hand. Wind direction is the heading it blows FROM and is used as the map bearing.
- **Distances are nautical** (meters under 1 km, else nm), wind speed in knots;
  helpers in `client/src/geo/math.ts`.
- Run `npm run typecheck && npm test` (and `npm run test:e2e` for UI changes)
  before proposing changes.
- **Include screenshots in PRs that change the UI.**
