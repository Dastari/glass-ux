import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";

/** ChipOverflow with wrap={false}, measured under the theme's density, UI scale, radius and line weight. */
const PRESETS = [
  { name: "default", density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1, mode: "light" },
  { name: "dense large", density: "compact", uiScale: 1.25, radiusScale: 0, borderWidth: 2, mode: "dark" },
  { name: "dense small", density: "compact", uiScale: 0.875, radiusScale: 1.5, borderWidth: 0.5, glass: "solid" },
] as const;

interface Measured {
  root: DOMRect;
  parent: DOMRect;
  trigger: DOMRect | null;
  triggerName: string | null;
  items: { left: number; right: number; top: number; bottom: number; cut: boolean; overflow: string }[];
}

const measure = (box: Locator) =>
  box.evaluate((element): Measured => {
    const root = element.querySelector(".fa-chip-overflow")!;
    const trigger = root.querySelector<HTMLElement>(":scope > .fa-btn");
    return {
      root: root.getBoundingClientRect().toJSON(),
      parent: element.getBoundingClientRect().toJSON(),
      trigger: trigger ? trigger.getBoundingClientRect().toJSON() : null,
      triggerName: trigger?.textContent ?? null,
      items: [...root.querySelectorAll(".fa-chip-overflow-item")].map((item) => {
        const box = item.getBoundingClientRect();
        const label = item.querySelector<HTMLElement>(".fa-badge-label")!;
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          cut: label.scrollWidth > label.clientWidth,
          overflow: getComputedStyle(label).textOverflow,
        };
      }),
    };
  });

for (const preset of PRESETS) {
  test.describe(preset.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((settings) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(settings)), {
        ...preset,
        motion: "reduced",
      });
      await page.goto("/components/chip-overflow");
      await expect(page.locator("html")).toHaveAttribute("data-density", preset.density);
    });

    test("stays on one line inside its box with +N whole @responsive", async ({ page }) => {
      const wide = await measure(page.getByTestId("chip-overflow-w-full"));
      for (const id of ["chip-overflow-w-full", "chip-overflow-w-64", "chip-overflow-w-40"]) {
        const box = page.getByTestId(id);
        await box.scrollIntoViewIfNeeded();
        const { root, parent, trigger, triggerName, items } = await measure(box);
        // Inside the box it was given.
        expect(root.right).toBeLessThanOrEqual(parent.right + 0.5);
        expect(root.left).toBeGreaterThanOrEqual(parent.left - 0.5);
        // One line: the chips share a row with the trigger.
        expect(items).toHaveLength(2);
        for (const item of items) {
          expect(Math.abs(item.top - items[0]!.top)).toBeLessThan(1);
          expect(item.top).toBeGreaterThanOrEqual(root.top - 0.5);
          expect(item.bottom).toBeLessThanOrEqual(root.bottom + 0.5);
        }
        expect(root.height).toBeLessThanOrEqual(trigger!.height + 1);
        // The trigger is whole, after the chips, and the same size wherever it sits.
        expect(triggerName).toBe("+2");
        expect(trigger!.right).toBeLessThanOrEqual(parent.right + 0.5);
        expect(trigger!.left).toBeGreaterThanOrEqual(items[1]!.right);
        expect(Math.abs(trigger!.width - wide.trigger!.width)).toBeLessThan(0.5);
        // Chips do not overlap.
        expect(items[1]!.left).toBeGreaterThanOrEqual(items[0]!.right);
      }
      // A box too small for the chips cuts them with an ellipsis.
      const narrow = await measure(page.getByTestId("chip-overflow-w-40"));
      expect(narrow.items.every((item) => item.cut && item.overflow === "ellipsis")).toBe(true);
      const widths = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(widths[0]).toBeLessThanOrEqual(widths[1]!);
    });

    test("a table row keeps its height", async ({ page }) => {
      const table = page.getByTestId("chip-overflow-table");
      await table.scrollIntoViewIfNeeded();
      const row = table.locator('[role="row"]', { hasText: "Halden" });
      const cell = row.locator(".fa-chip-overflow");
      await expect(cell).toBeVisible();
      const heights = await row.evaluate((element) => {
        const rowBox = element.getBoundingClientRect();
        const chip = element.querySelector(".fa-chip-overflow")!.getBoundingClientRect();
        const cellBox = element.querySelector(".fa-chip-overflow")!.closest(".fa-dt-cell")!.getBoundingClientRect();
        const trigger = element.querySelector(".fa-chip-overflow > .fa-btn")!.getBoundingClientRect();
        return { row: rowBox.height, chip: chip.height, right: chip.right, cellRight: cellBox.right, triggerRight: trigger.right };
      });
      expect(heights.chip).toBeLessThanOrEqual(heights.row);
      expect(heights.right).toBeLessThanOrEqual(heights.cellRight + 0.5);
      expect(heights.triggerRight).toBeLessThanOrEqual(heights.cellRight + 0.5);
      const other = table.locator('[role="row"]', { hasText: "Mossbridge" });
      expect(await other.evaluate((element) => element.getBoundingClientRect().height)).toBe(heights.row);
    });
  });
}

