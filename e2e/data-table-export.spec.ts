import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/data-table");
  await page
    .getByRole("region", { name: "Editable inventory", exact: true })
    .scrollIntoViewIfNeeded();
});

test("downloads CSV with a BOM, loaded rows and raw values @responsive", async ({
  page,
}) => {
  const table = page.getByTestId("dt-inventory");
  await table.getByRole("button", { name: "Export", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Download CSV", exact: true })
    .click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("inventory.csv");
  const text = await readFile((await download.path())!, "utf8");
  expect(text).toContain("Cedar sensor");
  expect(text).toContain("Birch relay");
  expect(text).toContain("true\r\n");
  expect(text.charCodeAt(0)).toBe(0xfeff);
  expect(text).not.toContain("[object Object]");
});

test("selected rows export and keyboard copy use TSV; focused cells copy their text @responsive", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const table = page.getByTestId("dt-inventory");
  await table
    .getByRole("checkbox", { name: "Select Cedar sensor", exact: true })
    .click();
  await table.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Copy as table", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("Cedar sensor");
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).not.toContain("Birch relay");
  expect(text).toContain("\t");
  const cell = table
    .locator('[data-row-id="i1"]')
    .getByRole("group", { name: "Edit Item", exact: true });
  await cell.focus();
  await page.keyboard.press("ControlOrMeta+c");
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("Cedar sensor\t12");
  await table.getByRole("button", { name: /^Clear( selection)?$/ }).click();
  await cell.focus();
  await page.keyboard.press("ControlOrMeta+c");
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("Cedar sensor");
});
