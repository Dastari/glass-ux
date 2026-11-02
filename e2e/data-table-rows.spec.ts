import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const APPEARANCE = { mode: "light", palette: "graphite", density: "comfortable", motion: "reduced" };

async function open(page: Page, name: "Detail panels" | "Lazy tree", appearance: object = {}, query = "") {
  await page.addInitScript(
    (stored) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(stored)),
    { ...APPEARANCE, ...appearance },
  );
  await page.goto(`./components/data-table${query}`);
  const demo = page.getByRole("region", { name, exact: true });
  const table = demo.locator(".fa-dt");
  await table.scrollIntoViewIfNeeded();
  await expect(table.locator('[data-item="row"]').first()).toBeVisible();
  return { demo, table, scroller: table.locator(".fa-dt-scroll") };
}

const top = async (locator: Locator) => (await locator.boundingBox())!.y;
const line = (table: Locator, rowId: string) => table.locator(`[data-item="row"][data-row-id="${rowId}"]`);
const scrollBy = (scroller: Locator, delta: number) =>
  scroller.evaluate((element, by) => {
    element.scrollTop += by;
  }, delta);

/** Every line touches the next: nothing overlaps or leaves a gap once heights are measured. */
const lineGaps = (table: Locator) =>
  table.locator(".fa-dt-rows").evaluate((rows) => {
    const lines = [...rows.children].map((element) => {
      const box = element.getBoundingClientRect();
      return { index: Number((element as HTMLElement).dataset.index), top: box.top, bottom: box.bottom };
    });
    lines.sort((a, b) => a.index - b.index);
    return lines.flatMap((current, at) => {
      const next = lines[at + 1];
      return next && next.index === current.index + 1 ? [Math.abs(next.top - current.bottom)] : [];
    });
  });

