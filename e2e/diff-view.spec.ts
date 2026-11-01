import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PALETTE_IDS = ["ocean", "aurora", "emerald", "sunset", "graphite", "ruby", "lagoon", "indigo", "rose", "moss", "sand", "slate"];

test("the sign reads without colour and the table has no axe violations", async ({ page }) => {
  await page.goto("/components/diff-view");
  const demo = page.getByTestId("diff-view-demo");
  await expect(demo.getByRole("cell", { name: "Added" }).first()).toHaveText("+");
  const results = await new AxeBuilder({ page }).include(".fa-diff").analyze();
  expect(results.violations).toEqual([]);
});

test("line numbers drop in a narrow box and the region scrolls from the keyboard @responsive", async ({ page }) => {
  await page.goto("/components/diff-view");
  const narrow = page.getByTestId("diff-view-narrow").locator(".fa-diff");
  await expect(narrow.locator(".fa-diff-number").first()).toBeHidden();
  await narrow.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => narrow.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("the token roles follow a surface's own material", async ({ page }) => {
  await page.goto("/components/diff-view");
  const line = page.getByTestId("diff-view-demo").locator('.fa-diff-line[data-type="add"]').first();
  const glass = await line.evaluate((element) => getComputedStyle(element).backgroundColor);
  await line.evaluate((element) => element.closest<HTMLElement>(".fa-diff")!.setAttribute("data-glass", "solid"));
  await expect.poll(() => line.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(glass);
});

test("text, signs and line numbers on the plain, add and remove surfaces meet AA in every palette, mode and material", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/components/diff-view");
  const demo = page.getByTestId("diff-view-demo");
  await expect(demo.locator(".fa-diff-line").first()).toBeVisible();
  const report = await page.evaluate((palettes) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const paint = (...layers: string[]) => {
      context.globalCompositeOperation = "source-over";
      context.fillStyle = "#808080";
      context.fillRect(0, 0, 1, 1);
      for (const layer of layers) {
        context.fillStyle = layer;
        context.fillRect(0, 0, 1, 1);
      }
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const luminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map((value) => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const ratio = (a: number[], b: number[]) => {
      const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (high! + 0.05) / (low! + 0.05);
    };
    const root = document.documentElement;
    const results: Array<Record<string, string | number>> = [];
    for (const palette of palettes)
      for (const mode of ["light", "dark"])
        for (const glass of ["full", "reduced", "solid"]) {
          root.dataset.palette = palette;
          root.dataset.mode = mode;
          root.dataset.glass = glass;
          const style = getComputedStyle(root);
          const surfaces = ["--surface-1", "--surface-2", "--surface-3"].map((name) => style.getPropertyValue(name));
          for (const type of ["context", "add", "remove"]) {
            const line = document.querySelector<HTMLElement>(`.fa-diff-line[data-type="${type}"]`)!;
            const tint = getComputedStyle(line).backgroundColor;
            const text = paint(getComputedStyle(line.querySelector(".fa-diff-text")!).color);
            const sign = paint(getComputedStyle(line.querySelector(".fa-diff-sign")!).color);
            const number = paint(getComputedStyle(line.querySelector(".fa-diff-number")!).color);
            for (const surface of surfaces) {
              const background = paint(surface, tint);
              results.push({
                palette,
                mode,
                glass,
                type,
                text: ratio(text, background),
                sign: ratio(sign, background),
                number: ratio(number, background),
              });
            }
          }
        }
    return results;
  }, PALETTE_IDS);
  expect(report.length).toBe(PALETTE_IDS.length * 2 * 3 * 3 * 3);
  const worst = (key: string, type?: string) => Math.min(...report.filter((row) => !type || row.type === type).map((row) => row[key] as number));
  console.log(
    `diff contrast over ${report.length} combinations: text ${worst("text").toFixed(2)}, sign ${worst("sign").toFixed(2)}, line number ${worst("number").toFixed(2)} ` +
      `(plain ${worst("number", "context").toFixed(2)}, add ${worst("number", "add").toFixed(2)}, remove ${worst("number", "remove").toFixed(2)})`,
  );
  expect(report.filter((row) => (row.text as number) < 4.5)).toEqual([]);
  expect(report.filter((row) => (row.sign as number) < 4.5)).toEqual([]);
  expect(report.filter((row) => (row.number as number) < 4.5)).toEqual([]);
});
