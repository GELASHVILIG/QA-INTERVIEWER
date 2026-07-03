// Playwright E2E config for QA Quest.
// Setup (once):  npm i -D @playwright/test && npx playwright install chromium
// Run:           npx playwright test
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "node tests/e2e/start-server.js",
    url: "http://127.0.0.1:3100/api/ping",
    reuseExistingServer: false,
    env: { PORT: "3100" }
  }
});
