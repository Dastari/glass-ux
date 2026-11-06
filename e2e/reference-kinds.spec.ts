import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** ReferenceInput's kind filter with fourteen kinds, measured against the popup it sits in. */
const PRESETS = [
  { name: "default", density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1, mode: "light" },
  { name: "dense large", density: "compact", uiScale: 1.25, radiusScale: 0, borderWidth: 2, mode: "dark" },
  { name: "dense small", density: "compact", uiScale: 0.875, radiusScale: 1.5, borderWidth: 0.5, glass: "solid" },
] as const;

for (const preset of PRESETS) {
  test(`the kinds keep to one scrolling row: ${preset.name} @responsive`, async ({ page }) => {
    await page.addInitScript((settings) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(settings)), {
      ...preset,
      motion: "reduced",
    });
    await page.goto("/components/reference-input");
    await expect(page.locator("html")).toHaveAttribute("data-density", preset.density);
    const field = page.getByTestId("reference-many-kinds");
    await field.scrollIntoViewIfNeeded();
    await field.getByRole("combobox").click();
    await page.keyboard.type("@");
    const kinds = page.getByRole("group", { name: "Kind" });
    await expect(kinds.getByRole("button")).toHaveCount(15);
    const measured = await kinds.evaluate((row) => {
      const chips = [...row.querySelectorAll("button")].map((chip) => chip.getBoundingClientRect());
      const popup = row.closest(".fa-ref-popup")!.getBoundingClientRect();
      const box = row.getBoundingClientRect();
      return {
        tops: chips.map((chip) => chip.top),
        chipHeight: chips[0]!.height,
        rowHeight: box.height,
        popupHeight: popup.height,
        popupWidth: popup.width,
        rowWidth: box.width,
        scrollWidth: row.scrollWidth,
        clientWidth: row.clientWidth,
      };
    });
    // One line of chips.
    for (const top of measured.tops) expect(Math.abs(top - measured.tops[0]!)).toBeLessThan(1);
    // Scrolling, not wrapping or spilling out of the popup.
    expect(measured.scrollWidth).toBeGreaterThan(measured.clientWidth);
    expect(measured.rowWidth).toBeLessThanOrEqual(measured.popupWidth);
    // The row is about a chip high, whatever the popup's height.
    expect(measured.rowHeight).toBeLessThan(measured.chipHeight * 2);
  });
}

test("the row takes little of a phone popup, and results keep the rest @responsive", async ({ page }, info) => {
  await page.goto("/components/reference-input");
  const field = page.getByTestId("reference-many-kinds");
  await field.scrollIntoViewIfNeeded();
  await field.getByRole("combobox").click();
  await page.keyboard.type("@");
  const row = page.getByRole("group", { name: "Kind" });
  await expect(row).toBeVisible();
  const share = await row.evaluate((element) => element.getBoundingClientRect().height / element.closest(".fa-ref-popup")!.getBoundingClientRect().height);
  // The report that asked for this measured about 40% with wrapped chips.
  expect(share, info.project.name).toBeLessThan(0.25);
});

test("Alt arrows bring the chosen kind into view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/components/reference-input");
  const field = page.getByTestId("reference-many-kinds");
  await field.scrollIntoViewIfNeeded();
  await field.getByRole("combobox").click();
  await page.keyboard.type("@");
  const row = page.getByRole("group", { name: "Kind" });
  await expect(row).toBeVisible();
  // All, then back round to the last kind, which starts out of sight.
  await page.keyboard.press("Alt+ArrowLeft");
  const last = row.getByRole("button", { name: "Reports" });
  await expect(last).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() =>
      last.evaluate((chip) => {
        const box = chip.getBoundingClientRect();
        const parent = chip.parentElement!.getBoundingClientRect();
        return box.left >= parent.left - 0.5 && box.right <= parent.right + 0.5;
      }),
    )
    .toBe(true);
  // The field keeps focus throughout.
  await expect(field.getByRole("combobox")).toBeFocused();
});

test("a field's add label is its own", async ({ page }) => {
  await page.goto("/components/reference-input");
  await expect(page.getByTestId("reference-tags").getByRole("button", { name: "Tag…" })).toBeVisible();
  await expect(page.getByTestId("reference-tags").getByRole("button", { name: "Link…" })).toHaveCount(0);
  await expect(page.getByTestId("reference-many-kinds").getByRole("button", { name: "Link…" })).toBeVisible();
});

test("the open popup has no axe violations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/components/reference-input");
  const field = page.getByTestId("reference-many-kinds");
  await field.scrollIntoViewIfNeeded();
  await field.getByRole("combobox").click();
  await page.keyboard.type("@");
  await expect(page.getByRole("group", { name: "Kind" })).toBeVisible();
  // Focus stays in the input, the combobox pattern: ↑ ↓ move through the results and Alt ← → through
  // the kinds, each scrolling what it moves, which axe cannot see from the scrolling regions.
  const results = await new AxeBuilder({ page }).include(".fa-ref-popup").disableRules(["scrollable-region-focusable"]).analyze();
  expect(results.violations).toEqual([]);
});
