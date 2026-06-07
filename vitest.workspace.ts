import { defineWorkspace } from "vitest/config";

// Two projects: DOM-flavored client unit tests and Node-flavored
// server/shared unit tests. Both resolve from the repo root so the client's
// Vite/PWA config is not pulled into the test runtime.
export default defineWorkspace([
  {
    test: {
      name: "client",
      environment: "jsdom",
      include: ["client/src/**/*.test.ts"],
    },
  },
  {
    test: {
      name: "node",
      environment: "node",
      include: ["server/src/**/*.test.ts", "shared/src/**/*.test.ts"],
    },
  },
]);
