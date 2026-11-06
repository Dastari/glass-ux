import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * RichTextReader through its catalogue page: what it draws, keyboard reach, phone widths,
 * appearance preferences, right to left, axe and what it loads.
 */

const ROUTE = "/components/rich-text-reader";
const documentDemo = (page: Page) => page.getByTestId("reader-document");
const bounded = (page: Page) => page.getByTestId("reader-bounded");
const appearance = (page: Page, values: Record<string, unknown>) =>
  page.addInitScript((stored) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(stored)), { motion: "reduced", ...values });

const pageOverflow = (page: Page) =>
  page.evaluate(() =>
    Math.max(...[...document.querySelectorAll("[data-scroll-container], html")].filter((element) => !element.closest(".fa-rich-text-reader")).map((element) => element.scrollWidth - element.clientWidth)),
  );

/** What a token resolves to on the element, measured by a probe in the same place. */
const token = (element: Locator, property: string, value: string) =>
  element.evaluate(
    (node, [name, css]) => {
      const probe = document.createElement("div");
      probe.style.setProperty(name!, css!);
      node.append(probe);
      const computed = getComputedStyle(probe).getPropertyValue(name!);
      probe.remove();
      return computed;
    },
    [property, value],
  );

test.beforeEach(async ({ page }) => {
  await appearance(page, { mode: "light", palette: "graphite" });
});

