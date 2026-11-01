import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * NotificationList through its catalogue page: the keyboard, rows that stay put while others
 * arrive, the shell's openers, and actual geometry under every preference.
 */

const ROUTE = "/components/notification-list";
const prefs = (page: Page, more: object = {}) =>
  page.addInitScript(
    (extra) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced", ...extra })),
    more,
  );
const full = (page: Page) => page.getByTestId("notifications-full");
const row = (scope: Locator, title: string) => scope.locator("li.fa-notification").filter({ hasText: title });
const tops = (scope: Locator) => scope.locator("li.fa-notification").evaluateAll((rows) => rows.map((element) => Math.round(element.getBoundingClientRect().top)));

test.beforeEach(async ({ page }) => {
  await prefs(page);
  await page.goto(ROUTE);
  await expect(row(full(page), "Mira Rowan commented").first()).toBeVisible();
});

test("unread state is in the accessible name, and the rows are one tab stop @responsive", async ({ page }) => {
  const list = full(page);
  const first = list.getByRole("button", { name: /^Unread: Mira Rowan commented on Floor plan/ });
  await expect(first).toBeVisible();
  await expect(list.getByRole("button", { name: /^Export of Site survey finished/ })).toBeVisible();
  await first.focus();
  await page.keyboard.press("ArrowDown");
  await expect(list.getByRole("button", { name: /^Unread: Avery Quinn shared/ })).toBeFocused();
  await page.keyboard.press("End");
  await expect(list.getByRole("button", { name: /^Jamie Wells joined/ })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(first).toBeFocused();
  // Tab walks this row's controls and leaves the list: other rows are out of the tab order.
  const stops: string[] = [];
  for (let press = 0; press < 12; press++) {
    await page.keyboard.press("Tab");
    const name = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent ?? "");
    const inside = await list.evaluate((element) => element.contains(document.activeElement));
    if (!inside) break;
    stops.push(name.slice(0, 60));
  }
  expect(stops.slice(0, 3)).toEqual(["Reply", "Mark read: Mira Rowan commented on Floor plan", "Dismiss: Mira Rowan commented on Floor plan"]);
  expect(stops).toHaveLength(4);
  expect(stops[3]).toMatch(/^Load more/);
});

test("mark read, mark all read, the action and opening a row", async ({ page }) => {
  const list = full(page);
  const target = row(list, "Avery Quinn shared");
  await target.hover();
  await target.getByRole("button", { name: /^Mark read/ }).click();
  await expect(list.getByRole("button", { name: /^Avery Quinn shared/ })).toBeVisible();
  await target.hover();
  await expect(target.getByRole("button", { name: /^Mark unread/ })).toBeVisible();
  await row(list, "Export of Site survey").getByRole("button", { name: "Download" }).click();
  await expect(page.getByTestId("notifications-log")).toHaveText("Download on n3");
  await list.getByRole("button", { name: /^Unread: Mira Rowan commented/ }).click();
  await expect(page.getByTestId("notifications-log")).toHaveText("Opened n1");
  await expect(list.getByRole("button", { name: /^Mira Rowan commented/ })).toBeVisible();
  await list.getByRole("button", { name: "Mark all read", exact: true }).click();
  await expect(list.locator("[data-unread]")).toHaveCount(0);
  await expect(list.getByRole("button", { name: "Mark all read", exact: true })).toHaveAttribute("aria-disabled", "true");
});

test("marking a row read under Unread leaves it where it is until the filter changes", async ({ page }) => {
  const list = full(page);
  await list.getByRole("button", { name: "Unread", exact: true }).click();
  await expect(list.locator("li.fa-notification")).toHaveCount(3);
  const before = await tops(list);
  const target = row(list, "Avery Quinn shared");
  await target.hover();
  await target.getByRole("button", { name: /^Mark read/ }).click();
  await expect(list.locator("[data-unread]")).toHaveCount(2);
  expect(await tops(list)).toEqual(before);
  await list.getByRole("button", { name: "All", exact: true }).click();
  await list.getByRole("button", { name: "Unread", exact: true }).click();
  await expect(list.locator("li.fa-notification")).toHaveCount(2);
});

