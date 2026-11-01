import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * Rating: radio semantics and keys, half steps, clearing, a hover preview that moves nothing, the
 * fill mirroring in right-to-left, and geometry that follows density, UI scale, radius and line weight.
 */
const APPEARANCES = [
  { density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1 },
  { density: "compact", uiScale: 1.125, radiusScale: 1.4, borderWidth: 1.5 },
  { density: "comfortable", uiScale: 0.9, radiusScale: 0, borderWidth: 2 },
] as const;

async function open(page: Page, appearance: Record<string, unknown> = {}) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    (value) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced", ...value })),
    appearance,
  );
  await page.goto("/components/rating");
  await expect(page.getByTestId("rating-basic")).toBeVisible({ timeout: 30_000 });
  return errors;
}

const px = (page: Page, value: string) =>
  page.evaluate((expression) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;width:${expression}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, value);

test("is a radio group named by its label, one tab stop, and the keys choose @responsive", async ({ page }) => {
  const errors = await open(page);
  const demo = page.getByTestId("rating-basic");
  const group = demo.getByRole("radiogroup", { name: "Service" });
  await group.scrollIntoViewIfNeeded();
  await expect(group.getByRole("radio")).toHaveCount(5);
  await expect(group.getByRole("radio", { name: "3 of 5 stars" })).toBeChecked();
  expect(await group.locator("[role=radio][tabindex='0']").count()).toBe(1);

  const value = demo.getByTestId("rating-value");
  await group.getByRole("radio", { name: "3 of 5 stars" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(value).toHaveText("4");
  await expect(group.getByRole("radio", { name: "4 of 5 stars" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(value).toHaveText("3");
  await page.keyboard.press("End");
  await expect(value).toHaveText("5");
  await page.keyboard.press("Home");
  await expect(value).toHaveText("1");
  // Tab leaves the group in one press.
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.closest("[role=radiogroup]")?.getAttribute("aria-label") ?? null)).not.toBe("Service");
  expect(errors).toEqual([]);
});

test("half steps choose by the half of the icon pressed, and clearing works by press and key @responsive", async ({ page }) => {
  await open(page);
  const group = page.getByTestId("rating-half").getByRole("radiogroup", { name: "Comfort" });
  await group.scrollIntoViewIfNeeded();
  await expect(group.getByRole("radio", { name: "3.5 of 5 stars" })).toBeChecked();
  const stars = group.locator(".fa-rating-star");
  const third = (await stars.nth(2).boundingBox())!;
  await page.mouse.click(third.x + third.width * 0.25, third.y + third.height / 2);
  await expect(group.getByRole("radio", { name: "2.5 of 5 stars" })).toBeChecked();
  await page.mouse.click(third.x + third.width * 0.75, third.y + third.height / 2);
  await expect(group.getByRole("radio", { name: "3 of 5 stars" })).toBeChecked();
  await page.mouse.click(third.x + third.width * 0.75, third.y + third.height / 2);
  await expect(group.locator("[aria-checked=true]")).toHaveCount(0);
  await group.getByRole("radio").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("radio", { name: "1 of 5 stars" })).toBeChecked();
  await page.keyboard.press("Delete");
  await expect(group.locator("[aria-checked=true]")).toHaveCount(0);
});

test("hovering previews the rating in colour: no box changes, only the fill @responsive", async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("rating-basic");
  await demo.scrollIntoViewIfNeeded();
  const boxes = () =>
    demo.evaluate((element) =>
      [...element.querySelectorAll(".fa-rating, .fa-rating-star, .fa-rating-glyph, .fa-rating-hit, [data-testid=rating-value]")].map((child) => {
        const { x, y, width, height } = child.getBoundingClientRect();
        return [x, y, width, height];
      }),
    );
  const before = await boxes();
  const fifth = (await demo.locator(".fa-rating-star").nth(4).boundingBox())!;
  await page.mouse.move(fifth.x + fifth.width / 2, fifth.y + fifth.height / 2);
  await expect(demo.locator(".fa-rating")).toHaveAttribute("data-hovering", "");
  expect(await boxes()).toEqual(before);
  await expect.poll(() => demo.locator(".fa-rating-fill").nth(4).evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(10);
  await page.mouse.move(0, 0);
  await expect(demo.locator(".fa-rating")).not.toHaveAttribute("data-hovering", "");
  expect(await boxes()).toEqual(before);
});

test("a display is one image filled to the exact value @responsive", async ({ page }) => {
  await open(page);
  const display = page.getByTestId("rating-display");
  await display.scrollIntoViewIfNeeded();
  const image = display.getByRole("img", { name: "Harbour Cafe: 4.3 of 5 stars" });
  await expect(image).toBeVisible();
  expect(await image.getByRole("radio").count()).toBe(0);
  const glyph = (await image.locator(".fa-rating-glyph").nth(4).boundingBox())!;
  const filled = await image.locator(".fa-rating-fill").nth(4).evaluate((element) => element.getBoundingClientRect().width);
  expect(filled / glyph.width).toBeGreaterThan(0.28);
  expect(filled / glyph.width).toBeLessThan(0.32);
  await expect(display.getByRole("img", { name: "Stonebridge Rooms: Not rated" })).toBeVisible();
});

test("right to left fills from the right and the arrows still point @responsive", async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("rating-rtl");
  const group = demo.getByRole("radiogroup", { name: "Service" });
  await group.scrollIntoViewIfNeeded();
  const first = (await group.locator(".fa-rating-star").first().boundingBox())!;
  const last = (await group.locator(".fa-rating-star").last().boundingBox())!;
  expect(first.x).toBeGreaterThan(last.x);
  // The third icon is half filled: its fill starts at the right edge of the icon.
  const glyph = (await group.locator(".fa-rating-glyph").nth(2).boundingBox())!;
  const fill = (await group.locator(".fa-rating-fill").nth(2).boundingBox())!;
  expect(fill.x + fill.width).toBeCloseTo(glyph.x + glyph.width, 0);
  expect(fill.width / glyph.width).toBeCloseTo(0.5, 1);
  await group.getByRole("radio", { name: "2.5 of 5 stars" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(group.getByRole("radio", { name: "3 of 5 stars" })).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("radio", { name: "2.5 of 5 stars" })).toBeChecked();
});

test("in a form it is named by its label and reports a missing rating in place @responsive", async ({ page }) => {
  await open(page);
  const form = page.getByTestId("rating-form");
  await form.scrollIntoViewIfNeeded();
  const group = form.getByRole("radiogroup", { name: "Quality" });
  await expect(group).toBeVisible();
  // Where the button sits against the rating: the page may scroll when focus moves.
  const offset = async () => {
    const [button, rating] = [(await form.getByRole("button", { name: "Send review" }).boundingBox())!, (await group.boundingBox())!];
    return [button.x - rating.x, button.y - rating.y, button.width, button.height];
  };
  const box = await offset();
  // Validation runs when focus leaves the field (R15.9).
  await group.getByRole("radio").first().focus();
  await page.keyboard.press("Tab");
  await expect(form.getByText("Choose a rating")).toBeVisible();
  await expect(group).toHaveAttribute("aria-invalid", "true");
  expect(await offset()).toEqual(box);
  await group.getByRole("radio", { name: "4 of 5 stars" }).click();
  await expect(form.getByText("Choose a rating")).toBeHidden();
  expect(await offset()).toEqual(box);
});

test("uses the system colours in forced colours", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await open(page);
  const demo = page.getByTestId("rating-basic");
  await demo.scrollIntoViewIfNeeded();
  const colours = await demo.evaluate((element) => [getComputedStyle(element.querySelector(".fa-rating-fill")!).color, getComputedStyle(element.querySelector(".fa-rating-base")!).color]);
  expect(colours[0]).not.toBe(colours[1]);
  await demo.getByRole("radio", { name: "3 of 5 stars" }).focus();
  await page.keyboard.press("ArrowRight");
  const ring = await demo.locator(".fa-rating-star").nth(3).evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(ring).toBe("solid");
});

for (const appearance of APPEARANCES) {
  const name = `${appearance.density}, scale ${appearance.uiScale}, radius ${appearance.radiusScale}, line ${appearance.borderWidth}`;

  test(`icons and targets follow the theme: ${name} @responsive`, async ({ page }) => {
    await open(page, appearance);
    const demo = page.getByTestId("rating-basic");
    await demo.scrollIntoViewIfNeeded();
    const glyph = (await demo.locator(".fa-rating-glyph").first().boundingBox())!;
    expect(Math.abs(glyph.width - (await px(page, "var(--icon-xl)")))).toBeLessThan(1);
    expect(Math.abs(glyph.height - glyph.width)).toBeLessThan(1);
    const target = (await demo.locator(".fa-rating-hit").first().boundingBox())!;
    expect(target.width).toBeGreaterThanOrEqual((await px(page, "var(--target-aa)")) - 0.5);
    expect(target.height).toBeGreaterThanOrEqual((await px(page, "var(--target-aa)")) - 0.5);
    // The row is exactly its icons: nothing is added around them.
    const row = (await demo.locator(".fa-rating").boundingBox())!;
    const stars = await demo.locator(".fa-rating-star").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().width));
    expect(Math.abs(row.width - stars.reduce((sum, width) => sum + width, 0))).toBeLessThan(1);
    // The focus ring has room in the lab frame: it is not cut by the box it sits in.
    await demo.getByRole("radio", { name: "3 of 5 stars" }).focus();
    const ring = await demo.locator(".fa-rating-star").nth(2).evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth));
    expect(ring).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}

test("keeps a touch target tall enough without growing the row @responsive", async ({ page, isMobile }) => {
  test.skip(!isMobile, "coarse pointer");
  await open(page);
  const demo = page.getByTestId("rating-basic");
  await demo.scrollIntoViewIfNeeded();
  const hit = (await demo.locator(".fa-rating-hit").first().boundingBox())!;
  const row = (await demo.locator(".fa-rating").boundingBox())!;
  expect(hit.height).toBeGreaterThanOrEqual((await px(page, "var(--target-min)")) - 0.5);
  expect(row.height).toBeLessThan(hit.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test("passes axe @responsive", async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page }).include("[data-testid=rating-basic]").include("[data-testid=rating-half]").include("[data-testid=rating-display]").include("[data-testid=rating-form]").include("[data-testid=rating-rtl]").analyze();
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
