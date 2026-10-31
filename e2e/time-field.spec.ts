import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

// TimeField and DateTimeField (src/ui/date-picker): typing, keyboard stepping, the windowed list,
// the date-and-time popup beside or below the calendar, Solid popups and the DateTimeAsk consumer.

const settle = (page: Page) =>
  page.addInitScript(() =>
    localStorage.setItem(
      "glass-ux.appearance.v1",
      JSON.stringify({ mode: "dark", motion: "reduced" }),
    ),
  );

async function caret(input: Locator, at: number) {
  await input.evaluate(
    (node, position) =>
      (node as HTMLInputElement).setSelectionRange(position, position),
    at,
  );
}

test("TimeField reads typing, steps with the keyboard and picks from the list @responsive", async ({
  page,
}) => {
  await settle(page);
  await page.goto("/components/date-field");
  const form = page.getByTestId("time-form");
  const opens = form.getByRole("textbox", { name: "Depot opens" });
  const closes = form.getByRole("textbox", { name: "Depot closes" });
  await expect(opens).toHaveValue("7:30 am");

  await opens.fill("930");
  await opens.press("Tab");
  await expect(opens).toHaveValue("9:30 am");

  // Minutes step on the 30-minute grid from min; Page Up moves an hour; Home goes to min.
  await opens.focus();
  await caret(opens, 3);
  await opens.press("ArrowUp");
  await expect(opens).toHaveValue("10:00 am");
  await caret(opens, 0);
  await opens.press("ArrowUp");
  await expect(opens).toHaveValue("11:00 am");
  await opens.press("PageDown");
  await expect(opens).toHaveValue("10:00 am");
  await opens.press("Home");
  await expect(opens).toHaveValue("6:00 am");

  // The list opens at the chosen time and is keyboard operable.
  await opens.press("Alt+ArrowDown");
  const list = page.getByRole("listbox", { name: "Times" });
  await expect(list).toBeFocused();
  const active = async () =>
    page
      .locator(`[id="${await list.getAttribute("aria-activedescendant")}"]`)
      .textContent();
  expect(await active()).toBe("6:00 am");
  await list.press("ArrowDown");
  await list.press("ArrowDown");
  expect(await active()).toBe("7:00 am");
  await list.press("Enter");
  await expect(list).toBeHidden();
  await expect(opens).toHaveValue("7:00 am");
  await expect(opens).toBeFocused();

  // A pointer pick, then an unreadable entry: the message replaces the hint in place (R9.1).
  await form
    .getByRole("button", { name: "Choose a time" })
    .nth(1)
    .click();
  await page
    .getByRole("listbox", { name: "Times" })
    .getByRole("option", { name: "3:30 pm" })
    .click();
  await expect(closes).toHaveValue("3:30 pm");
  const before = await closes.boundingBox();
  await opens.fill("soon");
  await opens.press("Tab");
  await expect(form.getByText("Enter a time such as 9:30 am")).toBeVisible();
  await expect(opens).toHaveAttribute("aria-invalid", "true");
  expect((await closes.boundingBox())?.y).toBe(before?.y);
  await opens.fill("1pm");
  await opens.press("Tab");
  await expect(
    form.getByText("Enter a time from 6:00 am to 12:00 pm"),
  ).toBeVisible();

  const scan = await new AxeBuilder({ page })
    .include('[data-testid="time-form"]')
    .analyze();
  expect(scan.violations).toEqual([]);
});

