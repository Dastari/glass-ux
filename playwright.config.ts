import { defineConfig, devices } from "@playwright/test";
// GLASS_UX_DEV_PORT points the suite at a docs server on another port (a second checkout).
const port = process.env.GLASS_UX_DEV_PORT ?? "4220";
const origin = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./e2e",
  testIgnore: "production.spec.ts",
  fullyParallel: true,
  workers: 2,
  timeout: 45000,
  expect: { timeout: 15000 },
  outputDir: "test-results/development",
  reporter: [["list"]],
  use: { baseURL: origin, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: "phone",
      use: { ...devices["iPhone 15"], browserName: "chromium" },
      grep: /@responsive/,
    },
  ],
  webServer: {
    command: `pnpm --filter glass-ux-docs exec vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: origin,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
