import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * Requests from a consuming application:
 *   Stepper     a complete step can also be the current one; with `sections` it follows the
 *               section in view and scrolls to a chosen one
 *   Segmented   readOnly: a recorded answer, one tab stop, nothing changes it
 *   Workspace   reservePrimary={false} lets tiles fill the stage; tileOrder keeps their order
 *   LevelGauge  a small ordered scale with an earlier level kept in view
 */

async function open(page: Page, path: string) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })),
  );
  await page.goto(path);
  return errors;
}

test("the stepper follows the section in view, keeps a complete current step highlighted, and scrolls to a chosen step", async ({ page }) => {
  const errors = await open(page, "/components/stepper");
  const form = page.getByTestId("check-in-form");
  await expect(form).toBeVisible({ timeout: 30_000 });
  await form.scrollIntoViewIfNeeded();
  const nav = page.getByRole("navigation", { name: "Check-in sections" });
  const current = nav.locator("[aria-current='step']");
  await expect(current).toContainText("Visitor");

  await form.getByLabel("Countries visited in the last 30 days").fill("None");
  await form.getByLabel("Contact with livestock this week").fill("No");
  await form.evaluate((element) => element.scrollTo(0, 420));
  await expect(current).toContainText("Screening");
  await expect(current).toHaveAttribute("data-status", "complete");
  await expect(current.locator(".fa-stepper-text")).toHaveText("Screening, complete, current");

  await nav.getByRole("button", { name: /Agreement/ }).click();
  await expect(current).toContainText("Agreement");
  await expect.poll(() => form.evaluate((element) => element.scrollTop + element.clientHeight >= element.scrollHeight - 2)).toBe(true);
  await nav.getByRole("button", { name: /Visitor/ }).click();
  await expect(current).toContainText("Visitor");
  await expect.poll(() => form.evaluate((element) => element.scrollTop)).toBe(0);
  expect(errors).toEqual([]);
});

test("a read-only Segmented is one tab stop that keys and clicks do not change @responsive", async ({ page }) => {
  await open(page, "/components/segmented");
  const group = page.getByRole("radiogroup", { name: "Remote control (recorded)" });
  await expect(group).toHaveAttribute("aria-readonly", "true", { timeout: 30_000 });
  const enabled = group.getByRole("radio", { name: "Enabled" });
  const disabled = group.getByRole("radio", { name: "Disabled" });
  await disabled.click();
  await expect(enabled).toHaveAttribute("aria-checked", "true");
  await enabled.focus();
  await page.keyboard.press("ArrowRight");
  await expect(enabled).toBeFocused();
  await expect(enabled).toHaveAttribute("aria-checked", "true");
  expect(await group.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  await page.keyboard.press("Tab");
  await expect(disabled).not.toBeFocused();
});

test("tiles fill the stage without a primary column, in their set order, and the page returns when they close", async ({ page }) => {
  await open(page, "/components/window-frame");
  const dash = page.getByTestId("dashboard-workspace");
  await expect(dash).toBeVisible({ timeout: 30_000 });
  await dash.scrollIntoViewIfNeeded();
  const tiles = dash.locator(".fa-wm-window:not([data-primary])");
  await expect(tiles).toHaveCount(2);
  const [screen, terminal] = [dash.getByRole("region", { name: /Gate camera/ }), dash.getByRole("region", { name: /Gate log/ })];
  const stage = (await dash.locator(".fa-wm-workspace-stage").boundingBox())!;
  const left = (await screen.boundingBox())!;
  const right = (await terminal.boundingBox())!;
  expect(left.x).toBeLessThan(right.x);
  expect(left.x - stage.x).toBeLessThan(4);
  expect(stage.x + stage.width - (right.x + right.width)).toBeLessThan(4);
  await expect(dash.locator("[data-primary]")).toHaveAttribute("data-hidden", "");
  await expect(dash.getByRole("separator")).toHaveCount(1);

  for (const window of [screen, terminal]) await window.getByRole("button", { name: /^Close/ }).click();
  await expect(dash.getByText("The camera and log windows are closed.")).toBeVisible();
  await dash.getByRole("button", { name: "Reopen windows" }).click();
  await expect(tiles).toHaveCount(2);
  expect((await screen.boundingBox())!.x).toBeLessThan((await terminal.boundingBox())!.x);
});

test("level gauges name their level and the earlier one, open their explanation, and pass axe @responsive", async ({ page }) => {
  const errors = await open(page, "/components/level-gauge");
  const table = page.getByTestId("level-gauge-table");
  await expect(table).toBeVisible({ timeout: 30_000 });
  await expect(table.getByText("Risk: Moderate (Before mitigation: High)")).toBeAttached();
  await expect(table.getByText("Risk: Not rated")).toBeAttached();
  const summary = page.getByRole("button", { name: "Final risk: Moderate (Before mitigation: High)" }).first();
  await summary.click();
  await expect(page.getByRole("dialog", { name: "Risk levels" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(summary).toBeFocused();
  const result = await new AxeBuilder({ page }).include(".gallery-document-sections").analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
  expect(errors).toEqual([]);
});
