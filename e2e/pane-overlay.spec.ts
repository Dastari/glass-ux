import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * PaneLayout overlay placement: the primary panel lies under the layout and the other stacks float
 * over it, keeping tabs, separators, rails and Move to. The switch remounts nothing, the motion
 * flag reaches the material, the covered amounts keep the primary's controls clear, the pointer
 * passes through the clear area, and RTL and phones follow.
 */
const open = async (page: Page, route = "/components/pane-layout") => {
  await page.addInitScript(() => {
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" }));
  });
  await page.goto(route);
  const overlay = page.getByTestId("pane-overlay");
  await expect(page.getByTestId("pane-count-overlay-field")).toContainText("mounted 1", { timeout: 30_000 });
  await overlay.scrollIntoViewIfNeeded();
  if (page.viewportSize()!.width > 640) await expect(overlay.getByRole("button", { name: "Actions for Inspector" })).toBeVisible();
  return overlay;
};

const stackFor = (root: Locator, panel: string) => root.locator(`[data-stack]:has(.fa-pane-host[data-panel="${panel}"])`);
const box = async (locator: Locator) => (await locator.boundingBox())!;
const px = (page: Page, value: string) =>
  page.evaluate((expression) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;width:${expression}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, value);
const placement = (overlay: Locator, value: "Docked" | "Overlay") => overlay.getByRole("button", { name: value, exact: true }).click();

test("the primary panel fills the layout and the other stacks float inside its edges, below its bar", async ({ page }) => {
  const overlay = await open(page);
  const layout = overlay.locator(".fa-pane-layout");
  await expect(layout).toHaveAttribute("data-placement", "overlay");
  const frame = await box(layout);
  const ground = await box(stackFor(overlay, "field"));
  expect(ground).toEqual(frame);
  const inset = await px(page, "var(--gap-panels)");
  const bar = await px(page, "var(--control-h-md)");
  const layers = await box(stackFor(overlay, "layers"));
  const inspector = await box(stackFor(overlay, "inspector"));
  expect(layers.x - frame.x).toBeCloseTo(inset, 0);
  expect(frame.x + frame.width - (inspector.x + inspector.width)).toBeCloseTo(inset, 0);
  expect(layers.y - frame.y).toBeCloseTo(bar + inset, 0);
  expect(frame.y + frame.height - (layers.y + layers.height)).toBeCloseTo(inset, 0);
  expect(layers.width).toBeCloseTo(await px(page, "16rem"), 0);
  // The ground's bar is not covered: its title and menu are where a pointer lands.
  const menu = overlay.getByRole("button", { name: "Actions for Survey field" });
  const target = await box(menu);
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("button")?.getAttribute("aria-label"), { x: target.x + target.width / 2, y: target.y + target.height / 2 });
  expect(hit).toBe("Actions for Survey field");
  // The clear area passes the pointer through to the primary panel.
  const through = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-testid]")?.getAttribute("data-testid"), { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 });
  expect(through).toBe("pane-field");
  // Floating stacks keep the theme's corners.
  const radius = await stackFor(overlay, "layers").evaluate((element) => Number.parseFloat(getComputedStyle(element).borderStartStartRadius));
  expect(radius).toBeCloseTo(await px(page, "var(--radius-surface)"), 0);
  const result = await new AxeBuilder({ page }).include('[data-testid="pane-overlay"]').analyze();
  expect(result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
  if (process.env.PANE_SHOTS) await overlay.screenshot({ path: `${process.env.PANE_SHOTS}/overlay.png` });
});

