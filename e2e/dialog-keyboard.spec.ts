import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * Every modal kind opened from the keyboard closes with one Escape and hands focus back to its
 * trigger. Keyboard opens skip the header close button (its focus-visible tooltip used to take
 * the first Escape), and a tooltip that is showing passes Escape on to its dialog.
 */

const KINDS = [
  { kind: "Dialog", path: "components/dialog/", trigger: "Nested" },
  { kind: "Dialog as a phone-style sheet", path: "components/dialog/", trigger: "As a sheet" },
  { kind: "SettingsDialog", path: "components/settings-dialog/", trigger: "Agent settings" },
  { kind: "AlertDialog", path: "components/alert-dialog/", trigger: "Restart" },
  { kind: "Sheet", path: "components/sheet/", trigger: "Right · inspector" },
] as const;

async function openByKeyboard(page: Page, trigger: Locator) {
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.locator("[role=dialog], [role=alertdialog]").last();
  await expect(dialog).toBeVisible();
  // Let the open settle, and any focus-visible tooltip pass its delay.
  await page.waitForTimeout(700);
  return dialog;
}

const openDialogs = (page: Page) => page.locator("[role=dialog][data-open], [role=alertdialog][data-open]");

for (const { kind, path, trigger: name } of KINDS) {
  test(`${kind} opened by keyboard closes with one Escape and refocuses its trigger`, async ({ page }) => {
    await page.goto(path);
    const trigger = page.getByRole("button", { name, exact: true }).first();
    const dialog = await openByKeyboard(page, trigger);
    expect(await dialog.evaluate((element) => element.contains(document.activeElement) && !document.activeElement!.closest(".fa-dialog-close"))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(openDialogs(page)).toHaveCount(0);
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

test("SettingsDialog opened by keyboard focuses the current section's tab", async ({ page }) => {
  await page.goto("components/settings-dialog/");
  const dialog = await openByKeyboard(page, page.getByRole("button", { name: "Agent settings", exact: true }).first());
  await expect(dialog.getByRole("tab", { selected: true })).toBeFocused();
});

test("Escape on the focused close button closes its tooltip and the dialog in one press", async ({ page }) => {
  await page.goto("components/settings-dialog/");
  const trigger = page.getByRole("button", { name: "Agent settings", exact: true }).first();
  const dialog = await openByKeyboard(page, trigger);
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  for (let step = 0; step < 20 && !(await close.evaluate((element) => element === document.activeElement)); step++)
    await page.keyboard.press("Shift+Tab");
  await expect(close).toBeFocused();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(openDialogs(page)).toHaveCount(0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("in nested dialogs one Escape on the inner close button closes only the inner dialog", async ({ page }) => {
  await page.goto("components/dialog/");
  const outer = await openByKeyboard(page, page.getByRole("button", { name: "Nested", exact: true }).first());
  const inner = await openByKeyboard(page, outer.getByRole("button", { name: "Change organisation…", exact: true }));
  await expect(openDialogs(page)).toHaveCount(2);
  const close = inner.getByRole("button", { name: "Close", exact: true });
  for (let step = 0; step < 20 && !(await close.evaluate((element) => element === document.activeElement)); step++)
    await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(openDialogs(page)).toHaveCount(1);
  await expect(outer.getByRole("button", { name: "Change organisation…", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(openDialogs(page)).toHaveCount(0);
});
