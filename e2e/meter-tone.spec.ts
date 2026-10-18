import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

/*
 * Meter's tone: a healthy level is neutral by default, or the first data colour with
 * tone="data"; warning and danger apply past 75% and 90% either way. Colours are compared
 * with the theme's own tokens, resolved in the meter's context.
 */

async function colours(page: Page, name: string) {
  // The first meter of that name: the neutral specimen repeats "Storage used" at 48%, 84%, 98%.
  const meter = page.getByRole("meter", { name, exact: true }).first();
  await expect(meter).toBeVisible({ timeout: 30_000 });
  return meter.evaluate((element) => {
    const root = element.closest(".fa-meter")!;
    const resolve = (value: string) => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = value;
      root.append(probe);
      const colour = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return colour;
    };
    return {
      bar: getComputedStyle(root.querySelector(".fa-meter-indicator")!).backgroundColor,
      level: root.getAttribute("data-level"),
      tone: root.getAttribute("data-tone"),
      chart: resolve("var(--chart-1)"),
      neutral: resolve("var(--fg-subtle)"),
      warning: resolve("var(--warning)"),
      danger: resolve("var(--danger)"),
    };
  });
}

for (const mode of ["light", "dark"] as const) {
  test(`${mode}: MeterCell tone="data" uses --chart-1 while healthy and keeps its thresholds`, async ({ page }) => {
    await page.addInitScript(
      (mode) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode, motion: "reduced" })),
      mode,
    );
    await page.goto("/components/meter-cell");
    await expect(page.locator("html")).toHaveAttribute("data-mode", mode);

    const neutral = await colours(page, "Storage used");
    expect([neutral.tone, neutral.level]).toEqual([null, "normal"]);
    expect(neutral.bar).toBe(neutral.neutral);

    const healthy = await colours(page, "Archive volume used");
    expect([healthy.tone, healthy.level]).toEqual(["data", "normal"]);
    expect(healthy.bar).toBe(healthy.chart);
    expect(healthy.chart).not.toBe(healthy.neutral);

    const warning = await colours(page, "Media volume used");
    expect([warning.tone, warning.level]).toEqual(["data", "warning"]);
    expect(warning.bar).toBe(warning.warning);

    const danger = await colours(page, "Scratch volume used");
    expect([danger.tone, danger.level]).toEqual(["data", "danger"]);
    expect(danger.bar).toBe(danger.danger);
  });
}

test("MeterCell tone=\"data\" keeps its name, exact reading and narrow-cell layout, and passes axe @responsive", async ({ page }) => {
  await page.goto("/components/meter-cell");
  const healthy = page.getByRole("meter", { name: "Archive volume used" });
  await expect(healthy).toBeVisible({ timeout: 30_000 });
  await expect(healthy).toHaveAttribute("aria-valuetext", "24 GB of 50 GB");
  await expect(healthy).toHaveAttribute("aria-valuenow", "24");
  await expect(healthy).toHaveAttribute("aria-valuemax", "50");

  const narrow = page.getByRole("meter", { name: "Rooms booked" });
  await expect(narrow).toHaveAttribute("aria-valuetext", "3 / 10");
  const layout = await narrow.evaluate((element) => {
    const cell = element.closest(".fa-meter-cell")!.getBoundingClientRect();
    const reading = element.querySelector(".fa-meter-value")!.getBoundingClientRect();
    return {
      cellWidth: cell.width,
      readingWidth: reading.width,
      track: getComputedStyle(element.querySelector(".fa-meter-track")!).display,
    };
  });
  expect(layout.cellWidth).toBeGreaterThan(0);
  expect(layout.readingWidth).toBeGreaterThan(0);
  expect(layout.readingWidth).toBeLessThanOrEqual(layout.cellWidth + 0.5);
  expect(layout.track).toBe("none");

  const result = await new AxeBuilder({ page }).include("#meter-cell .fa-meter[data-tone='data']").analyze();
  expect(result.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
  expect(result.passes.length).toBeGreaterThan(0);
});

test("Meter tone=\"data\" on the Meter page uses --chart-1 while healthy and the status tones past each threshold", async ({ page }) => {
  await page.goto("/components/meter");
  const healthy = await colours(page, "Archive volume");
  expect([healthy.tone, healthy.level, healthy.bar]).toEqual(["data", "normal", healthy.chart]);
  const warning = await colours(page, "Media volume");
  expect([warning.level, warning.bar]).toEqual(["warning", warning.warning]);
  const danger = await colours(page, "Scratch volume");
  expect([danger.level, danger.bar]).toEqual(["danger", danger.danger]);
  const neutral = await colours(page, "CPU");
  expect([neutral.tone, neutral.bar]).toEqual([null, neutral.neutral]);
});
