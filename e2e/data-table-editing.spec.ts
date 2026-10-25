import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/data-table");
  await page
    .getByRole("region", { name: "Editable inventory", exact: true })
    .scrollIntoViewIfNeeded();
});

test("keyboard edit, commit, cancel, validation and Tab preserve row geometry @responsive", async ({
  page,
}) => {
  const table = page.getByTestId("dt-inventory");
  const row = table.locator('[data-row-id="i1"]');
  const name = row.getByRole("group", { name: "Edit Item", exact: true });
  await expect(name).toBeVisible();
  const before = await row.boundingBox();
  const quantity = row.getByRole("group", {
    name: "Edit Quantity",
    exact: true,
  });
  const quantityBefore = await quantity.boundingBox();
  await name.focus();
  await page.keyboard.press("Enter");
  const input = row.getByRole("textbox", { name: "Edit Item" });
  await expect(input).toHaveValue("Cedar sensor");
  await input.fill("Cedar module");
  await input.press("Escape");
  await expect(name).toContainText("Cedar sensor");
  await expect(name).toBeFocused();
  await page.keyboard.press("c");
  await expect(input).toHaveValue("c");
  await input.fill("Cedar module");
  await input.press("Tab");
  await expect(name).toHaveAttribute("data-pending", "");
  const number = row.getByRole("textbox", { name: "Edit Quantity" });
  await expect(number).toBeFocused();
  await number.fill("-1");
  await number.press("Enter");
  await expect(number).toHaveAttribute("aria-invalid", "true");
  await expect(
    page
      .getByRole("tooltip")
      .filter({ hasText: "Quantity must be zero or more" }),
  ).toBeVisible();
  await expect(number).toBeFocused();
  const after = await row.boundingBox();
  expect(after!.height).toBe(before!.height);
  expect((await quantity.boundingBox())!.width).toBe(quantityBefore!.width);
  await number.fill("18");
  await number.press("Shift+Tab");
  await expect(input).toBeFocused();
  await input.press("Escape");
  await expect(quantity).toContainText("18");
  await expect(name).toContainText("Cedar module");
  expect((await row.boundingBox())!.height).toBe(before!.height);
});

test("async rejection restores the previous value and exposes the server message @responsive", async ({
  page,
}) => {
  const row = page.getByTestId("dt-inventory").locator('[data-row-id="i3"]');
  const name = row.getByRole("group", { name: "Edit Item", exact: true });
  await name.dblclick();
  const input = row.getByRole("textbox", { name: "Edit Item" });
  await input.fill("Rejected value");
  await input.press("Enter");
  await expect(name).toContainText("Rejected value");
  await expect(name).toHaveAttribute("aria-busy", "true");
  await expect(name).toHaveAttribute("data-error", "");
  await expect(name).toContainText("Locked sample");
  await name.hover();
  await expect(
    page.getByRole("tooltip").filter({ hasText: "This sample is locked" }),
  ).toBeVisible();
  await expect(
    page
      .getByTestId("dt-inventory")
      .locator('.fa-dt-announcer[aria-live="polite"]'),
  ).toContainText("the value was restored");
});

test("select, date and switch editors commit on blur and keep arrows inside the editor @responsive", async ({
  page,
}) => {
  const row = page.getByTestId("dt-inventory").locator('[data-row-id="i1"]');
  await row.getByRole("group", { name: "Edit Status", exact: true }).dblclick();
  await row.getByRole("combobox", { name: "Edit Status" }).click();
  await page.getByRole("option", { name: "Ordered", exact: true }).click();
  await page.keyboard.press("Tab");
  await expect(
    row.getByRole("group", { name: "Edit Status", exact: true }),
  ).toContainText("ordered");
  const due = row.getByRole("group", { name: "Edit Due date", exact: true });
  await due.dblclick();
  await row.getByRole("textbox", { name: "Edit Due date" }).fill("2026-12-20");
  await page.keyboard.press("Enter");
  await expect(due).toContainText("2026-12-20");
  const active = row.getByRole("group", { name: "Edit Active", exact: true });
  await active.dblclick();
  await row.getByRole("switch", { name: "Edit Active" }).click();
  await page.keyboard.press("Enter");
  await expect(active).toContainText("No");
});

