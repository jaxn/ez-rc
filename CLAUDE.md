# CLAUDE.md

Guidance for Claude Code working in this repo.

👉 **Read [`AGENTS.md`](./AGENTS.md) first** — it has the architecture, commands,
and conventions all agents share. This file only adds Claude-specific notes.

## Quick reference

- Install/typecheck/test/build/e2e commands: see `AGENTS.md` → Commands.
- Always run `npm run typecheck && npm test` before committing; add
  `npm run test:e2e` for UI changes.

## Session startup (Claude Code on the web)

`.claude/hooks/session-start.sh` runs `npm install` on session start (registered
in `.claude/settings.json`) so typecheck/tests/dev servers work immediately in
web sessions. It is a synchronous hook and only runs in remote sessions. E2E
browsers are not installed by the hook — run `npx playwright install chromium`
once if you need to run `npm run test:e2e`.

## Gotchas (full list in AGENTS.md)

- `verbatimModuleSyntax`: use `import type`, and `.js` extensions on relative
  imports inside `server/`.
- Add/modify wire messages in `shared/src/` before touching client/server.
- Screenshots are required in PRs that change the UI.
