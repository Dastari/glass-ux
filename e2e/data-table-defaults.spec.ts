import { expect, test } from "@playwright/test";

for (const mode of ["light", "dark"] as const) {
  test(`application column defaults preserve details and explicit preferences in ${mode} @responsive`, async ({
    page,
  }, info) => {
    await page.addInitScript(
      (mode) =>
        localStorage.setItem(
          "glass-ux.appearance.v1",
          JSON.stringify({
            mode,
            palette: "graphite",
            density: "comfortable",
            motion: "reduced",
          }),
        ),
      mode,
    );
    await page.goto("/components/data-table");
    const example = page.getByRole("region", {
      name: "Default columns",
      exact: true,
    });
    const table = example.locator(".fa-dt");
    const cards = info.project.name === "phone";
    await expect(table).toHaveAttribute("data-mode", cards ? "cards" : "table");
    const row = table.locator('[data-row-id="s1"]');
    await expect(row).toBeVisible();
    await expect(table.locator('.fa-dt-th[data-col="installed"]')).toHaveCount(
      0,
    );
    await expect(row.locator('[data-col="sizeMb"]')).toHaveCount(0);
    await row
      .getByRole("button", { name: "Show 2 more fields for Google Chrome" })
      .click();
    await expect(row.locator('[data-col="installed"]')).toBeVisible();
    await expect(row.locator('[data-col="sizeMb"]')).toContainText("512");
    const detail = row.locator(cards ? ".fa-dt-card-details" : ".fa-dt-detail");
    const geometry = await detail.evaluate((element) => {
      const parent = element.closest(".fa-dt")!.getBoundingClientRect();
      return [...element.querySelectorAll("[data-col]")].map((field) => {
        const rect = field.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          outerLeft: parent.left,
          outerRight: parent.right,
        };
      });
    });
    for (const field of geometry) {
      expect(field.left).toBeGreaterThanOrEqual(field.outerLeft - 1);
      expect(field.right).toBeLessThanOrEqual(field.outerRight + 1);
    }
    await table.getByRole("button", { name: "Columns and density" }).click();
    for (const name of ["Installed", "Size"]) {
      const option = page.getByRole("menuitemcheckbox", { name, exact: true });
      await expect(option).toHaveAttribute("aria-checked", "false");
      await option.click();
      await expect(option).toHaveAttribute("aria-checked", "true");
    }
    await page.keyboard.press("Escape");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem(
                "glass-ux.table.gallery-default-columns.v1",
              )!,
            ).hidden,
        ),
      )
      .toEqual([]);
    await page.reload();
    await expect(table).toHaveAttribute("data-mode", cards ? "cards" : "table");
    await expect(row.locator('[data-col="sizeMb"]')).toBeVisible();
    if (!cards)
      await expect(
        table.locator('.fa-dt-th[data-col="installed"]'),
      ).toBeVisible();
    await table.getByRole("button", { name: "Columns and density" }).click();
    await page
      .getByRole("menuitem", { name: "Reset columns", exact: true })
      .click();
    await expect(row.locator('[data-col="sizeMb"]')).toHaveCount(0);
    await expect(
      row.getByRole("button", { name: "Show 2 more fields for Google Chrome" }),
    ).toBeVisible();
    // A whole five-card specimen exceeds the phone's nested scroll viewport.
    // Capture a fully visible expanded card so the image records its real bounds.
    if (cards) await row.getByRole("button", { name: "Show 2 more fields for Google Chrome" }).click();
    await (cards ? row : example).screenshot({
      path: info.outputPath(`default-columns-${mode}.png`),
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
