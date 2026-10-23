import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * A range Slider never widens what scrolls around it. Its range is a track-length strip moved
 * to the range's start; unclipped, moving the start thumb along pushed the strip past the
 * track's end and widened the scroll area by as much. Thumbs, ticks and the hidden value
 * bubble stay inside the slider too, in either direction.
 */

const nearestScroller = (slider: Locator) =>
  slider.evaluate((element) => {
    let node = element.parentElement;
    while (node && !/(auto|scroll)/.test(getComputedStyle(node).overflowX)) node = node.parentElement;
    const scroller = node ?? document.scrollingElement!;
    return { scrollWidth: scroller.scrollWidth, clientWidth: scroller.clientWidth };
  });

async function open(page: Page, dir: "ltr" | "rtl") {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })),
  );
  await page.goto("/components/slider");
  await expect(page.locator(".fa-slider-indicator[data-range]").first()).toBeAttached({ timeout: 30_000 });
  if (dir === "rtl") await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
}

for (const dir of ["ltr", "rtl"] as const)
  test(`moving a range's start to its end does not widen the scroll area (${dir})`, async ({ page }) => {
    await open(page, dir);
    const ranges = page.locator(".fa-slider:has(.fa-slider-indicator[data-range])");
    const count = await ranges.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index++) {
      const slider = ranges.nth(index);
      if (!(await slider.isVisible())) continue;
      await slider.scrollIntoViewIfNeeded();
      const thumbs = slider.locator(".fa-slider-thumb input");
      if ((await thumbs.count()) < 2 || (await thumbs.first().isDisabled())) continue;
      const before = await nearestScroller(slider);
      await thumbs.nth(1).focus();
      await page.keyboard.press("End");
      await thumbs.nth(0).focus();
      await page.keyboard.press("End");
      await page.locator("body").click({ position: { x: 2, y: 2 } });
      // Once its bubble has faded out, the slider takes no more room than before.
      await expect
        .poll(async () => (await nearestScroller(slider)).scrollWidth, { message: `range ${index}` })
        .toBe(before.scrollWidth);
      // Both thumbs end at the track's far end, inside it.
      const inside = await slider.evaluate((element) => {
        const track = element.querySelector(".fa-slider-track")!.getBoundingClientRect();
        return [...element.querySelectorAll(".fa-slider-thumb")].every((thumb) => {
          const box = thumb.getBoundingClientRect();
          return box.left >= track.left - 0.5 && box.right <= track.right + 0.5;
        });
      });
      expect(inside, `range ${index} thumbs inside the track`).toBe(true);
    }
  });

test("in RTL a thumb sits on its end of the range", async ({ page }) => {
  await open(page, "rtl");
  const slider = page.locator(".fa-slider:has(.fa-slider-indicator[data-range])").first();
  await slider.scrollIntoViewIfNeeded();
  const offsets = await slider.evaluate((element) => {
    const fill = element.querySelector(".fa-slider-indicator")!;
    // The visible range: the indicator box clipped to the track.
    const track = element.querySelector(".fa-slider-track")!.getBoundingClientRect();
    const box = fill.getBoundingClientRect();
    const fillRect = element.querySelector(".fa-slider-fill")!.getBoundingClientRect();
    const range = { left: Math.max(box.left, fillRect.left, track.left), right: Math.min(box.right, fillRect.right, track.right) };
    const centres = [...element.querySelectorAll(".fa-slider-thumb")].map((thumb) => {
      const r = thumb.getBoundingClientRect();
      return (r.left + r.right) / 2;
    });
    return { range, centres };
  });
  // RTL: the first (minimum) thumb is on the right end of the range, the second on the left.
  expect(Math.abs(offsets.centres[0]! - offsets.range.right)).toBeLessThan(2);
  expect(Math.abs(offsets.centres[1]! - offsets.range.left)).toBeLessThan(2);
});