test.describe("detail panels", () => {
  test("open in a fixed state, render on demand and pass axe", async ({ page }) => {
    const { table } = await open(page, "Detail panels");
    await expect(table.getByRole("grid")).toBeVisible();
    await expect(page.getByTestId("order-panel-ord-1002")).toBeVisible();
    await expect(page.getByTestId("order-panel-ord-1001")).toHaveCount(0);
    await expect(table.getByRole("button", { name: "Expand Order 1003" })).toHaveCount(0);
    await table.getByRole("button", { name: "Expand Order 1001" }).click();
    await expect(page.getByTestId("order-panel-ord-1001")).toBeVisible();
    await expect(table.getByRole("button", { name: "Collapse Order 1001" })).toHaveAttribute("aria-expanded", "true");
    const results = await new AxeBuilder({ page }).include('[data-testid="dt-panels"]').analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });

  test("the keyboard opens a panel, enters it and comes back", async ({ page }) => {
    const { table } = await open(page, "Detail panels");
    const row = line(table, "ord-1001");
    await row.locator(".fa-dt-cell").nth(2).click();
    await expect(row).toHaveAttribute("tabindex", "0");
    await row.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("order-panel-ord-1001")).toBeVisible();
    await expect(row).toBeFocused();
    await page.keyboard.press("ArrowRight");
    const panel = table.locator('[data-item="detail"][data-for-row="ord-1001"]');
    await expect(panel).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(line(table, "ord-1002")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(panel).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(row).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("order-panel-ord-1001")).toHaveCount(0);
  });

  test("expand-all above the viewport leaves the reader where they were", async ({ page }) => {
    const { table, scroller } = await open(page, "Detail panels");
    await scrollBy(scroller, 3000);
    await expect(line(table, "ord-1062")).toBeVisible();
    await page.waitForTimeout(100);
    // The first row in view: its own panel opens under it, so it alone must not move.
    const firstInView = await scroller.evaluate((element) => {
      const edge = element.getBoundingClientRect().top;
      const rows = [...element.querySelectorAll<HTMLElement>('[data-item="row"]')];
      rows.sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
      return rows.find((row) => row.getBoundingClientRect().bottom > edge)!.dataset.rowId!;
    });
    const anchor = line(table, firstInView);
    const before = await top(anchor);
    await table.getByRole("button", { name: "Expand all rows on this page" }).click();
    await expect(table.getByRole("button", { name: "Collapse all rows" })).toBeVisible();
    await expect.poll(() => top(anchor)).toBeCloseTo(before, 0);
    // Stays put once the panels around it have measured themselves.
    await page.waitForTimeout(150);
    expect(await top(anchor)).toBeCloseTo(before, 0);
    await table.getByRole("button", { name: "Collapse all rows" }).click();
    await expect(table.getByRole("button", { name: "Expand all rows on this page" })).toBeVisible();
    await expect.poll(() => top(anchor)).toBeCloseTo(before, 0);
  });

  test("scrolling up into panels not yet measured never jumps", async ({ page }) => {
    const { table, scroller } = await open(page, "Detail panels");
    await table.getByRole("button", { name: "Expand all rows on this page" }).click();
    await expect(table.getByRole("button", { name: "Collapse all rows" })).toBeVisible();
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await page.waitForTimeout(150);
    // Each step keeps a row that stays in view, and it must move by exactly the step.
    for (let step = 0; step < 8; step++) {
      const visible = table.locator('[data-item="row"]').nth(3);
      const id = await visible.getAttribute("data-row-id");
      const before = await top(line(table, id!));
      await scrollBy(scroller, -90);
      await page.evaluate(() => new Promise(requestAnimationFrame));
      await page.evaluate(() => new Promise(requestAnimationFrame));
      await page.evaluate(() => new Promise(requestAnimationFrame));
      expect(Math.abs((await top(line(table, id!))) - (before + 90))).toBeLessThan(2);
    }
    for (const gap of await lineGaps(table)) expect(gap).toBeLessThan(1.5);
  });

  test("a measured height survives leaving and coming back", async ({ page }) => {
    const { table, scroller } = await open(page, "Detail panels");
    const panel = table.locator('[data-item="detail"][data-for-row="ord-1002"]');
    const height = await panel.evaluate((element) => element.getBoundingClientRect().height);
    const below = line(table, "ord-1003");
    const offset = await below.evaluate((row) => new DOMMatrix(getComputedStyle(row).transform).m42);
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(panel).toHaveCount(0);
    await scroller.evaluate((element) => {
      element.scrollTop = 0;
    });
    await expect(panel).toBeVisible();
    expect(await panel.evaluate((element) => element.getBoundingClientRect().height)).toBeCloseTo(height, 0);
    expect(await below.evaluate((row) => new DOMMatrix(getComputedStyle(row).transform).m42)).toBeCloseTo(offset, 0);
  });

  test("a panel keeps its place when its content grows, and stays in view sideways", async ({ page }) => {
    const { table, scroller } = await open(page, "Detail panels");
    const panel = table.locator('[data-item="detail"][data-for-row="ord-1002"] .fa-dt-panel');
    const below = line(table, "ord-1003");
    const before = await top(below);
    await panel.evaluate((element) => {
      (element as HTMLElement).style.paddingBlockEnd = "6rem";
    });
    await expect.poll(async () => (await top(below)) - before).toBeGreaterThan(70);
    for (const gap of await lineGaps(table)) expect(gap).toBeLessThan(1.5);
    await scroller.evaluate((element) => {
      (element.closest(".fa-dt") as HTMLElement).style.width = "640px";
      (element.querySelector(".fa-dt-rows") as HTMLElement).style.minWidth = "1200px";
      element.scrollLeft = 300;
    });
    const scrollerBox = (await scroller.boundingBox())!;
    const box = (await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(scrollerBox.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(scrollerBox.x + scrollerBox.width + 1);
  });

  test("no ResizeObserver loop while panels measure", async ({ page }) => {
    await page.addInitScript(() => {
      window.addEventListener("error", (event) => {
        if (event.message.includes("ResizeObserver")) (window as unknown as { loopErrors: number }).loopErrors = 1 + ((window as unknown as { loopErrors?: number }).loopErrors ?? 0);
      });
    });
    const { table } = await open(page, "Detail panels");
    await page.waitForTimeout(500);
    const atRest = await page.evaluate(() => (window as unknown as { loopErrors?: number }).loopErrors ?? 0);
    await table.getByRole("button", { name: "Expand all rows on this page" }).click();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as unknown as { loopErrors?: number }).loopErrors ?? 0)).toBe(atRest);
  });
});

