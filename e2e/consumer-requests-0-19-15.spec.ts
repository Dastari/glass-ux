import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * #36: four controls whose faces held text their names did not (axe 4.14, WCAG 2.5.3).
 * #38: a window kind can hide its visible title. #39: tags beside an entity's state.
 */

async function labelInName(page: Page, selector: string) {
  const result = await new AxeBuilder({ page }).include(selector).withRules(["label-content-name-mismatch"]).analyze();
  expect(result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
}

test("ContextAvatar draws its initials with CSS, so a chip around it is named by its title alone", async ({ page }) => {
  await page.goto("./components/context-switcher");
  const face = page.locator(".fa-context-avatar-initials[data-initials]").first();
  await face.scrollIntoViewIfNeeded();
  expect(await face.evaluate((el) => el.textContent)).toBe("");
  expect(await face.evaluate((el) => getComputedStyle(el, "::before").content)).toMatch(/^"[A-Z]{1,3}"$/);
  await labelInName(page, ".gallery-content, main");
});

test("A DataTable group header is named by its label, count and detail", async ({ page }) => {
  await page.goto("./components/data-table");
  const grouped = page.getByTestId("dt-grouped");
  await grouped.scrollIntoViewIfNeeded();
  const toggle = grouped.locator(".fa-dt-group-toggle").first();
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toHaveAttribute("aria-label");
  await expect(toggle).toHaveAccessibleName(/^\S.* \d+ \d+ online$/);
  await expect(toggle).toHaveAttribute("aria-description", /, \d+ /);
  await labelInName(page, '[data-testid="dt-grouped"]');
});

test("SessionNav rows a host draws are named by their content", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./components/session-nav");
  const nav = page.getByTestId("session-identity");
  await nav.scrollIntoViewIfNeeded();
  await expect(nav.locator(".fa-ai-session[data-custom]")).toHaveCount(4);
  await labelInName(page, '[data-testid="session-identity"]');
});

test("TimerChip is named by its face, with the sentence as its description", async ({ page }) => {
  await page.goto("./components/timer-chip");
  const chip = page.locator(".fa-shell-timer").first();
  await chip.scrollIntoViewIfNeeded();
  await expect(chip).toHaveAccessibleName(/^\d+:\d{2} · Exhibition planning$/);
  await expect(chip).toHaveAttribute("aria-description", /running for/);
  await labelInName(page, ".fa-shell-timer");
});

test("A window kind's hidden title leaves the subtitle as the bar's heading line, and stays its name", async ({ page }) => {
  await page.goto("./components/window-frame");
  const box = page.getByTestId("window-hidden-title");
  await box.scrollIntoViewIfNeeded();
  const frame = box.locator(".fa-window");
  await expect(frame).toHaveAccessibleName("Web page");
  await expect(box.getByRole("heading", { name: "Web page" })).toBeAttached();
  await expect(box.getByRole("button", { name: /Close Web page/ })).toBeVisible();
  const title = await box.locator(".fa-window-title").boundingBox();
  expect(title!.width).toBeLessThanOrEqual(1);
  // The subtitle leads: centred in the bar on its own.
  const bar = (await box.locator(".fa-window-appbar").boundingBox())!;
  const subtitle = (await box.locator(".fa-window-subtitle").boundingBox())!;
  expect(Math.abs(subtitle.y + subtitle.height / 2 - (bar.y + bar.height / 2))).toBeLessThan(2);
});

test("Entity tags sit before the state at its size on the header and compact title lines", async ({ page }) => {
  await page.goto("./components/entity-identity");
  const tags = page.getByTestId("entity-tags");
  await tags.scrollIntoViewIfNeeded();
  for (const tier of ["header", "compact"]) {
    const line = tags.locator(`.fa-entity[data-tier="${tier}"] .fa-entity-state`);
    await expect(line.locator(".fa-badge")).toHaveText(["Router", "No agent"]);
    const [tag, state] = await line.locator(".fa-badge").evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
    expect(Math.abs(tag.height - state.height)).toBeLessThan(0.5);
    expect(Math.abs(tag.y - state.y)).toBeLessThan(0.5);
    expect(state.x).toBeGreaterThan(tag.x + tag.width);
  }
});
