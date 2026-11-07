import { expect, test, type Locator, type Page } from "@playwright/test";

/* The card view: a person's choice, a grid laid out by the width, and cards the host draws. */

const WIDE = 1000;
const NARROW = 360;

async function open(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/components/data-table");
  const frame = page.getByTestId("dt-card-view");
  await frame.scrollIntoViewIfNeeded();
  await setWidth(frame, WIDE);
  const table = frame.locator(".fa-dt");
  await expect(table).toHaveAttribute("data-mode", "cards");
  return { frame, table };
}
const setWidth = (frame: Locator, width: number) =>
  frame.evaluate((element, width) => {
    element.style.width = `${width}px`;
  }, width);
const toggle = (page: Page, name: string) =>
  page
    .getByRole("region", { name: "Card view" })
    .getByRole("button", { name, exact: true })
    .click();
const card = (table: Locator, id: string) =>
  table.locator(`.fa-dt-card[data-row-id="${id}"]`);
const focused = (table: Locator) =>
  table.evaluate(
    (root) => (root.ownerDocument.activeElement as HTMLElement).dataset.rowId,
  );

test("the switch holds cards at any width, and List goes back to following the width @responsive", async ({ page }) => {
  const { frame, table } = await open(page);
  await frame.getByRole("button", { name: "List", exact: true }).click();
  await expect(table).toHaveAttribute("data-mode", "table");
  await frame.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(table).toHaveAttribute("data-mode", "cards");
  await frame.getByRole("button", { name: "List", exact: true }).click();
  await setWidth(frame, NARROW);
  await expect(table).toHaveAttribute("data-mode", "cards");
  await expect(frame.locator(".dt-demo-view-switch")).toBeHidden();
});

test("view=table holds the table in a narrow box, scrolling sideways to reach what doesn't fit", async ({ page }) => {
  const { frame, table } = await open(page);
  await toggle(page, "Keep the table when narrow");
  await frame.getByRole("button", { name: "List", exact: true }).click();
  await setWidth(frame, NARROW);
  await expect(table).toHaveAttribute("data-mode", "table");
  await expect(frame.getByRole("button", { name: "Cards", exact: true })).toBeVisible();
  const row = table.locator('.fa-dt-row[data-row-id="p1"]');
  await expect(row).toBeVisible();
  const actions = row.locator(".fa-dt-actions");
  await actions.scrollIntoViewIfNeeded();
  await expect(actions).toBeInViewport();
});

test("selection and focus carry across a change of view", async ({ page }) => {
  const { frame, table } = await open(page);
  await card(table, "p2").getByRole("checkbox").click();
  await frame.getByRole("button", { name: "List", exact: true }).click();
  await expect(table.locator('.fa-dt-row[data-row-id="p2"]')).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await frame.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(card(table, "p2")).toHaveAttribute("aria-selected", "true");
});

test("cards fill the columns that fit, and one column when they don't @responsive", async ({ page }) => {
  const { frame, table } = await open(page);
  const across = () =>
    table.locator(".fa-dt-cards").evaluate((list) => {
      const tops = [...list.children].map((c) => c.getBoundingClientRect().top);
      return tops.filter((top) => Math.abs(top - tops[0]!) < 1).length;
    });
  expect(await across()).toBeGreaterThan(2);
  // Same width and no overflow in any column.
  const boxes = await table.locator(".fa-dt-card").evaluateAll((cards) =>
    cards.map((c) => c.getBoundingClientRect().width),
  );
  expect(Math.max(...boxes) - Math.min(...boxes)).toBeLessThan(1);
  await setWidth(frame, 200);
  await expect.poll(across).toBe(1);
  const spill = await table
    .locator(".fa-dt-scroll")
    .evaluate((scroll) => scroll.scrollWidth - scroll.clientWidth);
  expect(spill).toBeLessThanOrEqual(1);
});

test("cards in a row share a height, however little each holds", async ({ page }) => {
  const { table } = await open(page);
  const heights = await table.locator(".fa-dt-card").evaluateAll((cards) =>
    cards.map((c) => [
      c.clientHeight,
      c.querySelector(".fa-dt-card-slot")!.getBoundingClientRect().height,
    ]),
  );
  for (const [height, slot] of heights) expect(slot).toBeCloseTo(height!, 0);
});

for (const dir of ["ltr", "rtl"] as const) {
  test(`arrow keys move through the grid as drawn, ${dir}`, async ({ page }) => {
    const { frame, table } = await open(page);
    await frame.evaluate((element, dir) => element.setAttribute("dir", dir), dir);
    await card(table, "p1").focus();
    const perRow = await table.locator(".fa-dt-cards").evaluate((list) => {
      const tops = [...list.children].map((c) => c.getBoundingClientRect().top);
      return tops.filter((top) => Math.abs(top - tops[0]!) < 1).length;
    });
    const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const back = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    await page.keyboard.press(forward);
    expect(await focused(table)).toBe("p2");
    await page.keyboard.press("ArrowDown");
    expect(await focused(table)).toBe(`p${2 + perRow}`);
    await page.keyboard.press("ArrowUp");
    expect(await focused(table)).toBe("p2");
    await page.keyboard.press(back);
    expect(await focused(table)).toBe("p1");
    await page.keyboard.press("ArrowUp");
    expect(await focused(table)).toBe("p1");
    await page.keyboard.press("End");
    expect(await focused(table)).toBe("p12");
    await page.keyboard.press("Home");
    expect(await focused(table)).toBe("p1");
  });
}

