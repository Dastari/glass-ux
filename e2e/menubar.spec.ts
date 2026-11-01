import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { holdTimers } from "./held-timers.js";

const APPEARANCES = [
  { density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1 },
  { density: "compact", uiScale: 1.125, radiusScale: 1.4, borderWidth: 1.5 },
  { density: "comfortable", uiScale: 0.9, radiusScale: 0, borderWidth: 2 },
] as const;

const visit = async (page: Page, route = "./components/menubar", appearance: object = {}) => {
  await page.addInitScript((value) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced", ...value })), appearance);
  await page.goto(route);
  await expect(page.getByTestId("menubar-application").getByRole("menubar")).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { loopErrors: number }).loopErrors = 0;
    addEventListener("error", (event) => {
      if (String(event.message).includes("ResizeObserver")) (window as unknown as { loopErrors: number }).loopErrors += 1;
    });
  });
});

test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => (window as unknown as { loopErrors?: number }).loopErrors ?? 0), "ResizeObserver loop").toBe(0);
});

const px = (page: Page, value: string) =>
  page.evaluate((expression) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;width:${expression}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, value);

const bar = (page: Page, id: string) => page.getByTestId(id).getByRole("menubar");
const trigger = (page: Page, id: string, name: string) => bar(page, id).getByRole("menuitem", { name, exact: true });
const row = (page: Page, name: string | RegExp) => page.getByRole("menu").getByRole("menuitem", { name, exact: typeof name === "string" });
const check = (page: Page, name: string | RegExp) => page.getByRole("menu").getByRole("menuitemcheckbox", { name, exact: typeof name === "string" });
const applicationMenu = (page: Page, name: string) => trigger(page, "menubar-application", name);
/** Base UI's focus guards are `aria-hidden` by design: they hand Tab on, and never keep focus. */
const menuViolations = async (page: Page) => (await new AxeBuilder({ page }).include('[role="menu"]').exclude("[data-base-ui-focus-guard]").analyze()).violations;
const press = async (page: Page, ...keys: string[]) => {
  for (const key of keys) await page.keyboard.press(key);
};

test("the bar is named, one tab stop, and passes axe open and closed", async ({ page }) => {
  await visit(page);
  await expect(page.getByRole("menubar", { name: "Report editor" })).toBeVisible();
  const tabStops = await bar(page, "menubar-application").getByRole("menuitem").evaluateAll((items) => items.filter((item) => (item as HTMLElement).tabIndex === 0).length);
  expect(tabStops).toBe(1);
  const scan = () => new AxeBuilder({ page }).include("#examples").analyze();
  expect((await scan()).violations).toEqual([]);
  await applicationMenu(page, "View").click();
  await expect(check(page, /^Status line/)).toBeVisible();
  await page.waitForTimeout(200);
  expect(await menuViolations(page)).toEqual([]);
  await page.keyboard.press("Escape");
});

test("keyboard: bar arrows, opening, moving between menus, submenus and Escape", async ({ page }) => {
  await visit(page);
  const file = applicationMenu(page, "File");
  const edit = applicationMenu(page, "Edit");
  const view = applicationMenu(page, "View");
  const help = applicationMenu(page, "Help");
  await file.focus();
  await press(page, "ArrowRight");
  await expect(edit).toBeFocused();
  await press(page, "End");
  await expect(help).toBeFocused();
  await press(page, "ArrowRight");
  await expect(file).toBeFocused();
  await press(page, "ArrowLeft");
  await expect(help).toBeFocused();
  await press(page, "Home");
  await expect(file).toBeFocused();

  // Down opens on the first row; Up on the last.
  await press(page, "ArrowDown");
  await expect(row(page, /^New report/)).toBeFocused();
  await press(page, "Escape");
  await expect(file).toBeFocused();
  await press(page, "ArrowUp");
  await expect(row(page, /^Print/)).toBeFocused();
  await press(page, "Escape");
  await expect(file).toBeFocused();
  await press(page, "Enter");
  await expect(row(page, /^New report/)).toBeFocused();

  // Right on a row with no submenu goes to the next menu's first row; Left comes back.
  await press(page, "ArrowRight");
  await expect(row(page, /^Undo/)).toBeFocused();
  await expect(row(page, /^New report/)).toHaveCount(0);
  await press(page, "ArrowLeft");
  await expect(row(page, /^New report/)).toBeFocused();
  await press(page, "ArrowRight");
  await expect(row(page, /^Undo/)).toBeFocused();

  // Right on a submenu row opens it; Left closes it, back on the row.
  await press(page, "End");
  const transform = row(page, "Transform");
  await expect(transform).toBeFocused();
  await press(page, "ArrowRight");
  await expect(row(page, /^Upper case/)).toBeFocused();
  await press(page, "ArrowLeft");
  await expect(transform).toBeFocused();
  await expect(row(page, /^Upper case/)).toHaveCount(0);

  // Right on a leaf of a submenu closes the chain and goes to the next menu.
  await press(page, "ArrowRight", "ArrowDown");
  await expect(row(page, /^Lower case/)).toBeFocused();
  await press(page, "ArrowRight");
  await expect(check(page, /^Ruler/)).toBeFocused();
  await expect(row(page, /^Lower case/)).toHaveCount(0);

  // Left at the first level goes to the previous menu; a submenu's Escape stays one level.
  await press(page, "ArrowLeft");
  await expect(row(page, /^Undo/)).toBeFocused();
  await press(page, "End", "ArrowRight");
  await press(page, "Escape");
  await expect(transform).toBeFocused();
  await press(page, "Escape");
  await expect(edit).toBeFocused();
  await expect(view).toHaveAttribute("aria-expanded", "false");

  // Typing finds a row; Tab leaves the bar.
  await press(page, "ArrowDown");
  await page.keyboard.type("c");
  await expect(row(page, /^Copy/)).toBeFocused();
  await press(page, "Tab");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(bar(page, "menubar-application").locator(":focus")).toHaveCount(0);
  await expect(page.locator("body")).not.toBeFocused();
});

