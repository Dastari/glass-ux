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

test("useAnnounce keeps one region, speaks inside a modal dialog and the full-screen element, and says a repeat again", async ({ page }) => {
  const regions = page.locator("[data-fa-announcer]");
  await expect(regions).toHaveCount(1);
  await expect(regions.first()).toHaveAttribute("aria-live", "polite");
  // Repeats: the text changes each time (a trailing no-break space), so it is spoken again.
  await page.getByRole("button", { name: "Announce “Draft saved”" }).click();
  await expect(regions.first()).toHaveText(/^Draft saved/, { timeout: 3000 });
  const first = await regions.first().evaluate((node) => node.textContent);
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Announce “Draft saved”" }).click();
  await expect.poll(() => regions.first().evaluate((node) => node.textContent), { timeout: 3000 }).not.toBe(first);
  await expect(regions.first()).toHaveText(/^Draft saved/);
  // A burst of counts under one key is spoken once, with the last.
  await page.getByRole("button", { name: "Burst of three counts" }).click();
  await expect(regions.first()).toHaveText("1 result", { timeout: 3000 });

  // A modal dialog hides the page behind it: the message goes to a region inside the dialog.
  await page.getByRole("button", { name: "Open a modal dialog" }).click();
  const dialog = page.getByRole("dialog", { name: "Announce from a dialog" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Announce “Draft saved”" }).click();
  const inside = dialog.locator("[data-fa-announcer]");
  await expect(inside).toHaveText(/^Draft saved/, { timeout: 3000 });
  const hiddenAbove = await inside.evaluate((node) => Boolean(node.closest("[aria-hidden='true'], [inert]")));
  expect(hiddenAbove).toBe(false);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("useAnnounce speaks inside the full-screen element", async ({ page }) => {
  const frame = page.getByTestId("announce-frame");
  await page.getByRole("button", { name: "Full screen" }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.getAttribute("data-testid"))).toBe("announce-frame");
  await frame.getByRole("button", { name: "Announce “Draft saved”" }).click();
  await expect(frame.locator("[data-fa-announcer]")).toHaveText(/^Draft saved/, { timeout: 3000 });
  await page.evaluate(() => document.exitFullscreen());
});
