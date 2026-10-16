import { expect, test } from "@playwright/test";

for (const mode of ["light", "dark"] as const) {
  test(`command palette opens from a disabled draft action in ${mode} @responsive`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: mode, reducedMotion: "reduce" });
    await page.goto("components/entity-settings-dialog");
    const draft = page.getByRole("region", {
      name: "Draft-only settings",
      exact: true,
    });
    const name = draft.getByRole("textbox", { name: "Name", exact: true });
    await name.fill("Edited local draft");
    const save = draft.getByRole("button", { name: "Save", exact: true });
    await expect(save).toHaveAttribute("aria-disabled", "true");
    await save.focus();
    await save.press("Enter");
    await save.press("Space");
    await expect(save).not.toHaveAttribute("aria-busy", "true");
    await save.press("Control+k");
    const palette = page.getByRole("dialog", {
      name: "Command palette",
      exact: true,
    });
    await expect(palette.getByRole("combobox")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(palette).toHaveCount(0);
    await expect(name).toHaveValue("Edited local draft");
    await expect(save).toHaveAttribute("aria-disabled", "true");
  });
}
