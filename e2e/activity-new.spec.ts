import { expect, test, type Locator, type Page } from "@playwright/test";

/** ActivityFeed's isNew: the mark takes no room, and its highlight settles once or not at all. */
const PRESETS = [
  { name: "default", density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1, mode: "light" },
  { name: "dense large", density: "compact", uiScale: 1.25, radiusScale: 0, borderWidth: 2, mode: "dark" },
  { name: "dense small", density: "compact", uiScale: 0.875, radiusScale: 1.5, borderWidth: 0.5, glass: "solid" },
] as const;

/** Every row, text box and control in the specimen, as drawn. */
const boxes = (scope: Locator) =>
  scope.evaluate((element) => {
    // Against the specimen, because pressing its button may scroll the page.
    const origin = element.getBoundingClientRect();
    return [...element.querySelectorAll("button, li, [role=option], .fa-activity-content, .fa-activity-icon, time")].map((node) => {
      const box = node.getBoundingClientRect();
      return [box.left - origin.left, box.top - origin.top, box.width, box.height].map((value) => Math.round(value * 100) / 100);
    });
  });

const toggle = (page: Page) => page.getByTestId("activity-new").getByText("The first event is new");

for (const preset of PRESETS) {
  test(`setting and clearing the mark moves nothing: ${preset.name} @responsive`, async ({ page }) => {
    await page.addInitScript((settings) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(settings)), {
      ...preset,
      motion: "reduced",
    });
    await page.goto("/components/activity-feed");
    await expect(page.locator("html")).toHaveAttribute("data-density", preset.density);
    const scope = page.getByTestId("activity-new");
    await scope.scrollIntoViewIfNeeded();
    await expect(scope.locator("[data-new]")).toHaveCount(3);
    const marked = await boxes(scope);
    await toggle(page).click();
    await expect(scope.locator("[data-new]")).toHaveCount(0);
    expect(await boxes(scope)).toEqual(marked);
    await toggle(page).click();
    await expect(scope.locator("[data-new]")).toHaveCount(3);
    expect(await boxes(scope)).toEqual(marked);
  });
}

test("the wash and bar sit behind the row, in the row's own box @responsive", async ({ page }) => {
  await page.goto("/components/activity-feed");
  const row = page.getByRole("list", { name: "Dock events" }).locator(":scope > li").first();
  await row.scrollIntoViewIfNeeded();
  const drawn = await row.evaluate((li) => {
    const content = li.querySelector(".fa-activity-content")!;
    const wash = getComputedStyle(content, "::before");
    const bar = getComputedStyle(content, "::after");
    const box = li.getBoundingClientRect();
    return {
      position: getComputedStyle(li).position,
      washPosition: wash.position,
      washZ: wash.zIndex,
      barPosition: bar.position,
      washWidth: Number.parseFloat(wash.width),
      rowWidth: box.width,
      washHeight: Number.parseFloat(wash.height),
      rowHeight: box.height,
    };
  });
  expect(drawn.position).toBe("relative");
  expect(drawn.washPosition).toBe("absolute");
  expect(drawn.washZ).toBe("-1");
  expect(drawn.barPosition).toBe("absolute");
  expect(drawn.washWidth).toBeGreaterThan(drawn.rowWidth);
  expect(Math.abs(drawn.washHeight - drawn.rowHeight)).toBeLessThan(1);
});

test("the highlight runs once at full motion", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "full" })));
  await page.goto("/components/activity-feed");
  const content = page.getByRole("list", { name: "Dock events" }).locator(":scope > li .fa-activity-content").first();
  const animation = await content.evaluate((element) => {
    const style = getComputedStyle(element, "::before");
    return { name: style.animationName, count: style.animationIterationCount, duration: Number.parseFloat(style.animationDuration) };
  });
  expect(animation.name).toBe("fa-activity-arrive");
  expect(animation.count).toBe("1");
  expect(animation.duration).toBeGreaterThan(0);
});

test("Still stops the highlight", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced" })));
  await page.goto("/components/activity-feed");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  const content = page.getByRole("list", { name: "Dock events" }).locator(":scope > li .fa-activity-content").first();
  const style = await content.evaluate((element) => {
    const pseudo = getComputedStyle(element, "::before");
    return { duration: Number.parseFloat(pseudo.animationDuration), count: pseudo.animationIterationCount };
  });
  expect(style.duration).toBeLessThan(0.001);
  expect(style.count).toBe("1");
});

test("the operating system's reduced motion stops the highlight", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/activity-feed");
  const content = page.getByRole("list", { name: "Dock events" }).locator(":scope > li .fa-activity-content").first();
  const duration = await content.evaluate((element) => Number.parseFloat(getComputedStyle(element, "::before").animationDuration));
  expect(duration).toBeLessThan(0.001);
});

test("forced colours keep the bar", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/components/activity-feed");
  const content = page.getByRole("list", { name: "Dock events" }).locator(":scope > li .fa-activity-content").first();
  const colours = await content.evaluate((element) => ({
    bar: getComputedStyle(element, "::after").backgroundColor,
    wash: getComputedStyle(element, "::before").backgroundColor,
  }));
  expect(colours.bar).not.toMatch(/, 0\)$/);
  expect(colours.wash).toMatch(/, 0\)$/);
});

test("the mark is in a selectable row's name, and the row keeps its keys", async ({ page }) => {
  await page.goto("/components/activity-feed");
  const list = page.getByRole("listbox", { name: "Dock events to select" });
  const option = list.getByRole("option", { name: /^New:/ });
  await expect(option).toHaveCount(1);
  await option.focus();
  await page.keyboard.press("Enter");
  await expect(option).toHaveAttribute("aria-selected", "true");
});