test("switching between docked and overlay remounts nothing, and run panels keep their effects", async ({ page }) => {
  const overlay = await open(page);
  const layout = overlay.locator(".fa-pane-layout");
  await overlay.getByRole("tab", { name: "Legend" }).click();
  const unchanged = async () => {
    for (const name of ["field", "layers", "inspector", "legend"]) await expect(page.getByTestId(`pane-count-overlay-${name}`)).toContainText("mounted 1");
    await expect(page.getByTestId("pane-count-overlay-field")).toContainText("effects started 1, stopped 0");
  };
  const marker = await page.locator('.fa-pane-host[data-panel="field"]').evaluate((element) => {
    (element as HTMLElement & { marker?: string }).marker = "kept";
    return element.parentElement?.className;
  });
  for (const value of ["Docked", "Overlay", "Docked"] as const) {
    await placement(overlay, value);
    if (value === "Docked") await expect(layout).not.toHaveAttribute("data-placement");
    else await expect(layout).toHaveAttribute("data-placement", "overlay");
    await unchanged();
  }
  // The same host element, in the same slot.
  expect(await page.locator('.fa-pane-host[data-panel="field"]').evaluate((element) => [(element as HTMLElement & { marker?: string }).marker, element.parentElement?.className])).toEqual(["kept", marker]);
  // Docked again: the field takes its own track.
  const field = await box(stackFor(overlay, "field"));
  const layers = await box(stackFor(overlay, "layers"));
  expect(field.x).toBeGreaterThan(layers.x + layers.width);
  if (process.env.PANE_SHOTS) await overlay.screenshot({ path: `${process.env.PANE_SHOTS}/docked.png` });
});

test("a floating stack resizes and hides from the keyboard, and the primary's controls keep clear of it", async ({ page }) => {
  const overlay = await open(page);
  const inspector = stackFor(overlay, "inspector");
  const centre = overlay.getByRole("button", { name: "Centre" });
  const clear = async () => (await box(inspector)).x - ((await box(centre)).x + (await box(centre)).width);
  const space = await px(page, "var(--space-3)");
  const inset = await px(page, "var(--gap-panels)");
  // The button sits a --space-3 inside the clear area: the inspector's edge, less the separator.
  await expect.poll(clear).toBeCloseTo(space + inset, 0);
  const separator = overlay.getByRole("separator", { name: "Resize Survey field" });
  await separator.focus();
  const width = async () => (await box(inspector)).width;
  const start = await width();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(width).toBeCloseTo(start + 16, 0);
  await expect.poll(clear).toBeCloseTo(space + inset, 0);
  // Enter hides the stack that does not hold the primary panel, behind a rail chip.
  await page.keyboard.press("Enter");
  await expect(inspector).toBeHidden();
  const show = overlay.getByRole("button", { name: "Show Inspector" });
  await expect(show).toBeVisible();
  const rail = overlay.locator(".fa-split-rail");
  await expect(rail).toHaveClass(/glass-chrome/);
  // The rail's column is still covered, so the button keeps clear of it, nearer the end.
  const chip = await box(rail);
  await expect.poll(async () => chip.x - ((await box(centre)).x + (await box(centre)).width)).toBeCloseTo(space + inset, 0);
  if (process.env.PANE_SHOTS) await overlay.screenshot({ path: `${process.env.PANE_SHOTS}/collapsed.png` });
  await show.click();
  await expect(inspector).toBeVisible();
});

test("Move to reaches the primary's stack and back from the keyboard, with no remount", async ({ page }) => {
  const overlay = await open(page);
  await overlay.getByRole("button", { name: "Actions for Inspector" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: "Move to" }).press("ArrowRight");
  await page.getByRole("menuitem", { name: "Layers" }).press("Enter");
  await expect(stackFor(overlay, "inspector")).toHaveAttribute("data-overlay", "floating");
  await expect(stackFor(overlay, "inspector").getByRole("tab", { name: "Inspector" })).toBeFocused();
  await expect(page.getByTestId("pane-count-overlay-inspector")).toContainText("mounted 1");
  // With only one floating stack, the clear area runs to the end edge.
  const frame = await box(overlay.locator(".fa-pane-layout"));
  const centre = await box(overlay.getByRole("button", { name: "Centre" }));
  // The ground's own line weight sits between its edge and its body.
  const line = await px(page, "var(--border-width)");
  expect(frame.x + frame.width - (centre.x + centre.width)).toBeCloseTo((await px(page, "var(--space-3)")) + line, 0);
});

