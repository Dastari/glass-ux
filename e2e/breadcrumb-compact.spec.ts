import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * Breadcrumb size="xs": a file's path inside a pane (R6.4). Actual boxes under every geometry
 * preference, the fold inside its own box, keyboard, reading direction and hit areas.
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

async function open(page: Page, route: string, appearance: object = {}) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    (preferences) =>
      localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced", ...preferences })),
    appearance,
  );
  await page.goto(route);
  await expect(page.getByTestId("breadcrumb-pane-demo")).toBeVisible({ timeout: 30_000 });
  return errors;
}

for (const { name, appearance } of APPEARANCES) {
  test(`compact breadcrumb geometry beside the route breadcrumb, ${name} @responsive`, async ({ page }) => {
    const errors = await open(page, "/components/breadcrumb", appearance);
    const demo = page.getByTestId("breadcrumb-pane-demo");
    const route = demo.getByRole("navigation", { name: "Route" });
    const path = demo.getByRole("navigation", { name: "File path" });
    await expect(path).toHaveAttribute("data-size", "xs");
    await expect(route).not.toHaveAttribute("data-size", /.*/);

    const measure = await demo.evaluate((root) => {
      const nav = (label: string) => root.querySelector<HTMLElement>(`nav[aria-label="${label}"]`)!;
      const probe = document.createElement("div");
      root.append(probe);
      const resolve = (css: string) => {
        probe.style.height = css;
        return probe.getBoundingClientRect().height;
      };
      const expected = { sm: resolve("var(--control-h-sm)"), xs: resolve("max(var(--control-h-xs), var(--target-aa))") };
      probe.remove();
      const routeNav = nav("Route");
      const pathNav = nav("File path");
      const interactive = [...pathNav.querySelectorAll<HTMLElement>(".fa-breadcrumb-list :is(a, button)")].map((element) => {
        const box = element.getBoundingClientRect();
        return { text: element.textContent || element.getAttribute("aria-label"), width: box.width, height: box.height };
      });
      return {
        expected,
        routeHeight: routeNav.getBoundingClientRect().height,
        pathHeight: pathNav.getBoundingClientRect().height,
        routeFont: Number.parseFloat(getComputedStyle(routeNav).fontSize),
        pathFont: Number.parseFloat(getComputedStyle(pathNav).fontSize),
        interactive,
        overflow: pathNav.scrollWidth - pathNav.clientWidth,
        radius: getComputedStyle(pathNav.querySelector(".fa-crumb-link.fa-pressable")!).borderTopLeftRadius,
      };
    });
    // The default is unchanged at --control-h-sm; the compact form is shorter, never under --target-aa.
    expect(measure.routeHeight).toBeCloseTo(measure.expected.sm!, 1);
    expect(measure.pathHeight).toBeCloseTo(measure.expected.xs!, 1);
    expect(measure.pathHeight).toBeGreaterThanOrEqual(24);
    expect(measure.pathFont).toBeLessThan(measure.routeFont);
    expect(measure.interactive.length).toBeGreaterThan(0);
    for (const control of measure.interactive) expect(control.height, JSON.stringify(control)).toBeGreaterThanOrEqual(24 - 0.01);
    expect(measure.overflow).toBeLessThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("the route and the pane keep distinct landmark names and pass axe", async ({ page }) => {
  await open(page, "/components/breadcrumb");
  const demo = page.getByTestId("breadcrumb-pane-demo");
  await expect(demo.getByRole("navigation")).toHaveCount(2);
  await expect(demo.getByRole("navigation", { name: "Breadcrumb" })).toHaveCount(0);
  const results = await new AxeBuilder({ page }).include('[data-testid="breadcrumb-pane-demo"]').include('[data-testid="breadcrumb-xs-collapse"]').analyze();
  expect(results.violations).toEqual([]);
});

test("the compact form folds inside its own box, from full to the current place alone", async ({ page }) => {
  await open(page, "/components/breadcrumb");
  const lab = page.getByTestId("breadcrumb-xs-collapse");
  const modes = await lab.locator("nav").evaluateAll((navs) => navs.map((nav) => nav.getAttribute("data-mode")));
  expect(modes).toEqual(["full", "middle", "compact", "current"]);
  // Nothing clips: every crumb row fits its box.
  const clipped = await lab.locator("nav").evaluateAll((navs) => navs.filter((nav) => nav.scrollWidth > nav.clientWidth + 0.5).length);
  expect(clipped).toBe(0);
  // The current place alone opens the whole trail.
  const trail = lab.getByRole("navigation", { name: /Current place only/ }).getByRole("button");
  await trail.click();
  const popup = page.getByRole("dialog", { name: /Current place only/ });
  await expect(popup.getByRole("link").or(popup.getByRole("button")).first()).toBeVisible();
  await expect(popup.getByText("etc", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trail).toBeFocused();
});

test("keyboard: crumbs and the ellipsis menu work from the keys, and Escape returns focus", async ({ page }) => {
  await open(page, "/components/breadcrumb");
  const middle = page.getByRole("navigation", { name: /Middle collapsed/ });
  await expect(middle).toHaveAttribute("data-mode", "middle");
  await middle.scrollIntoViewIfNeeded();
  const more = middle.getByRole("button", { name: /Show \d+ more/ });
  await middle.getByRole("button").first().focus();
  await page.keyboard.press("Tab");
  await expect(more).toBeFocused();
  await expect(more).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(more).toBeFocused();
});

test("right to left: the path reads from the right and its chevrons mirror", async ({ page }) => {
  await open(page, "/components/breadcrumb?dir=rtl&lang=ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const path = page.getByTestId("breadcrumb-pane-demo").locator("nav[data-size='xs']");
  const boxes = await path.locator("ol.fa-breadcrumb-list > .fa-crumb").evaluateAll((items) => items.map((item) => item.getBoundingClientRect().left));
  expect(boxes.length).toBeGreaterThan(2);
  // Root first at the right: the lefts fall away along the trail.
  expect(boxes).toEqual([...boxes].sort((a, b) => b - a));
  await expect(path.locator(".fa-breadcrumb-list .fa-crumb-sep").first()).toHaveCSS("scale", "-1 1");
  const overflow = await path.evaluate((nav) => nav.scrollWidth - nav.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("a finger reaches --target-min on each crumb without growing the line @responsive", async ({ page }) => {
  await open(page, "/components/breadcrumb");
  const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  test.skip(!coarse, "Only a coarse pointer extends the hit area");
  const demo = page.getByTestId("breadcrumb-pane-demo");
  const result = await demo.locator("nav[data-size='xs'] .fa-breadcrumb-list a, nav[data-size='xs'] .fa-breadcrumb-list button").evaluateAll((elements) => {
    const probe = document.createElement("div");
    document.body.append(probe);
    probe.style.height = "var(--target-min)";
    const min = probe.getBoundingClientRect().height;
    probe.remove();
    return {
      min,
      reach: elements.map((element) => {
        const after = getComputedStyle(element, "::after");
        return { drawn: element.getBoundingClientRect().height, area: Number.parseFloat(after.height) };
      }),
    };
  });
  expect(result.reach.length).toBeGreaterThan(0);
  for (const entry of result.reach) expect(entry.area, JSON.stringify(entry)).toBeGreaterThanOrEqual(result.min - 0.5);
});
