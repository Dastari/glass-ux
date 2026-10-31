import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function open(page: Page, appearance: Record<string, string> = {}) {
  await page.addInitScript(
    (appearance) =>
      localStorage.setItem(
        "glass-ux.appearance.v1",
        JSON.stringify({ mode: "light", palette: "graphite", density: "comfortable", motion: "full", ...appearance }),
      ),
    appearance,
  );
  await page.goto("./components/scheduler");
  const scheduler = page.getByRole("region", { name: "Maintenance schedule", exact: true });
  await expect(scheduler.locator(".fa-sch-col").first()).toBeVisible();
  await scheduler.scrollIntoViewIfNeeded();
  return scheduler;
}

/** Scroll the hours so a time of day sits a third of the way down. */
async function scrollToTime(scheduler: Locator, minutes: number) {
  await scheduler.locator(".fa-sch-scroll").evaluate((element, minutes) => {
    const grid = element.querySelector<HTMLElement>(".fa-sch-cols")!;
    element.scrollTop = (minutes / 1440) * grid.offsetHeight - element.clientHeight / 3;
  }, minutes);
}

/** The page y of a time of day in the hours as they are scrolled now. */
async function timeY(scheduler: Locator, minutes: number) {
  return scheduler.locator(".fa-sch-cols").evaluate((grid, minutes) => grid.getBoundingClientRect().top + (minutes / 1440) * grid.offsetHeight, minutes);
}

async function columnX(scheduler: Locator, index: number) {
  const box = (await scheduler.locator(".fa-sch-col").nth(index).boundingBox())!;
  return box.x + box.width / 2;
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 12) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= steps; step++) await page.mouse.move(from.x + ((to.x - from.x) * step) / steps, from.y + ((to.y - from.y) * step) / steps);
  await page.mouse.up();
}

const status = (page: Page) => page.getByTestId("scheduler-status");
const event = (scheduler: Locator, title: string) => scheduler.getByRole("button", { name: new RegExp(`^${title},`) });

test("switches between week, month, day and agenda", async ({ page }) => {
  const scheduler = await open(page);
  await expect(scheduler.locator(".fa-sch-col")).toHaveCount(7);
  await scheduler.getByRole("button", { name: "Month", exact: true }).click();
  await expect(scheduler.getByRole("grid")).toBeVisible();
  await expect(scheduler.getByRole("row")).toHaveCount(await scheduler.locator(".fa-sch-week").count().then((weeks) => weeks + 1));
  await scheduler.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(scheduler.getByRole("list", { name: /^Events, / })).toBeVisible();
  await scheduler.getByRole("button", { name: "Day", exact: true }).click();
  await expect(scheduler.locator(".fa-sch-col")).toHaveCount(1);
  const title = await scheduler.locator(".fa-sch-title").textContent();
  await scheduler.getByRole("button", { name: "Next day" }).click();
  await expect(scheduler.locator(".fa-sch-title")).not.toHaveText(title ?? "");
  await scheduler.getByRole("button", { name: "Today" }).click();
  await expect(scheduler.locator(".fa-sch-title")).toHaveText(title ?? "");
  await page.screenshot({ path: "test-results/development/scheduler-day.png" });
});

test("drag over empty time selects a slot, and a click selects one slot", async ({ page }) => {
  const scheduler = await open(page);
  const count = await scheduler.locator(".fa-sch-ev").count();
  // Sunday afternoon is empty.
  const x = await columnX(scheduler, 6);
  await scrollToTime(scheduler, 14 * 60);
  const start = await timeY(scheduler, 14 * 60 + 5);
  const end = await timeY(scheduler, 15 * 60 + 20);
  await drag(page, { x, y: start }, { x, y: end });
  await expect(status(page)).toHaveText("Added a work order");
  await expect(scheduler.getByRole("button", { name: /^New work order, .*2:00\s?pm to 3:30\s?pm$/ })).toBeVisible();
  await expect(scheduler.locator(".fa-sch-ev")).toHaveCount(count + 1);
  // A click selects one 30-minute slot.
  await scrollToTime(scheduler, 18 * 60);
  const y = await timeY(scheduler, 18 * 60 + 10);
  await page.mouse.click(x, y);
  await expect(scheduler.getByRole("button", { name: /^New work order, .*6:00\s?pm to 6:30\s?pm$/ })).toBeVisible();
});