test("late arrivals wait behind a count: no row moves, and asking for them focuses the first @responsive", async ({ page }) => {
  const list = full(page);
  await expect(list.locator("[data-unread]")).toHaveCount(3);
  const before = await tops(list);
  const toolbar = await list.locator(".fa-notification-toolbar").boundingBox();
  const deliver = page.getByRole("button", { name: "Deliver a notification" });
  await deliver.click();
  await deliver.click();
  const show = list.getByRole("button", { name: "Show 2 new notifications" });
  await expect(show).toHaveText("2 new");
  expect(await tops(list)).toEqual(before);
  expect(await list.locator(".fa-notification-toolbar").boundingBox()).toEqual(toolbar);
  await expect(page.locator("[data-fa-announcer]").filter({ hasText: "2 new notifications" }).first()).toBeAttached();
  await show.focus();
  await page.keyboard.press("Enter");
  await expect(list.getByRole("button", { name: /^Unread: Avery Quinn replied to thread 2/ })).toBeFocused();
  await expect(show).toBeHidden();
});

test("dismiss moves focus to a neighbour @responsive", async ({ page }) => {
  const list = full(page);
  await list.getByRole("button", { name: /^Unread: Avery Quinn shared/ }).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("aria-label", /^Dismiss: Avery Quinn/);
  await page.keyboard.press("Enter");
  await expect(row(list, "Avery Quinn shared")).toHaveCount(0);
  await expect(list.getByRole("button", { name: /^Export of Site survey/ })).toBeFocused();
});

test("the next page loads at the end, fails in place and retries", async ({ page }) => {
  const list = full(page);
  await page.getByRole("button", { name: "Fail the next page" }).click();
  await list.locator(".fa-scroll-viewport").evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect(list.getByText("Older notifications did not load.")).toBeVisible();
  const foot = await list.locator(".fa-notification-foot").boundingBox();
  const before = await list.locator("li.fa-notification").count();
  await list.getByRole("button", { name: "Retry" }).click();
  await expect(list.getByText("Weekly summary 1 is ready")).toBeVisible();
  expect((await list.locator("li.fa-notification").count()) - before).toBeGreaterThanOrEqual(3);
  expect(foot?.height).toBeGreaterThan(0);
});

test("loading, empty and error fill the same box, and the error offers Retry", async ({ page }) => {
  const boxes = await Promise.all(["notifications-loading", "notifications-empty", "notifications-error"].map((id) => page.getByTestId(id).locator(".fa-notification-list").boundingBox()));
  expect(boxes[0]?.height).toBeGreaterThan(200);
  expect(boxes[1]?.height).toBe(boxes[0]?.height);
  expect(boxes[2]?.height).toBe(boxes[0]?.height);
  await expect(page.getByTestId("notifications-empty").getByRole("status")).toHaveText("No notifications");
  await expect(page.getByTestId("notifications-error").getByRole("alert")).toContainText("did not load");
  await expect(page.getByTestId("notifications-error").getByRole("button", { name: "Retry" })).toBeVisible();
  const skeleton = await page.getByTestId("notifications-loading").locator(".fa-notification").first().evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  const loaded = await full(page).locator("li.fa-notification").first().evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").slice(0, 2).join(" "));
  expect(skeleton.startsWith(loaded)).toBe(true);
});

test("host groups and a host filter", async ({ page }) => {
  const list = page.getByTestId("notifications-groups");
  await expect(list.getByRole("list", { name: "Mentions" })).toBeVisible();
  await expect(list.getByRole("list", { name: "Shared" })).toBeVisible();
  await list.getByRole("button", { name: "Mentions", exact: true }).click();
  await expect(list.locator("li.fa-notification")).toHaveCount(2);
});

test("AccountButton and the rail open it, keep their own behaviour, and take focus back @responsive", async ({ page }) => {
  const specimen = page.getByRole("region", { name: /With AccountButton and the rail$/ }).first();
  const account = specimen.getByRole("button", { name: "Account: Avery Quinn, 3 unread notifications", exact: true });
  await account.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("menuitem", { name: "Notifications" }).click();
  const popup = page.getByRole("dialog", { name: "Notifications" });
  await expect(popup).toBeVisible();
  await expect(popup.locator("[data-unread]")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(account).toBeFocused();
  const rail = specimen.getByRole("button", { name: "Notifications", exact: true });
  await rail.click();
  await expect(popup).toBeVisible();
  const box = await popup.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  await page.keyboard.press("Escape");
  await expect(rail).toBeFocused();
});

test("unread keeps a shape in forced colours", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  const dot = full(page).locator("li.fa-notification[data-unread] .fa-notification-dot").first();
  await expect(dot).toHaveCSS("forced-color-adjust", "none");
  const background = await dot.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(background).not.toBe("rgba(0, 0, 0, 0)");
  await expect(full(page).locator("li.fa-notification[data-unread] .fa-notification-title").first()).toHaveCSS("font-weight", "600");
});

