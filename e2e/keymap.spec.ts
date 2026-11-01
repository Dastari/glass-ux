import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const appearance = () => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced" }));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(appearance);
  await page.goto("./components/keymap-provider");
  await expect(page.getByTestId("keymap-demo")).toBeVisible();
});

test("a chord shows its first step, runs on the second, and works from a field whose binding asks", async ({ page }) => {
  const demo = page.getByTestId("keymap-demo");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("ControlOrMeta+k");
  await expect(demo.locator("[data-pending]")).toContainText("Waiting for the next key");
  await page.keyboard.press("ControlOrMeta+s");
  await expect(demo).toContainText("Last command: Save all");
  await expect(demo.locator("[data-pending]")).toHaveCount(0);

  await page.getByRole("textbox", { name: "Note title" }).focus();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(demo.locator("[data-pending]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(demo.locator("[data-pending]")).toHaveCount(0);
  // A plain key in the field stays typing.
  await page.keyboard.type("?");
  await expect(page.getByRole("textbox", { name: "Note title" })).toHaveValue("?");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the chord in progress moves nothing and the palette's keys stay free", async ({ page }) => {
  const button = page.getByRole("button", { name: "Keyboard shortcuts" });
  const before = await button.boundingBox();
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByTestId("keymap-demo").locator("[data-pending]")).toBeVisible();
  expect(await button.boundingBox()).toEqual(before);
  await expect(page.getByRole("dialog", { name: "Command palette" })).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("the help dialog is searchable, rebinds and reports JSON; a menu shows the new keys @responsive", async ({ page }) => {
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("?");
  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("region", { name: "File" })).toBeVisible();
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(results.violations).toEqual([]);

  await dialog.getByRole("searchbox").fill("duplicate");
  await expect(dialog.locator("[data-command]")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Change the shortcut for Duplicate" }).click();
  const input = dialog.getByRole("textbox", { name: "New shortcut for Duplicate" });
  await expect(input).toBeFocused();
  await input.press("Alt+d");
  await expect(input).not.toHaveValue("");
  await page.keyboard.press("Tab");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("keymap-json")).toContainText('"note.duplicate":["alt+d"]');
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "Actions for Harbour survey" }).click();
  await expect(page.getByRole("menuitem", { name: /Duplicate/ }).locator("kbd")).toContainText("Alt");
  await page.keyboard.press("Escape");
});

test("Escape while recording leaves the dialog open and a keyboard trap never forms", async ({ page }) => {
  await page.getByRole("button", { name: "Keyboard shortcuts" }).click();
  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await dialog.getByRole("button", { name: "Change the shortcut for Save", exact: true }).click();
  const input = dialog.getByRole("textbox", { name: "New shortcut for Save" });
  await input.press("Escape");
  await expect(input).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Change the shortcut for Save", exact: true }).click();
  await input.press("Tab");
  await expect(input).not.toBeFocused();
});

test("Kbd shows a chord's steps apart @responsive", async ({ page }) => {
  const chords = page.getByTestId("kbd-chords");
  const steps = chords.locator(".fa-kbd-step");
  await expect(steps).toHaveCount(6);
  const first = (await steps.nth(0).boundingBox())!;
  const second = (await steps.nth(1).boundingBox())!;
  expect(second.x).toBeGreaterThan(first.x + first.width);
  await expect(chords.locator('[data-variant="text"]')).toHaveText(/\S \S/);
});

test("a scoped key runs only with focus inside; the menu shows it, and a rebinding, without taking it", async ({ page }) => {
  const demo = page.getByTestId("keymap-demo");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("b");
  await expect(demo).toContainText("Last command: Nothing yet");
  await page.getByTestId("keymap-canvas").focus();
  await page.keyboard.press("b");
  await expect(demo).toContainText("Last command: Brush");

  await page.getByRole("button", { name: "Keyboard shortcuts" }).click();
  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await dialog.getByRole("button", { name: "Change the shortcut for Eraser" }).click();
  await dialog.getByRole("textbox", { name: "New shortcut for Eraser" }).press("x");
  await page.keyboard.press("Tab");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Tools" }).click();
  await expect(page.getByRole("menuitem", { name: /Eraser/ }).locator("kbd")).toHaveText("X");
  await expect(page.getByRole("menuitem", { name: /Brush/ }).locator("kbd")).toHaveText("B");
  await page.keyboard.press("Escape");
});
