import { expect, test } from "@playwright/test";

test("rowOpen click opens a row on one click, and leaves controls, modified clicks and text selection alone", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./components/data-table");
  const examples = page.locator("#examples");
  const request = examples.getByTestId("dt-request");
  const table = examples.getByTestId("dt-main").locator(".fa-dt");
  const row = table.locator(".fa-dt-rows > .fa-dt-row[data-item='row']").first();
  await expect(row).toBeVisible();
  const cell = row.locator("[role='gridcell']").nth(2);

  // Default: a click focuses, a double-click opens.
  await expect(row).not.toHaveCSS("cursor", "pointer");
  await cell.click();
  await expect(request).not.toContainText("ran Open on");
  await cell.dblclick();
  await expect(request).toContainText("ran Open on");

  await page.reload();
  await examples.getByRole("button", { name: "Open on click" }).click();
  await expect(row).toHaveCSS("cursor", "pointer");
  await cell.click({ modifiers: ["Shift"] });
  await cell.click({ modifiers: ["ControlOrMeta"] });
  await cell.click({ modifiers: ["Alt"] });
  await cell.click({ button: "middle" });
  await row.getByRole("checkbox").first().click();
  await expect(request).not.toContainText("ran Open on");

  // A drag that selects text in the row is not a press.
  const box = (await cell.boundingBox())!;
  await page.mouse.move(box.x + 4, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  const selected = await page.evaluate(() => String(window.getSelection()));
  if (selected) await expect(request).not.toContainText("ran Open on");
  await page.evaluate(() => window.getSelection()?.removeAllRanges());

  await cell.click();
  await expect(request).toContainText("ran Open on");
});

test("rowOpen click applies to cards", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./components/data-table");
  const examples = page.locator("#examples");
  await examples.getByRole("button", { name: "Open on click" }).click();
  const frame = examples.getByTestId("dt-main");
  await frame.evaluate((element) => {
    element.style.width = "360px";
  });
  const table = frame.locator(".fa-dt");
  await expect(table).toHaveAttribute("data-mode", "cards");
  const card = table.locator(".fa-dt-card:not(.fa-dt-skel-card)").first();
  await expect(card).toHaveCSS("cursor", "pointer");
  await card.locator(".fa-dt-card-title").click();
  await expect(examples.getByTestId("dt-request")).toContainText("ran Open on");
});
