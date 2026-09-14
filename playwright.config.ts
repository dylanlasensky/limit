import { defineConfig } from "@playwright/test";

// Runs the real production bundle against intercepted, disposable API fixtures.
// Never point this suite at a live Base44 app or put real credentials here.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      ...(process.env.LIMIT_CHROMIUM_PATH
        ? { executablePath: process.env.LIMIT_CHROMIUM_PATH }
        : {}),
      args: ["--no-sandbox"],
    },
  },
  projects: [
    { name: "small-phone", use: { viewport: { width: 320, height: 740 } } },
    {
      name: "phone",
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: "large-phone",
      use: { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true },
    },
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_BASE44_APP_ID: "limit-browser-test",
      VITE_BASE44_APP_BASE_URL: "http://127.0.0.1:4173",
    },
  },
});
