import { chromium, type FullConfig } from "@playwright/test";

// Vite compiles a page's modules on its first request. On a cold CI runner that can take longer
// than a test's own timeout, so the first tests to run failed while the rest passed. Visiting
// the heaviest pages once here leaves the dev server's module graph and dependency bundles warm.
const PAGES = ["/", "/components/account-button", "/components/data-table", "/components/app-shell", "/components/on-screen-keyboard", "/components/sidebar"];

export default async function warmUp(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) return;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const path of PAGES) {
    await page.goto(new URL(path, baseURL).href, { timeout: 180_000 });
    await page.locator(".gallery-document-sections, main").first().waitFor({ timeout: 180_000 });
  }
  await browser.close();
}
