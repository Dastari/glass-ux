import { expect, test } from "@playwright/test";

test("a line chart point activates by click and Enter and draws the selection @responsive", async ({ page }) => {
  await page.goto("/components/line-chart");
  const hit = page.getByRole("slider", { name: "CPU on NST-C106 · fictional — inspect values, Enter selects" });
  await hit.scrollIntoViewIfNeeded();
  await expect(hit).toHaveCSS("cursor", "pointer");
  const caption = page.getByText(/^Processes and events at|^No time selected/);
  await expect(caption).toHaveText(/10:10/);

  // The selected time draws one accent rule; the caption below the chart never moves the chart.
  // The hit layer and the plot's SVG share the chart layer.
  const rule = hit.locator("xpath=..").locator(".fa-chart-selection-rule");
  await expect(rule).toHaveCount(1);
  const before = await hit.boundingBox();

  // Click near the left edge: the first samples.
  const box = (await hit.boundingBox())!;
  await page.mouse.click(box.x + 2, box.y + box.height / 2);
  await expect(caption).toHaveText(/09:00/);
  const ruleX = Number(await rule.getAttribute("x1"));

  // Keyboard: End, then Enter selects the last sample.
  await hit.focus();
  await page.keyboard.press("End");
  await expect(hit).toHaveAttribute("aria-valuetext", /CPU 27/);
  await page.keyboard.press("Enter");
  await expect(caption).toHaveText(/10:55/);
  await expect(hit).toHaveAttribute("aria-valuetext", /selected/);
  expect(Number(await rule.getAttribute("x1"))).toBeGreaterThan(ruleX);
  expect(await hit.boundingBox()).toEqual(before);
});

test("a chart without onActivate keeps the crosshair and its plain name", async ({ page }) => {
  await page.goto("/components/line-chart");
  const hit = page.getByRole("slider", { name: "LineChart · fictional studio projects — inspect values" }).first();
  await hit.scrollIntoViewIfNeeded();
  await expect(hit).toHaveCSS("cursor", "crosshair");
  await expect(page.locator('[data-testid="chart-line-chart"] .fa-chart-selection')).toHaveCount(0);
});
