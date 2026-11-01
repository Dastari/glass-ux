import { expect, test, type Page } from "@playwright/test";

/*
 * SliderField puts label, track and value on one row. The value's width is reserved from the
 * widest value the slider can show (R9.1), so dragging from one end to the other never moves
 * or resizes the track. In a narrow container the row wraps to label and value above the track.
 */

async function open(page: Page, dir: "ltr" | "rtl" = "ltr") {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })),
  );
  await page.goto("/components/slider-field");
  await expect(page.locator(".fa-slider-field").first()).toBeAttached({ timeout: 30_000 });
  if (dir === "rtl") await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
}

const boxes = (page: Page, name: string) =>
  page
    .locator(".fa-slider-field", { has: page.getByRole("slider", { name }) })
    .evaluate((field) => {
      const rect = (selector: string) => {
        const box = field.querySelector(selector)!.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      };
      return { row: rect(".fa-slider-field-row"), track: rect(".fa-slider-track"), value: rect(".fa-slider-field-value"), name: rect(".fa-slider-field-name") };
    });

for (const dir of ["ltr", "rtl"] as const)
  test(`label, slider and value share one row, and the track never moves (${dir})`, async ({ page }) => {
    await open(page, dir);
    const slider = page.getByRole("slider", { name: "Gain" });
    await slider.scrollIntoViewIfNeeded();
    const before = await boxes(page, "Gain");
    // One row: the three parts are vertically centred on the track.
    for (const part of [before.name, before.value]) expect(Math.abs(part.y + part.height / 2 - (before.track.y + before.track.height / 2))).toBeLessThan(before.row.height / 2);
    // Reading order: label, then track, then value.
    if (dir === "ltr") expect(before.name.x).toBeLessThan(before.track.x);
    else expect(before.name.x).toBeGreaterThan(before.track.x);
    const values: string[] = [];
    for (const key of ["Home", "End", "ArrowLeft", "Home", "PageUp"]) {
      await slider.focus();
      await page.keyboard.press(key);
      const now = await boxes(page, "Gain");
      values.push((await page.locator(".fa-slider-field", { has: slider }).locator(".fa-slider-field-live").textContent()) ?? "");
      expect(now.track, `track after ${key}`).toEqual(before.track);
      expect(now.value, `value after ${key}`).toEqual(before.value);
    }
    expect(new Set(values).size).toBeGreaterThan(2);
  });

test("the label names the slider and the readout stays out of the accessibility tree", async ({ page }) => {
  await open(page);
  const slider = page.getByRole("slider", { name: "Bandwidth limit" });
  await expect(slider).toHaveAttribute("aria-valuetext", /40\sMbps/);
  const field = page.locator(".fa-slider-field", { has: slider });
  await expect(field.locator(".fa-slider-field-value")).toHaveAttribute("aria-hidden", "true");
});

test("a narrow container wraps the row: label and value over a full-width track", async ({ page }) => {
  await open(page);
  const field = page.locator(".fa-slider-field", { has: page.getByRole("slider", { name: "Bandwidth limit" }) });
  await field.scrollIntoViewIfNeeded();
  const wide = await boxes(page, "Bandwidth limit");
  await field.evaluate((node) => ((node as HTMLElement).style.width = "240px"));
  const narrow = await boxes(page, "Bandwidth limit");
  expect(narrow.track.y).toBeGreaterThan(narrow.name.y + narrow.name.height - 1);
  expect(wide.track.y + wide.track.height / 2).toBeLessThan(wide.name.y + wide.name.height + 2);
  expect(narrow.track.width).toBeGreaterThan(200);
});

test("the keyboard moves an uncontrolled field and focus is visible", async ({ page }) => {
  await open(page);
  const slider = page.getByRole("slider", { name: "Opacity" });
  await slider.scrollIntoViewIfNeeded();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "81");
  await expect(page.locator(".fa-slider-field", { has: slider }).locator(".fa-slider-field-live")).toHaveText(/81\s%/);
});
