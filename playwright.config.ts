import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testIgnore: "production.spec.ts",
  fullyParallel: true,
  workers: 2,
  timeout: 45000,
  expect: { timeout: 15000 },
  outputDir: "test-results/development",
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4220", trace: "retain-on-failure" },
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
    command: "pnpm --filter glass-ux-docs dev",
    url: "http://127.0.0.1:4220",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
