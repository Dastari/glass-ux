import { expect, test, type Page } from "@playwright/test";

/** The header toolbar's controls in the order they give way (fa-fit-1 … fa-fit-4). */
const FOLD_ORDER = ["Palette", "Density", "Animations", "Material"] as const;

interface ToolbarState {
  /** Each control's data-form, by its accessible name. */
  forms: Record<string, string | null>;
  /** The toolbar is shown (not replaced by the Appearance button). */
  shown: boolean;
  /** Controls whose box leaves the header or the toolbar, or overlaps the next one. */
  overflow: string[];
}

async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

async function toolbarState(page: Page): Promise<ToolbarState> {
  return page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(".docs-header")!;
    const toolbar = header.querySelector<HTMLElement>(".docs-toolbar")!;
    const shown = getComputedStyle(toolbar).display !== "none";
    const forms: Record<string, string | null> = {};
    const overflow: string[] = [];
    const bounds = header.getBoundingClientRect();
    const box = toolbar.getBoundingClientRect();
    let previousRight = -Infinity;
    for (const child of Array.from(toolbar.children) as HTMLElement[]) {
      const style = getComputedStyle(child);
      // Base UI's hidden form input beside the select is not a control on screen.
      if (child.tagName === "INPUT" || style.position === "absolute" || style.display === "none") continue;
      const name = child.getAttribute("aria-label") ?? child.className;
      forms[name] = child.getAttribute("data-form");
      if (!shown) continue;
      const rect = child.getBoundingClientRect();
      // Content spilling out of (or scrolling inside) its own box counts as overflow too.
      const spill = child.scrollWidth > child.clientWidth + 1;
      if (
        rect.left < Math.max(bounds.left, box.left) - 0.5 ||
        rect.right > Math.min(bounds.right, box.right) + 0.5 ||
        rect.left < previousRight - 0.5 ||
        spill
      )
        overflow.push(name);
      previousRight = rect.right;
    }
    for (const control of Array.from(
      header.querySelectorAll<HTMLElement>("a, button"),
    )) {
      if (!control.getClientRects().length) continue;
      const rect = control.getBoundingClientRect();
      if (rect.left < bounds.left - 0.5 || rect.right > bounds.right + 0.5)
        overflow.push(control.getAttribute("aria-label") ?? control.textContent ?? "control");
    }
    return { forms, shown, overflow };
  });
}

const folded = (state: ToolbarState) =>
  FOLD_ORDER.map((name) => state.forms[name] === "menu");

/** Controls fold in order: once one is folded, every control that gives way before it is too. */
function expectFoldOrder(state: ToolbarState) {
  const steps = folded(state);
  for (let index = 1; index < steps.length; index++)
    if (steps[index]) expect(steps[index - 1], `${FOLD_ORDER[index]} folded before ${FOLD_ORDER[index - 1]}`).toBe(true);
}

