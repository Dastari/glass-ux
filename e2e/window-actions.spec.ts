import { expect, test } from "@playwright/test";

/*
 * Window.Action priorities: when a window's app bar runs out of room, secondary actions fold
 * into a trailing More menu; a primary action and the window controls stay inside the frame.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })),
  );
  await page.goto("/components/window-action");
  await expect(page.getByTestId("window-actions-narrow").locator(".fa-window-appbar")).toBeVisible({ timeout: 30_000 });
});

for (const [width, expected] of [
  ["wide", ["Run as", "Send keys", "Copy output", "Clear", "Restart session"]],
  ["medium", ["Restart session"]],
  ["narrow", ["Restart session"]],
] as const)
  test(`at ${width} the controls stay in the frame and the actions fold in order`, async ({ page }) => {
    const frame = page.getByTestId(`window-actions-${width}`);
    await frame.scrollIntoViewIfNeeded();
    const state = await frame.evaluate((root) => {
      const box = root.querySelector(".fa-window")!.getBoundingClientRect();
      const bar = root.querySelector(".fa-window-appbar")!;
      const controls = [...bar.querySelectorAll(".fa-window-controls button")].map((button) => button.getBoundingClientRect());
      return {
        inside: controls.length > 0 && controls.every((rect) => rect.left >= box.left - 0.5 && rect.right <= box.right + 0.5),
        shown: [...bar.querySelectorAll(".fa-window-action:not([hidden]) [aria-label]")].map((element) => element.getAttribute("aria-label")),
        more: bar.querySelector('[aria-label="More actions"]') !== null,
      };
    });
    expect(state.inside).toBe(true);
    expect(state.shown).toEqual([...expected]);
    expect(state.more).toBe(expected.length < 5);
  });

test("More lists the folded actions in bar order and runs them", async ({ page }) => {
  const frame = page.getByTestId("window-actions-medium");
  await frame.scrollIntoViewIfNeeded();
  await frame.getByRole("button", { name: "More actions" }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitemradio", { name: "Signed-in user" })).toBeVisible();
  await expect(menu.getByRole("menuitem")).toHaveText(["Send keys", "Copy output", "Clear"]);
  await menu.getByRole("menuitem", { name: "Copy output" }).click();
  await expect(page.getByText("Output copied").first()).toBeVisible();
});
