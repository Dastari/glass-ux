import {
  findByRole,
  getByRole,
  getAllByRole,
  queryAllByRole,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  formatDateText,
  type IsoDate,
} from "../ui/date-picker/calendar-date.js";
import { getLocale } from "../lib/locale/locale.js";

function control(field: HTMLElement, selector: string): HTMLElement {
  const result = field.matches(selector)
    ? field
    : field.querySelector<HTMLElement>(selector);
  if (!result) throw new Error(`No ${selector} control in the supplied field`);
  return result;
}
async function popup(trigger: HTMLElement, role: "listbox" | "menu") {
  return waitFor(() => {
    const id = trigger.getAttribute("aria-controls");
    const owned = id && trigger.ownerDocument.getElementById(id);
    return owned && owned.getAttribute("role") === role
      ? owned
      : getByRole(trigger.ownerDocument.body, role);
  });
}

/** Choose an exact accessible option from Select; accepts its trigger or Field root. */
export async function selectOption(
  field: HTMLElement,
  label: string,
): Promise<void> {
  const trigger = control(field, "[role='combobox'],select");
  const user = userEvent.setup({ document: field.ownerDocument });
  if (trigger instanceof HTMLSelectElement) {
    await user.selectOptions(trigger, label);
    return;
  }
  await user.click(trigger);
  await user.click(
    await findByRole(await popup(trigger, "listbox"), "option", {
      name: label,
    }),
  );
}

/** Type a query into Combobox and choose the exact accessible option (query defaults to label). */
export async function chooseFromCombobox(
  field: HTMLElement,
  label: string,
  query = label,
): Promise<void> {
  const input = control(field, "input[role='combobox']");
  const user = userEvent.setup({ document: field.ownerDocument });
  await user.click(input);
  await user.clear(input);
  await user.type(input, query);
  await user.click(
    await findByRole(await popup(input, "listbox"), "option", { name: label }),
  );
}

/** Open a Menu and return its portalled menu element for chooseMenuItem. */
export async function openMenu(trigger: HTMLElement): Promise<HTMLElement> {
  await userEvent.setup({ document: trigger.ownerDocument }).click(trigger);
  return popup(trigger, "menu");
}

/** Activate an exact accessible item in an open menu. */
export async function chooseMenuItem(
  menu: HTMLElement,
  label: string,
): Promise<void> {
  const item = await waitFor(() => {
    const matches = ["menuitem", "menuitemcheckbox", "menuitemradio"].flatMap(
      (role) => queryAllByRole(menu, role, { name: label }),
    );
    if (matches.length !== 1)
      throw new Error(
        `Expected one menu item named ${label}, found ${matches.length}`,
      );
    return matches[0]!;
  });
  await userEvent.setup({ document: menu.ownerDocument }).click(item);
}

/** Commit an ISO calendar day through DateField's text input; pass the field's explicit locale when it differs from the app. */
export async function pickDate(
  field: HTMLElement,
  date: IsoDate,
  locale = getLocale(),
): Promise<void> {
  const input = control(field, "input");
  const user = userEvent.setup({ document: field.ownerDocument });
  await user.clear(input);
  await user.type(input, formatDateText(date, locale));
  await user.tab();
}

/** Toggle a Switch, or set its requested checked state without toggling an already matching value. */
export async function toggleSwitch(
  field: HTMLElement,
  checked?: boolean,
): Promise<void> {
  const button = control(field, "[role='switch']");
  if (
    checked === undefined ||
    (button.getAttribute("aria-checked") === "true") !== checked
  )
    await userEvent.setup({ document: field.ownerDocument }).click(button);
}

/** Currently mounted data rows, excluding header and presentation rows. Virtual rows outside the viewport are absent. */
export function getTableRows(table: HTMLElement): HTMLElement[] {
  return queryAllByRole(table, "row").filter(
    (row) =>
      queryAllByRole(row, "cell").length ||
      queryAllByRole(row, "gridcell").length,
  );
}

/** A visible data cell by zero-based row and column, or by an exact column heading. */
export function getCell(
  table: HTMLElement,
  row: number,
  column: number | string,
): HTMLElement {
  const headers =
    typeof column === "string" ? getAllByRole(table, "columnheader") : [];
  const header =
    typeof column === "string"
      ? (headers.find(
          (node) =>
            node.querySelector(".fa-dt-th-label")?.textContent === column,
        ) ?? getByRole(table, "columnheader", { name: column }))
      : undefined;
  const index = typeof column === "number" ? column : headers.indexOf(header!);
  const record = getTableRows(table)[row];
  const cells = record
    ? [...queryAllByRole(record, "cell"), ...queryAllByRole(record, "gridcell")]
    : [];
  if (!cells[index])
    throw new Error(`No visible cell at row ${row}, column ${column}`);
  return cells[index]!;
}

/** Wait for a live Glass UX toast with this exact title and return its root. */
export async function expectToast(
  text: string,
  container: HTMLElement = document.body,
): Promise<HTMLElement> {
  return waitFor(() => {
    const toasts = Array.from(
      container.querySelectorAll<HTMLElement>(
        ".fa-toast:not([data-ending-style])",
      ),
    );
    for (const toast of toasts)
      if (within(toast).queryByText(text, { exact: true })) return toast;
    throw new Error(`No live toast titled ${text}`);
  });
}
