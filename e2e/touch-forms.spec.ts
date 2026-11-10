import { expect, test, type Page } from "@playwright/test";

/*
 * Phone-first forms (issues #1-#7):
 *   text floor   on a coarse pointer every text-entry element is at least 16 CSS px, so iPhone
 *                Safari does not zoom on focus; control heights do not change
 *   targets      the phone country picker and a pressable sm LevelGauge reach --target-min
 *                (44 px) without growing (R20.4); in a table with rows under 44 px apart,
 *                neighbouring gauges share an edge, as compact chips do
 *   RadioCard    titles wrap instead of ending in an ellipsis
 *   SignaturePad maxHeight narrows the pad and keeps its shape
 */

async function open(page: Page, path: string) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })),
  );
  await page.goto(path);
  return errors;
}

/** Whether the point at (dx, dy) from the element's centre hits the element. */
async function hitsAround(page: Page, selector: string, offsets: [number, number][]) {
  return page.evaluate(
    ([selector, offsets]) => {
      const element = document.querySelector<HTMLElement>(selector)!;
      element.scrollIntoView({ block: "center" });
      const box = element.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      return {
        height: box.height,
        hits: offsets.map(([dx, dy]) => {
          const target = document.elementFromPoint(cx + dx, cy + dy);
          return target === element || element.contains(target);
        }),
      };
    },
    [selector, offsets] as const,
  );
}

test("text-entry elements keep 16 px text on a touch screen, at the same height @responsive", async ({ page, isMobile }) => {
  test.skip(!isMobile, "coarse pointer");
  const errors = await open(page, "/components/input");
  await expect(page.locator(".fa-input .fa-control-input").first()).toBeVisible({ timeout: 30_000 });
  // The page's demos arrive one after another: measure once they are all there, not on the first.
  await expect.poll(() => page.locator(".gallery-document-sections .fa-input .fa-control-input").count(), { timeout: 30_000 }).toBeGreaterThan(5);
  const sizes = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".gallery-document-sections :is(input:not([type=checkbox], [type=radio], [type=range], [type=hidden]), textarea)")]
      .filter((element) => element.getBoundingClientRect().width > 1 && !element.closest("[aria-hidden='true']"))
      .map((element) => ({ size: parseFloat(getComputedStyle(element).fontSize), box: element.closest<HTMLElement>(".fa-control")?.getBoundingClientRect().height })),
  );
  expect(sizes.length).toBeGreaterThan(5);
  for (const entry of sizes) expect(entry.size, JSON.stringify(entry)).toBeGreaterThanOrEqual(16);
  // md boxes stay at the touch height: the larger text does not push them taller.
  const md = await page.locator(".fa-input[data-size='md']").first().boundingBox();
  expect(Math.round(md!.height)).toBe(44);
  expect(errors).toEqual([]);
});

test("the phone country picker and a pressable sm gauge reach 44 px without growing @responsive", async ({ page, isMobile }) => {
  test.skip(!isMobile, "coarse pointer");
  const errors = await open(page, "/components/phone-input");
  await expect(page.locator(".fa-phone-country").first()).toBeVisible({ timeout: 30_000 });
  const picker = await hitsAround(page, ".fa-phone-country", [[0, -21.5], [0, 21.5]]);
  expect(picker.height).toBeLessThan(44);
  expect(picker.hits).toEqual([true, true]);

  await open(page, "/components/level-gauge");
  await expect(page.getByTestId("level-gauge-table")).toBeVisible({ timeout: 30_000 });
  // The last row's gauge: in rows closer than 44 px, neighbouring areas share an edge and the later one wins it.
  const gauge = await hitsAround(page, "[data-testid='level-gauge-table'] tr:last-child .fa-level-gauge[data-pressable]", [[0, -10], [0, 21.5]]);
  expect(gauge.height).toBeLessThan(24);
  expect(gauge.hits).toEqual([true, true]);
  expect(errors).toEqual([]);
});

test("radio card titles wrap rather than truncate @responsive", async ({ page }) => {
  const errors = await open(page, "/components/radio-card");
  const cards = page.getByTestId("answer-cards");
  await expect(cards).toBeVisible({ timeout: 30_000 });
  await cards.scrollIntoViewIfNeeded();
  const titles = await cards.locator(".fa-radio-card-title").evaluateAll((elements) =>
    elements.map((element) => ({ clipped: element.scrollWidth > element.clientWidth + 1, lines: Math.round(element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight)), size: parseFloat(getComputedStyle(element).fontSize) })),
  );
  expect(titles).toHaveLength(2);
  for (const title of titles) {
    expect(title.clipped).toBe(false);
    expect(title.size).toBe(15);
  }
  if (test.info().project.name === "phone") expect(titles[0]!.lines).toBeGreaterThan(1);
  await cards.getByRole("radio", { name: /^No,/ }).click();
  await expect(cards.getByRole("radio", { name: /^No,/ })).toBeChecked();
  expect(errors).toEqual([]);
});

test("SignaturePad maxHeight narrows the pad and keeps its shape @responsive", async ({ page }) => {
  const errors = await open(page, "/components/signature-pad");
  const holder = page.getByTestId("signature-max-height");
  await expect(holder).toBeVisible({ timeout: 30_000 });
  const surface = (await holder.locator(".fa-signature-surface").boundingBox())!;
  expect(surface.height).toBeLessThanOrEqual(160.5);
  expect(Math.abs(surface.width / surface.height - 2)).toBeLessThan(0.02);
  expect(errors).toEqual([]);
});
