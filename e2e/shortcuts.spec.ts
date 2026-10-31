import { expect, test } from "@playwright/test";

/*
 * WCAG 2.1.4: the application can switch single-character shortcuts off. The command palette
 * page registers "T" for the theme and offers the switch; modifier shortcuts are unaffected.
 */
test("single-character shortcuts run by default and stop when the application turns them off", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced" })));
  await page.goto("./components/palette-provider");
  const mode = () => page.evaluate(() => document.documentElement.dataset.mode);
  const toggle = page.getByRole("switch", { name: "Bare-key shortcuts" });
  await expect(toggle).toBeChecked();
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  expect(await mode()).toBe("light");
  await page.keyboard.press("t");
  await expect.poll(mode).toBe("dark");
  await page.keyboard.press("t");
  await expect.poll(mode).toBe("light");

  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("t");
  await page.waitForTimeout(300);
  expect(await mode()).toBe("light");

  // The palette still opens with its modifier shortcut, and no longer advertises the bare key.
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(palette).toBeVisible();
  const row = palette.getByRole("option", { name: /Switch to dark mode/ });
  await expect(row).toBeVisible();
  await expect(row.locator("kbd")).toHaveCount(0);
  await page.keyboard.press("Escape");

  await toggle.click();
  await expect(toggle).toBeChecked();
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("t");
  await expect.poll(mode).toBe("dark");
});
