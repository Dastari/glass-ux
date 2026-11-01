import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * PaneLayout: panels in a JSON tree move without remounting, keep state through a move, resize
 * from pointer and keys, survive a reload, collapse on a phone without touching the saved JSON,
 * mirror in RTL, and take their geometry from the theme.
 */
const STORAGE = "glass-ux.gallery.pane-layout";

const open = async (page: Page, route = "/components/pane-layout") => {
  await page.addInitScript(() => {
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" }));
  });
  await page.goto(route);
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE);
  await page.reload();
  await expect(page.getByTestId("pane-count-workbench-report")).toContainText("mounted 1", { timeout: 30_000 });
  await page.getByTestId("pane-workbench").scrollIntoViewIfNeeded();
  // The Actions menus load after the first paint; moves need them. A phone has none.
  if (page.viewportSize()!.width > 640) await expect(page.getByTestId("pane-workbench").getByRole("button", { name: "Actions for Report" })).toBeVisible();
};

const saved = (page: Page) => page.evaluate((key) => localStorage.getItem(key), STORAGE);
const count = (page: Page, name: string) => page.getByTestId(`pane-count-${name}`);
const commits = async (page: Page) => Number(await page.getByTestId("pane-workbench").locator("[data-commits]").getAttribute("data-commits"));
const centre = async (locator: Locator) => {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};
const stackFor = (root: Locator, panel: string) => root.locator(`[data-stack]:has(.fa-pane-host[data-panel="${panel}"])`);

/** Drag through `steps` pointer moves and release, or stay held for `during` to look at. */
const drag = async (page: Page, from: { x: number; y: number }, to: { x: number; y: number }, during?: () => Promise<void>, steps = 12) => {
  // A press is ignored until the last drag has settled.
  await expect(page.locator("html")).not.toHaveAttribute("data-dnd");
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 6, from.y + 6, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps });
  await during?.();
  await page.mouse.up();
};

const px = (page: Page, value: string) =>
  page.evaluate((expression) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;width:${expression}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, value);