test("the time list is windowed and scrolls the chosen time into view", async ({
  page,
}) => {
  await settle(page);
  await page.goto("/components/date-field");
  const reminder = page
    .getByTestId("time-form")
    .getByRole("textbox", { name: "Daily reminder" });
  await reminder.fill("8:45 pm");
  await reminder.press("Alt+ArrowDown");
  const list = page.getByRole("listbox", { name: "Times" });
  await expect(list).toBeFocused();
  // Every 5 minutes is 288 times; only those near the view are in the DOM.
  const options = list.getByRole("option");
  expect(await options.count()).toBeLessThan(40);
  await expect(options.first()).toHaveAttribute("aria-setsize", "288");
  const chosen = list.getByRole("option", { name: "8:45 pm" });
  await expect(chosen).toHaveAttribute("aria-selected", "true");
  const box = await list.boundingBox();
  const row = await chosen.boundingBox();
  expect(row!.y).toBeGreaterThanOrEqual(box!.y);
  expect(row!.y + row!.height).toBeLessThanOrEqual(box!.y + box!.height);
  await list.press("End");
  await expect(list.getByRole("option", { name: "11:55 pm" })).toBeVisible();
  await list.press("Escape");
  await expect(list).toBeHidden();
});

const DEMO_TODAY = new Date("2026-10-15T09:00:00+11:00");

test("DateTimeField reads as one field and its popup sits beside the calendar", async ({
  page,
}) => {
  await settle(page);
  // The steps pick dates in late October 2026; the form refuses past dates.
  await page.clock.setFixedTime(DEMO_TODAY);
  await page.goto("/components/date-field");
  const form = page.getByTestId("date-time-form");
  const group = form.getByRole("group", { name: "Maintenance starts" });
  const date = form.getByRole("textbox", { name: "Maintenance starts Date" });
  const time = form.getByRole("textbox", { name: "Maintenance starts Time" });
  await expect(group).toContainText("AEDT");
  await expect(form.getByText("Australia/Sydney · UTC+11:00")).toBeVisible();
  await expect(
    form.getByText("Clocks skip 2:30 am on 4 Oct; read as 3:30 am AEDT"),
  ).toBeVisible();

  await date.fill("30/10/2026");
  await time.fill("7pm");
  await time.press("Tab");
  await expect(time).toHaveValue("7:00 pm");

  await group.getByRole("button", { name: "Choose a date and time" }).click();
  const popup = page.locator(".fa-date-time-popover:not(.fa-popover-preview)");
  const grid = popup.getByRole("grid");
  const list = popup.getByRole("listbox", { name: "Times" });
  await expect(grid).toBeVisible();
  const gridBox = (await grid.boundingBox())!;
  const listBox = (await list.boundingBox())!;
  expect(listBox.x).toBeGreaterThan(gridBox.x + gridBox.width - 1);

  await popup.getByRole("button", { name: /31 October 2026/ }).click();
  await expect(list).toBeFocused();
  await expect(date).toHaveValue("31/10/2026");
  await list.press("ArrowDown");
  await list.press("Enter");
  await expect(list).toBeHidden();
  await expect(time).toHaveValue("7:30 pm");

  // A day without a time names the missing part.
  await time.fill("");
  await time.blur();
  await expect(form.getByText("Enter a time", { exact: true })).toBeVisible();

  const scan = await new AxeBuilder({ page })
    .include('[data-testid="date-time-form"]')
    .analyze();
  expect(scan.violations).toEqual([]);
});