test.describe("lazy tree", () => {
  test("is a treegrid with levels, positions and sizes, and passes axe", async ({ page }) => {
    const { table } = await open(page, "Lazy tree");
    const grid = table.getByRole("treegrid", { name: "Shared folders" });
    await expect(grid).toBeVisible();
    await expect(grid).toHaveAttribute("aria-rowcount", "-1");
    const projects = line(table, "projects");
    await expect(projects).toHaveAttribute("aria-level", "1");
    await expect(projects).toHaveAttribute("aria-expanded", "true");
    await expect(projects).toHaveAttribute("aria-setsize", "4");
    const designs = line(table, "designs");
    await expect(designs).toHaveAttribute("aria-level", "2");
    await expect(designs).toHaveAttribute("aria-posinset", "1");
    await expect(designs).toHaveAttribute("aria-setsize", "3");
    await expect(designs).toHaveAttribute("aria-expanded", "false");
    await expect(line(table, "brief")).not.toHaveAttribute("aria-expanded", /.*/);
    const results = await new AxeBuilder({ page }).include('[data-testid="dt-tree"]').analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });

  test("children load into the space held for them, moving nothing", async ({ page }) => {
    const { table } = await open(page, "Lazy tree");
    // Measured in the page, in one go: the load lasts 500 ms and the box may be busy.
    const held = await table.evaluate(async (element) => {
      const button = element.querySelector<HTMLElement>('[aria-label="Expand Designs"]')!;
      button.click();
      await new Promise(requestAnimationFrame);
      const status = element.querySelector<HTMLElement>('[data-item="child-status"]')!;
      return {
        state: status.dataset.state,
        height: status.getBoundingClientRect().height,
        row: element.querySelector('[data-item="row"]')!.getBoundingClientRect().height,
        below: element.querySelector('[data-row-id="reports"]')!.getBoundingClientRect().top,
      };
    });
    expect(held.state).toBe("loading");
    expect(held.height).toBeCloseTo(held.row * 3, 0);
    const status = table.locator('[data-item="child-status"]');
    const below = line(table, "reports");
    const before = held.below;
    await expect(line(table, "designs-3")).toBeVisible();
    await expect(status).toHaveCount(0);
    expect(await top(below)).toBeCloseTo(before, 0);
    await expect(line(table, "designs-1")).toHaveAttribute("aria-level", "3");
  });

  test("a failed load shows Retry over the same space, and Retry loads", async ({ page }) => {
    const { demo, table } = await open(page, "Lazy tree");
    await demo.getByRole("button", { name: "Fail next load" }).click();
    const status = table.locator('[data-item="child-status"]');
    const below = line(table, "reports");
    const before = await table.evaluate(async (element) => {
      element.querySelector<HTMLElement>('[aria-label="Expand Designs"]')!.click();
      await new Promise(requestAnimationFrame);
      return element.querySelector('[data-row-id="reports"]')!.getBoundingClientRect().top;
    });
    await expect(status).toHaveAttribute("data-state", "error");
    await expect(status).toContainText("Couldn't load rows under Designs");
    expect(await top(below)).toBeCloseTo(before, 0);
    const failed = await new AxeBuilder({ page }).include('[data-testid="dt-tree"]').analyze();
    expect(failed.violations.map((violation) => violation.id)).toEqual([]);
    await status.getByRole("button", { name: "Retry" }).click();
    await expect(line(table, "designs-1")).toBeVisible();
    expect(await top(below)).toBeCloseTo(before, 0);
  });

  test("the keyboard walks and opens the tree, and Show more hands focus to the new rows", async ({ page }) => {
    const { table, scroller } = await open(page, "Lazy tree");
    const archive = line(table, "archive");
    await line(table, "projects").focus();
    await page.keyboard.press("ArrowRight");
    await expect(line(table, "designs")).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(line(table, "projects")).toBeFocused();
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await expect(archive).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(line(table, "archive-1")).toBeVisible();
    await expect(archive).toBeFocused();
    const more = table.locator('[data-item="child-more"]');
    await expect(more).toContainText("4 of 10");
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await more.getByRole("button", { name: "Show more rows under Archive" }).click();
    await expect(more).toContainText("8 of 10");
    await expect(line(table, "archive-5")).toBeFocused();
  });

  test("a search keeps the path to a match, quieter, and leaves `expanded` alone", async ({ page }) => {
    const { table } = await open(page, "Lazy tree");
    await table.getByRole("searchbox").fill("brief");
    await expect(line(table, "brief")).toBeVisible();
    await expect(line(table, "archive")).toHaveCount(0);
    await expect(line(table, "projects")).toHaveAttribute("data-context", "");
    const quiet = await line(table, "projects").locator(".fa-dt-text").first().evaluate((text) => getComputedStyle(text).color);
    const plain = await line(table, "brief").locator(".fa-dt-text").first().evaluate((text) => getComputedStyle(text).color);
    expect(quiet).not.toBe(plain);
    await table.getByRole("checkbox", { name: "Select all rows on this page" }).click();
    await expect(table.getByRole("checkbox", { name: "Select Project brief" })).toBeChecked();
    await expect(table.getByRole("checkbox", { name: "Select Projects" })).not.toBeChecked();
    await table.getByRole("searchbox").fill("");
    await expect(line(table, "archive")).toBeVisible();
    await expect(line(table, "designs")).toBeVisible();
  });

  test("a child's indent grows with its level and caps in a narrow column", async ({ page }) => {
    const { table } = await open(page, "Lazy tree");
    const text = (id: string) => line(table, id).locator(".fa-dt-text").first();
    const step = await table.evaluate((element) => {
      const probe = document.createElement("div");
      probe.style.width = "var(--fa-dt-indent-step)";
      element.append(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return width;
    });
    const xOf = async (id: string) => (await text(id).boundingBox())!.x;
    expect((await xOf("designs")) - (await xOf("projects"))).toBeCloseTo(step, 0);
    await table.getByRole("button", { name: "Expand Designs" }).click();
    await expect(line(table, "designs-1")).toBeVisible();
    expect((await xOf("designs-1")) - (await xOf("projects"))).toBeCloseTo(step * 2, 0);
  });
});

for (const density of ["comfortable", "compact"] as const) {
  for (const { uiScale, radiusScale, lineWeight } of [
    { uiScale: 1, radiusScale: 1, lineWeight: "hairline" },
    { uiScale: 1.25, radiusScale: 0.5, lineWeight: "strong" },
  ]) {
    test(`geometry: ${density}, scale ${uiScale}, radius ${radiusScale}, ${lineWeight} @responsive`, async ({ page }) => {
      const { table } = await open(page, "Detail panels", { density, uiScale, radiusScale, lineWeight });
      const row = line(table, "ord-1001");
      const button = row.locator("button.fa-dt-expander");
      const measured = await table.evaluate((element) => {
        const read = (css: string, property: "width" | "borderRadius" = "width") => {
          const probe = document.createElement("div");
          probe.style.cssText = `position:absolute;${property === "width" ? `width:${css}` : `border-radius:${css};width:10rem;height:10rem`}`;
          element.append(probe);
          const value = property === "width" ? probe.getBoundingClientRect().width : parseFloat(getComputedStyle(probe).borderTopLeftRadius);
          probe.remove();
          return value;
        };
        return {
          aa: read("var(--target-aa)"),
          inset: read("var(--inset-tile)"),
          radius: read("var(--radius-tile)", "borderRadius"),
          reach: read("var(--focus-reach)"),
          border: read("var(--border-width)"),
        };
      });
      // Hit area: at least the WCAG minimum, whatever the control draws.
      const hit = await button.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const after = getComputedStyle(element, "::after");
        const size = (value: string, fallback: number) => (value.endsWith("px") ? parseFloat(value) : fallback);
        return {
          width: Math.max(box.width, size(after.width, 0)),
          height: Math.max(box.height, size(after.height, 0)),
        };
      });
      expect(hit.width).toBeGreaterThanOrEqual(measured.aa - 0.5);
      expect(hit.height).toBeGreaterThanOrEqual(measured.aa - 0.5);
      // The panel takes its inset and corner from the theme, not from a fixed length.
      const panel = table.locator('[data-item="detail"][data-for-row="ord-1002"] .fa-dt-panel');
      const style = await panel.evaluate((element) => {
        const computed = getComputedStyle(element);
        return { padding: parseFloat(computed.paddingInlineStart), radius: parseFloat(computed.borderTopLeftRadius) };
      });
      expect(style.padding).toBeCloseTo(measured.inset, 0);
      expect(style.radius).toBeCloseTo(measured.radius, 0);
      // A phone shows cards, which have no header and no clipping cell.
      if ((await table.getAttribute("data-mode")) === "table") {
        // The header's label stands over the rows' content, as in every other column (each
        // keeps the space of its hidden drag grip), not over the expander.
        const offset = async (name: string, column: number) => {
          const label = table.getByRole("columnheader", { name }).locator(".fa-dt-th-label");
          const content = row.locator(".fa-dt-text").nth(column);
          return (await label.boundingBox())!.x - (await content.boundingBox())!.x;
        };
        expect(Math.abs((await offset("Order", 0)) - (await offset("Customer", 1)))).toBeLessThan(2);
        // A row's expander clears its clipping cell, focus reach included (R11.10).
        const clip = await button.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const cell = element.closest(".fa-dt-cell")!.getBoundingClientRect();
          return { start: box.left - cell.left, top: box.top - cell.top, bottom: cell.bottom - box.bottom };
        });
        expect(clip.start).toBeGreaterThanOrEqual(measured.reach - 0.5);
        expect(clip.top).toBeGreaterThanOrEqual(measured.reach - 0.5);
        expect(clip.bottom).toBeGreaterThanOrEqual(measured.reach - 0.5);
        for (const gap of await lineGaps(table)) expect(gap).toBeLessThan(1.5);
      }
    });
  }
}