test("hover switches menus once one is open, and only then", async ({ page }) => {
  await visit(page);
  await applicationMenu(page, "Edit").hover();
  await page.waitForTimeout(250);
  await expect(page.getByRole("menu")).toHaveCount(0);
  await applicationMenu(page, "File").click();
  await expect(row(page, /^New report/)).toBeVisible();
  await applicationMenu(page, "Edit").hover();
  await expect(row(page, /^Undo/)).toBeVisible();
  await expect(row(page, /^New report/)).toHaveCount(0);
  await applicationMenu(page, "View").hover();
  await expect(check(page, /^Ruler/)).toBeVisible();
  // Clicking the open trigger closes it, and hovering no longer opens.
  await applicationMenu(page, "View").click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await applicationMenu(page, "File").hover();
  await page.waitForTimeout(250);
  await expect(page.getByRole("menu")).toHaveCount(0);
});

/** Menu's SUBMENU_CLOSE_DELAY_MS. */
const SUBMENU_GRACE = 300;

/**
 * A hand's way from a row into its submenu, stalling in the gap below the parent menu for longer
 * than the safe triangle's 40ms. Returns how long the trip took, in milliseconds.
 */
const stallOnTheWay = async (page: Page, from: Locator, to: Locator, stall: number) => {
  const start = (await from.boundingBox())!;
  const end = (await to.boundingBox())!;
  const [x0, y0, x1, y1] = [start.x + start.width / 2, start.y + start.height / 2, end.x + end.width / 2, end.y + end.height / 2];
  await page.mouse.move(x0, y0, { steps: 4 });
  const left = Date.now();
  await page.mouse.move(x0 + (x1 - x0) * 0.4, y0 + (y1 - y0) * 0.4);
  await page.waitForTimeout(stall);
  await page.mouse.move(x1, y1);
  return Date.now() - left;
};

test("a hovered submenu survives a stall on the way into it, by a real pointer path", async ({ page }) => {
  await visit(page);
  const transform = row(page, "Transform");
  const leaf = row(page, /^Title case/);
  let reached = 0;
  for (let attempt = 0; attempt < 16 && reached < 4; attempt += 1) {
    await applicationMenu(page, "Edit").click();
    await transform.hover();
    await expect(leaf).toBeVisible();
    const trip = await stallOnTheWay(page, transform, leaf, 60);
    await page.waitForTimeout(100);
    // A loaded box can stretch the trip past the grace, which proves nothing either way.
    if (trip < SUBMENU_GRACE - 20) {
      reached += 1;
      await expect(leaf, `a trip of ${trip}ms`).toBeVisible();
      await expect(page.getByRole("menu")).toHaveCount(2);
      await leaf.click();
      await expect(page.getByTestId("menubar-last-command")).toHaveText("Last command: title");
    } else {
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
    }
    await expect(page.getByRole("menu")).toHaveCount(0);
    await page.mouse.move(5, 5);
  }
  expect(reached, "trips that beat the grace").toBeGreaterThan(0);
});

