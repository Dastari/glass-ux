import { expect, test, type Page } from "@playwright/test";
import { openSection } from "./document-rail.js";

/*
 * A two-way slider (`origin`) fills from the origin to the thumb, on either side, and mirrors in
 * right-to-left text. The drawn fill is where the indicator's clip and the fill overlap. Every
 * thumb's centre sits at its value, with a DirectionProvider (the docs' RTL mode) or with only
 * the page's `dir`: Base UI's own thumb translate follows only the provider.
 */

async function open(page: Page, dir: "ltr" | "rtl") {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })),
  );
  await page.goto(dir === "rtl" ? "/components/slider-field?dir=rtl&lang=ar" : "/components/slider-field");
  await openSection(page, "Examples");
  await expect(page.getByRole("heading", { name: "Two-way" })).toBeVisible();
}

/** How far each thumb's centre is from where its value puts it, in pixels. */
const thumbOffsets = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".fa-slider")].map((root) => {
      const input = root.querySelector("input")!;
      const thumb = root.querySelector(".fa-slider-thumb")!.getBoundingClientRect();
      const track = root.querySelector(".fa-slider-track")!.getBoundingClientRect();
      const fraction = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min));
      const along = thumb.width / 2 + fraction * (track.width - thumb.width);
      const at = getComputedStyle(root).direction === "rtl" ? track.right - along : track.left + along;
      return Math.abs(thumb.left + thumb.width / 2 - at);
    }),
  );

/** The drawn fill's edges and the centres of the thumb and of the origin, in page pixels. */
const geometry = (page: Page, name: string, origin: number, min: number, max: number) =>
  page.getByRole("slider", { name }).evaluate(
    (input, [origin, min, max]) => {
      const root = input.closest(".fa-slider")!;
      const clip = root.querySelector(".fa-slider-indicator")!.getBoundingClientRect();
      const fill = root.querySelector(".fa-slider-fill")!.getBoundingClientRect();
      const range = root.querySelector(".fa-slider-range")!.getBoundingClientRect();
      const thumb = root.querySelector(".fa-slider-thumb")!.getBoundingClientRect();
      const track = root.querySelector(".fa-slider-track")!.getBoundingClientRect();
      const rtl = getComputedStyle(root).direction === "rtl";
      const fraction = (origin! - min!) / (max! - min!);
      const along = thumb.width / 2 + fraction * (track.width - thumb.width);
      const left = Math.max(clip.left, fill.left, range.left);
      const right = Math.min(clip.right, fill.right, range.right);
      return {
        left,
        right: Math.max(left, right),
        thumb: thumb.left + thumb.width / 2,
        origin: rtl ? track.right - along : track.left + along,
      };
    },
    [origin, min, max],
  );

for (const provider of [true, false])
  test(`every thumb sits at its value in right-to-left text (${provider ? "DirectionProvider" : "dir attribute only"})`, async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })),
    );
    await page.goto(provider ? "/components/slider?dir=rtl&lang=ar" : "/components/slider");
    await expect(page.locator(".fa-slider-thumb").first()).toBeAttached();
    if (!provider) await page.evaluate(() => Object.assign(document.documentElement, { dir: "rtl", lang: "ar" }));
    await expect.poll(async () => Math.max(...(await thumbOffsets(page)))).toBeLessThan(1);
  });

for (const dir of ["ltr", "rtl"] as const)
  test(`a two-way slider fills from its origin to the thumb, on either side (${dir})`, async ({ page }) => {
    await open(page, dir);
    for (const name of ["Exposure", "Contrast"]) {
      // The range input is visually hidden, so scroll its slider instead.
      await page.getByRole("slider", { name }).evaluate((input) => input.closest(".fa-slider")!.scrollIntoView({ block: "center" }));
      const box = await geometry(page, name, 0, -100, 100);
      const [near, far] = [box.origin, box.thumb].sort((a, b) => a - b);
      expect(Math.abs(box.left - near!), `${name} fill starts at the nearer of origin and thumb`).toBeLessThan(1.5);
      expect(Math.abs(box.right - far!), `${name} fill ends at the farther`).toBeLessThan(1.5);
    }
    // Exposure is above the origin, so its thumb is on the reading end's side.
    const exposure = await geometry(page, "Exposure", 0, -100, 100);
    expect(exposure.thumb > exposure.origin).toBe(dir === "ltr");
    // At the origin there is no fill.
    const tint = await geometry(page, "Tint", 0, -100, 100);
    expect(tint.right - tint.left).toBeLessThan(1);
    // The keyboard takes it across the origin, and the fill follows.
    const contrast = page.getByRole("slider", { name: "Contrast" });
    await contrast.focus();
    await page.keyboard.press("End");
    // A keyboard step glides, so read the fill once it has settled.
    await expect
      .poll(async () => {
        const crossed = await geometry(page, "Contrast", 0, -100, 100);
        return Math.abs((dir === "ltr" ? crossed.left : crossed.right) - crossed.origin) < 1.5 && Math.abs(crossed.right - crossed.left) > 20;
      })
      .toBe(true);
  });