test("draws a table, task list, code, image and footnote, with no editor around them @responsive", async ({ page }) => {
  await page.goto(ROUTE);
  const reader = documentDemo(page);
  await expect(reader.locator("table")).toBeVisible();
  await expect(reader.locator("tbody tr")).toHaveCount(3);
  expect(await reader.locator("p, li, td").allTextContents()).not.toContainEqual(expect.stringContaining("| ---"));
  await expect(reader.getByRole("checkbox", { name: "Done", exact: true })).toHaveCount(2);
  await expect(reader.getByRole("checkbox", { name: "Not done", exact: true })).toHaveCount(1);
  await expect(reader.locator(".fa-ai-code")).toContainText("device status");
  await expect(reader.locator("img")).toHaveJSProperty("complete", true);
  expect(await reader.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(reader.locator("[contenteditable], [role=toolbar], .fa-rich-text")).toHaveCount(0);
  const root = reader.locator(".fa-rich-text-reader");
  const look = await root.evaluate((element) => {
    const style = getComputedStyle(element);
    return { fill: style.backgroundColor, border: style.borderTopWidth, shadow: style.boxShadow, padding: style.paddingTop };
  });
  expect(look).toEqual({ fill: "rgba(0, 0, 0, 0)", border: "0px", shadow: "none", padding: "0px" });
});

test("everything active is in the tab order, and footnotes and fragments jump", async ({ page }) => {
  await page.goto(ROUTE);
  const reader = documentDemo(page);
  await expect(reader.locator("table")).toBeVisible();
  await reader.getByRole("link", { name: /support guide/ }).focus();
  const reached: string[] = [];
  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.press("Tab");
    reached.push(await page.evaluate(() => {
      const element = document.activeElement!;
      return element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "";
    }));
  }
  expect(reached.some((name) => name.includes("site lead"))).toBe(true);
  expect(reached).toContain("Table 1");
  expect(reached).toContain("Done");
  expect(reached.some((name) => /copy/i.test(name))).toBe(true);
  expect(reached.some((name) => name === "devices")).toBe(true);
  // The focused table region shows a ring.
  const region = reader.getByRole("region", { name: "Table 1" });
  await region.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  expect(await region.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  const reference = reader.locator("sup a");
  await expect(reader.locator(`[id="${(await reference.getAttribute("href"))!.slice(1)}"]`)).toContainText("18:00");
  await expect(reader.getByRole("link", { name: "Back to reference 1" })).toHaveAttribute("href", `#${(await reference.getAttribute("id"))!}`);
  await reader.getByRole("link", { name: "devices" }).click();
  await expect(page).toHaveURL(/#devices$/);
  await expect(reader.locator("#devices")).toBeInViewport();
});

test("a bounded document scrolls in a named region from the keyboard @responsive", async ({ page }) => {
  await page.goto(ROUTE);
  const reader = bounded(page);
  const viewport = reader.getByRole("region", { name: "Survey readings" });
  await expect(reader.locator("table")).toBeAttached();
  const box = (await viewport.boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(281);
  expect(box.height).toBeGreaterThan(200);
  await expect(reader.locator(".fa-scroll")).toHaveAttribute("data-scrolled-bottom", "");
  await viewport.focus();
  expect(await viewport.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  await page.keyboard.press("End");
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(reader.locator(".fa-scroll")).toHaveAttribute("data-scrolled-top", "");
  await expect(reader.locator("img")).toHaveCount(0);
  await expect(reader.locator("[id]:not(.fa-scroll-viewport, .fa-scroll-viewport *) h2[id]")).toHaveCount(0);
  // The viewport never scrolls sideways: a wide table scrolls in its own region.
  expect(await viewport.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
});

test("a wide table scrolls in its own region on a phone width, at a readable column width", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(ROUTE);
  const reader = documentDemo(page);
  const region = reader.getByRole("region", { name: "Table 1" });
  await expect(region).toBeVisible();
  const measured = await region.evaluate((element) => ({
    scrolls: element.scrollWidth > element.clientWidth + 1,
    column: Math.min(...[...element.querySelectorAll("th")].map((cell) => cell.getBoundingClientRect().width)),
    rem: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
  }));
  expect(measured.scrolls).toBe(true);
  expect(measured.column).toBeGreaterThanOrEqual(7 * measured.rem - 1);
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1);
  const readerBox = (await reader.boundingBox())!;
  const regionBox = (await region.boundingBox())!;
  expect(regionBox.x + regionBox.width).toBeLessThanOrEqual(readerBox.x + readerBox.width + 1);
});

test("follows every appearance preference, with the editor's type steps @responsive", async ({ page }) => {
  await appearance(page, { mode: "dark", density: "compact", uiScale: 1.25, radiusScale: 0.5, borderWidth: 2 });
  await page.goto(ROUTE);
  const reader = documentDemo(page);
  await expect(reader.locator("table")).toBeVisible();
  const prose = reader.locator(".fa-ai-md p").first();
  const sizes = await prose.evaluate((element) => {
    const style = getComputedStyle(element);
    return { size: style.fontSize, line: style.lineHeight };
  });
  expect(sizes.size).toBe(await token(reader, "font-size", "var(--type-body-size)"));
  expect(sizes.line).toBe(await token(reader, "line-height", "var(--type-body-line)"));
  expect(await reader.locator("h2").first().evaluate((element) => getComputedStyle(element).fontSize)).toBe(await token(reader, "font-size", "var(--type-title-size)"));
  expect(await reader.locator("h3").first().evaluate((element) => getComputedStyle(element).fontSize)).toBe(await token(reader, "font-size", "var(--type-subtitle-size)"));
  expect(await reader.locator("img").evaluate((element) => getComputedStyle(element).borderTopLeftRadius)).toBe(await token(reader, "border-radius", "var(--radius-item)"));
  const gap = await reader.locator(".fa-ai-md > p").nth(1).evaluate((element) => getComputedStyle(element).marginTop).catch(() => null);
  if (gap) expect(Number.parseFloat(gap)).toBeGreaterThan(0);
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1);
  const boundedBox = (await bounded(page).getByRole("region", { name: "Survey readings" }).boundingBox())!;
  expect(boundedBox.height).toBeLessThanOrEqual(281);
  // The ring reaches inside the scroller's edge rather than being clipped by it.
  const inset = await bounded(page).locator(".fa-scroll-content").evaluate((element) => getComputedStyle(element).paddingInlineStart);
  expect(inset).toBe(await token(bounded(page).locator(".fa-scroll-content"), "padding-inline-start", "var(--focus-reach)"));
});

test("reads from the right in RTL, with nothing past the page @responsive", async ({ page }) => {
  await page.goto(`${ROUTE}?dir=rtl`);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const reader = documentDemo(page);
  await expect(reader.locator("table")).toBeVisible();
  const box = (await reader.boundingBox())!;
  const first = (await reader.locator("th").first().boundingBox())!;
  const second = (await reader.locator("th").nth(1).boundingBox())!;
  expect(first.x).toBeGreaterThan(second.x);
  const quote = await reader.locator("blockquote").evaluate((element) => getComputedStyle(element).paddingRight);
  expect(Number.parseFloat(quote)).toBeGreaterThan(0);
  const list = (await reader.locator("h3").first().boundingBox())!;
  expect(list.x + list.width).toBeCloseTo(box.x + box.width, -1);
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1);
});

test("unsafe addresses keep their text and go nowhere @responsive", async ({ page }) => {
  await page.goto(ROUTE);
  const reader = page.getByTestId("reader-unsafe");
  await expect(reader).toContainText("A script link");
  await expect(reader).toContainText("a borrowed host");
  await expect(reader).toContainText("An embedded image");
  await expect(reader).not.toContainText("<b>");
  await expect(reader.locator("a, img, b")).toHaveCount(0);
});

test("axe finds nothing, in light and dark @responsive", async ({ page }) => {
  await page.goto(ROUTE);
  await expect(documentDemo(page).locator("table")).toBeVisible();
  const light = await new AxeBuilder({ page }).include(".gallery-specimen").analyze();
  expect(light.violations.filter((violation) => violation.id !== "region")).toEqual([]);
  await appearance(page, { mode: "dark", palette: "graphite" });
  await page.reload();
  await expect(documentDemo(page).locator("table")).toBeVisible();
  const dark = await new AxeBuilder({ page }).include(".gallery-specimen").analyze();
  expect(dark.violations.filter((violation) => violation.id !== "region")).toEqual([]);
});

test("loads no editor engine", async ({ page }) => {
  const editor: string[] = [];
  page.on("request", (request) => {
    if (/lexical/i.test(request.url())) editor.push(request.url());
  });
  await page.goto(ROUTE);
  await expect(documentDemo(page).locator("table")).toBeVisible();
  expect(editor).toEqual([]);
});