test("a hovered submenu stays for a pointer at rest, and a sibling row still closes it", async ({ page }) => {
  await visit(page);
  await applicationMenu(page, "Edit").click();
  const transform = row(page, "Transform");
  await expect(transform).toBeVisible();
  // Off the popup's enter animation, so the coordinates are still the row's when they land.
  await page.waitForTimeout(300);
  const rect = (await transform.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await expect(row(page, /^Title case/)).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.getByRole("menu")).toHaveCount(2);

  // A sibling row is a change of mind: it closes the submenu after the short grace.
  const copy = (await row(page, /^Copy/).boundingBox())!;
  const moved = Date.now();
  await page.mouse.move(copy.x + copy.width / 2, copy.y + copy.height / 2);
  await expect(page.getByRole("menu")).toHaveCount(1);
  expect(Date.now() - moved).toBeLessThan(1000);

  // Off into the page, the submenu goes after its grace, and the root stays.
  await transform.hover();
  await expect(row(page, /^Title case/)).toBeVisible();
  const box = (await page.getByRole("menu").first().boundingBox())!;
  await page.mouse.move(box.x - 60, box.y + box.height / 2, { steps: 4 });
  await expect(page.getByRole("menu")).toHaveCount(1);
  await page.keyboard.press("Escape");
});