test.describe("docs toolbar fit", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        "glass-ux.appearance.v1",
        JSON.stringify({ mode: "light", palette: "ocean", motion: "reduced" }),
      ),
    );
  });

  test("never overflows its header and folds the palette first", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await page.goto("components/swatch-picker/");
    await expect(page.locator(".docs-header .docs-toolbar")).toBeVisible();
    const seen: Record<number, ToolbarState> = {};
    for (const width of [1920, 1600, 1500, 1366, 1280, 1024, 960, 900, 800, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await settle(page);
      await settle(page);
      const state = await toolbarState(page);
      seen[width] = state;
      expect(state.overflow, `${width}px`).toEqual([]);
      if (state.shown) expectFoldOrder(state);
      // The mode switch keeps its icons whenever the toolbar shows.
      if (state.shown) expect(state.forms.Mode).toBe("icons");
    }
    expect(folded(seen[1920]!)).toEqual([false, false, false, false]);
    // Twelve palettes: the palette folds to its menu first, and already at 1500px.
    expect(folded(seen[1500]!)).toEqual([true, false, false, false]);
    // The palette gives way before any segmented control.
    expect(folded(seen[1280]!)).toEqual([true, false, false, false]);
    expect(seen[1024]!.shown).toBe(true);
    // Narrower, the segmented controls follow (how many depends on their chosen labels).
    expect(folded(seen[1024]!).slice(0, 2)).toEqual([true, true]);
    // Below every control folded, one Appearance button holds them.
    for (const width of [900, 800, 768]) expect(seen[width]!.shown).toBe(false);
    const appearance = page
      .locator(".docs-header")
      .getByRole("button", { name: "Appearance", exact: true });
    await expect(appearance).toBeVisible();
    await appearance.click();
    const popover = page.getByRole("dialog");
    await expect(popover.getByRole("button", { name: "Ruby", exact: true })).toBeVisible();
    await popover.getByRole("button", { name: "Ruby", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-palette", "ruby");
  });

  for (const appearance of [
    { density: "compact", uiScale: 1 },
    { density: "comfortable", uiScale: 1.25 },
    { density: "comfortable", uiScale: 1, motion: "full", glass: "reduced" },
  ]) {
    test(`never overflows at ${appearance.density}, UI scale ${appearance.uiScale}`, async ({
      page,
    }) => {
      await page.addInitScript(
        (appearance) =>
          localStorage.setItem(
            "glass-ux.appearance.v1",
            JSON.stringify({ mode: "dark", palette: "ocean", motion: "reduced", ...appearance }),
          ),
        appearance,
      );
      await page.setViewportSize({ width: 1920, height: 900 });
      await page.goto("components/swatch-picker/");
      await expect(page.locator(".docs-header .docs-toolbar")).toBeVisible();
      for (const width of [1920, 1600, 1500, 1366, 1280, 1024, 960, 900, 800, 768]) {
        await page.setViewportSize({ width, height: 900 });
        await settle(page);
        await settle(page);
        const state = await toolbarState(page);
        expect(state.overflow, `${width}px`).toEqual([]);
        if (state.shown) expectFoldOrder(state);
      }
    });
  }

  test("folds and unfolds once each way while the window resizes slowly", async ({
    page,
  }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width: 1920, height: 900 });
    await page.goto("components/swatch-picker/");
    await expect(page.locator(".docs-header .docs-toolbar")).toBeVisible();
    const widths: number[] = [];
    for (let width = 1920; width >= 980; width -= 6) widths.push(width);
    const run = async (sequence: number[]) => {
      const history: boolean[][] = [];
      for (const width of sequence) {
        await page.setViewportSize({ width, height: 900 });
        await settle(page);
        const state = await toolbarState(page);
        expect(state.overflow, `${width}px`).toEqual([]);
        expectFoldOrder(state);
        history.push(folded(state));
      }
      return history;
    };
    const changes = (history: boolean[][], index: number) =>
      history.filter((step, at) => at > 0 && step[index] !== history[at - 1]![index]).length;
    const shrinking = await run(widths);
    const growing = await run([...widths].reverse());
    for (const [index, name] of FOLD_ORDER.entries()) {
      expect(changes(shrinking, index), `${name} while shrinking`).toBeLessThanOrEqual(1);
      expect(changes(growing, index), `${name} while growing`).toBeLessThanOrEqual(1);
    }
    expect(shrinking.at(-1)).toEqual([true, true, true, true]);
    expect(growing.at(-1)).toEqual([false, false, false, false]);
  });

  test("the folded palette is a menu button that keeps its width and its keyboard path", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("components/swatch-picker/");
    const toolbar = page.getByRole("region", { name: "Appearance controls" });
    const group = toolbar.getByRole("group", { name: "Palette", exact: true });
    await expect(group).toHaveAttribute("data-form", "menu");
    const trigger = toolbar.getByRole("button", { name: "Palette: Ocean", exact: true });
    const before = await trigger.boundingBox();
    await trigger.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitemradio", { name: "Ocean" })).toHaveAttribute("aria-checked", "true");
    await expect(menu.getByRole("menuitemradio")).toHaveText(["Ocean", "Aurora", "Emerald", "Sunset", "Graphite", "Ruby", "Lagoon", "Indigo", "Rose", "Moss", "Sand", "Slate"]);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(menu).toBeHidden();
    await expect(page.locator("html")).not.toHaveAttribute("data-palette", "ocean");
    const chosen = await page.locator("html").getAttribute("data-palette");
    const renamed = toolbar.getByRole("button", { name: /^Palette: / });
    await expect(renamed).toBeFocused();
    expect(await renamed.getAttribute("aria-label")).not.toBe("Palette: Ocean");
    const after = await renamed.boundingBox();
    expect(after!.width).toBeCloseTo(before!.width, 1);
    expect(after!.x).toBeCloseTo(before!.x, 1);
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(renamed).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("data-palette", chosen!);
  });
});

test("catalogue toolbar specimen folds in order inside its frame @responsive", async ({
  page,
}) => {
  await page.goto("components/swatch-picker/");
  const frame = page.locator(".gallery-lab-frame[data-resizable]").first();
  const row = frame.getByRole("group", { name: "Toolbar", exact: true });
  await row.scrollIntoViewIfNeeded();
  const widths = (await page.viewportSize())!.width < 600 ? [300, 240] : [640, 480, 400, 300];
  for (const width of widths) {
    await frame.evaluate((element, width) => (element.style.width = `${width}px`), width);
    await settle(page);
    await settle(page);
    const state = await row.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return Array.from(element.children)
        .filter((child) => getComputedStyle(child).position !== "absolute")
        .map((child) => {
          const rect = child.getBoundingClientRect();
          return {
            name: child.getAttribute("aria-label"),
            form: child.getAttribute("data-form"),
            inside: rect.left >= bounds.left - 0.5 && rect.right <= bounds.right + 0.5,
          };
        });
    });
    const forms = state.map((control) => control.form === "menu");
    // Palette (fa-fit-1), then range (fa-fit-2), then density (fa-fit-3).
    if (forms[1]) expect(forms[0]).toBe(true);
    if (forms[2]) expect(forms[1]).toBe(true);
    const everyFolded = forms.every(Boolean);
    if (!everyFolded) expect(state.filter((control) => !control.inside)).toEqual([]);
  }
});

test("phone appearance sheet keeps every swatch @responsive", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 768, "the phone header only");
  await page.goto("./");
  await page
    .locator(".docs-mobile-header")
    .getByRole("button", { name: "Appearance", exact: true })
    .click();
  const sheet = page.getByRole("dialog", { name: "Appearance", exact: true });
  const palette = sheet.getByRole("group", { name: "Palette", exact: true });
  await expect(palette).toHaveAttribute("data-form", "full");
  await expect(palette.getByRole("button")).toHaveCount(12);
  const fits = await palette.evaluate((element) => {
    const bounds = element.closest('[role="dialog"]')!.getBoundingClientRect();
    return Array.from(element.querySelectorAll("button")).every((button) => {
      const rect = button.getBoundingClientRect();
      return rect.left >= bounds.left && rect.right <= bounds.right;
    });
  });
  expect(fits).toBe(true);
});
