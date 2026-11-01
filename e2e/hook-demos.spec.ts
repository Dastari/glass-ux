import { expect, test } from "@playwright/test";

/* usePanZoom and useUndoStack through their catalogue demos: gestures end in one commit. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })),
  );
  await page.goto("/foundations/hooks");
});

test("usePanZoom pans, zooms and stays in its stage @responsive", async ({ page }) => {
  const demo = page.getByTestId("pan-zoom");
  await expect(demo).toBeVisible({ timeout: 30_000 });
  const stage = demo.getByRole("application", { name: "Sample picture" });
  const camera = demo.getByTestId("pan-zoom-camera");
  await demo.getByRole("button", { name: "Zoom in" }).click();
  await expect(camera).toHaveText(/^125% /);
  await stage.focus();
  await page.keyboard.press("+");
  await expect(camera).toHaveText(/^156% /);
  const before = await camera.textContent();
  await page.keyboard.press("ArrowDown");
  await expect(camera).not.toHaveText(before!);

  await stage.scrollIntoViewIfNeeded();
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const held = await camera.textContent();
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 30, { steps: 4 });
  // No commit while the pointer is down.
  await expect(camera).toHaveText(held!);
  await page.mouse.up();
  await expect(camera).not.toHaveText(held!);

  await page.keyboard.press("0");
  await expect(camera).toHaveText(/^100% /);
});

test("useUndoStack steps back and forward", async ({ page }) => {
  const demo = page.getByTestId("undo-stack");
  await expect(demo).toBeVisible({ timeout: 30_000 });
  const value = demo.getByTestId("undo-value");
  await expect(demo.getByRole("button", { name: "Undo" })).toBeDisabled();
  await demo.getByRole("button", { name: "Move to Review" }).click();
  await demo.getByRole("button", { name: "Move to Approved" }).click();
  await expect(value).toHaveText("Approved · 2 back, 0 forward");
  await demo.getByRole("button", { name: "Undo" }).click();
  await expect(value).toHaveText("Review · 1 back, 1 forward");
  await demo.getByRole("button", { name: "Redo" }).click();
  await expect(value).toHaveText("Approved · 2 back, 0 forward");
});