test("a command runs after the menu closes; toggles and choices stay open; disabled rows explain themselves", async ({ page }) => {
  await visit(page);
  await applicationMenu(page, "File").click();
  await row(page, /^Save\b/).first().click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.getByTestId("menubar-last-command")).toHaveText("Last command: save");

  await applicationMenu(page, "File").click();
  const print = row(page, /^Print/);
  await expect(print).toHaveAttribute("aria-disabled", "true");
  await expect(print).toHaveAccessibleDescription("Nothing is selected to print");
  await print.hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "Nothing is selected to print" })).toBeVisible();
  await print.click({ force: true });
  await expect(print).toBeVisible();
  await page.keyboard.press("Escape");

  await applicationMenu(page, "View").click();
  const status = page.getByRole("menuitemcheckbox", { name: "Status line" });
  await expect(status).toHaveAttribute("aria-checked", "false");
  await status.click();
  await expect(status).toHaveAttribute("aria-checked", "true");
  const outline = page.getByRole("menuitemcheckbox", { name: "Outline" });
  await expect(outline).toHaveAccessibleDescription("This report has no headings");
  const zoom = page.getByRole("menuitemradio", { name: "150%" });
  await zoom.click();
  await expect(zoom).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("menuitemradio", { name: /^100%/ })).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("group", { name: "Zoom" })).toBeVisible();
  await page.keyboard.press("Escape");

  // A menu can be unavailable too: focusable, explained, and it does not open.
  const tools = applicationMenu(page, "Tools");
  await expect(tools).toHaveAttribute("aria-disabled", "true");
  await tools.focus();
  await expect(tools).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("chords and a rebinding show on the rows, from one action definition", async ({ page }) => {
  await visit(page);
  await applicationMenu(page, "Edit").click();
  await row(page, "Transform").hover();
  await expect(row(page, /^Upper case/).locator(".fa-kbd")).toContainText(/K.*U/);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await trigger(page, "menubar-actions", "Report").click();
  const save = row(page, /^Save/);
  await expect(save.locator(".fa-kbd")).toContainText(/Shift/);
  await expect(save).toHaveAttribute("aria-keyshortcuts", /Shift/);
  await expect(row(page, /^Publish/).locator(".fa-kbd")).toContainText(/K.*P/);
  await expect(row(page, /^Publish/)).toHaveAccessibleDescription("Already published");
  await page.keyboard.press("Escape");
  await trigger(page, "menubar-actions", "All actions").click();
  await expect(page.getByRole("group").getByRole("menuitem", { name: /^Delete/ })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("showing a shortcut adds no listener and nothing listens for it", async ({ page }) => {
  await page.addInitScript(() => {
    const added: string[] = [];
    (window as unknown as { keyListeners: string[] }).keyListeners = added;
    const original = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, ...rest: never[]) {
      if ((type === "keydown" || type === "keyup") && (this === document || this === window)) added.push(type);
      return (original as (...args: unknown[]) => void).call(this, type, ...rest);
    } as typeof EventTarget.prototype.addEventListener;
  });
  await visit(page);
  const listeners = () => page.evaluate(() => (window as unknown as { keyListeners: string[] }).keyListeners.length);
  await page.waitForTimeout(300);
  const before = await listeners();
  // One menu full of shortcuts and one with none add the same: only the menu's own Escape.
  await trigger(page, "menubar-focus", "Format").click();
  await expect(row(page, /^Bold/).locator(".fa-kbd")).toBeVisible();
  const withKeys = (await listeners()) - before;
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  const beforePlain = await listeners();
  await trigger(page, "menubar-controlled", "File").click();
  await expect(row(page, "File first")).toBeVisible();
  expect((await listeners()) - beforePlain).toBe(withKeys);
  await page.keyboard.press("Escape");

  // The page does not run a shown key, scoped or not.
  await applicationMenu(page, "File").focus();
  await page.keyboard.press("ControlOrMeta+o");
  await expect(page.getByTestId("menubar-last-command")).toHaveText("Last command: None");
  // A display-only row still runs from a click.
  await trigger(page, "menubar-focus", "Format").click();
  await row(page, /^Bold/).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("focus after a command goes to the host's element; Escape returns to the trigger", async ({ page }) => {
  await visit(page);
  const format = trigger(page, "menubar-focus", "Format");
  const text = page.getByRole("textbox", { name: "Report text" });
  await format.click();
  await row(page, /^Bold/).click();
  await expect(text).toBeFocused();
  await format.focus();
  await press(page, "ArrowDown");
  await expect(row(page, /^Bold/)).toBeFocused();
  await press(page, "Enter");
  await expect(text).toBeFocused();
  await format.click();
  await expect(row(page, /^Bold/)).toBeVisible();
  await press(page, "Escape");
  await expect(format).toBeFocused();
  // From a submenu too: the whole chain closes and focus lands on the host's element.
  await format.click();
  await row(page, "Case").hover();
  await row(page, /^Upper/).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(text).toBeFocused();
  // With no target, a command returns to the trigger as any menu does.
  const file = applicationMenu(page, "File");
  await file.focus();
  await press(page, "ArrowDown", "Enter");
  await expect(file).toBeFocused();
  // … also from a submenu, by pointer and by keyboard.
  const edit = applicationMenu(page, "Edit");
  await edit.click();
  await row(page, "Transform").hover();
  await row(page, /^Lower case/).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(edit).toBeFocused();
  await press(page, "ArrowDown", "End", "ArrowRight", "Enter");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(edit).toBeFocused();
  await expect(page.getByTestId("menubar-last-command")).toHaveText("Last command: upper");
});

test("focus after a command holds with full motion, and a command's dialog keeps focus", async ({ page }) => {
  await visit(page, "./components/menubar", { motion: "full" });
  const text = page.getByRole("textbox", { name: "Report text" });
  const format = trigger(page, "menubar-focus", "Format");
  await format.click();
  await row(page, "Case").hover();
  await row(page, /^Lower/).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(text).toBeFocused();

  // A confirmation from the shared action runner takes focus, and returns it to the trigger.
  const report = trigger(page, "menubar-actions", "Report");
  await report.click();
  await row(page, /^Delete/).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(report).toBeFocused();
});

test("the bar settles at every width: no flipping and no ResizeObserver loop", async ({ page }) => {
  await visit(page);
  const box = page.getByTestId("menubar-w-120");
  const flips = await box.evaluate(async (element) => {
    let count = 0;
    const needed = element.querySelector(".fa-menubar-measure > .fa-menubar")!.getBoundingClientRect().width;
    const watcher = new MutationObserver(() => (count += 1));
    watcher.observe(element.querySelector(".fa-menubar-box")!, { attributes: true, attributeFilter: ["data-collapsed"] });
    // Hold the box a pixel either side of what the row needs.
    for (const width of [needed + 1, needed - 1]) {
      count = 0;
      element.style.width = `${width}px`;
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (count > 1) return count;
    }
    return 0;
  });
  expect(flips).toBe(0);
  await box.evaluate((element) => (element.style.width = ""));
  await expect(box.getByRole("menuitem")).toHaveCount(8);
});

test("a window is a box like any other: the bar folds, and its popup leaves the window", async ({ page }) => {
  await visit(page);
  const frame = page.getByTestId("menubar-window");
  const menu = frame.getByRole("menuitem", { name: "Menu" });
  await expect(menu).toBeVisible();
  await menu.click();
  await row(page, "File").hover();
  await expect(row(page, "File first")).toBeVisible();
  const box = (await frame.boundingBox())!;
  const popup = (await page.getByRole("menu").first().boundingBox())!;
  expect(popup.x + popup.width).toBeGreaterThan(box.x);
  await expect(row(page, "Help")).toBeInViewport();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
});

test("open state: controlled from the page, reporting back", async ({ page }) => {
  await visit(page);
  const value = page.getByTestId("menubar-open-value");
  await page.getByRole("button", { name: "Open View" }).click();
  await expect(row(page, "View first")).toBeVisible();
  await expect(value).toHaveText("Open: view");
  await trigger(page, "menubar-controlled", "Edit").hover();
  await expect(row(page, "Edit first")).toBeVisible();
  await expect(value).toHaveText("Open: edit");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(value).toHaveText("Open: none");

  // A switch from the page does not bounce back when the closing menu returns focus.
  await trigger(page, "menubar-controlled", "File").click();
  await expect(value).toHaveText("Open: file");
  await page.getByRole("button", { name: "Open View" }).evaluate((button) => (button as HTMLElement).click());
  await expect(row(page, "View first")).toBeVisible();
  await page.waitForTimeout(200);
  await expect(value).toHaveText("Open: view");
  await page.keyboard.press("Escape");
});

test("collapses by the width of its box, not the viewport", async ({ page }) => {
  await visit(page);
  const wide = page.getByTestId("menubar-w-120");
  const narrow = page.getByTestId("menubar-w-40");
  await expect(wide.getByRole("menuitem")).toHaveCount(8);
  await expect(narrow.getByRole("menuitem")).toHaveCount(1);
  const collapsed = narrow.getByRole("menuitem", { name: "Menu" });
  await expect(page.getByRole("menubar", { name: "Editor w-40" })).toBeVisible();
  await collapsed.focus();
  await press(page, "ArrowDown");
  await expect(row(page, "File")).toBeFocused();
  await press(page, "ArrowDown", "ArrowRight");
  await expect(row(page, "Edit first")).toBeFocused();
  // The only menu: Right on a leaf has nowhere to go, and focus stays on the bar or a row.
  await press(page, "ArrowRight");
  await expect(page.locator("body")).not.toBeFocused();
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => document.activeElement?.getAttribute("role"))).toMatch(/^menu/);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(collapsed).toBeFocused();
  await press(page, "ArrowDown");
  await expect(row(page, "File")).toBeFocused();
  await press(page, "ArrowRight");
  await expect(row(page, "File first")).toBeFocused();
  await press(page, "Enter");
  await expect(collapsed).toBeFocused();

  // Live: narrowing the same box folds it, and focus stays on the bar.
  await wide.evaluate((element) => (element.style.width = "160px"));
  await expect(wide.getByRole("menuitem")).toHaveCount(1);
  await wide.evaluate((element) => (element.style.width = ""));
  await expect(wide.getByRole("menuitem")).toHaveCount(8);
  await wide.getByRole("menuitem", { name: "File" }).focus();
  await wide.evaluate((element) => (element.style.width = "160px"));
  await expect(wide.getByRole("menuitem", { name: "Menu" })).toBeFocused();
  await wide.evaluate((element) => (element.style.width = ""));
  await expect(wide.getByRole("menuitem", { name: "File" })).toBeFocused();
});

test("a popup from a small box still fits the screen", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 500 });
  await visit(page);
  const box = page.getByTestId("menubar-w-40");
  await box.scrollIntoViewIfNeeded();
  await box.getByRole("menuitem", { name: "Menu" }).click();
  await row(page, "Window").hover();
  await expect(row(page, "Window first")).toBeVisible();
  for (const menu of await page.getByRole("menu").all()) {
    const rect = (await menu.boundingBox())!;
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(700);
    expect(rect.y + rect.height).toBeLessThanOrEqual(500);
  }
});

