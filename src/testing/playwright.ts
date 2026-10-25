import { expect, type Locator, type Page } from "@playwright/test";
import {
  formatDateText,
  type IsoDate,
} from "../ui/date-picker/calendar-date.js";

async function control(field: Locator, selector: string): Promise<Locator> {
  return (await field.evaluate(
    (element, match) => element.matches(match),
    selector,
  ))
    ? field
    : field.locator(selector).first();
}
async function ownedPopup(
  trigger: Locator,
  role: "listbox" | "menu",
): Promise<Locator> {
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const id = await trigger.getAttribute("aria-controls");
  return id
    ? trigger
        .page()
        .locator(`[id=${JSON.stringify(id)}]`)
        .getByRole(role)
        .or(
          trigger.page().locator(`[id=${JSON.stringify(id)}][role='${role}']`),
        )
    : trigger.page().getByRole(role).filter({ visible: true });
}

/** Choose an exact option from a Glass UX Select trigger or Field locator. */
export async function selectOption(
  field: Locator,
  label: string,
): Promise<void> {
  const trigger = await control(field, "[role='combobox'],select");
  if (await trigger.evaluate((node) => node.tagName === "SELECT")) {
    await trigger.selectOption({ label });
    return;
  }
  await trigger.click();
  await (
    await ownedPopup(trigger, "listbox")
  )
    .getByRole("option", { name: label, exact: true })
    .click();
}

/** Search a Combobox and choose its exact option. */
export async function chooseFromCombobox(
  field: Locator,
  label: string,
  query = label,
): Promise<void> {
  const input = await control(field, "input[role='combobox']");
  await input.fill(query);
  await (
    await ownedPopup(input, "listbox")
  )
    .getByRole("option", { name: label, exact: true })
    .click();
}

/** Open a Menu and return its visible popup locator. */
export async function openMenu(trigger: Locator): Promise<Locator> {
  await trigger.click();
  const menu = await ownedPopup(trigger, "menu");
  await expect(menu).toBeVisible();
  return menu;
}

/** Activate an exact item, checkbox item or radio item in an open Menu. */
export async function chooseMenuItem(
  menu: Locator,
  label: string,
): Promise<void> {
  await menu
    .getByRole("menuitem", { name: label, exact: true })
    .or(menu.getByRole("menuitemcheckbox", { name: label, exact: true }))
    .or(menu.getByRole("menuitemradio", { name: label, exact: true }))
    .click();
}

/** Type and commit an ISO calendar day through DateField. Locale defaults to en-AU. */
export async function pickDate(
  field: Locator,
  date: IsoDate,
  locale = "en-AU",
): Promise<void> {
  const input = await control(field, "input");
  await input.fill(formatDateText(date, locale));
  await input.press("Tab");
}

/** Toggle a Switch or set a requested checked state. */
export async function toggleSwitch(
  field: Locator,
  checked?: boolean,
): Promise<void> {
  const button = await control(field, "[role='switch']");
  if (
    checked === undefined ||
    ((await button.getAttribute("aria-checked")) === "true") !== checked
  )
    await button.click();
}

/** Mounted data rows, excluding table headers; virtual rows outside the viewport are absent. */
export function getTableRows(table: Locator): Locator {
  return table
    .getByRole("row")
    .filter({
      has: table.page().locator("[role='cell'],[role='gridcell'],td"),
    });
}

/** A visible cell by zero-based data row and column index. */
export function getCell(table: Locator, row: number, column: number): Locator {
  return getTableRows(table)
    .nth(row)
    .locator("[role='cell'],[role='gridcell'],td")
    .nth(column);
}

/** Assert a visible toast with an exact title, returning its root locator. */
export async function expectToast(page: Page, text: string): Promise<Locator> {
  const toast = page
    .locator(".fa-toast:not([data-ending-style])")
    .filter({ has: page.getByText(text, { exact: true }) });
  await expect(toast).toBeVisible();
  return toast;
}
