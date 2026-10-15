import { defineConfig, devices } from "@playwright/test";

// The deployable artifact uses a project base path, unlike the development server.
// Set GLASS_UX_TEST_URL to run these same checks against the published Pages site.
const published = process.env.GLASS_UX_TEST_URL;
export default defineConfig({
  testDir: "./e2e",
  testMatch: [
    "production.spec.ts",
    "documentation-navigation.spec.ts",
    "org-switcher-remote.spec.ts",
    "entity-settings-save.spec.ts",
    "map-attribution.spec.ts",
    "slider-production.spec.ts",
  ],
  fullyParallel: true,
  workers: 2,
  timeout: 60000,
  expect: { timeout: 15000 },
  outputDir: "test-results/production",
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1920, height: 1080 },
    baseURL: published ?? "http://127.0.0.1:4221/glass-ux/",
    trace: "retain-on-failure",
  },
  webServer: published
    ? undefined
    : {
        command:
          "pnpm --filter glass-ux-docs exec vite preview --port 4221 --host 127.0.0.1 --strictPort",
        env: { GLASS_UX_BASE: "/glass-ux/" },
        url: "http://127.0.0.1:4221/glass-ux/",
        reuseExistingServer: false,
        timeout: 60000,
      },
});