const scrollState = (menu: Locator) =>
  menu.evaluate((element) => ({
    scrollTop: element.scrollTop,
    scrolls: element.scrollHeight > element.clientHeight + 1,
    start: element.querySelector('[data-edge="start"]')?.hasAttribute("data-shown"),
    end: element.querySelector('[data-edge="end"]')?.hasAttribute("data-shown"),
  }));

test("a menu taller than the space scrolls, with an edge at each side holding more rows", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 620 });
  await visit(page);
  await page.getByTestId("menubar-long").scrollIntoViewIfNeeded();
  await trigger(page, "menubar-long", "All blocks").click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  const rect = (await menu.boundingBox())!;
  expect(rect.y + rect.height).toBeLessThanOrEqual(620);
  await expect.poll(() => scrollState(menu)).toMatchObject({ scrolls: true, start: false, end: true });
  // The keyboard reaches the end, and the row is on screen, clear of the edge.
  await press(page, "ArrowDown", "End");
  const last = row(page, "Star right");
  await expect(last).toBeFocused();
  await expect.poll(() => scrollState(menu)).toMatchObject({ start: true, end: false });
  const lastBox = (await last.boundingBox())!;
  expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(rect.y + rect.height);
  await press(page, "Home");
  await expect(row(page, "Square left")).toBeFocused();
  await expect.poll(() => scrollState(menu)).toMatchObject({ scrollTop: 0, start: false, end: true });
  // The wheel scrolls the menu, not the page.
  const pageScroll = () => page.evaluate(() => document.querySelector("[data-scroll-container]")?.scrollTop ?? 0);
  const before = await pageScroll();
  await last.page().mouse.move(rect.x + 40, rect.y + 80);
  await page.mouse.wheel(0, 200);
  await expect.poll(async () => (await scrollState(menu)).scrollTop).toBeGreaterThan(0);
  expect(await pageScroll()).toBe(before);
  await press(page, "Escape");
});

