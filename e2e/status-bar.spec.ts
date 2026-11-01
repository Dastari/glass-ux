import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced" })));
  await page.goto("./components/status-bar");
  await expect(page.getByTestId("status-bar-widths")).toBeVisible();
});

const shown = (page: Page, id: string) =>
  page.getByTestId(id).locator(".fa-status-bar-item:not([data-gave-way])").evaluateAll((items) => items.map((item) => item.textContent));

test("gives way in the stated order: rank 1, rank 2, then truncation, and the toned item stays", async ({ page }) => {
  await expect.poll(() => shown(page, "status-bar-full")).toContain("4,210 words");
  await expect.poll(() => shown(page, "status-bar-wide")).not.toContain("4,210 words");
  expect(await shown(page, "status-bar-wide")).toContain("Page 12 of 48");
  await expect.poll(() => shown(page, "status-bar-medium")).not.toContain("Page 12 of 48");
  expect(await shown(page, "status-bar-tiny")).toContain("Synced");
  for (const id of ["status-bar-wide", "status-bar-medium", "status-bar-narrow", "status-bar-tiny"]) {
    const bar = page.getByTestId(id).locator(".fa-status-bar");
    await expect(bar.locator('.fa-status-bar-item[data-tone="success"]')).toBeVisible();
    const overflow = await bar.evaluate((element) => {
      const edge = element.getBoundingClientRect();
      return [...element.querySelectorAll(".fa-status-bar-item:not([data-gave-way]), .fa-status-bar-more:not([data-idle])")].filter((item) => {
        const box = item.getBoundingClientRect();
        return box.width > 0 && (box.right > edge.right + 1 || box.left < edge.left - 1);
      }).length;
    });
    if (id !== "status-bar-tiny") expect(overflow, id).toBe(0);
    // Truncation stops short of nothing: the unranked value stays on screen.
    const value = (await bar.locator(".fa-status-bar-end .fa-status-bar-item").last().boundingBox())!;
    expect(value.width, id).toBeGreaterThan(20);
  }
});

test("the bar settles: no flipping and no ResizeObserver loop", async ({ page }) => {
  const errors = await page.evaluate(async () => {
    let count = 0;
    addEventListener("error", (event) => {
      if (String(event.message).includes("ResizeObserver")) count += 1;
    });
    const bars = document.querySelectorAll(".fa-status-bar");
    let flips = 0;
    const watcher = new MutationObserver((records) => (flips += records.length));
    for (const bar of bars) watcher.observe(bar, { attributes: true, attributeFilter: ["data-gave-way"], subtree: true });
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { count, flips };
  });
  expect(errors).toEqual({ count: 0, flips: 0 });
});

test("what gave way is in More, with its button still working", async ({ page }) => {
  const bar = page.getByTestId("status-bar-narrow");
  const more = bar.getByRole("button", { name: /More status/ });
  await expect(more).toBeVisible();
  await more.click();
  const popup = page.locator(".fa-status-bar-overflow");
  await expect(popup).toContainText("4,210 words");
  await expect(popup.getByRole("button", { name: "Go to page" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();
});

test("a group on its own, as in a window's status slot, gives way too", async ({ page }) => {
  const slot = page.getByTestId("status-bar-slot");
  await expect(slot.getByRole("button", { name: /More status/ })).toBeVisible();
  await expect.poll(() => shown(page, "status-bar-slot")).toEqual(["Connected"]);
});

test("a reason keeps an item focusable; a menu opens from an item", async ({ page }) => {
  const reason = page.getByRole("button", { name: "Line endings: LF" });
  await expect(reason).toHaveAttribute("aria-disabled", "true");
  await reason.focus();
  await expect(reason).toBeFocused();
  await page.getByRole("button", { name: "Spaces: 2" }).click();
  await expect(page.getByRole("menuitem", { name: "Tabs" })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("phone width: nothing widens the page, and axe passes @responsive", async ({ page }) => {
  const value = (await page.getByTestId("status-bar-full").locator(".fa-status-bar-end .fa-status-bar-item").last().boundingBox())!;
  expect(value.width).toBeGreaterThan(20);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const result = await new AxeBuilder({ page }).include('[data-testid="status-bar-widths"]').analyze();
  expect(result.violations).toEqual([]);
});
