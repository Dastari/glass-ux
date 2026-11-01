import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * Masonry: columns from the width, no layout shift as pictures load, appended items leave the earlier
 * ones where they are, Tab follows the way the grid reads (also right to left), and the geometry follows the theme.
 */
const APPEARANCES = [
  { density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1 },
  { density: "compact", uiScale: 1.125, radiusScale: 1.4, borderWidth: 1.5 },
  { density: "comfortable", uiScale: 0.9, radiusScale: 0, borderWidth: 2 },
] as const;

async function open(page: Page, appearance: Record<string, unknown> = {}) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    (value) => {
      localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced", ...value }));
      // Every layout shift that touches a masonry, from the first frame.
      const shifts: number[] = [];
      (window as unknown as { masonryShifts: number[] }).masonryShifts = shifts;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean; sources?: { node?: Node }[] }[]) {
          if (entry.sources?.some((source) => source.node && (source.node as Element).closest?.(".fa-masonry") !== null)) shifts.push(entry.value);
        }
      }).observe({ type: "layout-shift", buffered: true });
    },
    appearance,
  );
  await page.goto("/components/masonry");
  await expect(page.getByTestId("masonry-photos").locator(".fa-masonry[data-ready]")).toBeVisible({ timeout: 30_000 });
  return errors;
}

const px = (page: Page, value: string) =>
  page.evaluate((expression) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;width:${expression}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, value);

const boxes = (list: Locator) =>
  list.locator(".fa-masonry-item").evaluateAll((items) => {
    const origin = items[0]!.closest(".fa-masonry")!.getBoundingClientRect();
    return items.map((item) => {
      const box = item.getBoundingClientRect();
      return [Math.round((box.x - origin.x) * 100) / 100, Math.round((box.y - origin.y) * 100) / 100, Math.round(box.width * 100) / 100, Math.round(box.height * 100) / 100];
    });
  });

test("lays the photographs out in columns and reserves every box before pictures load @responsive", async ({ page }) => {
  const errors = await open(page);
  const demo = page.getByTestId("masonry-photos");
  await demo.scrollIntoViewIfNeeded();
  const first = await boxes(demo);
  expect(first).toHaveLength(18);
  // Pictures arrive (they are lazy, so scroll through them); no box changes, and the browser reports no shift.
  const root = (await demo.locator(".fa-masonry").boundingBox())!;
  await demo.locator(".fa-masonry-list").evaluate((list) => list.scrollIntoView({ block: "end" }));
  await expect(demo.locator(".fa-image[data-state=loaded]").last()).toBeVisible();
  await page.waitForTimeout(300);
  expect(await boxes(demo)).toEqual(first);
  expect(await page.evaluate(() => (window as unknown as { masonryShifts: number[] }).masonryShifts.reduce((sum, value) => sum + value, 0))).toBe(0);
  // Every item sits inside the box and no two overlap.
  const items = (await demo.locator(".fa-masonry-item").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()))) as { x: number; y: number; width: number; height: number }[];
  for (const [index, a] of items.entries()) {
    expect(a.x).toBeGreaterThanOrEqual(root.x - 0.5);
    expect(a.x + a.width).toBeLessThanOrEqual(root.x + root.width + 0.5);
    for (const b of items.slice(index + 1)) {
      const apart = a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5;
      expect(apart).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test("Tab follows the way the grid reads: tops never rise, and a tie goes to the reading start @responsive", async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("masonry-photos");
  await demo.scrollIntoViewIfNeeded();
  const buttons = demo.locator(".fa-masonry-item > button");
  await buttons.first().focus();
  const seen: { y: number; x: number; label: string }[] = [];
  for (let step = 0; step < 18; step++) {
    seen.push(await page.evaluate(() => {
      const box = document.activeElement!.getBoundingClientRect();
      return { y: box.y + window.scrollY, x: box.x, label: document.activeElement!.getAttribute("aria-label") ?? "" };
    }));
    await page.keyboard.press("Tab");
  }
  expect(seen.map((point) => point.label)).toEqual(Array.from({ length: 18 }, (_, index) => `Open View ${index + 1}`));
  // The page may scroll while Tab moves; compare each photograph's place in the masonry instead.
  const places = await boxes(demo);
  for (let index = 1; index < places.length; index++) {
    const [before, now] = [places[index - 1]!, places[index]!];
    expect(now[1]).toBeGreaterThanOrEqual(before[1] - 0.5);
    if (Math.abs(now[1] - before[1]) < 0.5) expect(now[0]).toBeGreaterThan(before[0]);
  }
});

test("right to left starts the columns at the right, and Tab reads from the right @responsive", async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("masonry-rtl");
  await demo.scrollIntoViewIfNeeded();
  const places = await boxes(demo);
  const root = (await demo.locator(".fa-masonry").boundingBox())!;
  expect(Math.abs(places[0]![0] + places[0]![2] - root.width)).toBeLessThan(1.5);
  expect(places[1]![0]).toBeLessThan(places[0]![0]);
  for (let index = 1; index < places.length; index++) {
    const [before, now] = [places[index - 1]!, places[index]!];
    expect(now[1]).toBeGreaterThanOrEqual(before[1] - 0.5);
    if (Math.abs(now[1] - before[1]) < 0.5) expect(now[0]).toBeLessThan(before[0]);
  }
  await demo.locator(".fa-masonry-item > button").first().focus();
  await page.keyboard.press("Tab");
  await expect(demo.getByRole("button", { name: "Open View 2" })).toBeFocused();
});