test("drags an event to another day and time, and resizes it by its lower edge", async ({ page }) => {
  const scheduler = await open(page);
  const permit = event(scheduler, "Permit review");
  await permit.evaluate((element) => element.scrollIntoView({ block: "center" }));
  const box = (await permit.boundingBox())!;
  const tuesday = await scheduler.locator(".fa-sch-col").nth(1).getAttribute("data-day");
  // Grab it near its top and drop it an hour and a half lower, one day later.
  const grab = { x: box.x + box.width / 2, y: box.y + 6 };
  const hour = await scheduler.locator(".fa-sch-cols").evaluate((grid) => grid.offsetHeight / 24);
  await drag(page, grab, { x: await columnX(scheduler, 1), y: grab.y + hour * 1.5 });
  await expect(status(page)).toHaveText("Moved Permit review");
  await expect(permit).toHaveAccessibleName(/3:30\s?pm to 4:15\s?pm/);
  await expect(permit.locator("xpath=ancestor::div[@data-day]")).toHaveAttribute("data-day", tuesday!);
  // The click after the drag did not open it.
  await expect(status(page)).not.toHaveText(/Opened/);

  // Away from the scroller's edges, which scroll it during a drag.
  await permit.evaluate((element) => element.scrollIntoView({ block: "center" }));
  const moved = (await permit.boundingBox())!;
  await drag(page, { x: moved.x + moved.width / 2, y: moved.y + moved.height - 2 }, { x: moved.x + moved.width / 2, y: moved.y + moved.height - 2 + hour });
  await expect(status(page)).toHaveText("Resized Permit review");
  await expect(permit).toHaveAccessibleName(/3:30\s?pm to 5:15\s?pm/);
});

test("moves and resizes an event with the keyboard and announces it", async ({ page }) => {
  const scheduler = await open(page);
  const lubrication = event(scheduler, "Lubrication round");
  await lubrication.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(lubrication).toHaveAccessibleName(/11:30\s?am to 12:30\s?pm/);
  await expect(lubrication).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(lubrication).toBeFocused();
  const tuesday = await scheduler.locator(".fa-sch-col").nth(1).getAttribute("data-day");
  await expect(lubrication.locator("xpath=ancestor::div[@data-day]")).toHaveAttribute("data-day", tuesday!);
  await page.keyboard.press("Shift+ArrowDown");
  await expect(lubrication).toHaveAccessibleName(/11:30\s?am to 12:45\s?pm/);
  await expect(scheduler.locator(".fa-sch-announcer")).toContainText("Lubrication round now");
  await page.keyboard.press("Enter");
  await expect(status(page)).toHaveText("Opened Lubrication round");
});

