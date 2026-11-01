import { expect, test, type Page } from "@playwright/test";

/*
 * ImageCropper, CompareSlider and GradientPicker under every geometry preference: actual boxes,
 * corners and hit areas, not only that the page renders (R24.3).
 */

const APPEARANCES = [
  { name: "comfortable", appearance: {} },
  { name: "compact density", appearance: { density: "compact" } },
  { name: "small UI scale", appearance: { uiScale: 0.875 } },
  { name: "large UI scale", appearance: { uiScale: 1.25 } },
  { name: "square corners", appearance: { radiusScale: 0 } },
  { name: "round corners", appearance: { radiusScale: 1.5 } },
  { name: "thin lines", appearance: { borderWidth: 0.5 } },
  { name: "heavy lines", appearance: { borderWidth: 2 } },
  { name: "dark solid", appearance: { mode: "dark", glass: "solid" } },
];

async function open(page: Page, route: string, appearance: object) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    (preferences) =>
      localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced", ...preferences })),
    appearance,
  );
  await page.goto(route);
  return errors;
}

const noPageOverflow = (page: Page) =>
  page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>("[data-scroll-container]") ?? document.documentElement;
    return scroller.scrollWidth - scroller.clientWidth;
  });

/** The hit area a pseudo-element gives an element, in px. */
const hitArea = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((element) => {
    const after = getComputedStyle(element, "::after");
    return Math.min(Number.parseFloat(after.width), Number.parseFloat(after.height));
  });

for (const { name, appearance } of APPEARANCES) {
  test(`image cropper geometry, ${name} @responsive`, async ({ page }) => {
    const errors = await open(page, "/components/image-cropper", appearance);
    const free = page.getByTestId("crop-free");
    const area = free.getByRole("application", { name: "Crop area" });
    await expect(area).toBeVisible({ timeout: 30_000 });

    const frame = free.locator(".fa-image-cropper-frame");
    const box = (await frame.boundingBox())!;
    const root = (await free.locator(".fa-image-cropper").boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(root.width + 0.5);
    // The image's 4:3 shape, whatever the scale.
    expect(box.width / box.height).toBeCloseTo(4 / 3, 1);

    const radius = await frame.evaluate((element) => {
      const probe = document.createElement("div");
      probe.style.borderRadius = "var(--radius-control)";
      element.append(probe);
      const expected = getComputedStyle(probe).borderTopLeftRadius;
      probe.remove();
      return { expected, actual: getComputedStyle(element.querySelector(".fa-image-cropper-clip")!).borderTopLeftRadius };
    });
    expect(radius.actual).toBe(radius.expected);

    expect(await hitArea(page, ".fa-image-cropper-handle")).toBeGreaterThanOrEqual(24);
    const crop = (await free.locator(".fa-image-cropper-box").boundingBox())!;
    expect(crop.x).toBeGreaterThanOrEqual(box.x - 0.5);
    expect(crop.x + crop.width).toBeLessThanOrEqual(box.x + box.width + 0.5);

    const fields = await free.locator(".fa-image-cropper-fields .fa-number-group").evaluateAll((groups) =>
      groups.map((group) => group.getBoundingClientRect().right),
    );
    expect(Math.max(...fields)).toBeLessThanOrEqual(root.x + root.width + 0.5);
    expect(await noPageOverflow(page)).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });

  test(`compare slider geometry, ${name} @responsive`, async ({ page }) => {
    const errors = await open(page, "/components/compare-slider", appearance);
    const demo = page.getByTestId("compare-images");
    const slider = demo.getByRole("slider");
    await expect(slider).toBeVisible({ timeout: 30_000 });
    await slider.focus();
    for (const key of ["End", "Home"]) {
      await page.keyboard.press(key);
      const frame = (await demo.locator(".fa-compare").boundingBox())!;
      const grip = (await slider.boundingBox())!;
      // At both ends the grip stays inside the box, and it never falls below the AA target.
      expect(grip.x).toBeGreaterThanOrEqual(frame.x - 0.5);
      expect(grip.x + grip.width).toBeLessThanOrEqual(frame.x + frame.width + 0.5);
      expect(Math.min(grip.width, grip.height)).toBeGreaterThanOrEqual(24);
    }
    expect(await noPageOverflow(page)).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });

  test(`gradient picker geometry, ${name} @responsive`, async ({ page }) => {
    const errors = await open(page, "/components/gradient-picker", appearance);
    const demo = page.getByTestId("gradient-picker");
    const stops = demo.getByRole("slider", { name: /^Stop/ });
    await expect(stops.first()).toBeVisible({ timeout: 30_000 });
    const picker = (await demo.locator(".fa-gradient-picker").boundingBox())!;
    const first = (await stops.first().boundingBox())!;
    const last = (await stops.last().boundingBox())!;
    // The end stops sit over the rail's ends and stay inside the picker.
    expect(first.x).toBeGreaterThanOrEqual(picker.x - 1);
    expect(last.x + last.width).toBeLessThanOrEqual(picker.x + picker.width + 1);
    expect(await hitArea(page, ".fa-gradient-stop")).toBeGreaterThanOrEqual(24);
    const row = await demo.locator(".fa-gradient-row").evaluateAll((rows) => rows.map((element) => element.scrollWidth - element.clientWidth));
    expect(Math.max(...row)).toBeLessThanOrEqual(0);
    expect(await noPageOverflow(page)).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}
