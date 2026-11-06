import { expect, test } from "@playwright/test";

/** AlertDialog's refusal: onConfirm resolving to false leaves the dialog open at rest, with the field saying why. */
const PRESETS = [
  { name: "default", density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1, mode: "light" },
  { name: "dense large", density: "compact", uiScale: 1.25, radiusScale: 0, borderWidth: 2, mode: "dark" },
] as const;

for (const preset of PRESETS) {
  test(`a refused confirm moves nothing and shows no toast: ${preset.name} @responsive`, async ({ page }) => {
    await page.addInitScript((settings) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(settings)), {
      ...preset,
      motion: "reduced",
    });
    await page.goto("/components/alert-dialog");
    await page.getByRole("button", { name: "Delete workspace" }).click();
    const dialog = page.getByRole("alertdialog");
    const confirm = dialog.getByRole("button", { name: "Delete workspace" });
    const field = dialog.getByRole("textbox", { name: "Workspace name" });
    await expect(field).toBeVisible();
    // The dialog settles before anything is measured.
    await page.waitForTimeout(100);
    const before = await confirm.boundingBox();

    await confirm.click();
    await expect(dialog.getByText("Enter Orbit Workspace to confirm")).toBeVisible();
    await expect(confirm).toHaveAttribute("data-status", "idle");
    await expect(page.getByRole("status").filter({ hasText: "failed" })).toHaveCount(0);
    await expect(page.locator(".fa-toast")).toHaveCount(0);
    await expect(field).toHaveAttribute("aria-invalid", "true");
    // The message line is reserved, so the confirm stays under the pointer (R9.1).
    expect(await confirm.boundingBox()).toEqual(before);

    await field.fill("Orbit Workspace");
    await expect(dialog.getByText("Enter Orbit Workspace to confirm")).toHaveCount(0);
    await confirm.click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  });
}