test("chooses a slot with the keyboard", async ({ page }) => {
  const scheduler = await open(page);
  const hours = scheduler.getByRole("group", { name: /^Times, / });
  await hours.focus();
  await expect(scheduler.locator(".fa-sch-cursor")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(scheduler.locator(".fa-sch-announcer")).toContainText(" to ");
  await page.keyboard.press("Enter");
  await expect(status(page)).toHaveText("Added a work order");
  await expect(event(scheduler, "New work order")).toHaveCount(1);
});

test("a full month day offers +N more with the whole day in a popover", async ({ page }) => {
  await open(page);
  const month = page.getByRole("region", { name: "Maintenance month", exact: true });
  await month.scrollIntoViewIfNeeded();
  const more = month.getByRole("button", { name: /more events? on / }).first();
  await expect(more).toBeVisible();
  const hidden = Number(/^(\d+)/.exec((await more.getAttribute("aria-label")) ?? "")?.[1]);
  const cell = more.locator("xpath=ancestor::div[@role='gridcell']");
  const shown = await cell.locator(".fa-sch-ev").count();
  await more.click();
  const popup = page.locator(".fa-popover").last();
  await expect(popup).toBeVisible();
  await expect(popup.locator(".fa-sch-ev")).toHaveCount(shown + hidden);
  await page.screenshot({ path: "test-results/development/scheduler-more.png" });
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(more).toBeFocused();
});

test("drags a month event to another day", async ({ page }) => {
  await open(page);
  const month = page.getByRole("region", { name: "Maintenance month", exact: true });
  await month.scrollIntoViewIfNeeded();
  const item = month.getByRole("button", { name: /^Contractor induction,/ });
  const from = await item.locator("xpath=ancestor::div[@role='gridcell']").getAttribute("data-day");
  const box = (await item.boundingBox())!;
  // Sunday of the same week is free.
  const target = month.locator(`[data-day="${from}"]`).locator("xpath=..").getByRole("gridcell").last();
  const targetBox = (await target.boundingBox())!;
  await drag(page, { x: box.x + 10, y: box.y + box.height / 2 }, { x: targetBox.x + 10, y: box.y + box.height / 2 });
  await expect(item.locator("xpath=ancestor::div[@role='gridcell']")).not.toHaveAttribute("data-day", from!);
  await expect(item).toHaveAccessibleName(/1:00\s?pm to 2:00\s?pm/);
});

test("a failed save puts the event back and says so", async ({ page }) => {
  await open(page);
  const saving = page.getByRole("region", { name: "Saved schedule", exact: true });
  await saving.scrollIntoViewIfNeeded();
  // Go to Thursday of this week, where the substation's scan is booked.
  const weekday = await page.evaluate(() => (new Date().getDay() + 6) % 7);
  for (let step = weekday; step < 3; step++) await saving.getByRole("button", { name: "Next day" }).click();
  for (let step = weekday; step > 3; step--) await saving.getByRole("button", { name: "Previous day" }).click();
  const scan = event(saving, "Switchboard thermal scan");
  const before = await scan.getAttribute("aria-label");
  await scan.focus();
  await page.keyboard.press("ArrowUp");
  await expect(scan).toHaveAccessibleName(/9:45\s?pm/);
  await expect(scan).toHaveAttribute("aria-label", before!, { timeout: 5000 });
  await expect(saving.locator(".fa-sch-announcer")).toContainText("could not be changed");
});

test("@responsive a narrow week shows one day with a day strip; a narrow month shows dots and the day", async ({ page }, info) => {
  await open(page);
  const narrow = page.getByRole("region", { name: "Narrow week", exact: true });
  await narrow.scrollIntoViewIfNeeded();
  await expect(narrow.locator(".fa-sch-col")).toHaveCount(1);
  const strip = narrow.getByRole("group", { name: "Days of the week" });
  await expect(strip.getByRole("button")).toHaveCount(7);
  const title = narrow.locator(".fa-sch-title");
  const before = await title.textContent();
  await strip.getByRole("button", { pressed: false }).first().click();
  await expect(title).not.toHaveText(before ?? "");
  // Nothing in the header leaves the scheduler.
  const frame = (await narrow.boundingBox())!;
  for (const control of await narrow.locator(".fa-sch-head button").all()) {
    const box = await control.boundingBox();
    if (!box) continue;
    expect(box.x).toBeGreaterThanOrEqual(frame.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
  }
  const month = page.getByRole("region", { name: "Narrow month", exact: true });
  await month.scrollIntoViewIfNeeded();
  await expect(month.locator(".fa-sch-dots").first()).toBeVisible();
  const day = month.locator(".fa-sch-cell-day", { has: page.locator(".fa-sch-dots") }).first();
  await day.click();
  await expect(day).toHaveAttribute("aria-pressed", "true");
  await expect(month.locator(".fa-sch-day-list .fa-sch-ev").first()).toBeVisible();
  await page.screenshot({ path: `test-results/development/scheduler-narrow-${info.project.name}.png`, fullPage: false });
});

test("loading keeps the header and grid in place", async ({ page }) => {
  await open(page);
  const loading = page.getByRole("region", { name: "Loading schedule", exact: true });
  await loading.scrollIntoViewIfNeeded();
  await expect(loading.locator("[data-skeleton]").first()).toBeVisible();
  const today = await loading.getByRole("button", { name: "Today" }).boundingBox();
  const grid = await loading.locator(".fa-sch-scroll").boundingBox();
  await page.getByRole("switch", { name: "Loading" }).first().click();
  await expect(loading.locator("[data-skeleton]")).toHaveCount(0);
  expect(await loading.getByRole("button", { name: "Today" }).boundingBox()).toEqual(today);
  const after = (await loading.locator(".fa-sch-scroll").boundingBox())!;
  expect(after.x).toBe(grid!.x);
  expect(after.width).toBe(grid!.width);
});

test("the scheduler passes axe in the week, month and agenda views and the view buttons work by keyboard", async ({ page }) => {
  const scheduler = await open(page);
  for (const view of ["Week", "Month", "Agenda"]) {
    if (view !== "Week") await scheduler.getByRole("button", { name: view, exact: true }).click();
    await expect(scheduler.getByRole("button", { name: view, exact: true })).toHaveAttribute("aria-pressed", "true");
  const result = await new AxeBuilder({ page }).include("[aria-label='Maintenance schedule']").analyze();
  expect(result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
  }
  await scheduler.getByRole("button", { name: "Week", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(scheduler.locator(".fa-sch-col")).toHaveCount(7);
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});