test("DateTimeField fits a 320px phone and stacks its popup @responsive", async ({
  page,
}) => {
  await settle(page);
  // The steps pick dates in late October 2026; the form refuses past dates.
  await page.clock.setFixedTime(DEMO_TODAY);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/components/date-field");
  const form = page.getByTestId("date-time-form");
  const group = form.getByRole("group", { name: "Maintenance starts" });
  await group.scrollIntoViewIfNeeded();
  const box = (await group.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  // Both typed parts stay readable.
  for (const name of ["Maintenance starts Date", "Maintenance starts Time"]) {
    const input = form.getByRole("textbox", { name });
    expect(
      await input.evaluate(
        (node) => (node as HTMLInputElement).scrollWidth <= (node as HTMLInputElement).clientWidth,
      ),
    ).toBe(true);
  }
  await group.getByRole("button", { name: "Choose a date and time" }).click();
  const popup = page.locator(".fa-date-time-popover:not(.fa-popover-preview)");
  const grid = popup.getByRole("grid");
  const list = popup.getByRole("listbox", { name: "Times" });
  await expect(grid).toBeVisible();
  const popupBox = (await popup.boundingBox())!;
  expect(popupBox.x).toBeGreaterThanOrEqual(0);
  expect(popupBox.x + popupBox.width).toBeLessThanOrEqual(320);
  const gridBox = (await grid.boundingBox())!;
  const listBox = (await list.boundingBox())!;
  expect(listBox.y).toBeGreaterThanOrEqual(gridBox.y + gridBox.height - 1);
  // Picking a day brings the times into view and focuses them.
  await popup.getByRole("button", { name: /30 October 2026/ }).click();
  await expect(list).toBeFocused();
  await expect(list).toBeInViewport();
});

test("time popups are opaque in Solid", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "glass-ux.appearance.v1",
      JSON.stringify({ mode: "light", glass: "solid", motion: "reduced" }),
    ),
  );
  await page.goto("/components/date-field");
  const opaque = (popup: Locator) =>
    popup.evaluate((node) => {
      const style = getComputedStyle(node);
      const slash = /\/\s*([\d.]+%?)\s*\)/.exec(style.backgroundColor);
      const rgba = /rgba\([^)]*,\s*([\d.]+)\)/.exec(style.backgroundColor);
      const alpha = slash
        ? slash[1]!.endsWith("%")
          ? Number.parseFloat(slash[1]!) / 100
          : Number.parseFloat(slash[1]!)
        : rgba
          ? Number.parseFloat(rgba[1]!)
          : 1;
      return { alpha, blur: style.backdropFilter };
    });
  await page
    .getByTestId("time-form")
    .getByRole("textbox", { name: "Depot opens" })
    .press("Alt+ArrowDown");
  const timePopup = page.locator(".fa-time-popover");
  await expect(timePopup).toBeVisible();
  expect(await opaque(timePopup)).toEqual({ alpha: expect.any(Number), blur: "none" });
  expect((await opaque(timePopup)).alpha).toBeGreaterThanOrEqual(0.97);
  await page.keyboard.press("Escape");
  await page
    .getByTestId("date-time-form")
    .getByRole("textbox", { name: "Maintenance starts Time" })
    .press("Alt+ArrowDown");
  const dateTimePopup = page.locator(
    ".fa-date-time-popover:not(.fa-popover-preview)",
  );
  await expect(dateTimePopup).toBeVisible();
  expect(await opaque(dateTimePopup)).toEqual({ alpha: expect.any(Number), blur: "none" });
  expect((await opaque(dateTimePopup)).alpha).toBeGreaterThanOrEqual(0.97);
});

test("DateTimeAsk takes an exact time in the ask's zone and answers with an instant", async ({
  page,
}) => {
  await settle(page);
  await page.goto("/components/date-time-ask");
  const card = page
    .locator(".fa-ai-ask")
    .filter({ hasText: "When should the update install?" })
    .first();
  const date = card.getByRole("textbox", { name: "Date and time Date" });
  const time = card.getByRole("textbox", { name: "Date and time Time" });
  await expect(card.getByRole("group", { name: "Date and time" })).toContainText(
    /AEDT|AEST/,
  );
  // Before the earliest allowed time ("now").
  await date.fill("1/1/2026");
  await time.fill("9:00 am");
  await time.press("Tab");
  await expect(
    card.getByText("Choose a time after the earliest allowed time"),
  ).toBeVisible();
  // A day picked first gets the default time, 9:00 am.
  await date.fill("15/12/2026");
  await time.fill("");
  await date.press("Tab");
  await time.blur();
  await expect(time).toHaveValue("9:00 am");
  const schedule = card.getByRole("button", { name: "Schedule" });
  await expect(schedule).toBeEnabled();
});
