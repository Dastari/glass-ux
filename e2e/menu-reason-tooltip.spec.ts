import { expect, test } from "@playwright/test";

for (const uiScale of [1, 1.25]) {
  test(`a disabled menu row explains itself in a tooltip beside the menu (ui scale ${uiScale})`, async ({ page }) => {
    await page.addInitScript(
      (uiScale) =>
        localStorage.setItem(
          "glass-ux.appearance.v1",
          JSON.stringify({ uiScale, mode: "light", motion: "reduced" }),
        ),
      uiScale,
    );
    await page.goto("./components/menu");
    const trigger = page
      .locator("#examples")
      .getByRole("button", { name: "Actions for STUDIO-VM" })
      .first();
    await trigger.click();
    const menu = page.getByRole("menu", { name: "Actions for STUDIO-VM" });
    await expect(menu).toBeVisible();
    const row = menu.getByRole("menuitem", { name: /^Connect/ });
    await expect(row).toHaveAttribute("aria-disabled", "true");
    // No caption line under the row; the reason is the row's accessible description.
    await expect(page.locator(".fa-menu-reason")).toHaveCount(0);
    await expect(row).toHaveAccessibleDescription("STUDIO-VM is offline");
    const rowBox = (await row.boundingBox())!;
    const height = await menu
      .getByRole("menuitem")
      .first()
      .evaluate((element) => element.getBoundingClientRect().height);
    expect(Math.abs(rowBox.height - height)).toBeLessThan(1);

    // Pointer hover.
    await row.hover();
    // The ⋯ trigger has its own name tooltip when focus returns to it; look for the reason.
    const tooltip = page.getByRole("tooltip").filter({ hasText: "STUDIO-VM is offline" });
    await expect(tooltip).toHaveText("STUDIO-VM is offline");
    const menuBox = (await menu.boundingBox())!;
    const tipBox = (await tooltip.boundingBox())!;
    // Beside the menu, never over the row's label, and centred on the row.
    expect(tipBox.x).toBeGreaterThanOrEqual(menuBox.x + menuBox.width - 0.5);
    expect(
      Math.abs(tipBox.y + tipBox.height / 2 - (rowBox.y + rowBox.height / 2)),
    ).toBeLessThan(2);
    // Pressing a disabled row does nothing: the menu stays open.
    await row.click({ force: true });
    await expect(menu).toBeVisible();

    // Keyboard highlight.
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await page.mouse.move(1, 1);
    await expect(tooltip).toBeHidden();
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    // Arrow onto the disabled row: Base UI keeps disabled items highlightable.
    await expect(async () => {
      await page.keyboard.press("ArrowDown");
      await expect(row).toHaveAttribute("data-highlighted", "", { timeout: 200 });
    }).toPass({ timeout: 5000 });
    await expect(tooltip).toHaveText("STUDIO-VM is offline");
    // Moving on to an enabled row hides it.
    await expect(async () => {
      await page.keyboard.press("ArrowDown");
      await expect(menu.getByRole("menuitem", { name: "Power" })).toHaveAttribute("data-highlighted", "", { timeout: 200 });
    }).toPass({ timeout: 5000 });
    await expect(tooltip).toBeHidden();
    // One Escape closes the menu even while a reason tooltip shows.
    await page.keyboard.press("ArrowUp");
    await expect(tooltip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });
}