test("a pan of the primary panel puts the floating stacks into the material's moving state", async ({ page }) => {
  const overlay = await open(page);
  const field = page.getByTestId("pane-field");
  const frame = await box(field);
  const floating = overlay.locator('[data-overlay="floating"]');
  await expect(floating).toHaveCount(2);
  const blur = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element, "::before").backdropFilter + "|" + getComputedStyle(element).backdropFilter);
  expect(await blur(floating.first())).toContain("blur");
  await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2);
  await page.mouse.down();
  await page.mouse.move(frame.x + frame.width / 2 + 40, frame.y + frame.height / 2 + 20, { steps: 4 });
  await expect(overlay.locator("[data-moving]")).toHaveCount(2);
  await expect(stackFor(overlay, "field")).not.toHaveAttribute("data-moving");
  expect(await blur(floating.first())).not.toContain("blur");
  await page.mouse.up();
  await expect(overlay.locator("[data-moving]")).toHaveCount(0);
  // Docked, the same gesture marks nothing.
  await placement(overlay, "Docked");
  await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2);
  await page.mouse.down();
  await page.mouse.move(frame.x + frame.width / 2 + 20, frame.y + frame.height / 2, { steps: 3 });
  await expect(overlay.locator("[data-moving]")).toHaveCount(0);
  await page.mouse.up();
});

test("F6 and Tab walk the stacks in the tree's reading order while floating", async ({ page }) => {
  const overlay = await open(page);
  const regions = await overlay.locator("[data-focus-region]").evaluateAll((elements) => elements.map((element) => element.getAttribute("aria-label")));
  expect(regions).toEqual(["Layers", "Survey field", "Inspector"]);
  await overlay.getByRole("tab", { name: "Layers" }).focus();
  const order: string[] = [];
  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() => document.activeElement?.closest("[data-stack]")?.getAttribute("aria-label") ?? null);
    if (label && order.at(-1) !== label) order.push(label);
  }
  expect(order.slice(0, 3)).toEqual(["Layers", "Survey field", "Inspector"]);
});

test("overlay mirrors in right-to-left, covered amounts included", async ({ page }) => {
  const overlay = await open(page, "/components/pane-layout?dir=rtl&lang=ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const frame = await box(overlay.locator(".fa-pane-layout"));
  const layers = await box(stackFor(overlay, "layers"));
  const inspector = await box(stackFor(overlay, "inspector"));
  const inset = await px(page, "var(--gap-panels)");
  expect(frame.x + frame.width - (layers.x + layers.width)).toBeCloseTo(inset, 0);
  expect(inspector.x - frame.x).toBeCloseTo(inset, 0);
  // The Centre button sits at the inline end, the left, clear of the inspector.
  const centre = await box(overlay.getByRole("button", { name: "Centre" }));
  expect(centre.x - (inspector.x + inspector.width)).toBeCloseTo(inset + (await px(page, "var(--space-3)")), 0);
  // The separator's keys follow the reading direction.
  const separator = overlay.getByRole("separator", { name: "Resize Layers" });
  await separator.focus();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => (await box(stackFor(overlay, "layers"))).width).toBeCloseTo(layers.width + 16, 0);
  if (process.env.PANE_SHOTS) await overlay.screenshot({ path: `${process.env.PANE_SHOTS}/rtl.png` });
});

test("a phone draws the overlay layout in its collapsed form @responsive", async ({ page, isMobile }) => {
  const overlay = await open(page);
  const layout = overlay.locator(".fa-pane-layout");
  if (!isMobile) await overlay.evaluate((element) => (element.style.width = "24rem"));
  await expect(layout).toHaveAttribute("data-narrow", "");
  await expect(layout).not.toHaveAttribute("data-placement");
  await expect(overlay.locator("[data-overlay]")).toHaveCount(0);
  const strip = overlay.getByRole("tablist", { name: "Panels" });
  await expect(strip).toBeVisible();
  await expect(page.getByTestId("pane-field")).toBeVisible();
  await strip.getByRole("tab", { name: "Layers" }).click();
  await expect(page.getByRole("dialog", { name: "Layers" })).toBeVisible();
  await expect(page.getByTestId("pane-count-overlay-field")).toContainText("mounted 1, effects started 1, stopped 0");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  if (process.env.PANE_SHOTS) await overlay.screenshot({ path: `${process.env.PANE_SHOTS}/phone-${isMobile ? "device" : "box"}.png` });
});

