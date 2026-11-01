import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * Carousel: the scroll-snap strip follows the buttons, keys and swipes, hidden slides are inert, the
 * height is reserved, autoplay can be stopped and holds, and geometry follows the theme.
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
  await page.goto("/components/carousel");
  await expect(page.getByTestId("carousel-images")).toBeVisible({ timeout: 30_000 });
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

const strip = (demo: Locator) => demo.locator(".fa-carousel-viewport");
const current = (demo: Locator) => demo.locator(".fa-carousel-slide").evaluateAll((slides) => slides.findIndex((slide) => slide.hasAttribute("data-current")));
const polite = (page: Page) => page.locator("[data-fa-announcer]").first();

test("the buttons, indicators and keys move the strip to the slide, and the page does not move @responsive", async ({ page }) => {
  const errors = await open(page);
  const demo = page.getByTestId("carousel-images");
  await demo.scrollIntoViewIfNeeded();
  const scrollY = await page.evaluate(() => document.querySelector("[data-scroll-container]")?.scrollTop ?? window.scrollY);
  await expect(page.getByTestId("carousel-value")).toHaveText("Slide 2");
  const frame = (await strip(demo).boundingBox())!;
  const slideAt = async (index: number) => (await demo.locator(".fa-carousel-slide").nth(index).boundingBox())!;
  // The second slide is shown, flush with the strip.
  expect(Math.abs((await slideAt(1)).x - frame.x)).toBeLessThan(1.5);
  expect(Math.abs((await slideAt(1)).width - frame.width)).toBeLessThan(1.5);

  await demo.getByRole("button", { name: "Next slide" }).click();
  await expect(page.getByTestId("carousel-value")).toHaveText("Slide 3");
  await expect.poll(async () => Math.abs((await slideAt(2)).x - frame.x)).toBeLessThan(1.5);
  await demo.getByRole("button", { name: "Previous slide" }).click();
  await demo.getByRole("button", { name: "Previous slide" }).click();
  await expect(page.getByTestId("carousel-value")).toHaveText("Slide 1");
  await expect(demo.getByRole("button", { name: "Previous slide" })).toHaveAttribute("aria-disabled", "true");

  // An indicator, named for its slide, and then the arrows from it.
  await demo.getByRole("tab", { name: "Dusk" }).click();
  await expect(page.getByTestId("carousel-value")).toHaveText("Slide 4");
  await expect(demo.getByRole("tab", { name: "Dusk" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(demo.getByRole("tab", { name: "Ridge" })).toBeFocused();
  await expect(page.getByTestId("carousel-value")).toHaveText("Slide 3");
  await page.keyboard.press("Home");
  await expect(page.getByTestId("carousel-value")).toHaveText("Slide 1");
  await expect.poll(async () => Math.abs((await slideAt(0)).x - frame.x)).toBeLessThan(1.5);

  expect(await page.evaluate(() => document.querySelector("[data-scroll-container]")?.scrollTop ?? window.scrollY)).toBe(scrollY);
  expect(errors).toEqual([]);
});

test("a swipe comes to rest on a slide, reports it and announces it politely @responsive", async ({ page, isMobile }) => {
  await open(page);
  const demo = page.getByTestId("carousel-images");
  await demo.scrollIntoViewIfNeeded();
  const box = (await strip(demo).boundingBox())!;
  if (isMobile) {
    const client = await page.context().newCDPSession(page);
    // A finger drag: down, ten moves to the left, up.
    const y = box.y + box.height / 2;
    const from = box.x + box.width * 0.85;
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from, y }] });
    for (let step = 1; step <= 10; step++) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from - box.width * 0.07 * step, y }] });
      await page.waitForTimeout(16);
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await strip(demo).evaluate((element) => element.scrollTo({ left: element.scrollLeft + element.clientWidth * 1.4 }));
  }
  await expect(page.getByTestId("carousel-value")).toHaveText("Slide 3");
  await expect(polite(page)).toHaveText("Slide 3 of 4: Ridge");
  // It rests exactly on the slide, not between two.
  await expect.poll(async () => Math.abs((await demo.locator(".fa-carousel-slide").nth(2).boundingBox())!.x - box.x)).toBeLessThan(1.5);
});

