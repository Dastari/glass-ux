import { test, expect, type Page } from "@playwright/test";
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

/** Darkest and busiest artwork: where a tint over the canvas is hardest to read on. */
const CANVASES = ["network", "hills", "circuit", "facets", "grid"];
const GLASS_LEVELS = ["full", "reduced", "solid"];
const FLOOR = 4.5;

async function prepare(page: Page, appearance: Record<string, unknown>) {
  await page.addInitScript(
    (value) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", ...value })),
    appearance,
  );
  await page.goto("/components/diff-view");
  await expect(page.getByTestId("diff-view-demo").locator(".fa-diff-line").first()).toBeVisible();
  // One copy bare on the page canvas, one in a panel. The text is hidden, so a screenshot is the ground.
  await page.evaluate(() => {
    const source = document.querySelector('[data-testid="diff-view-demo"] .fa-diff')!;
    const intro = document.querySelector(".gallery-document-intro")!;
    const bare = source.cloneNode(true) as HTMLElement;
    bare.id = "diff-bare";
    const panel = document.createElement("div");
    panel.className = "glass-panel";
    panel.style.padding = "12px";
    const held = source.cloneNode(true) as HTMLElement;
    held.id = "diff-panel";
    panel.append(held);
    intro.before(bare, panel);
    const hide = document.createElement("style");
    hide.textContent = "#diff-bare *, #diff-panel * { color: transparent !important }";
    hide.id = "diff-hide";
    document.head.append(hide);
  });
}

/** The worst contrast of each ink on each kind of line, against the rendered pixels of that line. */
async function worst(page: Page, id: string) {
  const element = page.locator(`#${id}`);
  await element.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const png = (await element.screenshot()).toString("base64");
  return element.evaluate(async (root, png64) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const rgb = (css: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = "#000";
      context.fillStyle = css;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const luminance = (colour: number[]) => {
      const [r, g, b] = colour.map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const ratio = (a: number[], b: number[]) => {
      const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (high! + 0.05) / (low! + 0.05);
    };
    const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${png64}`)).blob());
    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);
    const frame = root.getBoundingClientRect();
    const scale = image.width / frame.width;
    const lines = [...root.querySelectorAll<HTMLElement>(".fa-diff-line")];
    // The inks are read with the text showing again.
    const hide = document.querySelector<HTMLStyleElement>("#diff-hide")!;
    const parts = [
      ["number", ".fa-diff-number"],
      ["sign", ".fa-diff-sign"],
      ["text", ".fa-diff-text"],
    ] as const;
    hide.disabled = true;
    const inks = lines.map((line) => parts.flatMap(([part, selector]) => {
      const piece = line.querySelector<HTMLElement>(selector)!;
      return piece.textContent!.trim() ? [{ part, colour: rgb(getComputedStyle(piece).color) }] : [];
    }));
    hide.disabled = false;
    const report: Record<string, number> = {};
    lines.forEach((line, index) => {
      const box = line.getBoundingClientRect();
      const ground: number[][] = [];
      for (let across = 0; across < 24; across++)
        for (let down = 0; down < 3; down++) {
          const x = Math.floor((box.left - frame.left + ((across + 0.5) / 24) * frame.width) * scale);
          const y = Math.floor((box.top - frame.top + ((down + 0.5) / 3) * box.height) * scale);
          ground.push([...context.getImageData(x, y, 1, 1).data].slice(0, 3));
        }
      for (const { part, colour } of inks[index]!) {
        const key = `${line.dataset.type} ${part}`;
        report[key] = Math.min(report[key] ?? Infinity, ...ground.map((sample) => ratio(colour, sample)));
      }
    });
    return report;
  }, png);
}

function belowFloor(table: Array<[string, Record<string, number>]>) {
  const rows = table.flatMap(([where, report]) => Object.entries(report).map(([ink, value]) => ({ where, ink, value })));
  const lowest = rows.reduce((a, b) => (b.value < a.value ? b : a));
  console.log(`diff contrast over ${table.length} renders: worst ${lowest.value.toFixed(2)}:1 (${lowest.ink}, ${lowest.where})`);
  return rows.filter((row) => row.value < FLOOR).map((row) => `${row.where}: ${row.ink} ${row.value.toFixed(2)}`);
}

for (const mode of ["light", "dark"])
  test(`numbers, signs and text meet AA in every palette and material, bare and in a panel (${mode})`, async ({ page }) => {
    test.setTimeout(300_000);
    await prepare(page, { mode });
    const table: Array<[string, Record<string, number>]> = [];
    for (const palette of PALETTE_IDS)
      for (const glass of GLASS_LEVELS) {
        await page.evaluate(([palette, glass]) => Object.assign(document.documentElement.dataset, { palette, glass }), [palette, glass]);
        for (const id of ["diff-bare", "diff-panel"]) table.push([`${palette} ${glass} ${id}`, await worst(page, id)]);
      }
    expect(belowFloor(table)).toEqual([]);
  });

for (const mode of ["light", "dark"])
  test(`numbers, signs and text meet AA on the hardest canvases, bare and in a panel (${mode})`, async ({ page }) => {
    test.setTimeout(300_000);
    const table: Array<[string, Record<string, number>]> = [];
    for (const palette of ["emerald", "ruby", "graphite"])
      for (const background of CANVASES) {
        await prepare(page, { mode, palette, glass: "full", background });
        for (const id of ["diff-bare", "diff-panel"]) table.push([`${palette} ${background} ${id}`, await worst(page, id)]);
      }
    expect(belowFloor(table)).toEqual([]);
  });