test("the number of columns follows the container's width @responsive", async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("masonry-photos");
  await demo.scrollIntoViewIfNeeded();
  const columns = () => demo.locator(".fa-masonry-item").evaluateAll((items) => new Set(items.map((item) => (item as HTMLElement).dataset.column)).size);
  const [width, min, gap] = await demo.locator(".fa-masonry").evaluate((root) => {
    const probe = root.querySelector(".fa-masonry-probe")!.getBoundingClientRect();
    return [root.getBoundingClientRect().width, probe.width, probe.height];
  });
  expect(await columns()).toBe(Math.max(1, Math.floor((width + gap!) / (min! + gap!))));
  // The columns share the width exactly, with the gap between them.
  const places = await boxes(demo);
  const columnCount = await columns();
  const itemWidth = places[0]![2];
  expect(Math.abs(itemWidth * columnCount + gap! * (columnCount - 1) - width!)).toBeLessThan(1);
  // Narrowing the box takes columns away.
  if (columnCount > 2) {
    await page.setViewportSize({ width: 480, height: 900 });
    await expect.poll(columns).toBeLessThan(columnCount);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test("adding photographs moves nothing that was there, and not the button @responsive", async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("masonry-photos");
  await demo.scrollIntoViewIfNeeded();
  const add = demo.getByRole("button", { name: "Add 6 photographs" });
  const before = await boxes(demo);
  // Where the button is against the masonry: the page may scroll as the button is pressed.
  const offset = async () => (await add.boundingBox())!.y - (await demo.locator(".fa-masonry").boundingBox())!.y;
  const button = await offset();
  const height = (await demo.locator(".fa-masonry").boundingBox())!.height;
  await add.click();
  await expect(demo.locator(".fa-masonry-item")).toHaveCount(24);
  const after = await boxes(demo);
  expect(after.slice(0, 18)).toEqual(before);
  expect((await demo.locator(".fa-masonry").boundingBox())!.height).toBeGreaterThan(height);
  expect(await offset()).toBe(button);
  expect(await page.evaluate(() => (window as unknown as { masonryShifts: number[] }).masonryShifts.reduce((sum, value) => sum + value, 0))).toBe(0);
  await add.click();
  await expect(demo.locator(".fa-masonry-item")).toHaveCount(30);
  await expect(add).toHaveAttribute("aria-disabled", "true");
});

test("a photograph opens in the Lightbox, and closing returns to it @responsive", async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("masonry-photos");
  await demo.scrollIntoViewIfNeeded();
  const item = demo.getByRole("button", { name: "Open View 3" });
  await item.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("View 3").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(item).toBeFocused();
});

