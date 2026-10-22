import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

/*
 * WindowScopeInfo chip and icon (0.9.5): the application's identity component draws the app
 * bar's scope chip in place of the library's pill, and its icon in a narrow window, without
 * changing the app bar's height or overlapping the title.
 */

async function measure(page: Page, frame: string) {
  const scope = page.locator(`[aria-label="${frame}"] .fa-window-scope`);
  await expect(scope).toBeAttached({ timeout: 30_000 });
  await scope.scrollIntoViewIfNeeded();
  return scope.evaluate((element) => {
    const box = (node: Element | null | undefined) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };
    const style = getComputedStyle(element);
    const window = element.closest(".fa-window")!;
    const part = (selector: string) => {
      const node = element.querySelector<HTMLElement>(selector);
      return node && { display: getComputedStyle(node).display, box: box(node), scroll: node.scrollWidth, client: node.clientWidth };
    };
    return {
      scope: box(element),
      background: style.backgroundColor,
      padding: style.paddingInline,
      frame: box(window),
      bar: box(window.querySelector(".fa-window-appbar")),
      title: box(window.querySelector(".fa-window-title")),
      chip: part(".fa-window-scope-chip"),
      icon: part(".fa-window-scope-icon"),
      tile: box(element.querySelector(".fa-window-scope-icon .fa-entity-icon")),
      label: part(".fa-window-scope-label"),
      // The narrow form applies below 36rem of window width (@container window).
      narrow: window.getBoundingClientRect().width < 36 * parseFloat(getComputedStyle(document.documentElement).fontSize),
    };
  });
}

test("the application's scope chip replaces the pill, and its icon replaces it in a narrow window @responsive", async ({ page }) => {
  await page.goto("/components/window-scope-chip");
  const reference = await measure(page, "Northstar Studio terminal");
  const wide = await measure(page, "Northstar Studio terminal with an identity chip");
  const narrow = await measure(page, "Compact Northstar Studio terminal with an identity icon");

  // The example window is drawn: the app bar fits inside the frame.
  expect(reference.bar!.height).toBeGreaterThan(30);
  expect(reference.frame!.height).toBeGreaterThanOrEqual(reference.bar!.height);
  // The library's pill is still drawn by default.
  expect(reference.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(reference.label?.display).toBe(reference.narrow ? "none" : "block");
  expect(narrow.narrow).toBe(true);

  for (const view of [wide, narrow]) {
    expect(view.background).toBe("rgba(0, 0, 0, 0)");
    expect(view.padding).toBe("0px");
    expect(view.label).toBeNull();
    // Inside the app bar, which keeps the reference window's height, and clear of the title.
    expect(view.bar!.height).toBeCloseTo(reference.bar!.height, 0);
    expect(view.scope!.bottom).toBeLessThanOrEqual(view.frame!.bottom + 0.5);
    expect(view.scope!.top).toBeGreaterThanOrEqual(view.bar!.top - 0.5);
    expect(view.scope!.bottom).toBeLessThanOrEqual(view.bar!.bottom + 0.5);
    expect(view.scope!.left).toBeGreaterThanOrEqual(view.title!.right - 0.5);
  }

  // A wide window: the chip, whole; the icon is held back. (On a phone every window is narrow.)
  if (!wide.narrow) {
    expect(wide.icon?.display).toBe("none");
    expect(wide.chip?.display).not.toBe("none");
    expect(wide.chip!.box!.width).toBeGreaterThan(reference.scope!.height);
    expect(wide.chip!.scroll).toBeLessThanOrEqual(wide.chip!.client + 1);
  }

  // A narrow window: the icon alone, a library tile the size of the narrow pill.
  // The library's pill is --control-h-xs tall at every width.
  const pill = reference.scope!.height;
  expect(pill).toBeGreaterThan(16);
  for (const view of wide.narrow ? [wide, narrow] : [narrow]) {
    expect(view.chip?.display).toBe("none");
    expect(view.icon?.display).not.toBe("none");
    expect(view.tile!.width).toBeCloseTo(pill, 0);
    expect(view.tile!.height).toBeCloseTo(pill, 0);
    expect(view.scope!.width).toBeCloseTo(pill, 0);
  }
});

test("a squeezed narrow window keeps the scope icon's tile and clear of the next tool @responsive", async ({ page }) => {
  await page.goto("/components/window-scope-chip");
  const label = "Compact Northstar Studio terminal with an identity icon";
  const pill = (await measure(page, label)).scope!.height;
  // Squeeze the title row until the scope would have to give way: the example has no app bar
  // tools, so it takes a very narrow window (in an application, tools take the room).
  await page.locator(`[aria-label="${label}"]`).evaluate((element: HTMLElement) => {
    element.style.width = "7rem";
    element.style.minWidth = "0";
  });
  const view = await measure(page, label);
  expect(view.narrow).toBe(true);
  expect(view.scope!.width).toBeCloseTo(pill, 0);
  expect(view.icon!.box!.left).toBeGreaterThanOrEqual(view.scope!.left - 0.5);
  expect(view.icon!.box!.right).toBeLessThanOrEqual(view.scope!.right + 0.5);
  const next = await page
    .locator(`[aria-label="${label}"] .fa-window-scope`)
    .evaluate((element) => {
      // The next tool drawn in the app bar after the scope.
      const bar = element.closest(".fa-window-appbar")!;
      const after = Array.from(bar.querySelectorAll<HTMLElement>("button, .fa-window-actions > *")).filter(
        (node) => !element.contains(node) && element.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
      const drawn = after.map((node) => node.getBoundingClientRect()).find((rect) => rect.width > 0);
      return drawn ? drawn.left : null;
    });
  if (next !== null) expect(view.scope!.right).toBeLessThanOrEqual(next + 0.5);
});

test("a scope drawn by the application keeps its name and passes axe @responsive", async ({ page }) => {
  await page.goto("/components/window-scope-chip");
  for (const frame of ["Northstar Studio terminal with an identity chip", "Compact Northstar Studio terminal with an identity icon"]) {
    const window = page.locator(`[aria-label="${frame}"]`);
    await expect(window.getByRole("img", { name: "Organisation: Northstar Studio" })).toBeAttached({ timeout: 30_000 });
    await expect(window.locator(".fa-window-scope-chip, .fa-window-scope-icon").first()).toHaveAttribute("aria-hidden", "true");
    const result = await new AxeBuilder({ page }).include(`[aria-label="${frame}"] .fa-window-scope`).analyze();
    expect(result.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
  }
});
