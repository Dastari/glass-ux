import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/* Identities a host draws in a window's subtitle and a session's organisation: actual boxes,
   nothing nested in a button, and the row's own controls stay reachable. */

test("a session's organisation sits in the row without covering or nesting @responsive", async ({ page }) => {
  await page.goto("/components/session-nav");
  const nav = page.getByTestId("session-organisation-slot");
  const row = nav.locator(".fa-ai-session[data-organisation-slot]").first();
  await row.scrollIntoViewIfNeeded();
  const chip = row.getByRole("link").first();
  const button = row.locator(".fa-ai-session-row");
  expect(await chip.evaluate((node) => Boolean(node.closest("button")))).toBe(false);
  const [rowBox, chipBox, buttonBox] = await Promise.all([row.boundingBox(), chip.boundingBox(), button.boundingBox()]);
  expect(chipBox!.x + chipBox!.width).toBeLessThanOrEqual(rowBox!.x + rowBox!.width + 0.5);
  expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(chipBox!.x + 0.5);
  expect(chipBox!.height).toBeLessThanOrEqual(rowBox!.height + 0.5);
  const selected = nav.locator('.fa-ai-session[data-active]');
  await expect(selected).toHaveCSS("background-color", /./);
  await row.hover();
  const menu = await row.locator(".fa-ai-session-menu").boundingBox();
  expect(menu!.x).toBeGreaterThanOrEqual(chipBox!.x + chipBox!.width - 0.5);
  const results = await new AxeBuilder({ page }).include('[data-testid="session-organisation-slot"]').analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test("pressing the organisation does not select the session", async ({ page }) => {
  await page.goto("/components/session-nav");
  const nav = page.getByTestId("session-organisation-slot");
  const second = nav.locator(".fa-ai-session[data-organisation-slot]").nth(1);
  await expect(second).not.toHaveAttribute("data-active", "");
  await second.scrollIntoViewIfNeeded();
  await second.getByRole("link").first().click();
  await expect(second).not.toHaveAttribute("data-active", "");
  await second.locator(".fa-ai-session-row").click();
  await expect(second).toHaveAttribute("data-active", "");
});

test("a long organisation gives way and the session's time stays whole", async ({ page }) => {
  await page.goto("/components/session-nav");
  const rows = page.getByTestId("session-organisation-slot").locator(".fa-ai-session[data-organisation-slot]");
  await rows.first().scrollIntoViewIfNeeded();
  for (const row of await rows.all()) {
    const state = row.locator(".fa-ai-session-end > :is(.fa-ai-session-trail, .fa-ai-session-state)");
    const [rowBox, stateBox] = await Promise.all([row.boundingBox(), state.boundingBox()]);
    expect(stateBox!.x + stateBox!.width).toBeLessThanOrEqual(rowBox!.x + rowBox!.width + 0.5);
    // Only text can be cut short: a working spinner's scroll width changes as it turns.
    const text = await state.evaluate((node) => (node.querySelector("time") ? { scroll: node.scrollWidth, client: node.clientWidth } : { scroll: 0, client: 0 }));
    // A status dot's ring may report a pixel or two; text cut short would report far more.
    expect(text.scroll).toBeLessThanOrEqual(text.client + 2);
  }
});

test("a dock item raises its subject's actions, and the chip raises the same", async ({ page }) => {
  await page.goto("/components/window-frame");
  const stage = page.getByTestId("window-subject");
  await stage.scrollIntoViewIfNeeded();
  await stage.locator(".fa-wm-dock-item").first().click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Copy name" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem", { name: "Copy name" })).toHaveCount(0);
  await stage.locator(".fa-window-subtitle").getByRole("link").click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Copy name" })).toBeVisible();
});

test("a window's subject stays on the bar's line and the title keeps its place", async ({ page }) => {
  await page.goto("/components/window-frame");
  const stage = page.getByTestId("window-subject");
  await stage.scrollIntoViewIfNeeded();
  const subject = stage.locator("div.fa-window-subtitle");
  const chip = subject.getByRole("link");
  await expect(chip).toBeVisible();
  const [bar, box, title] = await Promise.all([
    stage.locator(".fa-window-appbar").boundingBox(),
    chip.boundingBox(),
    stage.locator(".fa-window-title").boundingBox(),
  ]);
  // A chip in the subtitle does not make the bar taller than a text subtitle does.
  const plain = await page.locator(".gallery-wm-box .fa-window-appbar").filter({ hasText: "Task manager" }).first().boundingBox();
  expect(bar!.height).toBeLessThanOrEqual(plain!.height + 0.5);
  // An inline chip sits 2px into its line box by design, so it does not grow the line.
  expect(box!.y).toBeGreaterThanOrEqual(title!.y + title!.height - 2.5);
  expect(box!.y + box!.height).toBeLessThanOrEqual(bar!.y + bar!.height + 0.5);
  // The dock names the window's subject in text.
  await expect(stage.locator(".fa-wm-dock-item").first()).toHaveAttribute("aria-label", /NST-C106/);
  const results = await new AxeBuilder({ page }).include('[data-testid="window-subject"]').analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

for (const appearance of [{ density: "compact" }, { uiScale: 1.25 }, { radiusScale: 0 }, { borderWidth: 2 }]) {
  test(`the organisation stays inside its row under ${JSON.stringify(appearance)}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(value)), appearance);
    await page.goto("/components/session-nav");
    const row = page.getByTestId("session-organisation-slot").locator(".fa-ai-session[data-organisation-slot]").first();
    await row.scrollIntoViewIfNeeded();
    const [rowBox, chip, button] = await Promise.all([
      row.boundingBox(),
      row.getByRole("link").first().boundingBox(),
      row.locator(".fa-ai-session-row").boundingBox(),
    ]);
    expect(chip!.x + chip!.width).toBeLessThanOrEqual(rowBox!.x + rowBox!.width + 0.5);
    expect(chip!.y).toBeGreaterThanOrEqual(rowBox!.y - 0.5);
    expect(chip!.y + chip!.height).toBeLessThanOrEqual(rowBox!.y + rowBox!.height + 0.5);
    expect(button!.width).toBeGreaterThan(0);
  });
}