test("axe finds nothing on the page or the open popover", async ({ page }) => {
  const results = await new AxeBuilder({ page }).include(".gallery-specimen").analyze();
  expect(results.violations.filter((violation) => violation.id !== "region")).toEqual([]);
  await page.getByRole("button", { name: "Notifications", exact: true }).first().click();
  const popup = await new AxeBuilder({ page }).include(".fa-notification-popup").analyze();
  expect(popup.violations).toEqual([]);
});

test("in RTL the row runs from the right @responsive", async ({ page }) => {
  await page.goto(`${ROUTE}?dir=rtl`);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const item = full(page).locator("li.fa-notification").first();
  await expect(item).toBeVisible();
  const dot = (await item.locator(".fa-notification-dot").boundingBox())!;
  const main = (await item.locator(".fa-notification-main").boundingBox())!;
  expect(dot.x).toBeGreaterThan(main.x);
  await item.getByRole("button", { name: /^Unread/ }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(full(page).getByRole("button", { name: /^Unread: Avery Quinn shared/ })).toBeFocused();
  const overflow = await page.evaluate(() => {
    const scroller = document.querySelector("[data-scroll-container]");
    return scroller ? scroller.scrollWidth - scroller.clientWidth : 0;
  });
  expect(overflow).toBeLessThanOrEqual(1);
});

for (const [name, preferences] of [
  ["compact, small radius, thick lines", { density: "compact", uiScale: 1.25, radiusScale: 0.5, borderWidth: 2 }],
  ["comfortable, large radius", { density: "comfortable", uiScale: 0.9, radiusScale: 1.5, borderWidth: 1 }],
] as const) {
  test(`geometry under ${name} @responsive`, async ({ page }) => {
    await page.addInitScript((extra) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "dark", motion: "reduced", ...extra })), preferences);
    await page.reload();
    const scroll = page.getByTestId("notifications-scroll");
    const rows = scroll.locator("li.fa-notification");
    await expect(rows.first()).toBeVisible();
    const measured = await rows.first().evaluate((element) => {
      const style = getComputedStyle(element);
      const root = getComputedStyle(document.documentElement);
      const probe = document.createElement("div");
      probe.style.cssText = "position:absolute;width:var(--space-2);height:var(--control-h-xs);border-radius:var(--radius-item);border-width:var(--border-width)";
      element.append(probe);
      const expected = getComputedStyle(probe);
      const values = { inset: expected.width, radius: expected.borderRadius };
      probe.remove();
      return { paddingInline: style.paddingInlineStart, radius: style.borderTopLeftRadius, expected: values, scale: root.getPropertyValue("--ui-scale") };
    });
    expect(Number.parseFloat(measured.paddingInline)).toBeCloseTo(Number.parseFloat(measured.expected.inset), 1);
    expect(Number.parseFloat(measured.radius)).toBeCloseTo(Number.parseFloat(measured.expected.radius), 1);
    const box = (await scroll.locator(".fa-notification-list").boundingBox())!;
    const first = (await rows.first().boundingBox())!;
    expect(first.x).toBeGreaterThanOrEqual(box.x);
    expect(first.x + first.width).toBeLessThanOrEqual(box.x + box.width);
    // The scroll edge: a hairline only while content continues, and nothing is cut sideways.
    const root = scroll.locator(".fa-scroll");
    await expect(root).toHaveAttribute("data-scrolled-bottom", "");
    await expect(root).not.toHaveAttribute("data-scrolled-top", "");
    const viewport = root.locator(".fa-scroll-viewport");
    await viewport.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
    await expect(root).toHaveAttribute("data-scrolled-top", "");
    await expect(root).not.toHaveAttribute("data-scrolled-bottom", "");
    expect(await viewport.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
    // A focus ring on a row stays inside the scroller (R11.10).
    const lastMain = rows.last().locator(".fa-notification-main");
    const offset = await lastMain.evaluate((element) => {
      (element as HTMLElement).focus({ focusVisible: true } as FocusOptions);
      return Number.parseFloat(getComputedStyle(element, "::after").outlineOffset);
    });
    expect(Number.isNaN(offset) ? -1 : offset).toBeLessThanOrEqual(0);
  });
}