test("with full motion a tall menu settles inside the screen", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 500 });
  await visit(page, "./components/menubar", { motion: "full" });
  await page.getByTestId("menubar-long").scrollIntoViewIfNeeded();
  await trigger(page, "menubar-long", "All blocks").click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect.poll(async () => { const rect = (await menu.boundingBox())!; return rect.y + rect.height; }).toBeLessThanOrEqual(500);
  await page.waitForTimeout(500);
  const rect = (await menu.boundingBox())!;
  expect(rect.y + rect.height).toBeLessThanOrEqual(500);
  await page.keyboard.press("Escape");
});

test("about 100 grouped items in 11 submenus; the longest fits or scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 420 });
  await visit(page);
  await page.getByTestId("menubar-long").scrollIntoViewIfNeeded();
  await trigger(page, "menubar-long", "Insert").click();
  const top = page.getByRole("menu");
  await expect(top.getByRole("menuitem")).toHaveCount(11);
  await expect(top.getByRole("group", { name: "Drawing" })).toBeVisible();
  await row(page, "Blocks").hover();
  await expect(row(page, "Star")).toBeAttached();
  const sub = page.getByRole("menu").nth(1);
  await expect(sub.getByRole("menuitem")).toHaveCount(16);
  const rect = (await sub.boundingBox())!;
  expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.y + rect.height).toBeLessThanOrEqual(420);
  await expect.poll(() => scrollState(sub)).toMatchObject({ scrolls: true, end: true });
  await sub.evaluate((element) => (element.scrollTop = element.scrollHeight));
  await expect(row(page, "Star")).toBeInViewport();
  await press(page, "Escape", "Escape");
});

test("items load at open time in reserved space, with no row moving", async ({ page }) => {
  await visit(page);
  const finishLoad = await holdTimers(page, 1500);
  const documents = trigger(page, "menubar-loaded", "Documents");
  await documents.focus();
  await press(page, "ArrowDown");
  await expect(row(page, "Open recent")).toBeFocused();
  await press(page, "ArrowRight");
  // The loading row has the keyboard, and the rows are reserved.
  const loading = page.getByRole("menuitem", { name: "Loading" });
  await expect(loading).toBeFocused();
  const sub = page.getByRole("menu").nth(1);
  expect(await menuViolations(page)).toEqual([]);
  const reserved = sub.locator(".fa-item[data-loading]");
  await expect(reserved).toHaveCount(3);
  const before = (await reserved.first().boundingBox())!;
  const popupBefore = (await sub.boundingBox())!;
  const parentRow = (await row(page, "Open recent").boundingBox())!;

  // Arrived in place: the first row sits where the placeholder did, the keyboard on it.
  await finishLoad();
  const survey = row(page, /^Harbour survey/);
  await expect(survey).toBeFocused();
  const after = (await survey.boundingBox())!;
  expect(after.y).toBe(before.y);
  expect((await sub.boundingBox())!.y).toBe(popupBefore.y);
  expect((await row(page, "Open recent").boundingBox())!).toEqual(parentRow);
  await expect(page.locator(".fa-item[data-loading]")).toHaveCount(0);

  // A second open reserves what the last load returned.
  await press(page, "ArrowLeft");
  await expect(page.getByRole("menu")).toHaveCount(1);
  await press(page, "ArrowRight");
  await expect(page.locator(".fa-item[data-loading]")).toHaveCount(3);
  await finishLoad();
  await expect(survey).toBeFocused();
  await press(page, "Escape", "Escape");
});