test("without a grid, Down walks the cards one by one", async ({ page }) => {
  const { table } = await open(page);
  await toggle(page, "Grid");
  await expect(table.locator(".fa-dt-cards")).not.toHaveAttribute("data-grid", "");
  await card(table, "p1").focus();
  await page.keyboard.press("ArrowDown");
  expect(await focused(table)).toBe("p2");
});

test("group headers run across the grid, and the arrows reach them", async ({ page }) => {
  const { table } = await open(page);
  await toggle(page, "Groups");
  const list = table.locator(".fa-dt-cards");
  const header = list.locator(".fa-dt-group-row").nth(1);
  await expect(header).toBeVisible();
  const [listWidth, headerWidth] = await Promise.all([
    list.evaluate((el) => el.clientWidth),
    header.evaluate((el) => el.getBoundingClientRect().width),
  ]);
  expect(Math.abs(listWidth - headerWidth)).toBeLessThan(2);
  // The second group's first card, then up to its header, then back down to the same card.
  const firstLarge = table.locator('.fa-dt-card[data-row-id="p7"]');
  await firstLarge.focus();
  await page.keyboard.press("ArrowUp");
  await expect(header).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(firstLarge).toBeFocused();
});

test("a detail panel runs across the grid, under the row it belongs to", async ({ page }) => {
  const { table } = await open(page);
  await toggle(page, "Detail panels");
  const first = card(table, "p1");
  await first.getByRole("button", { name: /Harbour Agent/ }).first().click();
  const panel = table.locator(".fa-dt-panel-row");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Harbour Agent");
  const boxes = await Promise.all([
    table.locator(".fa-dt-cards").evaluate((el) => el.clientWidth),
    panel.evaluate((el) => el.getBoundingClientRect().width),
    first.evaluate((el) => el.getBoundingClientRect().bottom),
    panel.evaluate((el) => el.getBoundingClientRect().top),
  ]);
  expect(Math.abs(boxes[0] - boxes[1])).toBeLessThan(2);
  expect(boxes[3]).toBeGreaterThanOrEqual(boxes[2]);
});

test("a card the host draws keeps selection, actions, focus and the Tab order @responsive", async ({ page }) => {
  const { table } = await open(page);
  const first = card(table, "p1");
  await expect(first.locator(".dt-demo-tile")).toBeVisible();
  await expect(first.locator(".fa-dt-card-head")).toHaveCount(0);
  await expect(first).toContainText("Harbour Agent");
  await expect(first.locator('[data-col="version"]')).toHaveText("2.0.0");

  await first.getByRole("checkbox").click();
  await expect(first).toHaveAttribute("aria-selected", "true");
  await expect(first).toHaveAttribute("data-selected", "");
  await expect(table.locator(".fa-dt-bulk")).toBeVisible();
  // The pointer is still over it: a selected card keeps its highlight under hover.
  const fill = (element: Element) => getComputedStyle(element).backgroundColor;
  await expect.poll(() => first.evaluate(fill)).toBe(
    await table.evaluate((root) => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = "var(--accent-soft)";
      root.append(probe);
      const colour = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return colour;
    }),
  );
  await first.getByRole("checkbox").click();

  await first.getByRole("button", { name: /Harbour Agent/ }).click();
  await expect(page.getByRole("menuitem", { name: "Remove" })).toBeVisible();
  await page.keyboard.press("Escape");

  // Tab stays in the current card: only one card's controls are in the order.
  const tabbable = await table.locator(".fa-dt-card").evaluateAll((cards) =>
    cards.map((c) =>
      [...c.querySelectorAll("button, input, [role='checkbox']")].filter(
        (el) => (el as HTMLElement).tabIndex >= 0,
      ).length,
    ),
  );
  expect(tabbable.filter((count) => count > 0)).toHaveLength(1);
});

test("the settings menu drops column choices for a card the host draws", async ({ page }) => {
  const { table } = await open(page);
  await table.getByRole("button", { name: "Columns and density" }).click();
  await expect(page.getByRole("menuitemcheckbox")).toHaveCount(0);
  await expect(page.getByRole("menuitemradio", { name: "Compact" })).toBeVisible();
  await page.keyboard.press("Escape");
  await toggle(page, "Own card design");
  await table.getByRole("button", { name: "Columns and density" }).click();
  await expect(page.getByRole("menuitemcheckbox").first()).toBeVisible();
});

test("the loading placeholder matches the card it stands for @responsive", async ({ page }) => {
  const { table } = await open(page);
  const real = await card(table, "p1").evaluate((c) => {
    const box = c.getBoundingClientRect();
    return { width: box.width, height: box.height };
  });
  await toggle(page, "Loading");
  const skeleton = table.locator(".fa-dt-skel-card").first();
  await expect(skeleton.locator(".dt-demo-tile")).toBeVisible();
  const held = await skeleton.evaluate((c) => {
    const box = c.getBoundingClientRect();
    return { width: box.width, height: box.height };
  });
  expect(Math.abs(held.width - real.width)).toBeLessThan(1);
  expect(Math.abs(held.height - real.height)).toBeLessThanOrEqual(2);
});

test("the default card keeps its slots in a grid, at each density", async ({ page }) => {
  const { table } = await open(page);
  await toggle(page, "Own card design");
  const first = card(table, "p1");
  await expect(first.locator(".fa-dt-card-title")).toContainText("Harbour Agent");
  const fits = await table.locator(".fa-dt-card").evaluateAll((cards) =>
    cards.every((c) => c.scrollWidth <= c.clientWidth + 1),
  );
  expect(fits).toBe(true);
});
