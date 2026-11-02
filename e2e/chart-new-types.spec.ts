import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * ComboChart, FunnelChart, RadarChart and SankeyChart. Each page carries a full-tier specimen
 * (`chart-<id>`), swap slots for the loading skeleton and a specimen with onActivate.
 */

const IDS = ["combo-chart", "funnel-chart", "radar-chart", "sankey-chart"] as const;
/** Every built-in palette (appearance.ts PALETTES; importing it here would pull the font assets into Playwright). */
const PALETTES = ["ocean", "aurora", "emerald", "sunset", "graphite", "ruby", "lagoon", "indigo", "rose", "moss", "sand", "slate"];

const preferences = (page: Page, value: Record<string, unknown> = {}) =>
  page.addInitScript(
    (preferred) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced", ...preferred })),
    value,
  );

async function open(page: Page, id: string, query = "") {
  await page.goto(`/components/${id}${query}`);
  const pane = page.getByTestId(`chart-${id}`);
  await pane.scrollIntoViewIfNeeded();
  const chart = pane.locator(".fa-chart");
  await expect(chart).toHaveAttribute("data-state", "ready");
  return { pane, chart };
}

/**
 * Every label stands inside the chart's box: nothing overhangs at any size or scale. A resize
 * re-lays the labels a frame later, and WebKit can be read in between, so this polls to rest.
 */
async function expectLabelsInside(chart: Locator) {
  await expect.poll(() => chart.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const out: string[] = [];
    for (const label of element.querySelectorAll(".fa-chart-labels *, .fa-chart-text, .fa-chart-axis-name")) {
      const rect = label.getBoundingClientRect();
      if (rect.width === 0) continue;
      if (rect.left < box.left - 1.5 || rect.right > box.right + 1.5 || rect.top < box.top - 1.5 || rect.bottom > box.bottom + 1.5)
        out.push(`${label.textContent}: ${Math.round(rect.left - box.left)}…${Math.round(rect.right - box.left)} of ${Math.round(box.width)}, ${Math.round(rect.top - box.top)}…${Math.round(rect.bottom - box.top)} of ${Math.round(box.height)}`);
    }
    return out;
  })).toEqual([]);
}

const marks = (chart: Locator) => chart.locator(".fa-chart-svg").first().locator(".fa-chart-bar, .fa-chart-line, .fa-chart-sankey-node");

