import { expect, test, type Page } from "@playwright/test";

/*
 * Scrolling cost (issues #11-#13; scripts/profile-scroll.mjs measures it):
 *   far blocks   documentation blocks more than a screen away skip rendering (data-far) once
 *                the reader scrolls, and keep their height, so the page's length and deep links
 *                do not move. Under automation only with the docs-kit.far-blocks key.
 *   hover-in     rows that scroll under a resting pointer start their hover at once and ease
 *                only on the way out
 *   sparkline    the wrapper is not positioned; its dot still sits inside the plot
 */

async function open(page: Page, path: string) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "full" }));
    // The documentation skips far blocks for people only; automation opts in.
    localStorage.setItem("docs-kit.far-blocks", "on");
  });
  await page.goto(path);
  await expect(page.locator(".gallery-document-sections").first()).toBeVisible({ timeout: 30_000 });
  return errors;
}

const scroller = (page: Page) => page.locator(".docs-content");

/** Nothing is skipped until the reader scrolls: scroll a little and back. */
async function nudge(page: Page) {
  await page.waitForTimeout(1200);
  await scroller(page).evaluate((element) => {
    element.scrollTop += 4;
    element.scrollTop -= 4;
  });
}

test("blocks far from the view skip rendering and keep the page's length @responsive", async ({ page }) => {
  const errors = await open(page, "/components/dialog");
  await page.waitForTimeout(1500);
  // Nothing is skipped on a page nobody has scrolled.
  expect(await page.locator(".gallery-document-sections [data-far]").count()).toBe(0);
  await nudge(page);
  // Blocks are skipped once their height has held for a second.
  await expect.poll(() => page.locator(".gallery-document-sections [data-far]").count(), { timeout: 10_000 }).toBeGreaterThan(2);
  const far = page.locator(".gallery-document-sections [data-far]").first();
  expect(await far.evaluate((block) => getComputedStyle(block).contentVisibility)).toBe("auto");
  // Nothing on screen is skipped, so glass inside a demo blurs the page behind it.
  const onScreen = await page.evaluate(() =>
    [...document.querySelectorAll(".gallery-specimen")].filter((block) => {
      const box = block.getBoundingClientRect();
      return box.bottom > 0 && box.top < innerHeight && block.hasAttribute("data-far");
    }).length,
  );
  expect(onScreen).toBe(0);
  const length = () => scroller(page).evaluate((element) => element.scrollHeight);
  const skipped = await length();
  await page.addStyleTag({ content: "[data-far] { content-visibility: visible !important; contain-intrinsic-block-size: none !important }" });
  await page.waitForTimeout(300);
  expect(Math.abs((await length()) - skipped)).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});

test("a deep link lands on its section with far blocks above it @responsive", async ({ page }) => {
  const errors = await open(page, "/components/dialog");
  await nudge(page);
  await expect.poll(() => page.locator(".gallery-document-sections [data-far]").count(), { timeout: 10_000 }).toBeGreaterThan(2);
  await page.goto("/components/dialog#api");
  const target = page.locator("#api");
  await expect(target).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => {
      const [top, viewTop] = await Promise.all([
        target.evaluate((element) => element.getBoundingClientRect().top),
        scroller(page).evaluate((element) => element.getBoundingClientRect().top),
      ]);
      return Math.abs(top - viewTop) < 160;
    }, { timeout: 10_000 })
    .toBe(true);
  expect(errors).toEqual([]);
});

test("a hovered table row changes at once and eases on the way out", async ({ page }) => {
  await open(page, "/components/data-table");
  await page.locator(".fa-dt").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const row = page.locator(".fa-dt").first().locator(".fa-dt-rows > .fa-dt-row").first();
  await expect(row).toBeVisible();
  const duration = () => row.evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(await duration()).not.toBe("0s");
  await row.hover();
  expect(await duration()).toBe("0s");
  const button = row.locator(".fa-dt-row-button").first();
  if (await button.count()) expect(await button.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  await page.mouse.move(0, 0);
  expect(await duration()).not.toBe("0s");
});

test("a sparkline's dot sits inside its plot without a positioned wrapper", async ({ page }) => {
  await open(page, "/components/sparkline");
  const spark = page.locator(".fa-spark:has(.fa-spark-dot)").first();
  await spark.scrollIntoViewIfNeeded();
  expect(await spark.evaluate((element) => getComputedStyle(element).position)).toBe("static");
  const [plot, dot] = await Promise.all([spark.locator(".fa-spark-plot").boundingBox(), spark.locator(".fa-spark-dot").first().boundingBox()]);
  const centreX = dot!.x + dot!.width / 2;
  const centreY = dot!.y + dot!.height / 2;
  expect(centreX).toBeGreaterThanOrEqual(plot!.x - 1);
  expect(centreX).toBeLessThanOrEqual(plot!.x + plot!.width + 1);
  expect(centreY).toBeGreaterThanOrEqual(plot!.y - 1);
  expect(centreY).toBeLessThanOrEqual(plot!.y + plot!.height + 1);
});