test("compact cells retain their dimensions while editing @responsive", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Compact inventory", exact: true })
    .click();
  const row = page.getByTestId("dt-inventory").locator('[data-row-id="i1"]');
  const before = await row.boundingBox();
  await row
    .getByRole("group", { name: "Edit Quantity", exact: true })
    .dblclick();
  const editor = row.getByRole("textbox", { name: "Edit Quantity" });
  const box = await editor.boundingBox();
  expect((await row.boundingBox())!.height).toBe(before!.height);
  expect(box!.y).toBeGreaterThanOrEqual(before!.y);
  expect(box!.y + box!.height).toBeLessThanOrEqual(before!.y + before!.height);
  await editor.press("ArrowDown");
  await expect(editor).toBeFocused();
  await editor.press("Escape");
});

for (const mode of ["light", "dark"] as const) {
  test(`inventory editors keep insets at themed scale and line weight in ${mode} @responsive`, async ({
    page,
  }, info) => {
    await page.evaluate(
      (mode) =>
        localStorage.setItem(
          "glass-ux.appearance.v1",
          JSON.stringify({
            mode,
            palette: "graphite",
            motion: "reduced",
            uiScale: mode === "dark" ? 1.125 : 1,
            radiusScale: 0.5,
            borderWidth: 2,
          }),
        ),
      mode,
    );
    await page.reload();
    const table = page.getByTestId("dt-inventory");
    await table.scrollIntoViewIfNeeded();
    const row = table.locator('[data-row-id="i1"]');
    const before = await row.boundingBox();
    await row
      .getByRole("group", { name: "Edit Quantity", exact: true })
      .dblclick();
    const input = row.getByRole("textbox", { name: "Edit Quantity" });
    const rect = await input.boundingBox();
    expect((await row.boundingBox())!.height).toBe(before!.height);
    expect(rect!.x).toBeGreaterThanOrEqual(before!.x);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(
      before!.x + before!.width,
    );
    const geometry = await input.evaluate((element) => {
      const cell = element.closest(".fa-dt-cell, .fa-dt-card-value")!;
      const control = element.closest(".fa-control")!;
      return {
        padding: getComputedStyle(cell).paddingInlineStart,
        radius: getComputedStyle(control).borderRadius,
        line: getComputedStyle(control).getPropertyValue("--border-width"),
        rootSize: getComputedStyle(document.documentElement).fontSize,
      };
    });
    expect(Number.parseFloat(geometry.radius)).toBeGreaterThan(0);
    expect(Number.parseFloat(geometry.line)).toBe(2);
    expect(Number.parseFloat(geometry.rootSize)).toBe(
      mode === "dark" ? 18 : 16,
    );
    if (info.project.name === "desktop")
      expect(Number.parseFloat(geometry.padding)).toBeGreaterThan(0);
    await table.screenshot({ path: info.outputPath(`inventory-${mode}.png`) });
    await input.press("Escape");
  });
}

test("Tab and Shift+Tab wrap between rows @responsive", async ({ page }) => {
  const table = page.getByTestId("dt-inventory");
  const first = table.locator('[data-row-id="i1"]');
  await first
    .getByRole("group", { name: "Edit Active", exact: true })
    .dblclick();
  await page.keyboard.press("Tab");
  const next = table
    .locator('[data-row-id="i2"]')
    .getByRole("textbox", { name: "Edit Item" });
  await expect(next).toBeFocused();
  await next.press("Shift+Tab");
  await expect(
    first.getByRole("switch", { name: "Edit Active" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
});
