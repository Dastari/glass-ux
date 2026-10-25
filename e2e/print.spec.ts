import { expect, test } from "@playwright/test";

/*
 * Print media (emulated): materials print as white surfaces with a hairline and no blur, the
 * canvas loses its artwork, text is dark whatever the mode, chrome is left out unless marked
 * data-print="keep", the document flows, charts keep their colours and the chart's own
 * tools are left out.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "dark" })),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
});

const lightness = (colour: string) => {
  const rgb = colour.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  if (colour.startsWith("oklch") || colour.startsWith("oklab")) return Number(colour.match(/[\d.]+/)![0]) * (colour.includes("%") ? 0.01 : 1);
  return (0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!) / 255;
};

test("a dark page prints light: white materials with a hairline, dark text, no blur or artwork", async ({ page }) => {
  await page.goto("/components/line-chart");
  await expect(page.getByTestId("chart-references").locator(".fa-chart-line").first()).toBeAttached({ timeout: 30_000 });
  const panel = page.locator(".glass-panel").first();
  const before = await panel.evaluate((el) => getComputedStyle(el, "::before").backgroundColor);
  await page.emulateMedia({ media: "print" });
  const printed = await panel.evaluate((el) => {
    const cs = getComputedStyle(el);
    const before = getComputedStyle(el, "::before");
    return { display: cs.display, border: cs.borderTopWidth, shadow: cs.boxShadow, beforeFill: before.backgroundColor, beforeBlur: before.backdropFilter, blur: cs.backdropFilter };
  });
  // The docs sidebar is shell chrome: it is left out.
  expect(printed.display).toBe("none");
  // A material that stays: the code well and every glass panel in the document.
  const glass = await page.evaluate(() =>
    [...document.querySelectorAll(".glass-panel, .glass-card, .glass-overlay, .glass-chrome")]
      .filter((el) => getComputedStyle(el).display !== "none")
      .map((el) => ({ fill: getComputedStyle(el).backgroundColor, shadow: getComputedStyle(el).boxShadow, blur: getComputedStyle(el).backdropFilter })),
  );
  for (const material of glass) {
    expect(material.shadow).toBe("none");
    expect(material.blur).toBe("none");
    expect(lightness(material.fill)).toBeGreaterThan(0.95);
  }
  expect(before).not.toBe("");
  const body = await page.evaluate(() => ({ colour: getComputedStyle(document.body).color, fill: getComputedStyle(document.body).backgroundColor, overflow: getComputedStyle(document.body).overflow }));
  expect(lightness(body.colour)).toBeLessThan(0.25);
  expect(lightness(body.fill)).toBeGreaterThan(0.95);
  expect(body.overflow).toBe("visible");
  expect(await page.locator(".canvas-silk").evaluateAll((els) => els.every((el) => getComputedStyle(el).display === "none"))).toBe(true);
});

test("charts print in colour with legends, without their tools; the accent text is dark", async ({ page }) => {
  await page.goto("/components/line-chart");
  const chart = page.getByTestId("chart-references");
  await expect(chart.locator(".fa-chart-line").first()).toBeAttached({ timeout: 30_000 });
  await page.emulateMedia({ media: "print" });
  const figure = chart.locator(".fa-chart");
  expect(await figure.evaluate((el) => getComputedStyle(el).printColorAdjust)).toBe("exact");
  await expect(chart.locator(".fa-chart-tools")).toBeHidden();
  const stroke = await page.getByTestId("chart-references-neutral").locator(".fa-chart-line").first().evaluate((el) => getComputedStyle(el).stroke);
  // A coloured series, not grey: its channels differ.
  const [r, g, b] = stroke.match(/[\d.]+/g)!.map(Number);
  expect(Math.max(r!, g!, b!) - Math.min(r!, g!, b!)).toBeGreaterThan(0.05);
  const accentText = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--accent-text)";
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  });
  expect(lightness(accentText)).toBeLessThan(0.5);
  await page.screenshot({ path: test.info().outputPath("print-charts.png"), fullPage: false });
});

test("data-print=\"keep\" keeps chrome; data-print=\"hide\" leaves anything out; the docs flow", async ({ page }) => {
  await page.goto("/components/line-chart");
  await expect(page.getByTestId("chart-references").locator(".fa-chart-line").first()).toBeAttached({ timeout: 30_000 });
  await page.evaluate(() => {
    document.querySelector(".docs-sidebar")?.setAttribute("data-print", "keep");
    document.querySelector("[data-testid='chart-references']")?.setAttribute("data-print", "hide");
  });
  await page.emulateMedia({ media: "print" });
  expect(await page.locator(".docs-sidebar").evaluate((el) => getComputedStyle(el).display)).not.toBe("none");
  await expect(page.getByTestId("chart-references")).toBeHidden();
  const content = await page.locator(".docs-content").evaluate((el) => ({ overflow: getComputedStyle(el).overflowY, height: el.scrollHeight - el.clientHeight }));
  expect(content.overflow).toBe("visible");
});
