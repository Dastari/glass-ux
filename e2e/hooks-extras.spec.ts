import { expect, test } from "@playwright/test";

/*
 * useClipboard, useDebouncedValue/useDebouncedCallback, useScrollEdges and the reading-direction
 * helpers on the Hooks page, in a real browser.
 */

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })),
  );
  await page.goto("/foundations/hooks");
  await expect(page.getByTestId("clipboard-state")).toBeAttached({ timeout: 30_000 });
});

test("useClipboard copies, confirms for a moment and reserves its space", async ({ page }) => {
  const button = page.getByRole("button", { name: /Copy 10\.20\.4\.18/ });
  const before = (await button.boundingBox())!;
  await button.click();
  await expect(page.getByTestId("clipboard-state")).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("10.20.4.18");
  const during = (await button.boundingBox())!;
  expect(during.width).toBe(before.width);
  await expect(page.getByTestId("clipboard-state")).toHaveText("", { timeout: 5000 });
});

test("useClipboard falls back where the Clipboard API is missing", async ({ page }) => {
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true }));
  await page.getByRole("button", { name: /Copy 10\.20\.4\.18/ }).click();
  // A real gesture lets execCommand copy in Chromium.
  await expect(page.getByTestId("clipboard-state")).toHaveText("Copied");
});

test("the debounced value and callback wait for a pause in typing", async ({ page }) => {
  const state = page.getByTestId("debounce-state");
  await expect(state).toContainText("0 searches");
  await page.getByRole("textbox", { name: "Search" }).pressSequentially("harbour", { delay: 40 });
  await expect(state).toContainText("Query “”");
  await expect(state).toContainText("Query “harbour”", { timeout: 3000 });
  await expect(state).toContainText("1 searches");
});

test("scroll edges follow the scroller, and readingKey follows the direction", async ({ page }) => {
  const region = page.getByRole("region", { name: "Scroll edges", exact: true });
  const state = page.getByTestId("edges-state");
  await region.scrollIntoViewIfNeeded();
  await expect(state).toContainText("at the top");
  await region.evaluate((element) => element.scrollTo({ top: 60 }));
  await expect(state).toContainText("scrolled away from the top");
  await region.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(state).toContainText("ArrowLeft → ArrowLeft");
  await page.goto("/foundations/hooks?dir=rtl&lang=ar");
  await region.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(state).toContainText("ArrowLeft → ArrowRight (rtl)");
});
