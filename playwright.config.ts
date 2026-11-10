import { defineConfig, devices } from "@playwright/test";

const port = process.env.PORT || "3000";
const external = process.env.PW_BASE_URL;
const baseURL = external ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: external ? undefined : {
    command: "npm run start",
    url: `${baseURL}/`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { NEWS_MODE: "drill", AGENT_AUTORUN: "false" },
  },
});
