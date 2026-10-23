import { expect, test, type Locator } from "@playwright/test";

/*
 * LineChart gaps: by default a missing sample breaks the line; gaps="bridge" joins the
 * readings on either side with a dashed line that carries no value. The tooltip and the
 * data table at a gap still show no value.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })),
  );
  await page.goto("/components/line-chart");
  await expect(page.getByTestId("chart-gaps-bridge").locator(".fa-chart-line").first()).toBeAttached({ timeout: 30_000 });
});

const bridges = (chart: Locator) => chart.locator(".fa-chart-bridge");

test("bridges draw only with gaps='bridge', dashed, with a title and a description", async ({ page }) => {
  await expect(bridges(page.getByTestId("chart-gaps-break"))).toHaveCount(0);
  const bridged = page.getByTestId("chart-gaps-bridge");
  // Two interior gaps in the specimen; none before the first reading or after the last.
  await expect(bridges(bridged)).toHaveCount(2);
  const first = bridges(bridged).first();
  expect(await first.evaluate((path) => getComputedStyle(path).strokeDasharray)).not.toBe("none");
  await expect(first.locator("title")).toHaveText("No samples available · visual bridge only");
  // A straight segment between two real readings: one move and one line command.
  expect(await first.evaluate((path) => getComputedStyle(path).d)).toMatch(/^path\("M [\d.]+ [\d.]+ L [\d.]+ [\d.]+"\)$/);
  const figure = bridged.locator("figure");
  const describedBy = await figure.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  await expect(page.locator(`[id="${describedBy!.split(" ").pop()}"]`)).toHaveText(
    "Dashed lines join readings across times with no samples.",
  );
  await expect(page.getByTestId("chart-gaps-break").locator("figure")).not.toHaveAttribute("aria-describedby", /./);
});

test("at a gap the tooltip and the table show no value", async ({ page }) => {
  const bridged = page.getByTestId("chart-gaps-bridge");
  await bridged.scrollIntoViewIfNeeded();
  // Index 16 of 24 is inside the long gap (indices 15–18).
  const svg = (await bridged.locator(".fa-chart-svg").boundingBox())!;
  const plot = await bridged.locator(".fa-chart-bridge").nth(1).evaluate((path) => {
    const box = (path as SVGGraphicsElement).getBBox();
    return { left: box.x, width: box.width };
  });
  await page.mouse.move(svg.x + plot.left + plot.width * 0.4, svg.y + svg.height / 2);
  const tooltip = page.locator(".fa-chart-tip").filter({ visible: true }).first();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("—");
  await expect(tooltip).not.toContainText("%");
  // The data table: the rows inside the gap have no value.
  const rows = await bridged.locator("table tbody tr").evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll("td, th")].map((cell) => cell.textContent?.trim())));
  const empty = rows.filter((cells) => cells.slice(1).every((cell) => !cell || cell === "—"));
  expect(empty.length).toBe(6);
});
