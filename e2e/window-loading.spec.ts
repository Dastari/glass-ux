import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

// The WindowBodySkeleton page hosts a window whose body never loads, so WindowContentHost
// keeps showing its real Suspense fallback.
test("a window body that is still loading is a named busy status and passes axe @responsive", async ({ page }) => {
  await page.goto("/components/window-body-skeleton");
  const window = page.locator("#window-body-skeleton .fa-window", { has: page.getByText("Exhibition notes") });
  const loading = window.getByRole("status", { name: "Loading window" });
  await expect(loading).toBeVisible({ timeout: 30_000 });
  await expect(loading).toHaveAttribute("aria-busy", "true");
  await expect(loading.locator(".fa-window-skeleton")).toBeVisible();
  // The skeleton keeps the body's box rather than collapsing while it loads.
  expect((await loading.boundingBox())!.height).toBeGreaterThan(100);

  const result = await new AxeBuilder({ page }).include("#window-body-skeleton .fa-window-body[aria-busy='true']").analyze();
  expect(result.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
  // aria-prohibited-attr is evaluated, not skipped, on both loading bodies.
  expect(result.passes.find((rule) => rule.id === "aria-prohibited-attr")?.nodes.length).toBeGreaterThanOrEqual(2);
});

// Window demos register their kinds at module scope. Registering during render notified
// every mounted WindowContentHost mid-render, which React reports as a setState in render.
for (const path of ["/components/window-body-skeleton", "/components/window-content-host", "/components/window-switcher"]) {
  test(`${path} renders without a cross-component update warning`, async ({ page }) => {
    const messages: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") messages.push(message.text());
    });
    await page.goto(path);
    await expect(page.getByRole("button", { name: /switch window/i }).or(page.locator(".fa-window")).first()).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState("networkidle");
    expect(messages.filter((text) => text.includes("Cannot update a component"))).toEqual([]);
  });
}