test("a load that fails says so and retries in place; an empty result says so; closing aborts", async ({ page }) => {
  await visit(page);
  await trigger(page, "menubar-loaded", "Documents").click();
  await row(page, "Shared with me").click();
  const failure = page.locator(".fa-menubar-failure");
  await expect(failure).toHaveText("Shared documents are unavailable. Try again.");
  await expect(page.getByTestId("menubar-loaded").locator('[aria-live="polite"]')).toHaveText("Shared documents are unavailable. Try again.");
  expect(await menuViolations(page)).toEqual([]);
  const retry = row(page, "Try again");
  await retry.click();
  await expect(row(page, "Meeting minutes")).toBeVisible();
  await expect(failure).toHaveCount(0);

  await row(page, "Archived").hover();
  await expect(page.getByRole("menuitem", { name: "No archived documents" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  // A menu of the bar itself can load, too.
  await trigger(page, "menubar-loaded", "Templates").click();
  await expect(page.locator(".fa-item[data-loading]")).toHaveCount(3);
  await expect(row(page, "Memo")).toBeVisible();
  await page.keyboard.press("Escape");
});

test("rich rows keep one height with a thumbnail and a detail line; plain rows keep theirs", async ({ page }) => {
  await visit(page);
  await trigger(page, "menubar-loaded", "Documents").click();
  await row(page, "Open recent").click();
  const rows = page.locator(".fa-menu-item[data-rich]");
  await expect(rows).toHaveCount(3);
  const heights = await rows.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
  expect(new Set(heights).size).toBe(1);
  const leading = await rows.locator(".fa-menu-leading").evaluateAll((items) => items.map((item) => [item.getBoundingClientRect().width, item.getBoundingClientRect().height].join("x")));
  expect(new Set(leading).size).toBe(1);
  const image = await rows.first().locator("img").evaluate((element) => [element.getBoundingClientRect().width, element.parentElement!.getBoundingClientRect().width]);
  expect(image[0]).toBe(image[1]);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
});

test("RTL: arrows follow the reading direction and submenus open towards it @responsive", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await visit(page, "./components/menubar?dir=rtl&lang=ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const file = applicationMenu(page, "File");
  const edit = applicationMenu(page, "Edit");
  expect((await file.boundingBox())!.x).toBeGreaterThan((await edit.boundingBox())!.x);
  await file.focus();
  await press(page, "ArrowLeft");
  await expect(edit).toBeFocused();
  await press(page, "ArrowRight");
  await expect(file).toBeFocused();
  await press(page, "ArrowDown", "ArrowLeft");
  await expect(row(page, /^Undo/)).toBeFocused();
  await press(page, "ArrowRight");
  await expect(row(page, /^New report/)).toBeFocused();
  await press(page, "ArrowLeft", "End", "ArrowLeft");
  await expect(row(page, /^Upper case/)).toBeFocused();
  const parent = (await row(page, "Transform").boundingBox())!;
  const child = (await page.getByRole("menu").nth(1).boundingBox())!;
  expect(child.x + child.width).toBeLessThanOrEqual(parent.x + 1);
  await press(page, "ArrowRight");
  await expect(row(page, "Transform")).toBeFocused();
  await press(page, "Escape");
  // No shift of the page, and the failure and live text hold their place in a popup.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("phone: tap opens, tap switches, rows meet the target size, reasons show, nothing widens @responsive", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the phone project covers touch");
  await visit(page);
  const viewport = page.viewportSize()!;
  const applications = page.getByTestId("menubar-application");
  await applications.scrollIntoViewIfNeeded();
  const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(await noOverflow()).toBe(true);

  // Five short labels may fit a phone; whichever form shows, a tap opens it.
  const collapsed = applications.getByRole("menuitem", { name: "Menu" });
  if (await collapsed.count()) {
    await collapsed.tap();
    await row(page, "File").tap();
  } else {
    await applicationMenu(page, "File").tap();
  }
  const print = row(page, /^Print/);
  await expect(print).toBeVisible();
  await expect(print.locator(".fa-menubar-reason")).toBeVisible();
  const item = (await row(page, /^New report/).boundingBox())!;
  expect(item.height).toBeGreaterThanOrEqual(await px(page, "var(--target-min)"));
  for (const menu of await page.getByRole("menu").all()) {
    const rect = (await menu.boundingBox())!;
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width);
    expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height);
  }
  await row(page, /^New report/).tap();
  await expect(page.getByTestId("menubar-last-command")).toHaveText("Last command: new");
  expect(await noOverflow()).toBe(true);

  // The narrow box's one menu drills into a submenu by tap, and it fits.
  const narrow = page.getByTestId("menubar-w-40");
  await narrow.scrollIntoViewIfNeeded();
  await narrow.getByRole("menuitem", { name: "Menu" }).tap();
  await row(page, "View").tap();
  await expect(row(page, "View first")).toBeVisible();
  for (const menu of await page.getByRole("menu").all()) {
    const rect = (await menu.boundingBox())!;
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width);
  }
  await row(page, "View first").tap();
  await expect(page.getByRole("menu")).toHaveCount(0);
  expect(await noOverflow()).toBe(true);
});

