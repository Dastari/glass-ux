import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/* CompareSlider: drag commits on release, keys point the way they move, and right-to-left swaps the sides. */

async function open(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })),
  );
  await page.goto("/components/compare-slider");
  await expect(page.getByTestId("compare-images")).toBeVisible({ timeout: 30_000 });
  return errors;
}

test("a drag writes the divider and commits once on release @responsive", async ({ page }) => {
  const errors = await open(page);
  const demo = page.getByTestId("compare-images");
  const slider = demo.getByRole("slider", { name: "Comparison position" });
  await slider.scrollIntoViewIfNeeded();
  const value = demo.getByTestId("compare-value");
  await expect(value).toHaveText("30%");
  const handle = (await slider.boundingBox())!;
  const frame = (await demo.locator(".fa-compare").boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(frame.x + frame.width * 0.7, handle.y, { steps: 5 });
  await expect(slider).toHaveAttribute("aria-valuenow", /^(69|70|71)/);
  await expect(value).toHaveText("30%");
  await page.mouse.up();
  await expect(value).toHaveText(/^(69|70|71)/);

  await page.mouse.click(frame.x + frame.width / 2, handle.y - 40);
  await expect(value).toHaveText(/^(49|50|51)/);
  expect(errors).toEqual([]);
});

test("the keys move the divider the way they point, and vertical uses up and down", async ({ page }) => {
  await open(page);
  const slider = page.getByTestId("compare-images").getByRole("slider");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "31");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(slider).toHaveAttribute("aria-valuenow", "21");
  await page.keyboard.press("End");
  await expect(slider).toHaveAttribute("aria-valuenow", "100");

  const vertical = page.getByTestId("compare-vertical").getByRole("slider");
  await vertical.focus();
  await page.keyboard.press("ArrowDown");
  await expect(vertical).toHaveAttribute("aria-valuenow", "51");
  const box = (await vertical.boundingBox())!;
  await page.keyboard.press("PageUp");
  await expect.poll(async () => (await vertical.boundingBox())!.y).toBeGreaterThan(box.y);
});

test("right to left puts before on the right, and the arrows still point @responsive", async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("compare-rtl");
  const slider = demo.getByRole("slider");
  await slider.scrollIntoViewIfNeeded();
  const frame = (await demo.locator(".fa-compare").boundingBox())!;
  const handle = (await slider.boundingBox())!;
  // 30% of `before`, measured from the right edge.
  expect((handle.x + handle.width / 2 - frame.x) / frame.width).toBeCloseTo(0.7, 1);
  const before = await demo.locator("[data-side=before]").evaluate((element) => getComputedStyle(element).clipPath);
  expect(before).toMatch(/^inset\(0(px)? 0(px)? 0(px)? /);

  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(slider).toHaveAttribute("aria-valuenow", "31");
  await expect.poll(async () => (await slider.boundingBox())!.x).toBeLessThan(handle.x);
});

test("passes axe @responsive", async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page }).include(".fa-compare").analyze();
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