for (const id of IDS) {
  test(`${id}: axe, the keyboard cursor and its tooltip @responsive`, async ({ page }) => {
    await preferences(page);
    const { pane, chart } = await open(page, id);
    const scan = await new AxeBuilder({ page }).include(`[data-testid="chart-${id}"]`).analyze();
    expect(scan.violations).toEqual([]);

    await expect(chart).toHaveAttribute("data-tier", "full");
    const slider = chart.getByRole("slider");
    await slider.focus();
    const tip = page.locator("body > .fa-chart-tip[data-placed]");
    await expect(tip).toBeVisible();
    await expect(tip).toHaveAttribute("aria-hidden", "true");
    const first = await slider.getAttribute("aria-valuetext");
    expect(first).toBeTruthy();
    await page.keyboard.press("End");
    await expect(slider).not.toHaveAttribute("aria-valuetext", first!);
    await page.keyboard.press("Home");
    await expect(slider).toHaveAttribute("aria-valuetext", first!);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await expect(slider).not.toHaveAttribute("aria-valuetext", first!);
    await expect(chart.locator(".sr-only[aria-live]").last()).not.toBeEmpty();
    await page.keyboard.press("Escape");
    await expect(tip).toHaveCount(0);
    await expect(pane).toBeVisible();
  });

  test(`${id}: tiers follow the box, and labels stay inside it`, async ({ page }) => {
    await preferences(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const { pane, chart } = await open(page, id);
    const size = (width: string, height: string) =>
      pane.evaluate((element, [w, h]) => {
        (element as HTMLElement).style.width = w!;
        (element as HTMLElement).style.height = h!;
      }, [width, height]);

    for (const [width, height, tier] of [
      ["56rem", "30rem", "full"],
      ["20rem", "12rem", "full"],
      ["24rem", "16rem", "full"],
      ["20rem", "9rem", "compact"],
      ["12rem", "11rem", "compact"],
      ["30rem", "3rem", "micro"],
      ["9rem", "8rem", "micro"],
    ] as const) {
      await size(width, height);
      await expect(chart).toHaveAttribute("data-tier", tier);
      await expect(chart.getByRole("slider")).toHaveCount(tier === "full" ? 1 : 0);
      await expect(chart.locator(".fa-chart-svg").first()).toBeVisible();
      await expectLabelsInside(chart);
    }
  });

  test(`${id}: loading, empty and error keep the chart's box`, async ({ page }) => {
    await preferences(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/components/${id}`);
    for (const tier of ["full", "compact", "micro"]) {
      const slot = page.getByTestId(`${id}-${tier}-slot`);
      await slot.scrollIntoViewIfNeeded();
      const chart = slot.locator(".fa-chart");
      await expect(chart).toHaveAttribute("data-state", "loading");
      await expect(chart).toHaveAttribute("aria-busy", "true");
      await expect(chart.locator(".fa-chart-skel")).toBeVisible();
      const place = () =>
        chart.locator(".fa-chart-plot").evaluate((plot) => {
          const origin = plot.closest(".fa-chart")!.getBoundingClientRect();
          const box = plot.getBoundingClientRect();
          return [box.left - origin.left, box.top - origin.top, box.width, box.height].map((value) => Math.round(value * 2) / 2);
        });
      const loading = await place();
      await page.getByTestId(`${id}-${tier}-swap`).click();
      await expect(chart).toHaveAttribute("data-state", "ready");
      expect(await place()).toEqual(loading);
    }
    const pageText = page.locator(".gallery-tiers");
    await expect(pageText.getByText(/could not load/)).toBeVisible();
    await expect(pageText.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(pageText.getByText(/^No .* yet$/)).toBeVisible();
  });

  test(`${id}: reduced motion stops the entrance, and the chart prints with its legend`, async ({ page }) => {
    await preferences(page, { motion: "reduced" });
    const { chart } = await open(page, id);
    const running = () => chart.evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length);
    expect(await running()).toBe(0);

    await page.emulateMedia({ media: "print" });
    await expect(chart.locator(".fa-chart-tools")).toBeHidden();
    await expect(chart.locator(".fa-chart-hit")).toBeHidden();
    await expect(chart.locator(".fa-chart-legend")).toBeVisible();
    expect(await marks(chart).count()).toBeGreaterThan(0);
    await expect(marks(chart).first()).toHaveCSS("print-color-adjust", "exact");
    await page.emulateMedia({ media: "screen" });
  });

  test(`${id}: forced colours keep the series and take system colours for the frame`, async ({ page }) => {
    await preferences(page);
    const { chart } = await open(page, id);
    const fill = () => marks(chart).first().evaluate((mark) => getComputedStyle(mark).stroke + getComputedStyle(mark).fill);
    const before = await fill();
    await page.emulateMedia({ forcedColors: "active" });
    await expect.poll(() => page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    expect(await fill()).toBe(before);
    if (id === "radar-chart") {
      const stroke = await chart.locator(".fa-chart-radar-grid").first().evaluate((line) => getComputedStyle(line).stroke);
      const text = await chart.evaluate((element) => getComputedStyle(element).color);
      expect(stroke).toBe(text);
    }
    const halos = await chart.locator(".fa-chart-sankey-label, .fa-chart-ring-label").evaluateAll((labels) => labels.map((label) => getComputedStyle(label).textShadow));
    expect(halos.filter((shadow) => shadow !== "none")).toEqual([]);
  });

  for (const [name, appearance] of [
    ["compact density", { density: "compact" }],
    ["a large UI scale", { uiScale: 1.25 }],
    ["a small UI scale", { uiScale: 0.875 }],
    ["square corners", { radiusScale: 0 }],
    ["round corners", { radiusScale: 1.5 }],
    ["heavy lines", { borderWidth: 2 }],
    ["fine lines", { borderWidth: 0.5 }],
  ] as const) {
    test(`${id}: geometry follows ${name}`, async ({ page }) => {
      await preferences(page, appearance);
      await page.setViewportSize({ width: 1280, height: 900 });
      const { chart } = await open(page, id);
      await expect(chart).toHaveAttribute("data-tier", "full");
      await expectLabelsInside(chart);
      const tokens = await chart.evaluate((element) => {
        const probe = document.createElement("div");
        probe.style.cssText = "position:absolute;visibility:hidden;width:var(--chart-bar-radius);height:var(--border-width);inline-size:var(--chart-bar-radius)";
        element.append(probe);
        const box = probe.getBoundingClientRect();
        probe.remove();
        return { radius: box.width, line: box.height, rem: parseFloat(getComputedStyle(document.documentElement).fontSize) };
      });
      if ("uiScale" in appearance) expect(tokens.rem).toBeCloseTo(16 * appearance.uiScale, 0);
      if (id === "funnel-chart") {
        const rx = await chart.locator(".fa-chart-funnel-bar").first().evaluate((bar) => parseFloat(getComputedStyle(bar).rx));
        expect(rx).toBeCloseTo(tokens.radius, 1);
        // Rows split the plot evenly and stay on it.
        const rows = await chart.locator(".fa-chart-funnel-bar").evaluateAll((bars) => bars.map((bar) => bar.getBoundingClientRect().top));
        expect(new Set(rows.slice(1).map((top, index) => Math.round(top - rows[index]!))).size).toBeLessThanOrEqual(2);
      }
      if (id === "sankey-chart") {
        const width = await chart.locator(".fa-chart-sankey-link").first().evaluate((link) => parseFloat(getComputedStyle(link).strokeWidth));
        expect(width).toBeCloseTo(tokens.line, 1);
        const plot = (await chart.locator(".fa-chart-plot").boundingBox())!;
        const inside = await chart.locator(".fa-chart-sankey-node").evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()).map(({ left, right, top, bottom }) => ({ left, right, top, bottom })));
        for (const node of inside) {
          expect(node.left).toBeGreaterThanOrEqual(plot.x - 1);
          expect(node.right).toBeLessThanOrEqual(plot.x + plot.width + 1);
          expect(node.top).toBeGreaterThanOrEqual(plot.y - 1);
          expect(node.bottom).toBeLessThanOrEqual(plot.y + plot.height + 1);
        }
      }
      if (id === "radar-chart") {
        const width = await chart.locator(".fa-chart-radar-grid").first().evaluate((line) => parseFloat(getComputedStyle(line).strokeWidth));
        expect(width).toBeCloseTo(tokens.line, 1);
      }
      if (id === "combo-chart") {
        // The two axes' labels stand on the same gridlines, inside their own gutters.
        const ticks = await chart.locator('.fa-chart-tick[data-axis="y"]').evaluateAll((items) => items.map((item) => ({ side: (item as HTMLElement).dataset.side, top: Math.round(item.getBoundingClientRect().top), left: item.getBoundingClientRect().left, right: item.getBoundingClientRect().right })));
        const left = ticks.filter((tick) => tick.side === "left");
        const right = ticks.filter((tick) => tick.side === "right");
        expect(left.map((tick) => tick.top)).toEqual(right.map((tick) => tick.top));
        const grid = await chart.locator(".fa-chart-grid").first().evaluate((line) => line.getBoundingClientRect().right);
        for (const tick of right) expect(tick.left).toBeGreaterThanOrEqual(grid);
      }
    });
  }
}

test("combo-chart: columns, a line and two named axes @responsive", async ({ page }) => {
  await preferences(page);
  const { chart } = await open(page, "combo-chart");
  await expect(chart).toHaveAttribute("data-kind", "combo");
  await expect(chart.locator(".fa-chart-bar")).toHaveCount(8);
  await expect(chart.locator(".fa-chart-line")).toHaveCount(1);
  const names = chart.locator(".fa-chart-axis-name");
  await expect(names).toHaveText(["Revenue", "Return rate"]);
  // Each axis is keyed to its series: a box for columns, a line for the line, in their slots.
  await expect(names.nth(0).locator(".fa-chart-swatch")).toHaveAttribute("data-shape", "box");
  await expect(names.nth(0).locator(".fa-chart-swatch")).toHaveAttribute("data-slot", "1");
  await expect(names.nth(1).locator(".fa-chart-swatch")).toHaveAttribute("data-shape", "line");
  await expect(names.nth(1).locator(".fa-chart-swatch")).toHaveAttribute("data-slot", "2");
  await expect(chart.locator(".fa-chart-axis-rule")).toHaveCount(2);
  await expect(chart.locator(".fa-chart-axis-rule").nth(1)).toHaveAttribute("data-slot", "2");
  await expect(chart.locator('.fa-chart-tick[data-side="right"]').first()).toContainText("%");

  // The description says which series reads which axis.
  await expect(chart).toHaveAccessibleDescription(/Left axis: Revenue, for Revenue\. Right axis: Return rate, for Returns\./);

  const slider = chart.getByRole("slider");
  await slider.focus();
  await expect(slider).toHaveAttribute("aria-valuetext", /Jan · Revenue 412.k€, Returns 4\.2%/);
  const tip = page.locator("body > .fa-chart-tip[data-placed]");
  await expect(tip.locator(".fa-chart-tip-row")).toHaveCount(2);
  await expect(tip.locator(".fa-chart-tip-detail")).toHaveText(["left axis", "right axis"]);
  await expect(tip.locator('.fa-chart-key[data-shape="line"]')).toHaveCount(1);
  await page.keyboard.press("Escape");
});

test("combo-chart: the table and CSV name each series' axis and unit", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await preferences(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { chart } = await open(page, "combo-chart");
  await chart.getByRole("button", { name: "Copy as CSV" }).click();
  const csv = await page.evaluate(() => navigator.clipboard.readText());
  expect(csv.split("\r\n")[0]).toBe('Month,Revenue (k€),"Returns (Return rate, %)"');
  expect(csv.split("\r\n")[1]).toBe("Jan,412,4.2");
  await chart.getByRole("button", { name: "View as table" }).click();
  await expect(chart.locator("table[data-chart-table='visible'] thead th")).toHaveText(["Month", "Revenue (k€)", "Returns (Return rate, %)"]);
  await expect(chart.locator("table[data-chart-table='visible'] tbody tr").first().locator("td")).toHaveText([/412.k€/, /4\.2%/]);
  await expect(chart.locator(".fa-chart-table-notes")).toContainText("Right axis: Return rate, for Returns.");
});

test("combo-chart: hiding a series keeps both axes where they are", async ({ page }) => {
  await preferences(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { chart } = await open(page, "combo-chart");
  const plot = () => chart.locator(".fa-chart-grid").first().boundingBox();
  const before = await plot();
  const legend = chart.getByRole("toolbar", { name: "Series" });
  await legend.getByRole("button", { name: /Returns/ }).click();
  await expect(chart.locator(".fa-chart-line")).toHaveCount(0);
  await expect(chart.locator(".fa-chart-axis-name")).toHaveCount(2);
  await expect(chart.locator(".fa-chart-axis-name").nth(1).locator(".fa-chart-swatch")).toHaveAttribute("data-off", "");
  expect(await plot()).toEqual(before);
  // The last visible series stays.
  await expect(legend.getByRole("button", { name: /Revenue/ })).toHaveAttribute("aria-disabled", "true");
  await legend.getByRole("button", { name: /Returns/ }).click();
  await expect(chart.locator(".fa-chart-line")).toHaveCount(1);
});

test("combo-chart: one axis stacks its columns, with the line out of the stack", async ({ page }) => {
  await preferences(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/components/combo-chart");
  const pane = page.getByTestId("chart-combo-chart-single");
  await pane.scrollIntoViewIfNeeded();
  const chart = pane.locator(".fa-chart");
  await expect(chart.locator(".fa-chart-axis-name")).toHaveText(["Hours"]);
  await expect(chart.locator('.fa-chart-tick[data-side="right"]')).toHaveCount(0);
  const slider = chart.getByRole("slider");
  await slider.focus();
  const tip = page.locator("body > .fa-chart-tip[data-placed]");
  await expect(tip.locator(".fa-chart-tip-foot")).toHaveText(/^Total 80/);
  await expect(tip.locator(".fa-chart-tip-label")).toHaveText(["Build", "Design", "Plan"]);
});

const SELECTED = {
  "combo-chart": [/Selected month: Jan/, /Selected month: Aug/],
  "funnel-chart": [/Selected stage: visited/, /Selected stage: returned/],
  "radar-chart": [/Selected measure: Colour/, /Selected measure: Composition/],
  "sankey-chart": [/Selected: \w+$/, /Selected: \w+ to \w+/],
} as const;

for (const id of IDS) {
  test(`${id}: Enter, Space and a click activate the position @responsive`, async ({ page }) => {
    await preferences(page);
    await page.goto(`/components/${id}`);
    const pane = page.getByTestId(`chart-${id}-activate`);
    await pane.scrollIntoViewIfNeeded();
    const slider = pane.getByRole("slider");
    await expect(slider).toHaveAccessibleName(/Enter selects$/);
    await expect(slider).toHaveCSS("cursor", "pointer");
    const picked = page.getByTestId(`chart-${id}-picked`);
    await slider.focus();
    await page.keyboard.press("Enter");
    await expect(picked).toHaveText(SELECTED[id][0]);
    await page.keyboard.press("End");
    await page.keyboard.press(" ");
    await expect(picked).toHaveText(SELECTED[id][1]);
    await page.keyboard.press("Home");
    const box = (await slider.boundingBox())!;
    const before = await picked.textContent();
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.2);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => picked.textContent()).not.toBe("");
    expect(before).toBeTruthy();
  });
}

test("funnel-chart: rows, rates and a stage hidden from them", async ({ page }) => {
  await preferences(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { chart } = await open(page, "funnel-chart");
  await expect(chart.locator(".fa-chart-title")).toHaveText("Gallery visitors");
  await expect(chart.locator(".fa-chart-funnel-bar")).toHaveCount(5);
  const widths = await chart.locator(".fa-chart-funnel-bar").evaluateAll((bars) => bars.map((bar) => bar.getBoundingClientRect().width));
  expect(widths[1]! / widths[0]!).toBeCloseTo(0.5, 2);
  await expect(chart.locator(".fa-chart-funnel-rate")).toHaveText(["50%", "50%", "45%", "40%"]);

  const slider = chart.getByRole("slider");
  await slider.focus();
  await page.keyboard.press("ArrowDown");
  await expect(slider).toHaveAttribute("aria-valuetext", /Enquired · 6,240.visitors · 50% of first stage · 50% of previous stage/);
  await expect(page.locator(".fa-chart-tip-foot")).toContainText("6,240");
  await page.keyboard.press("ArrowUp");
  await expect(slider).toHaveAttribute("aria-valuetext", /^Visited gallery/);
  await page.keyboard.press("Escape");

  // The legend lives under the plot, so hiding keeps the title and the row labels in place.
  const legend = chart.locator(".fa-chart-foot").getByRole("toolbar");
  await legend.getByRole("button", { name: "Enquired" }).click();
  await expect(chart.locator(".fa-chart-funnel-bar")).toHaveCount(4);
  await expect(chart.locator(".fa-chart-funnel-rate").first()).toHaveText("25%");
  // The table keeps every stage.
  await chart.getByRole("button", { name: "View as table" }).click();
  await expect(chart.locator("table[data-chart-table='visible'] tbody tr")).toHaveCount(5);
});

test("funnel-chart: a start-aligned funnel lines its bars up", async ({ page }) => {
  await preferences(page);
  await page.goto("/components/funnel-chart");
  const pane = page.getByTestId("chart-funnel-chart-start");
  await pane.scrollIntoViewIfNeeded();
  const lefts = await pane.locator(".fa-chart-funnel-bar").evaluateAll((bars) => bars.map((bar) => Math.round(bar.getBoundingClientRect().left)));
  expect(new Set(lefts).size).toBe(1);
  await expect(pane.locator('.fa-chart-funnel-bar[data-tone="warning"]')).toHaveCount(1);
});

test("funnel-chart: the columns mirror in right-to-left text and arrow keys follow @responsive", async ({ page }) => {
  await preferences(page);
  const { chart } = await open(page, "funnel-chart", "?dir=rtl&lang=ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const name = chart.locator(".fa-chart-funnel-name").first();
  const value = chart.locator(".fa-chart-funnel-value").first();
  expect((await name.boundingBox())!.x).toBeGreaterThan((await value.boundingBox())!.x);
  const slider = chart.getByRole("slider");
  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(slider).toHaveAttribute("aria-valuenow", "1");
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "0");
});

test("radar-chart: a spoke per measure, and arrow keys go where they point", async ({ page }) => {
  await preferences(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { chart } = await open(page, "radar-chart");
  await expect(chart.locator(".fa-chart-radar-label")).toHaveText(["Colour", "Contrast", "Sharpness", "Framing", "Exposure", "Composition"]);
  await expect(chart.locator(".fa-chart-radar-area")).toHaveCount(2);
  const slider = chart.getByRole("slider");
  await slider.focus();
  await expect(slider).toHaveAttribute("aria-valuetext", /^Colour · North studio 8\.2, South studio 6\.1/);
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuetext", /^Contrast/);
  await page.keyboard.press("ArrowDown");
  await expect(slider).toHaveAttribute("aria-valuetext", /^Sharpness/);
  await page.keyboard.press("ArrowLeft");
  await expect(slider).toHaveAttribute("aria-valuetext", /^Framing|^Exposure/);
  await page.keyboard.press("Escape");

  // Pointing at a series in the legend brings it forward; hiding one drops it.
  const legend = chart.getByRole("toolbar", { name: "Series" });
  await legend.getByRole("button", { name: "South studio" }).hover();
  await expect(chart.locator(".fa-chart-svg").first()).toHaveAttribute("data-focus", "");
  await expect(chart.locator('.fa-chart-series[data-series="north"]')).toHaveCSS("opacity", "0.28");
  await page.mouse.move(0, 0);
  await expect(chart.locator(".fa-chart-svg").first()).not.toHaveAttribute("data-focus", "");
  await legend.getByRole("button", { name: "South studio" }).click();
  await expect(chart.locator(".fa-chart-radar-area")).toHaveCount(1);
});

test("radar-chart: a missing reading breaks the outline, and the ring does not mirror @responsive", async ({ page }) => {
  await preferences(page);
  await page.goto("/components/radar-chart");
  const pane = page.getByTestId("chart-radar-chart-gap");
  await pane.scrollIntoViewIfNeeded();
  await expect(pane.locator(".fa-chart-radar-area")).toHaveCount(0);
  await expect(pane.locator(".fa-chart-line")).toHaveCount(1);
  await expect(pane.locator(".fa-chart-series .fa-chart-dot")).toHaveCount(5);

  const { chart } = await open(page, "radar-chart", "?dir=rtl&lang=ar");
  const labels = chart.locator(".fa-chart-radar-label");
  await expect(labels).toHaveCount(6);
  // The second spoke stands to the right of the first, as it does in left-to-right text.
  expect((await labels.nth(1).boundingBox())!.x).toBeGreaterThan((await labels.nth(0).boundingBox())!.x);
});

test("combo-chart: the value axes do not mirror @responsive", async ({ page }) => {
  await preferences(page);
  const { chart } = await open(page, "combo-chart", "?dir=rtl&lang=ar");
  const left = (await chart.locator('.fa-chart-tick[data-side="left"]').first().boundingBox())!;
  const right = (await chart.locator('.fa-chart-tick[data-side="right"]').first().boundingBox())!;
  expect(left.x).toBeLessThan(right.x);
  await expect(chart.locator(".fa-chart-tick").first()).toBeVisible();
  const columns = await chart.locator(".fa-chart-bar").evaluateAll((bars) => bars.map((bar) => bar.getBoundingClientRect().left));
  expect(columns[1]).toBeGreaterThan(columns[0]!);
});

test("sankey-chart: flows to scale, the keyboard through nodes and flows, groups hidden and shown", async ({ page }) => {
  await preferences(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { chart } = await open(page, "sankey-chart");
  await expect(chart.locator(".fa-chart-sankey-node")).toHaveCount(7);
  await expect(chart.locator(".fa-chart-sankey-link")).toHaveCount(9);
  // Every ribbon's height at the node equals its share of the node's height.
  const heights = await chart.locator(".fa-chart-sankey-node").evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  expect(heights[0]! / heights[1]!).toBeCloseTo(1, 2);

  const slider = chart.getByRole("slider");
  await slider.focus();
  await expect(slider).toHaveAttribute("aria-valuetext", /^Briefing · 60.h$/);
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuetext", /Briefing → (Layout|Copy) · \d+.h · \d+% of source/);
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuetext", /^(Layout|Copy) · /);
  const overlay = chart.locator(".fa-chart-overlay .fa-chart-sankey-link");
  await expect(overlay.first()).toBeAttached();
  await page.keyboard.press("Escape");
  await expect(overlay).toHaveCount(0);

  const legend = chart.getByRole("toolbar", { name: "Series" });
  await legend.getByRole("button", { name: "Delivery" }).click();
  await expect(chart.locator(".fa-chart-sankey-node")).toHaveCount(5);
  await expect(chart.locator(".fa-chart-sankey-link")).toHaveCount(4);
  await legend.getByRole("button", { name: "Delivery" }).click();
  await expect(chart.locator(".fa-chart-sankey-node")).toHaveCount(7);
});

test("sankey-chart: a loop is left out of the drawing and said aloud", async ({ page }) => {
  await preferences(page);
  await page.goto("/components/sankey-chart");
  const pane = page.getByTestId("chart-sankey-chart-loop");
  await pane.scrollIntoViewIfNeeded();
  const chart = pane.locator(".fa-chart");
  await expect(chart.locator(".fa-chart-sankey-link")).toHaveCount(2);
  await expect(chart).toHaveAccessibleDescription("1 flow that loops back is in the table but not drawn.");
  await chart.getByRole("button", { name: "View as table" }).click();
  await expect(chart.locator("table[data-chart-table='visible'] tbody tr")).toHaveCount(3);
  await expect(chart.locator(".fa-chart-table-notes")).toContainText("1 flow that loops back");
});

test("sankey-chart: the flow starts on the right in right-to-left text @responsive", async ({ page }) => {
  await preferences(page);
  const { chart } = await open(page, "sankey-chart", "?dir=rtl&lang=ar");
  const nodes = chart.locator(".fa-chart-sankey-node");
  await expect(nodes).toHaveCount(7);
  const [first, last] = [await nodes.nth(0).boundingBox(), await nodes.nth(6).boundingBox()];
  expect(first!.x).toBeGreaterThan(last!.x);
  const slider = chart.getByRole("slider");
  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(slider).not.toHaveAttribute("aria-valuenow", "0");
  await expectLabelsInside(chart);
});

test("the new charts fit a phone without widening the page @responsive", async ({ page }) => {
  await preferences(page);
  for (const id of IDS) {
    const { chart } = await open(page, id);
    await expectLabelsInside(chart);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(scroll).toBeLessThanOrEqual(0);
  }
});

/** WCAG contrast from sRGB, with colours resolved through a canvas so oklch and color-mix work. */
const CONTRAST = `
  const canvas = document.createElement("canvas");
  canvas.width = 1; canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const rgba = (css) => { context.clearRect(0, 0, 1, 1); context.fillStyle = css; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data]; };
  const over = (top, ground) => { const a = top[3] / 255; return [0, 1, 2].map((i) => top[i] * a + ground[i] * (1 - a)); };
  const lum = ([r, g, b]) => { const f = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
`;

/** The worst text contrast in the chart, against the pixels under each piece of text. */
async function textContrast(page: Page, chart: Locator, selector: string) {
  await page.addStyleTag({ content: `.fa-measure-text, .fa-measure-text * { color: transparent !important; text-shadow: none !important } .fa-measure-text :is(.fa-chart-swatch) { opacity: 0 !important } .fa-chart-sankey-link { stroke: transparent !important }` });
  await chart.evaluate((element) => element.classList.add("fa-measure-text"));
  await page.waitForTimeout(80);
  const png = (await chart.screenshot()).toString("base64");
  await chart.evaluate((element) => element.classList.remove("fa-measure-text"));
  return chart.evaluate(
    async (element, [png64, query, script]) => {
      const measure = new Function("element", "png64", "query", `return (async () => {
        ${script}
        const image = await createImageBitmap(await (await fetch("data:image/png;base64," + png64)).blob());
        const shot = document.createElement("canvas");
        shot.width = image.width; shot.height = image.height;
        const paper = shot.getContext("2d", { willReadFrequently: true });
        paper.drawImage(image, 0, 0);
        const box = element.getBoundingClientRect();
        const scale = image.width / box.width;
        const out = [];
        for (const label of element.querySelectorAll(query)) {
          const rect = label.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          const ink = rgba(getComputedStyle(label).color);
          let worst = Infinity;
          for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
            const x = Math.min(image.width - 1, Math.max(0, Math.floor((rect.left - box.left + (rect.width * (i + 0.5)) / 6) * scale)));
            const y = Math.min(image.height - 1, Math.max(0, Math.floor((rect.top - box.top + (rect.height * (j + 0.5)) / 3) * scale)));
            const ground = [...paper.getImageData(x, y, 1, 1).data];
            worst = Math.min(worst, ratio(ink, ground));
          }
          out.push({ text: label.textContent.slice(0, 24), ratio: worst });
        }
        return out;
      })()`);
      return (await measure(element, png64, query)) as Array<{ text: string; ratio: number }>;
    },
    [png, selector, CONTRAST] as const,
  );
}

/** The marks' fill or stroke against the pixels beside them; a tint's edge carries the 3:1. */
async function markContrast(chart: Locator, selector: string, property: "fill" | "stroke") {
  return chart.evaluate(
    (element, [query, prop, script]) =>
      new Function("element", "query", "prop", `${script}
        const ground = (node) => { for (let at = node; at; at = at.parentElement) { const colour = getComputedStyle(at).getPropertyValue("--surface-3"); if (colour) return rgba(colour); } return [255, 255, 255, 255]; };
        const out = [];
        for (const mark of element.querySelectorAll(query)) {
          const paint = rgba(getComputedStyle(mark).getPropertyValue("--_c") || getComputedStyle(mark)[prop]);
          out.push(ratio(paint, ground(mark)));
        }
        return out;`)(element, query, prop) as number[],
    [selector, property, CONTRAST] as const,
  );
}

const TEXT: Record<(typeof IDS)[number], { selector: string; floor: number }[]> = {
  "combo-chart": [{ selector: ".fa-chart-tick, .fa-chart-cat, .fa-chart-axis-name-text", floor: 4.5 }],
  "funnel-chart": [{ selector: ".fa-chart-funnel-name, .fa-chart-funnel-value, .fa-chart-funnel-share, .fa-chart-funnel-rate", floor: 4.5 }],
  "radar-chart": [{ selector: ".fa-chart-radar-label", floor: 4.5 }],
  "sankey-chart": [{ selector: ".fa-chart-sankey-name, .fa-chart-sankey-value", floor: 4.5 }],
};
const MARKS: Record<(typeof IDS)[number], string> = {
  "combo-chart": ".fa-chart-axis-rule, .fa-chart-bar",
  "funnel-chart": ".fa-chart-funnel-bar",
  "radar-chart": ".fa-chart-series .fa-chart-line",
  "sankey-chart": ".fa-chart-sankey-node, .fa-chart-sankey-link",
};

for (const id of IDS) {
  test(`${id}: marks reach 3:1 and text 4.5:1 in every palette and mode`, async ({ page }) => {
    test.setTimeout(240_000);
    await preferences(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    const { chart } = await open(page, id);
    const failures: string[] = [];
    for (const mode of ["light", "dark"])
      for (const palette of PALETTES) {
        await page.evaluate(([m, p]) => {
          document.documentElement.dataset.mode = m;
          document.documentElement.dataset.palette = p;
        }, [mode, palette]);
        await page.waitForTimeout(120);
        for (const { selector, floor } of TEXT[id])
          for (const { text, ratio } of await textContrast(page, chart, selector))
            if (ratio < floor) failures.push(`${palette} ${mode} text "${text}" ${ratio.toFixed(2)}`);
        const ratios = await markContrast(chart, MARKS[id], "fill");
        const worst = Math.min(...ratios);
        if (worst < 3) failures.push(`${palette} ${mode} mark ${worst.toFixed(2)}`);
      }
    expect(failures).toEqual([]);
  });
}