test("slides that are not shown are inert, so Tab never reaches their controls @responsive", async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("carousel-cards");
  await demo.scrollIntoViewIfNeeded();
  await expect(demo.locator(".fa-carousel-slide[inert]")).toHaveCount(2);
  await demo.getByRole("button", { name: "Open booking" }).focus();
  const seen: string[] = [];
  for (let step = 0; step < 6; step++) {
    await page.keyboard.press("Tab");
    seen.push(await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent ?? ""));
  }
  expect(seen.join("|")).not.toContain("Add catering");
  expect(seen.join("|")).not.toContain("See menu");
  // The indicators are one tab stop.
  expect(await demo.locator("[role=tab][tabindex='0']").count()).toBe(1);
  expect(await demo.locator("[role=tab][tabindex='-1']").count()).toBe(2);
  await demo.getByRole("button", { name: "Next slide" }).click();
  await expect(demo.getByRole("button", { name: "Add catering" })).toBeVisible();
  await expect(demo.locator(".fa-carousel-slide[data-current] [inert]")).toHaveCount(0);
  await expect(demo.locator(".fa-carousel-slide").first()).toHaveAttribute("inert", "");
});

test("the height and the controls do not move between slides @responsive", async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("carousel-cards");
  await demo.scrollIntoViewIfNeeded();
  const root = demo.locator(".fa-carousel");
  const next = demo.getByRole("button", { name: "Next slide" });
  const heights = new Set<number>();
  const bars = new Set<number>();
  const record = async () => {
    heights.add(Math.round((await strip(demo).boundingBox())!.height));
    bars.add(Math.round((await next.boundingBox())!.y - (await root.boundingBox())!.y));
  };
  await record();
  await next.click();
  await expect.poll(() => current(demo)).toBe(1);
  await record();
  await next.click();
  await expect.poll(() => current(demo)).toBe(2);
  await record();
  expect([...heights]).toHaveLength(1);
  expect([...bars]).toHaveLength(1);
  // The tallest slide set it: the second slide's text is the longest.
  const slide = (await demo.locator(".fa-carousel-slide").nth(1).boundingBox())!;
  expect(Math.round(slide.height)).toBe([...heights][0]);
});

test("the next slide is never visible beside the current one @responsive", async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("carousel-images");
  await demo.scrollIntoViewIfNeeded();
  const frame = (await strip(demo).boundingBox())!;
  const second = (await demo.locator(".fa-carousel-slide").nth(2).boundingBox())!;
  expect(second.x).toBeGreaterThanOrEqual(frame.x + frame.width - 1);
  const first = (await demo.locator(".fa-carousel-slide").nth(0).boundingBox())!;
  expect(first.x + first.width).toBeLessThanOrEqual(frame.x + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test("autoplay is stopped by the person, holds on hover, focus and a hidden page, and has no clock in a live region", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-03-02T09:00:00") });
  await open(page, { motion: "full" });
  const demo = page.getByTestId("carousel-auto");
  await demo.scrollIntoViewIfNeeded();
  const play = demo.getByRole("button", { name: "Start automatic advance" });
  await expect(play).toBeVisible();
  await page.clock.runFor(10_000);
  expect(await current(demo)).toBe(0);
  await play.click();
  const pause = demo.getByRole("button", { name: "Pause automatic advance" });
  await expect(pause).toBeVisible();
  // Held by the pointer and by focus, then released.
  await page.mouse.move(2, 2);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.clock.runFor(4100);
  await expect.poll(() => current(demo)).toBe(1);
  expect(await polite(page).textContent()).toBe("");
  const root = (await demo.locator(".fa-carousel").boundingBox())!;
  await page.mouse.move(root.x + root.width / 2, root.y + 20);
  await expect(demo.locator(".fa-carousel[data-held]")).toBeAttached();
  await page.clock.runFor(100);
  await page.clock.runFor(12_000);
  expect(await current(demo)).toBe(1);
  await page.mouse.move(2, 2);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(demo.locator(".fa-carousel[data-held]")).toHaveCount(0);
  // A hidden document holds it too.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(demo.locator(".fa-carousel[data-held]")).toBeAttached();
  await page.clock.runFor(100);
  await page.clock.runFor(12_000);
  expect(await current(demo)).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(demo.locator(".fa-carousel[data-held]")).toHaveCount(0);
  await page.clock.runFor(4100);
  await expect.poll(() => current(demo)).toBe(2);
  // Stopping it keeps it stopped.
  await pause.click();
  await page.mouse.move(2, 2);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.clock.runFor(100);
  await page.clock.runFor(20_000);
  expect(await current(demo)).toBe(2);
  await expect(demo.getByRole("button", { name: "Start automatic advance" })).toBeVisible();
});

test("autoplay does not exist under reduced motion @responsive", async ({ page }) => {
  await open(page, { motion: "reduced" });
  const demo = page.getByTestId("carousel-auto");
  await demo.scrollIntoViewIfNeeded();
  await expect(demo.getByRole("button", { name: /automatic advance/ })).toHaveCount(0);
  await expect(demo.getByRole("tablist")).toBeVisible();
});

test("right to left starts the strip at the right, and the chevrons and arrow keys keep their meaning @responsive", async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("carousel-rtl");
  await demo.scrollIntoViewIfNeeded();
  const frame = (await strip(demo).boundingBox())!;
  const first = (await demo.locator(".fa-carousel-slide").nth(0).boundingBox())!;
  expect(Math.abs(first.x + first.width - (frame.x + frame.width))).toBeLessThan(1.5);
  const previous = (await demo.getByRole("button", { name: "Previous slide" }).boundingBox())!;
  const next = (await demo.getByRole("button", { name: "Next slide" }).boundingBox())!;
  expect(previous.x).toBeGreaterThan(next.x);
  const chevron = await demo.getByRole("button", { name: "Next slide" }).locator("svg").evaluate((svg) => getComputedStyle(svg).scale);
  expect(chevron).toMatch(/^-1/);
  await demo.getByRole("button", { name: "Next slide" }).click();
  await expect.poll(() => current(demo)).toBe(1);
  await expect.poll(async () => Math.abs((await demo.locator(".fa-carousel-slide").nth(1).boundingBox())!.x - frame.x)).toBeLessThan(1.5);
  await demo.getByRole("tab", { name: "Dunes" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => current(demo)).toBe(2);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => current(demo)).toBe(1);
  // Where the strip comes to rest after a swipe is read from its own origin.
  // (After the strip has come to rest from the arrow keys' own scroll.)
  await expect.poll(async () => Math.abs((await demo.locator(".fa-carousel-slide").nth(1).boundingBox())!.x - frame.x)).toBeLessThan(1.5);
  await page.waitForTimeout(400);
  await strip(demo).evaluate((element) => element.scrollTo({ left: -element.clientWidth * 3 }));
  await expect.poll(() => current(demo)).toBe(3);
});

