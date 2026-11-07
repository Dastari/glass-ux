import { expect, test, type Locator, type Page } from "@playwright/test";

/* Controls on one phone line stay apart, and text beside a button keeps its words. */

const WIDTHS = [390, 360, 320];

async function boxes(controls: Locator) {
  const count = await controls.count();
  const found = [];
  for (let index = 0; index < count; index += 1) {
    const box = await controls.nth(index).boundingBox();
    if (box) found.push({ name: (await controls.nth(index).innerText()).slice(0, 20), ...box });
  }
  return found;
}

function overlaps(list: Awaited<ReturnType<typeof boxes>>) {
  const out: string[] = [];
  list.forEach((a, index) => {
    for (const b of list.slice(index + 1)) {
      const wide = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const tall = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (wide > 0.5 && tall > 0.5) out.push(`${a.name} and ${b.name}`);
    }
  });
  return out;
}

async function searchTable(page: Page) {
  const table = page.locator(".fa-dt").filter({ has: page.locator(".fa-dt-search") }).first();
  await table.scrollIntoViewIfNeeded();
  await table.locator(".fa-dt-search button").first().click();
  await page.keyboard.type("A long sample search that truncates");
  // The chip takes over once the query has settled and focus leaves the field.
  await expect(table.getByRole("searchbox")).toHaveValue(/truncates/);
  await page.waitForTimeout(500);
  await page.getByRole("heading", { level: 1 }).first().click();
  await expect(table.locator(".fa-dt-search-chip")).toBeVisible();
  return table;
}

for (const width of WIDTHS) {
  test(`an active table search stays clear of the toolbar at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/components/data-table");
    const table = await searchTable(page);
    const controls = table.locator(
      ".fa-dt-toolbar .fa-dt-search-chip, .fa-dt-toolbar .fa-dt-filters-button, .fa-dt-toolbar-end button",
    );
    // The strip folds in the frame after the chip appears, so wait for the line to settle.
    await expect.poll(async () => overlaps(await boxes(controls))).toEqual([]);
    const toolbar = await table.locator(".fa-dt-toolbar").evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(toolbar.scroll).toBeLessThanOrEqual(toolbar.client + 1);
  });

  test(`the offline status keeps its words beside Retry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/components/ai-status-strip");
    const strip = page.locator('.fa-ai-status[data-stream="offline"]').first();
    await strip.scrollIntoViewIfNeeded();
    const item = strip.locator("> .fa-ai-status-item");
    const text = await item.evaluate((node) => ({ scroll: node.scrollWidth, client: node.clientWidth }));
    expect(text.scroll).toBeLessThanOrEqual(text.client);
    expect(overlaps(await boxes(strip.locator("> .fa-ai-status-item, > .fa-ai-status-retry")))).toEqual([]);
  });
}

/* A filtered table's cards, in a width like a settings dialog on a phone: its own sort adds no button. */
for (const width of [560, 480, 430, ...WIDTHS]) {
  test(`a filtered table's cards keep every toolbar control clear and pressable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/components/data-table");
    const table = page.getByTestId("dt-card-view").locator(".fa-dt");
    await table.scrollIntoViewIfNeeded();
    await expect(table).toHaveAttribute("data-mode", "cards");
    await table.locator(".fa-dt-filters-button").click();
    await page.getByRole("menuitemcheckbox", { name: "500 MB and over" }).click();
    await page.keyboard.press("Escape");
    // The filter is on: six of the twelve packages, and the strip has settled around its chip.
    await expect(table.locator(".fa-dt-card")).toHaveCount(6);
    await page.waitForTimeout(500);
    const controls = table.locator(".fa-dt-toolbar button:visible");
    const found = await controls.evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return {
          name: button.getAttribute("aria-label") ?? button.textContent ?? "",
          x: box.x, y: box.y, width: box.width, height: box.height,
          pressable: Boolean(hit && (button === hit || button.contains(hit))),
        };
      }),
    );
    expect(overlaps(found)).toEqual([]);
    for (const control of found) expect(control.pressable, control.name).toBe(true);
    await expect(table.locator(".fa-dt-sort-menu")).toHaveCount(0);
    await expect(table.getByRole("button", { name: "Sort, columns and density" })).toBeVisible();
  });
}
