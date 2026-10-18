import { test, expect, type Locator, type Page } from "@playwright/test";

/*
 * AppShell's drawer and inspector slots reach over the workspace column so their panes can
 * slide over it, so the shell sizes the pane. A pane's own `flex: 1 1 auto` (Inspector in
 * 0.7.0) must not stretch it across the workspace, whatever order the stylesheets load in.
 */

// A component default that loads after app-shell.css, as inspector.css does.
const STRETCHING_PANES = `@layer components {
  .fa-shell-inspector, .fa-shell-drawer { flex: 1 1 auto; min-width: 0; }
}`;

const SHELL_STORAGE_KEY = "workspace.shell.v1";

async function openShell(page: Page, inspector?: "open") {
  if (inspector)
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      [SHELL_STORAGE_KEY, JSON.stringify({ inspector })] as const,
    );
  await page.goto("/components/app-shell");
  const shell = page.locator("#examples .fa-shell").first();
  await expect(shell).toBeVisible({ timeout: 30_000 });
  await page.addStyleTag({ content: STRETCHING_PANES });
  return shell;
}

/** The pixel width of a length token, resolved inside the shell. */
async function tokenWidth(shell: Locator, value: string) {
  return shell.evaluate((element, width) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;width:${width}`;
    element.append(probe);
    const px = probe.getBoundingClientRect().width;
    probe.remove();
    return px;
  }, value);
}

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  expect(rect).not.toBeNull();
  return rect!;
}

/** Waits for the pane's slide and the shell's track commit to finish. */
async function settled(pane: Locator, work: Locator) {
  await expect
    .poll(() => pane.evaluate((element) => getComputedStyle(element).transform))
    .toBe("none");
  let last = "";
  await expect
    .poll(async () => {
      const now = JSON.stringify([await box(pane), await box(work)]);
      const same = now === last;
      last = now;
      return same;
    })
    .toBe(true);
}

async function workTakesItsOwnClicks(work: Locator) {
  // elementFromPoint only sees the viewport.
  await work.scrollIntoViewIfNeeded();
  const rect = await box(work);
  const hit = await work.evaluate(
    (element, [x, y]) => element.contains(document.elementFromPoint(x, y)),
    [rect.x + rect.width / 2, rect.y + rect.height / 2] as const,
  );
  expect(hit).toBe(true);
}

for (const viewport of [
  { width: 1920, height: 1080, inspector: undefined },
  { width: 1366, height: 768, inspector: "open" as const },
]) {
  const when = `${viewport.width}×${viewport.height}${viewport.inspector ? ", opened" : ", by default"}`;

  test(`a docked Inspector keeps its width beside the workspace at ${when}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const shell = await openShell(page, viewport.inspector);
    const pane = shell.locator(".fa-shell-slot-inspector > .fa-shell-inspector");
    const work = shell.locator(".fa-shell-slot-work");
    await expect(pane).toBeVisible();
    await settled(pane, work);

    const paneBox = await box(pane);
    const workBox = await box(work);
    expect(Math.abs(paneBox.width - (await tokenWidth(shell, "var(--inspector-w)")))).toBeLessThan(1);
    expect(paneBox.x).toBeGreaterThanOrEqual(workBox.x + workBox.width - 0.5);
    await workTakesItsOwnClicks(work);
  });

  test(`a docked SectionDrawer keeps its width beside the workspace at ${when}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const shell = await openShell(page, viewport.inspector);
    const pane = shell.locator(".fa-shell-slot-drawer > .fa-shell-drawer");
    const work = shell.locator(".fa-shell-slot-work");
    await expect(pane).toBeVisible();
    await settled(pane, work);

    const paneBox = await box(pane);
    const workBox = await box(work);
    expect(Math.abs(paneBox.width - (await tokenWidth(shell, "var(--_drawer)")))).toBeLessThan(1);
    expect(paneBox.x + paneBox.width).toBeLessThanOrEqual(workBox.x + 0.5);
    await workTakesItsOwnClicks(work);
  });
}