const APPEARANCES = [
  { density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1, mode: "light" },
  { density: "compact", uiScale: 1.125, radiusScale: 1.4, borderWidth: 1.5, mode: "dark" },
  { density: "comfortable", uiScale: 0.9, radiusScale: 0, borderWidth: 2, mode: "dark", glass: "solid" },
] as const;

for (const appearance of APPEARANCES) {
  const name = `${appearance.density}, scale ${appearance.uiScale}, radius ${appearance.radiusScale}, line ${appearance.borderWidth}, ${appearance.mode}`;
  test(`overlay geometry follows the theme: ${name}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", ...value })), appearance);
    await page.goto("/components/pane-layout");
    const overlay = page.getByTestId("pane-overlay");
    await expect(page.getByTestId("pane-count-overlay-field")).toContainText("mounted 1", { timeout: 30_000 });
    await overlay.scrollIntoViewIfNeeded();
    const frame = await box(overlay.locator(".fa-pane-layout"));
    const layers = await box(stackFor(overlay, "layers"));
    const inset = await px(page, "var(--gap-panels)");
    expect(layers.x - frame.x).toBeCloseTo(inset, 0);
    expect(layers.y - frame.y).toBeCloseTo((await px(page, "var(--control-h-md)")) + inset, 0);
    expect(layers.width).toBeCloseTo(await px(page, "16rem"), 0);
    // The ground bar and a floating bar are the same height, from the theme.
    for (const panel of ["field", "layers"]) expect((await box(stackFor(overlay, panel).locator(".fa-pane-bar"))).height).toBeCloseTo(await px(page, "var(--control-h-md)"), 0);
    for (const panel of ["field", "inspector"]) {
      const radius = await stackFor(overlay, panel).evaluate((element) => Number.parseFloat(getComputedStyle(element).borderStartStartRadius));
      expect(radius).toBeCloseTo(await px(page, "var(--radius-surface)"), 0);
    }
    // Content inside a floating stack keeps the panel inset.
    const body = page.locator('.fa-pane-host[data-panel="inspector"] .fa-panel-body');
    expect(await body.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingInlineStart))).toBeCloseTo(await px(page, "var(--inset-panel)"), 0);
    // A hidden stack's rail chip nests its button's corner.
    await overlay.getByRole("separator", { name: "Resize Survey field" }).focus();
    await page.keyboard.press("Enter");
    const rail = overlay.locator(".fa-split-rail");
    const chip = await rail.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderStartStartRadius));
    expect(chip).toBeCloseTo((await px(page, "var(--radius-control)")) + (await px(page, "var(--space-1)")), 0);
    expect((await box(rail)).y - frame.y).toBeCloseTo((await px(page, "var(--control-h-md)")) + inset, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}

test("forced colours keep every floating stack's edge", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  const overlay = await open(page);
  for (const panel of ["layers", "inspector", "field"]) {
    const border = await stackFor(overlay, panel).evaluate((element) => {
      const style = getComputedStyle(element);
      const before = getComputedStyle(element, "::before");
      return Math.max(Number.parseFloat(style.borderTopWidth), Number.parseFloat(before.borderTopWidth) || 0, style.outlineStyle === "none" ? 0 : Number.parseFloat(style.outlineWidth));
    });
    expect(border).toBeGreaterThan(0);
  }
  if (process.env.PANE_SHOTS) await overlay.screenshot({ path: `${process.env.PANE_SHOTS}/forced.png` });
});