test("a cut chip shows its label in a tooltip, and takes focus when no +N lists it", async ({ page }) => {
  await page.goto("/components/chip-overflow");
  const narrow = page.getByTestId("chip-overflow-w-40");
  await narrow.scrollIntoViewIfNeeded();
  const chip = narrow.locator(".fa-chip-overflow-item").first();
  await expect(chip).not.toHaveAttribute("tabindex", "0");
  await chip.hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "Northern freight corridor" })).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);

  const alone = page.getByTestId("chip-overflow-no-trigger").locator(".fa-chip-overflow-item");
  await expect(alone).toHaveAttribute("tabindex", "0");
  await page.keyboard.press("Tab");
  await alone.focus();
  await expect(page.getByRole("tooltip").filter({ hasText: "Northern freight corridor" })).toBeVisible();
});

test("a chip with room has no tooltip and no tab stop", async ({ page }) => {
  await page.goto("/components/chip-overflow");
  const chip = page.getByTestId("chip-overflow-w-full").locator(".fa-chip-overflow-item").first();
  await expect(chip).not.toHaveAttribute("tabindex", "0");
  await chip.hover();
  await page.waitForTimeout(800);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});

test("the +N popover still lists every entry", async ({ page }) => {
  await page.goto("/components/chip-overflow");
  const narrow = page.getByTestId("chip-overflow-w-40");
  await narrow.scrollIntoViewIfNeeded();
  await narrow.getByRole("button", { name: "2 more Routes" }).click();
  await expect(page.getByRole("list", { name: "Routes" }).getByRole("listitem")).toHaveCount(4);
});

test("the single-line specimens have no axe violations", async ({ page }) => {
  await page.goto("/components/chip-overflow");
  const box = page.getByTestId("chip-overflow-one-line");
  await box.scrollIntoViewIfNeeded();
  await expect(box.getByRole("button", { name: "2 more Routes" }).first()).toBeVisible();
  const results = await new AxeBuilder({ page }).include("[data-testid=chip-overflow-one-line]").analyze();
  expect(results.violations).toEqual([]);
});

test("a table's card keeps the field's label whole @responsive", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "cards are the phone layout");
  await page.goto("/components/chip-overflow");
  const table = page.getByTestId("chip-overflow-table");
  await table.scrollIntoViewIfNeeded();
  const label = table.locator(".fa-dt-card-label").first();
  await expect(label).toHaveText("Routes");
  expect(await label.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const fits = await table.locator(".fa-dt-card-field").first().evaluate((field) => {
    const box = field.getBoundingClientRect();
    const trigger = field.querySelector(".fa-chip-overflow > .fa-btn")!.getBoundingClientRect();
    return trigger.right <= box.right + 0.5;
  });
  expect(fits).toBe(true);
});
