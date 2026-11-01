import { test, expect } from "@playwright/test";

test("F6 goes round the regions in Chromium and cancels the browser's own F6", async ({ page }) => {
  await page.goto("/foundations/hooks");
  await page.evaluate(() => {
    (window as unknown as { f6: boolean[] }).f6 = [];
    window.addEventListener("keydown", (event) => {
      if (event.key === "F6") (window as unknown as { f6: boolean[] }).f6.push(event.defaultPrevented);
    });
  });
  const demo = page.getByTestId("focus-regions");
  await demo.getByRole("button", { name: "Floor plans" }).focus();
  await page.keyboard.press("F6");
  await expect(demo.getByRole("textbox", { name: "Handover notes" })).toBeFocused();
  await page.keyboard.press("F6");
  const summary = demo.getByRole("region", { name: "Summary" });
  await expect(summary).toBeFocused();
  await expect(summary).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("F6");
  await expect(demo.getByRole("button", { name: "Open a dialog" })).toBeFocused();
  await page.keyboard.press("F6");
  await expect(demo.getByRole("button", { name: "Floor plans" })).toBeFocused();
  await page.keyboard.press("Shift+F6");
  await expect(demo.getByRole("button", { name: "Open a dialog" })).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { f6: boolean[] }).f6)).toEqual([true, true, true, true, true]);
});

test("a modal dialog keeps F6 from the regions, and leaves it to the browser", async ({ page }) => {
  await page.goto("/foundations/hooks");
  const demo = page.getByTestId("focus-regions");
  await demo.getByRole("button", { name: "Open a dialog" }).click();
  const close = page.getByRole("dialog").getByRole("button", { name: "Done" });
  await expect(close).toBeVisible();
  await close.focus();
  const result = page.evaluate(
    () => new Promise<boolean>((resolve) => window.addEventListener("keydown", (event) => setTimeout(() => resolve(event.defaultPrevented)), { once: true })),
  );
  await page.waitForTimeout(50);
  await page.keyboard.press("F6");
  expect(await result).toBe(false);
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(demo.getByRole("button", { name: "Open a dialog" })).toBeFocused();
  await page.keyboard.press("F6");
  await expect(demo.getByRole("button", { name: "Floor plans" })).toBeFocused();
});

test("AppShell's regions leave text entry, skip a collapsed pane and return @responsive", async ({ page }) => {
  await page.goto("/components/app-shell");
  const shell = page.getByTestId("app-shell-regions");
  const start = shell.locator("a:visible, button:visible").first();
  await start.waitFor();
  await start.focus();
  const seen: string[] = [];
  for (let press = 0; press < 5; press++) {
    await page.keyboard.press("F6");
    seen.push(await page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      return (active.closest("[data-focus-region]") as HTMLElement | null)?.className.replace("fa-shell-slot-", "") ?? active.tagName;
    }));
  }
  expect(seen).not.toContain("BODY");
  expect(new Set(seen).size).toBeGreaterThan(1);
  await expect(shell.locator("[data-focus-region][inert]:focus-within")).toHaveCount(0);
});