test("the layouts pass axe, and stacks are named regions", async ({ page }) => {
  await open(page);
  const workbench = page.getByTestId("pane-workbench");
  await expect(workbench.getByRole("region", { name: "Report" })).toBeVisible();
  await expect(workbench.getByRole("tablist", { name: "Outline group" })).toBeVisible();
  const result = await new AxeBuilder({ page }).include("#examples").analyze();
  expect(result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
});

test("the keyboard resizes within the limits, and Enter hides a stack behind a rail button", async ({ page }) => {
  await open(page);
  const workbench = page.getByTestId("pane-workbench");
  const separator = workbench.getByRole("separator", { name: "Resize Outline" });
  const width = async () => (await stackFor(workbench, "outline").boundingBox())!.width;
  const start = await width();
  await separator.focus();
  await expect(separator).toHaveAttribute("aria-valuenow", /^\d+$/);
  const now = await separator.getAttribute("aria-valuenow");
  await page.keyboard.press("ArrowRight");
  await expect.poll(width).toBeCloseTo(start + 16, 0);
  await expect(separator).not.toHaveAttribute("aria-valuenow", now!);
  await expect(page.getByTestId("pane-change")).toHaveText("Last change: resize");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect.poll(width).toBeCloseTo(start + 16 - 64, 0);
  await page.keyboard.press("Home");
  await expect.poll(width).toBeCloseTo(192, 0);
  await page.keyboard.press("End");
  const end = await width();
  expect(end).toBeGreaterThan(300);
  // Report keeps its 12rem.
  expect((await stackFor(workbench, "report").boundingBox())!.width).toBeGreaterThanOrEqual(191);
  await page.keyboard.press("Enter");
  await expect(workbench.getByRole("region", { name: "Outline" })).toBeHidden();
  await expect(count(page, "workbench-outline")).toBeHidden();
  await workbench.getByRole("button", { name: "Show Outline" }).click();
  await expect(workbench.getByRole("region", { name: "Outline" })).toBeVisible();
  await expect(count(page, "workbench-outline")).toContainText("mounted 1, effects started 2, stopped 1");
});

test("Move to reaches every target from one pointer and from the keyboard, with no remount", async ({ page }) => {
  await open(page);
  const workbench = page.getByTestId("pane-workbench");
  // A single pointer: the Actions menu on the bar.
  await workbench.getByRole("button", { name: "Actions for Session" }).click();
  await page.getByRole("menuitem", { name: "Move to" }).click();
  await expect(page.getByRole("menuitem", { name: "Split left" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Outline", exact: true }).click();
  const strip = workbench.getByRole("tablist", { name: "Session group" });
  await expect(strip.getByRole("tab", { name: "Session" })).toBeFocused();
  await expect(count(page, "workbench-session")).toContainText("mounted 1, effects started 1, stopped 0");
  await expect(page.getByTestId("pane-change")).toHaveText("Last change: move");
  await expect(workbench.locator(".fa-pane-announcer")).toHaveText("Session moved to Outline.");

  // The keyboard: the tab's context menu, a split.
  await page.keyboard.press("Shift+F10");
  await expect(page.getByRole("menuitem", { name: "Move to" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Move to" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("menuitem", { name: "Split down" }).focus();
  await page.keyboard.press("Enter");
  await expect(stackFor(workbench, "session").getByRole("tab")).toHaveCount(0);
  await expect(count(page, "workbench-session")).toContainText("mounted 1, effects started 1, stopped 0");
  await expect(stackFor(workbench, "session")).toBeVisible();
  await expect(page.locator(".fa-pane-host[data-panel=\"session\"]")).toBeFocused();
});

test("a tab drags to another stack and to a new split, one commit, one mount", async ({ page }) => {
  await open(page);
  const workbench = page.getByTestId("pane-workbench");
  const notes = workbench.getByRole("tab", { name: "Notes" });
  const reportBody = stackFor(workbench, "report").locator(".fa-pane-body");
  const from = await centre(notes);
  const box = (await reportBody.boundingBox())!;

  // To the outer quarter: the indicator shows the half it will take, and nothing commits.
  await drag(page, from, { x: box.x + box.width - 12, y: box.y + box.height / 2 }, async () => {
    await expect(reportBody.locator(".fa-pane-drop")).toHaveAttribute("data-edge", "end");
    await expect(page.getByTestId("pane-change")).toHaveText("No change yet");
    // The lift renders the preview once; the frames after it render nothing.
    const held = await commits(page);
    await page.mouse.move(box.x + box.width - 14, box.y + box.height / 2 + 20, { steps: 30 });
    expect(await commits(page)).toBe(held);
  });
  await expect(page.getByTestId("pane-change")).toHaveText("Last change: move");
  await expect(reportBody.locator(".fa-pane-drop")).not.toHaveAttribute("data-edge");
  const notesStack = stackFor(workbench, "notes");
  await expect(notesStack.getByRole("tab")).toHaveCount(0);
  const reportBox = (await stackFor(workbench, "report").boundingBox())!;
  expect((await notesStack.boundingBox())!.x).toBeGreaterThan(reportBox.x + reportBox.width - 1);
  await expect(count(page, "workbench-notes")).toContainText("mounted 1, effects started 1, stopped 0");
  await expect(count(page, "workbench-report")).toContainText("mounted 1, effects started 1, stopped 0");

  // By its title into a strip.
  const title = notesStack.locator(".fa-pane-title");
  const target = workbench.getByRole("tablist", { name: "Outline group" });
  await drag(page, await centre(title), await centre(target), () => expect(workbench.locator('.fa-tabs-bar:has([aria-label="Outline group"])')).toHaveAttribute("data-drop-over"));
  await expect(target.or(workbench.getByRole("tablist", { name: "Notes group" })).getByRole("tab", { name: "Notes" })).toBeVisible();
  await expect(count(page, "workbench-notes")).toContainText("mounted 1, effects started 1, stopped 0");
  await expect(page.getByTestId("pane-change")).toHaveText("Last change: move");

  // To the centre of a body: joins the stack as a tab.
  const body = stackFor(workbench, "report").locator(".fa-pane-body");
  await drag(page, await centre(workbench.getByRole("tab", { name: "Notes" })), await centre(body), () => expect(body).toHaveAttribute("data-drop-over"));
  await expect(stackFor(workbench, "report").getByRole("tab", { name: "Notes" })).toBeVisible();
  await expect(count(page, "workbench-notes")).toContainText("mounted 1");
  await expect(count(page, "workbench-notes")).toContainText("stopped 0");
});

test("a separator drag renders nothing per frame and commits once (R18.5)", async ({ page }) => {
  await open(page);
  const workbench = page.getByTestId("pane-workbench");
  const separator = workbench.getByRole("separator", { name: "Resize Outline" });
  const from = await centre(separator);
  const before = await commits(page);
  const stackBefore = (await stackFor(workbench, "outline").boundingBox())!.width;
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 120, from.y, { steps: 40 });
  expect((await stackFor(workbench, "outline").boundingBox())!.width).toBeCloseTo(stackBefore + 120, 0);
  // 40 frames. Nothing but a strip refitting as it crosses a tab's width, which fonts decide.
  expect((await commits(page)) - before).toBeLessThanOrEqual(2);
  await expect(page.getByTestId("pane-change")).toHaveText("No change yet");
  await page.mouse.up();
  await expect(page.getByTestId("pane-change")).toHaveText("Last change: resize");
  // The layout's commit, the demo's caption and any strip that now fits another tab.
  expect((await commits(page)) - before).toBeLessThanOrEqual(4);
  await expect(count(page, "workbench-report")).toContainText("mounted 1, effects started 1, stopped 0");
  expect(JSON.parse((await saved(page))!).root.sizes[0]).toMatch(/rem$/);
});

test("a move keeps input, scroll and focus in the moved panel", async ({ page }) => {
  await open(page);
  const workbench = page.getByTestId("pane-workbench");
  const input = workbench.getByRole("textbox", { name: "Report title" });
  await input.fill("Harbour survey");
  const host = page.locator('.fa-pane-host[data-panel="report"]');
  // Little enough to leave the button in view: Firefox scrolls a focused control into view on a key.
  await host.evaluate((element) => (element.scrollTop = 40));
  await expect.poll(() => host.evaluate((element) => element.scrollTop)).toBe(40);
  const button = workbench.getByRole("button", { name: "Move beside Notes" });
  await button.evaluate((element) => (element as HTMLElement).focus({ preventScroll: true }));
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("pane-change")).toHaveText("Last change: move");
  await expect(stackFor(workbench, "report").getByRole("tab", { name: "Notes" })).toBeVisible();
  await expect(input).toHaveValue("Harbour survey");
  await expect(button).toBeFocused();
  await expect(count(page, "workbench-report")).toContainText("mounted 1, effects started 1, stopped 0");
  expect(await host.evaluate((element) => element.scrollTop)).toBe(40);
  // Hidden behind another tab and shown again, it keeps its place.
  const stack = stackFor(workbench, "report");
  await stack.getByRole("tab", { name: "History" }).click();
  await expect(host).toBeHidden();
  await stack.getByRole("tab", { name: "Report" }).click();
  await expect(host).toBeVisible();
  expect(await host.evaluate((element) => element.scrollTop)).toBe(40);
  await expect(input).toHaveValue("Harbour survey");
  await expect(count(page, "workbench-report")).toContainText("mounted 1, effects started 2, stopped 1");
});

for (const mode of ["moveBefore", "insertBefore"] as const) {
  test(`state through a move that empties a stack, with ${mode}`, async ({ page }) => {
    if (mode === "insertBefore") {
      await page.addInitScript(() => {
        delete (Element.prototype as { moveBefore?: unknown }).moveBefore;
      });
    }
    await open(page);
    const native = await page.evaluate(() => "moveBefore" in Element.prototype);
    test.skip(mode === "moveBefore" && !native, "this browser has no moveBefore");
    expect(native).toBe(mode === "moveBefore");
    const workbench = page.getByTestId("pane-workbench");
    const host = page.locator('.fa-pane-host[data-panel="report"]');
    const input = workbench.getByRole("textbox", { name: "Report title" });
    await input.fill("Ridge permit");
    await input.evaluate((element) => (element as HTMLInputElement).setSelectionRange(2, 5));
    await host.evaluate((element) => (element.scrollTop = 240));
    await expect.poll(() => host.evaluate((element) => element.scrollTop)).toBe(240);
    // An iframe, added here: the design accepts its reload without moveBefore and only then.
    await host.evaluate((element) => {
      const frame = document.createElement("iframe");
      frame.title = "Embedded";
      frame.srcdoc = "<p>Frame</p>";
      frame.onload = () => {
        (window as unknown as { loads: number }).loads = ((window as unknown as { loads?: number }).loads ?? 0) + 1;
      };
      element.firstElementChild!.append(frame);
    });
    await expect.poll(() => page.evaluate(() => (window as unknown as { loads?: number }).loads)).toBe(1);
    await workbench.getByRole("button", { name: "Move beside Notes" }).evaluate((element) => {
      const input = element.parentElement!.querySelector("input")!;
      input.focus({ preventScroll: true });
      // Moves from a timer, as a host might, with focus still in the input.
      setTimeout(() => (element as HTMLElement).click(), 0);
    });
    await expect(stackFor(workbench, "report").getByRole("tab", { name: "Notes" })).toBeVisible();
    await expect(input).toBeFocused();
    expect(await input.evaluate((element) => [(element as HTMLInputElement).selectionStart, (element as HTMLInputElement).selectionEnd])).toEqual([2, 5]);
    await expect(input).toHaveValue("Ridge permit");
    expect(await host.evaluate((element) => element.scrollTop)).toBe(240);
    await expect(count(page, "workbench-report")).toContainText("mounted 1, effects started 1, stopped 0");
    const loads = await page.evaluate(() => (window as unknown as { loads: number }).loads);
    if (mode === "moveBefore") expect(loads).toBe(1);
    else await expect.poll(() => page.evaluate(() => (window as unknown as { loads: number }).loads)).toBeGreaterThan(1);
  });
}

test('whenHidden "run" keeps effects through tab switches and a pane move; a paused tab does not', async ({ page }) => {
  await open(page);
  const demo = page.getByTestId("pane-background");
  await demo.scrollIntoViewIfNeeded();
  const run = count(page, "background-remote");
  await expect(run).toContainText("mounted 1, effects started 1, stopped 0");
  await demo.getByRole("tab", { name: "Monitor" }).click();
  await expect(count(page, "background-monitor")).toContainText("mounted 1, effects started 1, stopped 0");
  await expect(run).toBeHidden();
  await demo.getByRole("tab", { name: "Remote session" }).click();
  await expect(run).toContainText("mounted 1, effects started 1, stopped 0");
  await demo.getByRole("tab", { name: "Monitor" }).click();
  await demo.getByRole("tab", { name: "Remote session" }).click();
  await expect(run).toContainText("mounted 1, effects started 1, stopped 0");
  // Monitor was hidden twice and shown twice: its effects ran again each time, with one mount.
  await demo.getByRole("tab", { name: "Monitor" }).click();
  await expect(count(page, "background-monitor")).toContainText("mounted 1, effects started 3, stopped 2");

  // Hidden, then moved: the run panel's effects never stop.
  await demo.getByRole("tab", { name: "Remote session" }).focus();
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "Move to" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("menuitem", { name: "Overview", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(stackFor(demo, "remote")).toContainText("Remote session");
  await expect(run).toContainText("mounted 1, effects started 1, stopped 0");
});

test("the layout comes back after a reload, moved panels included", async ({ page }) => {
  await open(page);
  const workbench = page.getByTestId("pane-workbench");
  await workbench.getByRole("button", { name: "Actions for Session" }).click();
  await page.getByRole("menuitem", { name: "Move to" }).click();
  await page.getByRole("menuitem", { name: "Report", exact: true }).click();
  await workbench.getByRole("separator", { name: "Resize Outline" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("pane-change")).toHaveText("Last change: resize");
  const json = await saved(page);
  const width = (await stackFor(workbench, "outline").boundingBox())!.width;
  await page.reload();
  await expect(workbench.getByRole("tab", { name: "Session" })).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await stackFor(workbench, "outline").boundingBox())?.width).toBeCloseTo(width, 0);
  expect(await saved(page)).toBe(json);
  await expect(page.getByTestId("pane-change")).toHaveText("No change yet");
});

test("a saved layout keeps an id nothing resolves, and a corrupt one falls back", async ({ page }) => {
  await open(page);
  const workbench = page.getByTestId("pane-workbench");
  const layout = JSON.parse((await page.evaluate(() => JSON.stringify({ version: 1, root: { type: "split", id: "r", orientation: "horizontal", sizes: [1, 2, 1], children: [{ type: "stack", id: "a", panels: ["report", "removed-tool"], active: "report" }, { type: "stack", id: "b", panels: ["removed-view"], active: "removed-view" }, { type: "stack", id: "c", panels: ["notes"], active: "notes" }] } })))) as { root: { children: unknown[] } };
  await page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [STORAGE, JSON.stringify(layout)]);
  await page.reload();
  await expect(workbench.getByRole("region", { name: "Report" })).toBeVisible({ timeout: 30_000 });
  await expect(workbench.getByRole("tab")).toHaveCount(0);
  await expect(workbench.getByRole("separator")).toHaveCount(1);
  await expect(workbench.getByRole("region")).toHaveCount(2);
  await workbench.getByRole("separator").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("pane-change")).toHaveText("Last change: resize");
  const stored = (await saved(page))!;
  expect(stored).toContain("removed-tool");
  expect(stored).toContain("removed-view");

  await page.evaluate((key) => localStorage.setItem(key, "{broken"), STORAGE);
  await page.reload();
  await expect(workbench.getByRole("region", { name: "Report" })).toBeVisible({ timeout: 30_000 });
  await expect(workbench.getByRole("tablist")).toHaveCount(2);
});

test("a narrow box collapses to one panel and a strip, and widening restores the same JSON @responsive", async ({ page, isMobile }) => {
  await open(page);
  const workbench = page.getByTestId("pane-workbench");
  // Fix a stored layout to compare, then collapse with the box's own width.
  await page.evaluate((key) => localStorage.setItem(key, "unset"), STORAGE + ".marker");
  const layout = workbench.locator(".fa-pane-layout");
  const wide = await workbench.evaluate((element) => element.getBoundingClientRect().width);
  const collapse = async () => {
    if (isMobile) return;
    await workbench.evaluate((element) => (element.style.width = "24rem"));
  };
  const widen = async () => workbench.evaluate((element, width) => (element.style.width = `${width}px`), Math.max(wide, 900));
  await collapse();
  await expect(layout).toHaveAttribute("data-narrow", "");
  await expect(workbench.getByRole("separator")).toHaveCount(0);
  await expect(workbench.locator(".fa-pane-title")).toHaveCount(0);
  const strip = workbench.getByRole("tablist", { name: "Panels" });
  await expect(strip).toBeVisible();
  // The primary panel fills the box, and is in the first screen (R21.3).
  await expect(count(page, "workbench-report")).toBeVisible();
  const box = (await layout.boundingBox())!;
  const host = (await page.locator('.fa-pane-host[data-panel="report"]').boundingBox())!;
  const stripBox = (await strip.boundingBox())!;
  expect(host.width).toBeGreaterThanOrEqual(box.width - 2);
  expect(stripBox.y).toBeGreaterThanOrEqual(host.y + host.height - 1);
  expect(stripBox.y + stripBox.height).toBeLessThanOrEqual(box.y + box.height + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

  // Another panel opens in a non-modal bottom sheet, and goes home when it closes.
  await strip.getByRole("tab", { name: "Outline" }).click();
  const sheet = page.getByRole("dialog", { name: "Outline" });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.fa-pane-host[data-panel="outline"]')).toBeVisible();
  await expect(count(page, "workbench-outline")).toContainText("mounted 1");
  await expect(count(page, "workbench-report")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(workbench.locator('.fa-pane-host[data-panel="outline"]')).toBeAttached();
  await expect(count(page, "workbench-report")).toContainText("mounted 1, effects started 1, stopped 0");
  await expect(page.getByTestId("pane-change")).toHaveText("No change yet");
  expect(await saved(page)).toBeNull();

  if (isMobile) return;
  await widen();
  await expect(layout).not.toHaveAttribute("data-narrow", "");
  await expect(workbench.getByRole("separator")).toHaveCount(3);
  await expect(count(page, "workbench-report")).toContainText("mounted 1, effects started 1, stopped 0");
  await expect(count(page, "workbench-outline")).toContainText("mounted 1");
  await expect(page.getByTestId("pane-change")).toHaveText("No change yet");
  expect(await saved(page)).toBeNull();
});

test("a stored layout is unchanged by a trip through the phone form", async ({ page }) => {
  await open(page);
  const workbench = page.getByTestId("pane-workbench");
  const separator = workbench.getByRole("separator", { name: "Resize Outline" });
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("pane-change")).toHaveText("Last change: resize");
  const before = await saved(page);
  await workbench.evaluate((element) => (element.style.width = "24rem"));
  await expect(workbench.locator(".fa-pane-layout")).toHaveAttribute("data-narrow", "");
  await workbench.getByRole("tablist", { name: "Panels" }).getByRole("tab", { name: "Outline" }).click();
  await expect(page.getByRole("dialog", { name: "Outline" })).toBeVisible();
  await workbench.evaluate((element) => (element.style.width = ""));
  await expect(workbench.locator(".fa-pane-layout")).not.toHaveAttribute("data-narrow", "");
  await expect(page.getByTestId("pane-change")).toHaveText("Last change: resize");
  expect(await saved(page)).toBe(before);
  // Outline paused while the phone form left it hidden, and came back with its one mount.
  await expect(count(page, "workbench-outline")).toBeVisible();
  await expect(count(page, "workbench-outline")).toContainText("mounted 1");
  await expect(count(page, "workbench-report")).toContainText("mounted 1, effects started 1, stopped 0");
});

test("the layout mirrors in right-to-left, with the keys and pointer following it", async ({ page }) => {
  await open(page, "/components/pane-layout?dir=rtl&lang=ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const workbench = page.getByTestId("pane-workbench");
  const outline = stackFor(workbench, "outline");
  const report = stackFor(workbench, "report");
  const left = async (locator: Locator) => (await locator.boundingBox())!.x;
  expect(await left(outline)).toBeGreaterThan(await left(report));
  const separator = workbench.getByRole("separator").first();
  await separator.focus();
  const width = async () => (await outline.boundingBox())!.width;
  const start = await width();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(width).toBeCloseTo(start + 16, 0);
  // Dragging toward the reading end grows the first track, here to the left.
  const from = await centre(separator);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x - 50, from.y, { steps: 8 });
  await page.mouse.up();
  await expect.poll(width).toBeCloseTo(start + 66, 0);
  const json = JSON.parse((await saved(page))!);
  expect(json.root.children[0].panels[0]).toBe("outline");

  // A drop at the left of a body in RTL is the end edge: the panel lands after it.
  const body = report.locator(".fa-pane-body");
  const box = (await body.boundingBox())!;
  await drag(page, await centre(workbench.getByRole("tab").filter({ hasText: "Notes" })), { x: box.x + 10, y: box.y + box.height / 2 }, async () => {
    await expect(body.locator(".fa-pane-drop")).toHaveAttribute("data-edge", "end");
  });
  await expect(stackFor(workbench, "notes").getByRole("tab")).toHaveCount(0);
  expect(await left(stackFor(workbench, "notes"))).toBeLessThan(await left(report));
  const result = await new AxeBuilder({ page }).include('[data-testid="pane-workbench"]').analyze();
  expect(result.violations.map((v) => v.id)).toEqual([]);
});

const APPEARANCES = [
  { density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1 },
  { density: "compact", uiScale: 1.125, radiusScale: 1.4, borderWidth: 1.5 },
  { density: "comfortable", uiScale: 0.9, radiusScale: 0, borderWidth: 2 },
] as const;

for (const appearance of APPEARANCES) {
  const name = `${appearance.density}, scale ${appearance.uiScale}, radius ${appearance.radiusScale}, line ${appearance.borderWidth}`;

  test(`geometry follows the theme: ${name}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced", ...value })), appearance);
    await page.goto("/components/pane-layout");
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE);
    await page.reload();
    const workbench = page.getByTestId("pane-workbench");
    await expect(count(page, "workbench-report")).toContainText("mounted 1", { timeout: 30_000 });
    await workbench.scrollIntoViewIfNeeded();
    const outline = stackFor(workbench, "outline");
    const report = stackFor(workbench, "report");
    const a = (await outline.boundingBox())!;
    const b = (await report.boundingBox())!;

    // The rem track follows UI scale; the gap is the theme's.
    expect(Math.abs(a.width - (await px(page, "16rem")))).toBeLessThan(1);
    expect(Math.abs(b.x - (a.x + a.width) - (await px(page, "var(--gap-panels)")))).toBeLessThan(1);
    const radius = await outline.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderStartStartRadius));
    expect(Math.abs(radius - (await px(page, "var(--radius-surface)")))).toBeLessThan(1);

    // The bar takes its height and inset from the theme, in both forms.
    for (const stack of [outline, report]) {
      const bar = stack.locator(".fa-pane-bar");
      expect(Math.abs((await bar.boundingBox())!.height - (await px(page, "var(--control-h-md)")))).toBeLessThan(1);
      const inset = await bar.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingInlineStart));
      expect(Math.abs(inset - (await px(page, "var(--space-2)")))).toBeLessThan(1);
    }

    // PanelBody inside a host keeps the panel's inset, measured against the host's edge.
    const body = page.locator('.fa-pane-host[data-panel="report"] .fa-panel-body');
    const padding = await body.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingInlineStart));
    expect(Math.abs(padding - (await px(page, "var(--inset-panel)")))).toBeLessThan(1);
    const host = page.locator('.fa-pane-host[data-panel="report"]');
    const hostBox = (await host.boundingBox())!;
    const button = (await workbench.getByRole("button", { name: "Move beside Notes" }).boundingBox())!;
    expect(Math.abs(button.x - hostBox.x - padding)).toBeLessThan(1);

    // The separator is a --gap-panels hit area, and its grip stays in it.
    const handle = workbench.getByRole("separator", { name: "Resize Outline" });
    expect(Math.abs((await handle.boundingBox())!.width - (await px(page, "var(--gap-panels)")))).toBeLessThan(1);

    // Flush chrome: one surface, and the hairline is the line weight.
    const flush = page.getByTestId("pane-flush");
    await flush.scrollIntoViewIfNeeded();
    const line = await flush.getByRole("separator").first().evaluate((element) => getComputedStyle(element, "::before").width);
    expect(Math.abs(Number.parseFloat(line) - (await px(page, "var(--border-width)")))).toBeLessThan(0.5);
    await expect(flush.locator(".fa-panel")).toHaveCount(1);

    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test(`scroll edges do not clip content: ${name}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced", ...value })), appearance);
    await page.goto("/components/pane-layout");
    const workbench = page.getByTestId("pane-workbench");
    await expect(count(page, "workbench-report")).toContainText("mounted 1", { timeout: 30_000 });
    await workbench.scrollIntoViewIfNeeded();
    const host = page.locator('.fa-pane-host[data-panel="report"]');
    const stack = stackFor(workbench, "report");
    await expect.poll(() => host.evaluate((element) => element.tabIndex)).toBe(0);
    await expect(host).not.toHaveAttribute("data-scrolled-top");
    // The first line is clear of the bar at rest.
    const top = await host.evaluate((element) => element.getBoundingClientRect().top);
    const first = (await count(page, "workbench-report").boundingBox())!;
    expect(first.y).toBeGreaterThanOrEqual(top);
    // At the far end the last row ends inside the host, above the inset, inside the stack.
    await host.evaluate((element) => (element.scrollTop = element.scrollHeight));
    await expect(host).toHaveAttribute("data-scrolled-top", "");
    const last = (await workbench.getByTestId("pane-report-rows").locator("li").last().boundingBox())!;
    const hostBox = (await host.boundingBox())!;
    const stackBox = (await stack.boundingBox())!;
    expect(last.y + last.height).toBeLessThanOrEqual(hostBox.y + hostBox.height + 0.5);
    expect(hostBox.y + hostBox.height).toBeLessThanOrEqual(stackBox.y + stackBox.height + 0.5);
    const inset = await px(page, "var(--inset-panel)");
    expect(hostBox.y + hostBox.height - (last.y + last.height)).toBeGreaterThanOrEqual(inset - 1);
    // The panel scrolls on one axis, and neither the content nor the bar widens the stack.
    expect(await host.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
    expect(hostBox.width).toBeLessThanOrEqual(stackBox.width + 0.5);
    // The focus ring of a control beside the host's edge fits between it and the edge.
    await workbench.getByRole("textbox", { name: "Report title" }).evaluate((element) => (element as HTMLElement).focus());
    const reach = await px(page, "var(--focus-reach)");
    const input = (await workbench.getByTestId("pane-report-rows").boundingBox())!;
    expect(input.x - hostBox.x).toBeGreaterThanOrEqual(reach);
    expect(hostBox.x + hostBox.width - (input.x + input.width)).toBeGreaterThanOrEqual(reach);
  });
}

test("the mail layout has no tabs, menus or drag, and still resizes", async ({ page }) => {
  await open(page);
  const mail = page.getByTestId("pane-mail");
  await mail.scrollIntoViewIfNeeded();
  await expect(mail.getByRole("tab")).toHaveCount(0);
  await expect(mail.getByRole("button")).toHaveCount(0);
  await expect(mail.locator(".fa-pane-bar")).toHaveCount(0);
  await expect(mail.getByRole("region")).toHaveCount(3);
  const separator = mail.getByRole("separator", { name: "Resize Folders" });
  const width = async () => (await mail.getByRole("region", { name: "Folders" }).boundingBox())!.width;
  const start = await width();
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(width).toBeCloseTo(start + 16, 0);
  // Its minimum is the panel's 10rem, not the default.
  await page.keyboard.press("Home");
  await expect.poll(width).toBeCloseTo(160, 0);
});

test("a maximised stack covers the tree, and its siblings pause", async ({ page }) => {
  await open(page);
  const workbench = page.getByTestId("pane-workbench");
  await workbench.getByRole("button", { name: "Actions for Report" }).click();
  await page.getByRole("menuitem", { name: "Maximise" }).click();
  const layout = workbench.locator(".fa-pane-layout");
  await expect(layout).toHaveAttribute("data-maximised", "");
  const report = (await stackFor(workbench, "report").boundingBox())!;
  const box = (await layout.boundingBox())!;
  expect(Math.abs(report.width - box.width)).toBeLessThan(1);
  expect(Math.abs(report.height - box.height)).toBeLessThan(1);
  await expect(workbench.getByRole("separator")).toHaveCount(0);
  await expect(count(page, "workbench-report")).toContainText("mounted 1, effects started 1, stopped 0");
  await expect(count(page, "workbench-outline")).toBeHidden();
  await workbench.getByRole("button", { name: "Actions for Report" }).click();
  await page.getByRole("menuitem", { name: "Restore" }).click();
  await expect(layout).not.toHaveAttribute("data-maximised", "");
  await expect(count(page, "workbench-outline")).toContainText("mounted 1, effects started 2, stopped 1");
  await expect(count(page, "workbench-session")).toContainText("mounted 1, effects started 1, stopped 0");
});
