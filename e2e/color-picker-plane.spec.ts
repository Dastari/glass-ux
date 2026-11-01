import { expect, test, type Page } from "@playwright/test";

/*
 * ColorPicker: the HSV plane, the compact size, and hex inputs in right-to-left layouts. The
 * planes run left to right in every language, like a chart.
 */

async function open(page: Page, query = "") {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })),
  );
  await page.goto(`/components/color-picker${query}`);
  await expect(page.getByRole("group", { name: "HSV colour", exact: true })).toBeAttached({ timeout: 30_000 });
}

/** A click this far in from a corner lands inside the plane's rounded corner. */
const INSET = 16;
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

test("the HSV plane reads saturation across and value up, in pixels", async ({ page }) => {
  await open(page);
  const picker = page.getByRole("group", { name: "HSV colour", exact: true });
  await picker.locator(".fa-color-area").evaluate((element) => element.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(500);
  const box = (await picker.locator(".fa-color-area").boundingBox())!;
  const hex = picker.getByRole("textbox", { name: "Hex colour" });
  // Hue of #1f6feb is 216.5°. Top right: nearly full saturation and value, a vivid blue.
  await page.mouse.click(box.x + box.width - INSET, box.y + INSET);
  const [r, , b] = channels(await hex.inputValue());
  expect(b).toBeGreaterThan(225);
  expect(r).toBeLessThan(40);
  // Bottom edge is black at any saturation; top left is white.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 2);
  expect(Math.max(...channels(await hex.inputValue()))).toBeLessThan(10);
  await page.mouse.click(box.x + INSET, box.y + INSET);
  expect(Math.min(...channels(await hex.inputValue()))).toBeGreaterThan(225);
  // The hue slider kept its hue through white and black.
  await expect(picker.getByRole("slider", { name: "Hue", exact: true })).toHaveAttribute("aria-valuenow", "216");
});

test("the compact picker is shorter, and every control keeps a 24px target", async ({ page }) => {
  await open(page);
  const regular = page.getByRole("group", { name: "Brand colour" });
  const compact = page.getByRole("group", { name: "Compact colour" });
  await compact.scrollIntoViewIfNeeded();
  const area = async (picker: typeof regular) => (await picker.locator(".fa-color-area").boundingBox())!;
  const a = await area(regular);
  const c = await area(compact);
  expect(c.height / c.width).toBeLessThan(a.height / a.width);
  for (const control of await compact.locator(".fa-color-slider-control, .fa-color-swatch").all()) {
    const box = (await control.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(24);
  }
  // The plane, sliders and hex row stay inside the box (the swatch row's ring room reaches 5px past it by design).
  const outside = await compact.evaluate((element) => {
    const right = element.getBoundingClientRect().right;
    return [...element.querySelectorAll(".fa-color-area, .fa-color-sliders, .fa-color-slider-thumb, .fa-color-inputs")].filter((node) => node.getBoundingClientRect().right > right + 0.5).length;
  });
  expect(outside).toBe(0);
});

test("in a right-to-left layout the planes and the hex input stay left to right", async ({ page }) => {
  await open(page, "?dir=rtl&lang=ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const picker = page.getByRole("group", { name: "HSV colour", exact: true });
  await picker.locator(".fa-color-area").evaluate((element) => element.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(500);
  const area = picker.locator(".fa-color-area");
  const box = (await area.boundingBox())!;
  await expect(area).toHaveCSS("direction", "ltr");
  // Top left is white in every language: the plane does not mirror.
  await page.mouse.click(box.x + INSET, box.y + INSET);
  const hex = picker.getByRole("textbox").first();
  expect(Math.min(...channels(await hex.inputValue()))).toBeGreaterThan(225);
  await expect(hex).toHaveCSS("direction", "ltr");
  // The hex code's characters run left to right: the "#" is the leftmost glyph of the text.
  const hashIsFirst = await hex.evaluate((input: HTMLInputElement) => {
    input.value = "#e8875a";
    const range = document.createRange();
    const mirror = document.createElement("span");
    mirror.style.cssText = "position:absolute;white-space:pre;visibility:hidden";
    mirror.setAttribute("dir", getComputedStyle(input).direction);
    mirror.style.font = getComputedStyle(input).font;
    mirror.textContent = input.value;
    document.body.append(mirror);
    range.setStart(mirror.firstChild!, 0);
    range.setEnd(mirror.firstChild!, 1);
    const hash = range.getBoundingClientRect().left;
    const end = mirror.getBoundingClientRect().left;
    mirror.remove();
    return hash <= end + 1;
  });
  expect(hashIsFirst).toBe(true);
});
