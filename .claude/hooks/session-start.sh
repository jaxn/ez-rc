#!/bin/bash
set -euo pipefail

# SessionStart hook for Claude Code on the web: install Node dependencies so
# typecheck, unit tests, and the dev servers work immediately. Synchronous and
# idempotent. `npm install` (not `ci`) is used so the cached container state is
# reused across sessions.

# Only run in remote (Claude Code on the web) sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
npm install