for (const appearance of APPEARANCES) {
  const name = `${appearance.density}, scale ${appearance.uiScale}, radius ${appearance.radiusScale}, line ${appearance.borderWidth}`;
  test(`geometry follows the theme: ${name}`, async ({ page }) => {
    await visit(page, "./components/menubar", appearance);
    const file = applicationMenu(page, "File");
    expect(Math.abs((await file.boundingBox())!.height - (await px(page, "var(--control-h-sm)")))).toBeLessThan(1);

    await file.click();
    const menu = page.getByRole("menu");
    const first = row(page, /^New report/);
    await expect(menu).not.toHaveAttribute("data-starting-style", /.*/);
    await expect.poll(async () => Math.abs((await first.boundingBox())!.height - (await px(page, "var(--item-h)")))).toBeLessThan(1);
    const rowsHeights = await menu.getByRole("menuitem").evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().height * 4)));
    expect(new Set(rowsHeights).size).toBe(1);
    const popup = await menu.evaluate((element) => {
      const style = getComputedStyle(element);
      return { radius: Number.parseFloat(style.borderStartStartRadius), line: Number.parseFloat(style.borderBlockStartWidth), inset: Number.parseFloat(style.paddingBlockStart) };
    });
    expect(Math.abs(popup.radius - (await px(page, "var(--radius-overlay)")))).toBeLessThan(1);
    expect(Math.abs(popup.line - (await px(page, "var(--border-width)")))).toBeLessThan(1);
    expect(Math.abs(popup.inset - (await px(page, "var(--inset-overlay)")))).toBeLessThan(1);
    const offset = (await menu.boundingBox())!.y - ((await file.boundingBox())!.y + (await file.boundingBox())!.height);
    expect(Math.abs(offset - (await px(page, "var(--popup-offset)")))).toBeLessThan(1.5);
    await page.keyboard.press("Escape");

    // Skeleton parity: box for box.
    const skeletons = page.getByTestId("menubar-skeleton");
    const placeholders = skeletons.locator("[data-skeleton] .fa-btn");
    const triggers = skeletons.getByRole("menuitem");
    const boxes = (locator: Locator) => locator.evaluateAll((items) => items.map((item) => { const { width, height } = item.getBoundingClientRect(); return [Math.round(width * 2), Math.round(height * 2)]; }));
    expect(await boxes(placeholders)).toEqual(await boxes(triggers));
    const clipped = await skeletons.getByRole("menubar").evaluate((element) => element.scrollWidth > element.clientWidth + 1);
    expect(clipped).toBe(false);
  });

  test(`rich rows and the scroll edge follow the theme: ${name}`, async ({ page }) => {
    await visit(page, "./components/menubar", appearance);
    await trigger(page, "menubar-loaded", "Documents").click();
    await row(page, "Open recent").click();
    const rich = page.locator(".fa-menu-item[data-rich]").first();
    await expect(rich).toBeVisible();
    const expected = await px(page, "max(var(--item-h), calc(var(--type-body-line) + var(--type-caption-line) + var(--space-1-5) * 2))");
    expect(Math.abs((await rich.boundingBox())!.height - expected)).toBeLessThan(1);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.getByTestId("menubar-long").scrollIntoViewIfNeeded();
    await trigger(page, "menubar-long", "All blocks").click();
    const menu = page.getByRole("menu");
    await expect.poll(() => scrollState(menu)).toMatchObject({ end: true });
    const edge = await menu.locator('[data-edge="end"]').evaluate((element) => {
      const line = getComputedStyle(element, "::before");
      return { height: Number.parseFloat(line.height), opacity: line.opacity, width: element.getBoundingClientRect().width };
    });
    expect(Math.abs(edge.height - (await px(page, "var(--border-width)")))).toBeLessThan(1);
    const inner = await menu.evaluate((element) => element.clientWidth);
    expect(Math.abs(edge.width - inner)).toBeLessThan(1.5);
    await page.keyboard.press("Escape");
  });
}

test("in full screen the popup portals into the full-screen element", async ({ page }) => {
  await visit(page);
  const box = page.getByTestId("menubar-application");
  await box.evaluate((element) => element.requestFullscreen());
  await applicationMenu(page, "File").click();
  await expect(row(page, /^New report/)).toBeVisible();
  expect(await row(page, /^New report/).evaluate((element) => document.fullscreenElement?.contains(element))).toBe(true);
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.exitFullscreen());
});
