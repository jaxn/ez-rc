import { defineConfig, devices } from "@playwright/test";

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

// E2E runs against the production build served by the Node server (PWA + WS on
// one origin). http://localhost is a secure context, so mocked geolocation +
// watchPosition work without HTTPS.
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  outputDir: "./e2e/.results",
  use: {
    baseURL: BASE_URL,
    locale: "en-US",
    permissions: ["geolocation"],
    // Default: open water just outside Hamilton Creek Marina, Percy Priest Lake.
    geolocation: { latitude: 36.108, longitude: -86.627 },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: `${BASE_URL}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