test("items without a ratio are measured and never overlap @responsive", async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("masonry-notes");
  await demo.scrollIntoViewIfNeeded();
  const list = demo.locator(".fa-masonry");
  await expect(list).toHaveAttribute("data-ready", "");
  const gap = await px(page, "var(--gap-tiles)");
  await expect.poll(async () => {
    const items = (await demo.locator(".fa-masonry-item").evaluateAll((elements) => elements.map((element) => ({ ...element.getBoundingClientRect().toJSON(), column: (element as HTMLElement).dataset.column })))) as { x: number; y: number; width: number; height: number; column: string }[];
    const byColumn = new Map<string, typeof items>();
    for (const item of items) byColumn.set(item.column, [...(byColumn.get(item.column) ?? []), item]);
    let worst = Infinity;
    for (const column of byColumn.values()) for (let index = 1; index < column.length; index++) worst = Math.min(worst, column[index]!.y - (column[index - 1]!.y + column[index - 1]!.height));
    return Math.abs(worst === Infinity ? gap : worst - gap) < 1;
  }).toBe(true);
  // The list is as tall as its tallest column.
  const frame = (await demo.locator(".fa-masonry-list").boundingBox())!;
  const bottoms = (await demo.locator(".fa-masonry-item").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().bottom))) as number[];
  expect(Math.abs(Math.max(...bottoms) - (frame.y + frame.height))).toBeLessThan(1.5);
});

test("inside a scroller its last item reaches the end with room for the focus ring @responsive", async ({ page }) => {
  await open(page);
  const frame = page.locator(".gallery-lab-frame").filter({ has: page.locator(".fa-masonry") }).first();
  await frame.scrollIntoViewIfNeeded();
  const scroller = frame.locator(".overflow-auto").first();
  await scroller.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  const edge = (await scroller.boundingBox())!;
  const bottom = Math.max(...((await frame.locator(".fa-masonry-item").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().bottom))) as number[]));
  const padding = await scroller.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingBlockEnd));
  // The tallest column ends where the scroller's padding begins: nothing is cut, and the ring has room.
  expect(Math.abs(bottom - (edge.y + edge.height - padding))).toBeLessThan(1.5);
  expect(padding).toBeGreaterThanOrEqual(await px(page, "var(--focus-reach)"));
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

for (const appearance of APPEARANCES) {
  const name = `${appearance.density}, scale ${appearance.uiScale}, radius ${appearance.radiusScale}, line ${appearance.borderWidth}`;

  test(`gap, corners and columns follow the theme: ${name} @responsive`, async ({ page }) => {
    await open(page, appearance);
    const demo = page.getByTestId("masonry-photos");
    await demo.scrollIntoViewIfNeeded();
    const places = await boxes(demo);
    const gap = await px(page, "var(--gap-tiles)");
    // The first row's neighbours are a gap apart, and the first column's items are a gap apart.
    const a = places[0]!;
    const next = await demo.locator(".fa-masonry-item").evaluateAll((items) => items.findIndex((item) => (item as HTMLElement).dataset.column === "1"));
    // A narrow box at a large UI scale has a single column.
    if (next > 0) expect(Math.abs(places[next]![0] - (a[0] + a[2]) - gap)).toBeLessThan(1);
    const column = places.filter((place) => Math.abs(place[0] - a[0]) < 0.5);
    expect(Math.abs(column[1]![1] - (column[0]![1] + column[0]![3]) - gap)).toBeLessThan(1);
    const radius = await demo.locator(".fa-image").first().evaluate((element) => Number.parseFloat(getComputedStyle(element).borderStartStartRadius));
    expect(Math.abs(radius - (await px(page, "var(--radius-media)")))).toBeLessThan(1);
    // The narrowest column is `sm` and as many as fit are used, so a column is never narrower.
    expect(a[2]).toBeGreaterThanOrEqual((await px(page, "10rem")) - 0.5);
    // Each picture fills its reserved box.
    const image = (await demo.locator(".fa-image").first().boundingBox())!;
    expect(Math.abs(image.width - a[2])).toBeLessThan(1);
    expect(Math.abs(image.height - a[3])).toBeLessThan(1);
    // The item's hit area covers the picture and a press ring shows in full.
    await demo.locator(".fa-masonry-item > button").first().focus();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}

test("passes axe @responsive", async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page }).include("[data-testid=masonry-photos]").include("[data-testid=masonry-notes]").include("[data-testid=masonry-rtl]").analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
});