test("the first and last lines keep their focus rings inside the scroller", async ({ page }) => {
  const { table, scroller } = await open(page, "Detail panels");
  const row = line(table, "ord-1001");
  await row.focus();
  await page.keyboard.press("ArrowRight");
  const panelRow = table.locator('[data-item="detail"][data-for-row="ord-1001"]');
  await page.keyboard.press("ArrowRight");
  await expect(panelRow).toBeFocused();
  const outline = await panelRow.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { width: parseFloat(computed.outlineWidth), offset: parseFloat(computed.outlineOffset) };
  });
  // Drawn inside the line's own box, so the scroller cannot clip it, and only there.
  expect(outline.width).toBeGreaterThan(0);
  expect(outline.offset).toBeLessThanOrEqual(0);
  expect(await panelRow.locator(".fa-dt-panel").evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("none");
  await page.keyboard.press("End");
  const last = line(table, "ord-1120");
  await expect(last).toBeFocused();
  const scrollerBox = (await scroller.boundingBox())!;
  const lastBox = (await last.boundingBox())!;
  expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(scrollerBox.y + scrollerBox.height + 1);
});

test("narrow frame: panels and tree rows become cards @responsive", async ({ page }) => {
  const { table } = await open(page, "Lazy tree");
  await table.locator("..").evaluate((frame) => {
    (frame as HTMLElement).style.width = "340px";
  });
  await expect(table).toHaveAttribute("data-mode", "cards");
  const parent = line(table, "projects");
  const child = line(table, "designs");
  await expect(child).toHaveAttribute("aria-level", "2");
  const parentBox = (await parent.boundingBox())!;
  const childBox = (await child.boundingBox())!;
  expect(childBox.x).toBeGreaterThan(parentBox.x);
  expect(childBox.x + childBox.width).toBeCloseTo(parentBox.x + parentBox.width, 0);
  await child.getByRole("button", { name: "Expand Designs" }).click();
  const status = table.locator('[data-item="child-status"]');
  await expect(status).toBeVisible();
  await expect(line(table, "designs-1")).toBeVisible();
  await expect(line(table, "designs-1")).toHaveAttribute("aria-level", "3");
  const scroller = table.locator(".fa-dt-scroll");
  expect(await scroller.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await table.getByRole("button", { name: "Columns and density" }).click();
  await page.getByRole("menuitem", { name: /(Expand|Collapse) all rows/ }).click();
  await expect(line(table, "reports-1")).toHaveCount(0);
});

test("narrow frame: a panel sits between its card and the next @responsive", async ({ page }) => {
  const { table } = await open(page, "Detail panels");
  await table.locator("..").evaluate((frame) => {
    (frame as HTMLElement).style.width = "340px";
  });
  await expect(table).toHaveAttribute("data-mode", "cards");
  const panel = page.getByTestId("order-panel-ord-1002");
  await expect(panel).toBeVisible();
  const card = (await line(table, "ord-1002").boundingBox())!;
  const panelBox = (await panel.boundingBox())!;
  const next = (await line(table, "ord-1003").boundingBox())!;
  expect(panelBox.y).toBeGreaterThanOrEqual(card.y + card.height - 1);
  expect(next.y).toBeGreaterThanOrEqual(panelBox.y + panelBox.height);
  expect(await table.locator(".fa-dt-scroll").evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).include('[data-testid="dt-panels"]').analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test("right to left: chevrons, indent and arrow keys follow the reading direction @responsive", async ({ page }) => {
  const { table } = await open(page, "Lazy tree", {}, "?dir=rtl&lang=ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const projects = line(table, "projects");
  const designs = line(table, "designs");
  const textOf = (row: Locator) => row.locator(".fa-dt-text").first();
  await table.evaluate((element) => {
    element.style.width = "60rem";
  });
  const right = (row: Locator) => textOf(row).evaluate((text) => text.getBoundingClientRect().right);
  // The width takes a phone's cards to a table, and the rows are new ones after that.
  await expect(table).toHaveAttribute("data-mode", "table");
  await expect(designs).toBeVisible();
  // Indent runs from the right edge, away from the row's start.
  await expect(async () => expect(await right(designs)).toBeLessThan(await right(projects))).toPass();
  // The closed chevron points along the reading direction; the open one points down.
  const closed = designs.locator("button.fa-dt-expander .fa-icon");
  const open_ = projects.locator("button.fa-dt-expander .fa-icon");
  expect(await closed.evaluate((icon) => getComputedStyle(icon).scale)).toBe("-1 1");
  expect(await open_.evaluate((icon) => getComputedStyle(icon).rotate)).toBe("-90deg");
  await designs.focus();
  await page.keyboard.press("ArrowRight");
  await expect(projects).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(designs).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(designs).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowRight");
  await expect(designs).toHaveAttribute("aria-expanded", "false");
});

test("on a phone the expander takes a tap and the page does not widen @responsive", async ({ page }) => {
  const { table } = await open(page, "Lazy tree");
  await table.getByRole("button", { name: "Expand Archive" }).click();
  await expect(line(table, "archive-1")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