test("in a narrow container the count stands in for indicators that do not fit, within the box @responsive", async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("carousel-narrow");
  await demo.scrollIntoViewIfNeeded();
  await expect(demo.getByRole("tablist")).toHaveCount(0);
  await expect(demo.locator(".fa-carousel-count")).toHaveText("1 of 12");
  const frame = (await demo.locator(".fa-carousel").boundingBox())!;
  for (const control of [demo.getByRole("button", { name: "Previous slide" }), demo.getByRole("button", { name: "Next slide" })]) {
    const box = (await control.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(frame.x - 0.5);
    expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width + 0.5);
  }
  await demo.getByRole("button", { name: "Next slide" }).click();
  await expect(demo.locator(".fa-carousel-count")).toHaveText("2 of 12");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test("uses the system colours for the current indicator in forced colours", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await open(page);
  const demo = page.getByTestId("carousel-images");
  await demo.scrollIntoViewIfNeeded();
  const colours = await demo.evaluate((element) => [...element.querySelectorAll(".fa-carousel-dot")].map((dot) => getComputedStyle(dot, "::before").backgroundColor));
  expect(new Set(colours).size).toBe(2);
});

for (const appearance of APPEARANCES) {
  const name = `${appearance.density}, scale ${appearance.uiScale}, radius ${appearance.radiusScale}, line ${appearance.borderWidth}`;

  test(`strip, controls and targets follow the theme: ${name} @responsive`, async ({ page }) => {
    await open(page, appearance);
    const demo = page.getByTestId("carousel-images");
    await demo.scrollIntoViewIfNeeded();
    const radius = await strip(demo).evaluate((element) => Number.parseFloat(getComputedStyle(element).borderStartStartRadius));
    expect(Math.abs(radius - (await px(page, "var(--radius-media)")))).toBeLessThan(1);
    const dot = (await demo.getByRole("tab").first().boundingBox())!;
    expect(Math.abs(dot.width - (await px(page, "var(--target-aa)")))).toBeLessThan(1);
    expect(Math.abs(dot.height - (await px(page, "var(--target-aa)")))).toBeLessThan(1);
    const mark = await demo.getByRole("tab").first().evaluate((element) => Number.parseFloat(getComputedStyle(element, "::before").width));
    expect(Math.abs(mark - (await px(page, "var(--space-2)")))).toBeLessThan(1);
    const slot = (await demo.locator(".fa-carousel-slot").boundingBox())!;
    expect(slot.height).toBeGreaterThanOrEqual((await px(page, "var(--control-h-sm)")) - 1);
    // The strip is the box it is given, and its ratio holds.
    const frame = (await strip(demo).boundingBox())!;
    expect(Math.abs(frame.width / frame.height - 16 / 9)).toBeLessThan(0.02);
    expect(Math.abs(frame.width - (await demo.locator(".fa-carousel").evaluate((element) => element.getBoundingClientRect().width)))).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}

test("passes axe @responsive", async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page }).include("[data-testid=carousel-images]").include("[data-testid=carousel-cards]").include("[data-testid=carousel-rtl]").include("[data-testid=carousel-narrow]").include("[data-testid=carousel-auto]").analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
});
