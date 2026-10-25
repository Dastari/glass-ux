import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/data-table");
  await page
    .getByRole("region", { name: "Editable inventory", exact: true })
    .scrollIntoViewIfNeeded();
});

test("header menu moves persist and pinned columns remain within their group", async ({
  page,
}) => {
  const table = page.getByTestId("dt-inventory");
  const columns = table.locator(".fa-dt-th[data-col]");
  await table
    .getByRole("button", { name: "Status column options", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Move to start", exact: true })
    .click();
  await expect
    .poll(() =>
      columns.evaluateAll((elements) =>
        elements.map((el) => el.getAttribute("data-col")),
      ),
    )
    .toEqual(["name", "status", "quantity", "due", "active"]);
  await page.reload();
  await table.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      columns.evaluateAll((elements) =>
        elements.map((el) => el.getAttribute("data-col")),
      ),
    )
    .toEqual(["name", "status", "quantity", "due", "active"]);
  await table
    .getByRole("button", { name: "Item column options", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Move to end", exact: true })
    .click();
  await expect(columns.first()).toHaveAttribute("data-col", "name");
  await table
    .getByRole("button", { name: "Status column options", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Pin column", exact: true }).click();
  await table
    .getByRole("button", { name: "Status column options", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Move to start", exact: true })
    .click();
  await expect
    .poll(() =>
      columns.evaluateAll((elements) =>
        elements.map((el) => el.getAttribute("data-col")),
      ),
    )
    .toEqual(["status", "name", "quantity", "due", "active"]);
});

test("drag headers reorders within the unpinned group", async ({ page }) => {
  const table = page.getByTestId("dt-inventory");
  const from = table.getByRole("button", {
    name: "Reorder Quantity column",
    exact: true,
  });
  const target = table.locator('.fa-dt-th[data-col="due"]');
  const a = (await from.boundingBox())!;
  const b = (await target.boundingBox())!;
  const source = (await table
    .locator('.fa-dt-th[data-col="quantity"]')
    .boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    b.x + b.width / 2 - source.width / 2 + (a.x + a.width / 2 - source.x) + 4,
    b.y + b.height / 2,
    { steps: 20 },
  );
  await expect(page.locator(".fa-dnd-ghost")).toBeVisible();
  await page.mouse.up();
  await expect
    .poll(() =>
      table
        .locator(".fa-dt-th[data-col]")
        .evaluateAll((elements) =>
          elements.map((el) => el.getAttribute("data-col")),
        ),
    )
    .toEqual(["name", "status", "due", "quantity", "active"]);
});

test("RTL header moves follow visual direction and pinned cells stick to the start", async ({
  page,
}) => {
  const table = page.getByTestId("dt-inventory");
  await page
    .getByRole("button", { name: "Right to left", exact: true })
    .click();
  await table
    .getByRole("button", { name: "Status column options", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Move left", exact: true }).click();
  await expect
    .poll(() =>
      table
        .locator(".fa-dt-th[data-col]")
        .evaluateAll((elements) =>
          elements.map((el) => el.getAttribute("data-col")),
        ),
    )
    .toEqual(["name", "quantity", "due", "status", "active"]);
  const pinned = table.locator('.fa-dt-th[data-col="name"]');
  const style = await pinned.evaluate((el) => ({
    direction: getComputedStyle(el).direction,
    right: getComputedStyle(el).right,
  }));
  expect(style.direction).toBe("rtl");
  expect(style.right).not.toBe("auto");
});
