import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * FileDialog through its catalogue page, on memoryFiles: every flow, every missing capability,
 * and actual geometry under every preference. The clock is free: fixtures use fixed dates.
 */

const ROUTE = "/components/file-dialog";
const prefs = (page: Page, more: object = {}) =>
  page.addInitScript((extra) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced", ...extra })), more);

/** Opens the dialog behind a button, once its popup has settled. */
async function openDialog(page: Page, name: string): Promise<Locator> {
  await page.getByRole("button", { name, exact: true }).click();
  const dialog = page.getByRole("dialog").last();
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toHaveAttribute("data-starting-style", "");
  return dialog;
}
const grid = (dialog: Locator) => dialog.getByRole("grid", { name: "Files" });
const row = (dialog: Locator, name: string) => grid(dialog).getByRole("row").filter({ hasText: name }).first();
const status = (dialog: Locator) => dialog.locator(".fa-file-dialog-status");

test.beforeEach(async ({ page }) => {
  await prefs(page);
  await page.goto(ROUTE);
  await expect(page.getByTestId("file-dialog-list").getByRole("grid", { name: "Files" })).toBeVisible();
});

test.describe("open", () => {
  test("from the keyboard: arrows, into a folder, up, select and open @responsive", async ({ page }) => {
    await page.getByRole("button", { name: "Open files", exact: true }).focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog").last();
    const rows = grid(dialog);
    await expect(row(dialog, "Pictures")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(row(dialog, "Reports")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(row(dialog, "Drafts")).toBeFocused();
    await expect(dialog.getByRole("navigation", { name: "Folder path" })).toContainText("Reports");
    await page.keyboard.press("Backspace");
    await expect(row(dialog, "Pictures")).toBeFocused();
    await page.keyboard.press("End");
    await expect(row(dialog, "Style guide.docx")).toBeFocused();
    await page.keyboard.press("Space");
    await expect(row(dialog, "Style guide.docx")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await expect(row(dialog, "Plan.txt")).toBeFocused();
    // A range from the anchor takes the files that can be chosen, and leaves Policy.pdf out.
    await page.keyboard.press("Shift+ArrowUp");
    await expect(status(dialog)).toHaveText("3 selected");
    await page.keyboard.press("m");
    await expect(row(dialog, "Meeting notes.txt")).toBeFocused();
    await page.keyboard.press("Control+a");
    await expect(rows.locator('[aria-selected="true"]')).toHaveCount(4);
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("file-dialog-opened")).toHaveText("Budget.xlsx, Meeting notes.txt, Plan.txt, Style guide.docx");
    await expect(page.getByRole("button", { name: "Open files", exact: true })).toBeFocused();
  });

  test("the path is the compact breadcrumb, named for what it is @responsive", async ({ page }) => {
    await page.getByRole("button", { name: "Open files", exact: true }).click();
    const dialog = page.getByRole("dialog").last();
    await row(dialog, "Reports").dblclick();
    await expect(row(dialog, "Drafts")).toBeVisible();
    const path = dialog.getByRole("navigation", { name: "Folder path", exact: true });
    await expect(path).toHaveAttribute("data-size", "xs");
    await expect(path).toContainText("Reports");
    const crumbs = (await path.boundingBox())!;
    const bar = (await dialog.locator(".fa-file-dialog-bar").boundingBox())!;
    expect(crumbs.y).toBeGreaterThanOrEqual(bar.y);
    expect(crumbs.y + crumbs.height).toBeLessThanOrEqual(bar.y + bar.height);
    expect(crumbs.height).toBeGreaterThanOrEqual(24);
    expect(await path.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  });

  test("selection follows the platform: click, Shift and Ctrl", async ({ page }) => {
    const dialog = await openDialog(page, "Open files");
    await row(dialog, "Budget.xlsx").click();
    await row(dialog, "Plan.txt").click({ modifiers: ["Shift"] });
    await expect(status(dialog)).toHaveText("3 selected");
    await row(dialog, "Meeting notes.txt").click({ modifiers: ["ControlOrMeta"] });
    await expect(status(dialog)).toHaveText("2 selected");
    await row(dialog, "Style guide.docx").locator(".fa-file-dialog-check").click();
    await expect(status(dialog)).toHaveText("3 selected");
    await row(dialog, "Budget.xlsx").click();
    await expect(status(dialog)).toHaveText("1 selected");
    await dialog.getByRole("button", { name: "Open", exact: true }).click();
    await expect(page.getByTestId("file-dialog-opened")).toHaveText("Budget.xlsx");
  });

  test("Open says what is missing, and a double press opens a folder then a file", async ({ page }) => {
    const dialog = await openDialog(page, "Open files");
    const confirm = dialog.getByRole("button", { name: "Open", exact: true });
    await expect(confirm).toHaveAttribute("aria-disabled", "true");
    await row(dialog, "Reports").dblclick();
    await row(dialog, "Regional figures.xlsx").dblclick();
    await expect(page.getByTestId("file-dialog-opened")).toHaveText("Regional figures.xlsx");
  });

  test("a denied or filtered entry stays listed, and says why", async ({ page }) => {
    const dialog = await openDialog(page, "Open files");
    await row(dialog, "Policy.pdf").click({ force: true });
    await expect(status(dialog)).toHaveText("Held for review until Friday");
    await expect(row(dialog, "Policy.pdf")).toHaveAttribute("aria-disabled", "true");
    await expect(row(dialog, "Policy.pdf")).not.toHaveAttribute("aria-selected");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    const pictures = await openDialog(page, "Choose a picture");
    await pictures.getByRole("navigation", { name: "Folder path" }).getByRole("button", { name: "Workspace" }).click();
    const cell = pictures.getByRole("gridcell").filter({ hasText: "Budget.xlsx" });
    await cell.click({ force: true });
    await expect(status(pictures)).toHaveText("Only image files can be opened here");
    await expect(cell).toHaveAttribute("aria-disabled", "true");
  });

  test("a folder that denies reading shows the provider's reason, and the path gets out", async ({ page }) => {
    const dialog = await openDialog(page, "Open files");
    await row(dialog, "Restricted").click({ force: true });
    await expect(status(dialog)).toHaveText("Ask a workspace owner for access");
    await dialog.getByRole("tree", { name: "Folders" }).getByRole("treeitem", { name: "Restricted" }).click();
    await expect(dialog.locator(".fa-empty")).toHaveText("Ask a workspace owner for access");
    await dialog.getByRole("navigation", { name: "Folder path" }).getByRole("button", { name: "Workspace" }).click();
    await expect(row(dialog, "Pictures")).toBeVisible();
  });

  test("thumbnails swap in place and the view control is stable", async ({ page }) => {
    const dialog = await openDialog(page, "Choose a picture");
    const pictures = grid(dialog).locator("img");
    await expect(pictures).toHaveCount(4);
    const frame = await grid(dialog).locator(".fa-file-dialog-picture").first().boundingBox();
    await dialog.getByRole("radio", { name: "List" }).or(dialog.getByRole("button", { name: "List" })).first().click();
    await expect(row(dialog, "dunes.svg").locator("img")).toBeVisible();
    await dialog.getByRole("radio", { name: "Grid" }).or(dialog.getByRole("button", { name: "Grid" })).first().click();
    expect(await grid(dialog).locator(".fa-file-dialog-picture").first().boundingBox()).toEqual(frame);
    await pictures.first().click();
    await expect(status(dialog)).toHaveText("1 selected");
    await page.keyboard.press("ArrowRight");
    await expect(grid(dialog).getByRole("gridcell").nth(1)).toBeFocused();
  });

  test("the row menu renames and deletes, the same menu as the context menu", async ({ page }) => {
    const dialog = await openDialog(page, "Open files");
    await row(dialog, "Meeting notes.txt").hover();
    await row(dialog, "Meeting notes.txt").getByRole("button", { name: "Actions for Meeting notes.txt" }).click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    const rename = page.getByRole("dialog", { name: "Rename Meeting notes.txt" });
    await expect(rename.getByRole("textbox")).toBeFocused();
    await rename.getByRole("textbox").fill("Plan.txt");
    await rename.getByRole("button", { name: "Rename" }).click();
    await expect(rename).toContainText("Plan.txt is already here");
    await rename.getByRole("textbox").fill("Minutes.txt");
    await page.keyboard.press("Enter");
    await expect(row(dialog, "Minutes.txt")).toBeVisible();
    await expect(row(dialog, "Minutes.txt")).toBeFocused();

    await row(dialog, "Minutes.txt").click({ button: "right" });
    await page.getByRole("menuitem", { name: "Delete" }).click();
    const alert = page.getByRole("alertdialog", { name: "Delete Minutes.txt?" });
    await alert.getByRole("button", { name: "Delete" }).click();
    await expect(alert).toBeHidden();
    await expect(grid(dialog).getByRole("row").filter({ hasText: "Minutes.txt" })).toHaveCount(0);
    await expect(row(dialog, "Plan.txt")).toBeFocused();
  });

  test("New folder adds a row and refuses a name in use", async ({ page }) => {
    const dialog = await openDialog(page, "Open files");
    await dialog.getByRole("button", { name: "New folder" }).click();
    const named = page.getByRole("dialog", { name: "New folder" });
    await named.getByRole("textbox").fill("Reports");
    await page.keyboard.press("Enter");
    await expect(named).toContainText("Reports is already here");
    await named.getByRole("textbox").fill("Invoices");
    await page.keyboard.press("Enter");
    await expect(named).toBeHidden();
    await expect(row(dialog, "Invoices")).toBeVisible();
  });
});

test.describe("save", () => {
  test("a new name writes with absent, and the format changes the extension", async ({ page }) => {
    const dialog = await openDialog(page, "Save a copy");
    const name = dialog.getByRole("textbox", { name: "Name" });
    await expect(name).toBeFocused();
    expect(await name.evaluate((input: HTMLInputElement) => input.value.slice(input.selectionStart!, input.selectionEnd!))).toBe("Quarterly plan");
    await dialog.getByRole("combobox", { name: "Format" }).click();
    await page.getByRole("option", { name: "Markdown" }).click();
    await expect(name).toHaveValue("Quarterly plan.md");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("file-dialog-saved")).toHaveText('Quarterly plan.md, {"absent":true}');
  });

  test("an existing name asks first, and writes at the version it saw", async ({ page }) => {
    const dialog = await openDialog(page, "Save a copy");
    await row(dialog, "Regional figures.xlsx").click();
    await expect(dialog.getByRole("textbox", { name: "Name" })).toHaveValue("Regional figures.xlsx");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    const alert = page.getByRole("alertdialog", { name: "Replace Regional figures.xlsx?" });
    await expect(alert).toContainText("Reports");
    await alert.getByRole("button", { name: "Cancel" }).click();
    await expect(alert).toBeHidden();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox", { name: "Name" }).press("Enter");
    await page.getByRole("alertdialog").getByRole("button", { name: "Replace" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("file-dialog-saved")).toHaveText(/Regional figures\.xlsx, \{"version":"v\d+"\}/);
  });

  test("bad names, a folder's name and a refused file stop in the field", async ({ page }) => {
    const dialog = await openDialog(page, "Save a copy");
    const name = dialog.getByRole("textbox", { name: "Name" });
    const save = dialog.getByRole("button", { name: "Save", exact: true });
    const before = await save.boundingBox();
    await name.fill("");
    await name.press("Enter");
    await expect(dialog.getByText("Enter a name")).toBeVisible();
    await name.fill("a/b");
    await name.press("Enter");
    await expect(dialog.getByText("A name can't contain a slash")).toBeVisible();
    await name.fill("Drafts");
    await name.press("Enter");
    await expect(dialog.getByText("Drafts is a folder. Choose another name.")).toBeVisible();
    expect(await save.boundingBox()).toEqual(before);
    await dialog.getByRole("navigation", { name: "Folder path" }).getByRole("button", { name: "Workspace" }).click();
    await expect(row(dialog, "Style guide.docx")).toBeVisible();
    await name.fill("Style guide.docx");
    await name.press("Enter");
    await expect(dialog.getByText("Only the editor can replace this file")).toBeVisible();
  });

  test("a folder that denies writing can't be a target, and says why", async ({ page }) => {
    const dialog = await openDialog(page, "Save a copy");
    await dialog.getByRole("navigation", { name: "Folder path" }).getByRole("button", { name: "Workspace" }).click();
    await row(dialog, "Shared").dblclick();
    await expect(row(dialog, "Handbook.pdf")).toBeVisible();
    const save = dialog.getByRole("button", { name: "Save", exact: true });
    await expect(save).toHaveAttribute("aria-disabled", "true");
    await dialog.getByRole("textbox", { name: "Name" }).press("Enter");
    await expect(status(dialog)).toHaveText("Shared is read-only for your role");
    await expect(dialog.getByRole("button", { name: "New folder" })).toHaveAttribute("aria-disabled", "true");
  });

  test("a conflict from the host: compare, keep it, save a copy, replace", async ({ page }) => {
    const dialog = await openDialog(page, "Save over a rival");
    await expect(row(dialog, "Plan.txt")).toBeVisible();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("alertdialog", { name: "Replace Plan.txt?" }).getByRole("button", { name: "Replace" }).click();
    const conflict = page.getByRole("alertdialog", { name: "Plan.txt changed while you were working" });
    await expect(conflict).toBeVisible();
    await expect(conflict.getByRole("button", { name: "Cancel" })).toBeFocused();
    await conflict.getByRole("button", { name: "Compare" }).click();
    await expect(page.getByTestId("file-dialog-compared")).toHaveText(/^v\d+$/);

    await conflict.getByRole("button", { name: "Save a copy" }).click();
    await expect(conflict).toBeHidden();
    const name = dialog.getByRole("textbox", { name: "Name" });
    await expect(name).toHaveValue("Plan (2).txt");
    await expect(name).toBeFocused();
    expect(await name.evaluate((input: HTMLInputElement) => input.value.slice(input.selectionStart!, input.selectionEnd!))).toBe("Plan (2)");

    await name.fill("Plan.txt");
    await name.press("Enter");
    await page.getByRole("alertdialog", { name: "Replace Plan.txt?" }).getByRole("button", { name: "Replace" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("file-dialog-saved")).toHaveText(/Plan\.txt, \{"version":"v\d+"\}/);
  });

  test("Replace in a conflict is the only overwrite", async ({ page }) => {
    const dialog = await openDialog(page, "Save over a rival");
    await expect(row(dialog, "Plan.txt")).toBeVisible();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("alertdialog", { name: "Replace Plan.txt?" }).getByRole("button", { name: "Replace" }).click();
    const conflict = page.getByRole("alertdialog", { name: "Plan.txt changed while you were working" });
    await conflict.getByRole("button", { name: "Replace" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("file-dialog-saved")).toHaveText('Plan.txt, {"overwrite":true}');
  });

  test("the standalone conflict step answers, and reads the two cases", async ({ page }) => {
    await page.getByRole("button", { name: "A newer version" }).click();
    let alert = page.getByRole("alertdialog");
    await expect(alert).toContainText("2 KB");
    await alert.getByRole("button", { name: "Replace" }).click();
    await expect(page.getByTestId("file-dialog-answer")).toHaveText("replace");
    await page.getByRole("button", { name: "The file has gone" }).click();
    alert = page.getByRole("alertdialog");
    await expect(alert).toContainText("deleted or moved");
    await alert.getByRole("button", { name: "Save anyway" }).click();
    await expect(page.getByTestId("file-dialog-answer")).toHaveText("replace");
    await page.getByRole("button", { name: "A newer version" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("file-dialog-answer")).toHaveText("cancel");
  });
});

test.describe("pagination and abort", () => {
  test("late pages join the end and nothing moves", async ({ page }) => {
    const dialog = await openDialog(page, "Open the long folder");
    const first = grid(dialog).getByRole("row").first();
    await expect(first).toContainText("Scan 0001");
    await expect(grid(dialog)).toHaveAttribute("aria-rowcount", "2400");
    await expect(status(dialog)).toHaveText("2,400 items");
    const before = await first.boundingBox();
    const scroller = grid(dialog);
    const reach = async () => scroller.evaluate((element) => element.scrollHeight);
    const start = await reach();
    await scroller.evaluate((element) => element.scrollTo(0, element.scrollHeight));
    await expect.poll(reach).toBeGreaterThan(start);
    await scroller.evaluate((element) => element.scrollTo(0, 0));
    await expect(first).toContainText("Scan 0001");
    expect(await first.boundingBox()).toEqual(before);
    await first.click();
    await page.keyboard.press("End");
    await expect(page.locator(":focus")).toContainText("Scan");
    // The focused row stays mounted through a page.
    await expect.poll(async () => Number(await page.locator(":focus").getAttribute("data-index"))).toBeGreaterThan(50);
  });

  test("leaving a folder aborts its listing, and closing aborts the rest", async ({ page }) => {
    const aborted = page.getByTestId("file-dialog-aborted");
    const dialog = await openDialog(page, "Open the distant location");
    await expect(dialog.locator(".fa-file-dialog-main [aria-hidden]").first()).toBeVisible();
    await expect(row(dialog, "Reports")).toBeVisible({ timeout: 10000 });
    await row(dialog, "Reports").dblclick();
    await expect(dialog.getByRole("navigation", { name: "Folder path" })).toContainText("Reports");
    await dialog.getByRole("navigation", { name: "Folder path" }).getByRole("button", { name: "Distant" }).click();
    await expect(aborted).not.toHaveText("Listings aborted: 0");
    const after = await aborted.textContent();
    await dialog.getByRole("button", { name: "Refresh" }).click();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(aborted).not.toHaveText(after!);
  });

});

test.describe("a provider without", () => {
  test("readDirectory has a location field, resolved with stat", async ({ page }) => {
    const dialog = await openDialog(page, "No readDirectory");
    await expect(dialog.getByRole("grid")).toHaveCount(0);
    await expect(dialog.getByRole("tree")).toHaveCount(0);
    await expect(dialog.getByRole("navigation", { name: "Folder path" })).toHaveCount(0);
    const field = dialog.getByRole("textbox", { name: "Location" });
    await field.fill("link:///Missing.txt");
    await field.press("Enter");
    await expect(dialog.getByText("This is no longer here")).toBeVisible();
    await field.fill("link:///Reports");
    await field.press("Enter");
    await expect(dialog.getByText("Reports is a folder")).toBeVisible();
    await field.fill("link:///Plan.txt");
    await dialog.getByRole("button", { name: "Go" }).click();
    await expect(row(dialog, "Plan.txt")).toHaveAttribute("aria-selected", "true");
    await dialog.getByRole("button", { name: "Open", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("file-dialog-opened")).toHaveText("Plan.txt");
  });

  test("write has no New folder, and no rename or delete means no row menu", async ({ page }) => {
    const dialog = await openDialog(page, "No write, rename or delete");
    await expect(row(dialog, "Plan.txt")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "New folder" })).toHaveCount(0);
    await expect(grid(dialog).getByRole("button", { name: /^Actions for/ })).toHaveCount(0);
    await row(dialog, "Plan.txt").click({ button: "right" });
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("thumbnail has no grid, whatever defaultView asks", async ({ page }) => {
    const dialog = await openDialog(page, "No thumbnail");
    await expect(row(dialog, "Plan.txt")).toBeVisible();
    await expect(dialog.getByRole("group", { name: "View" }).or(dialog.getByRole("radiogroup", { name: "View" }))).toHaveCount(0);
    await expect(grid(dialog)).toHaveAttribute("data-view", "list");
    await expect(grid(dialog).locator("img")).toHaveCount(0);
  });

  test("write leaves a provider out of Save, with no location list when one remains", async ({ page }) => {
    const single = await openDialog(page, "Save a copy");
    await expect(single.getByRole("combobox", { name: "Location" })).toHaveCount(0);
    await single.getByRole("button", { name: "Cancel" }).click();
    await expect(single).toBeHidden();
    const none = await openDialog(page, "Save with no write");
    await expect(none.locator(".fa-empty")).toHaveText("No location here can be saved to");
    await expect(none.getByRole("button", { name: "Save", exact: true })).toHaveAttribute("aria-disabled", "true");
  });

  test("folders hides the tree", async ({ page }) => {
    const flat = page.getByTestId("file-dialog-flat");
    await expect(flat.getByRole("grid", { name: "Files" })).toBeVisible();
    await expect(flat.getByRole("tree")).toHaveCount(0);
    await expect(page.getByTestId("file-dialog-list").getByRole("tree")).toHaveCount(1);
  });
});

test.describe("locations", () => {
  test("switch provider, and the device route is FileDrop", async ({ page }) => {
    const dialog = await openDialog(page, "Open from anywhere");
    const places = dialog.getByRole("combobox", { name: "Location" });
    await places.click();
    await page.getByRole("option", { name: "Archive" }).click();
    await expect(dialog.getByRole("navigation", { name: "Folder path" })).toContainText("Archive");
    await expect(row(dialog, "Plan.txt")).toBeVisible();
    await places.click();
    await page.getByRole("option", { name: "This device" }).click();
    await expect(dialog.getByRole("button", { name: "Open", exact: true })).toHaveCount(0);
    await dialog.locator('input[type="file"]').setInputFiles({ name: "from-disk.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("file-dialog-opened")).toHaveText("from-disk.txt");
  });

  test("the last place in the session is where the next dialog starts", async ({ page }) => {
    const dialog = await openDialog(page, "Open files");
    await row(dialog, "Reports").dblclick();
    await expect(row(dialog, "Drafts")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    const again = await openDialog(page, "Open files");
    await expect(row(again, "Drafts")).toBeVisible();
  });
});

test.describe("states", () => {
  test("every state uses the same box, and buttons stay put @responsive", async ({ page }) => {
    const boxes = [];
    for (const id of ["list", "loading", "empty", "flat", "denied", "error"]) {
      const state = page.getByTestId(`file-dialog-${id}`);
      await state.scrollIntoViewIfNeeded();
      const surface = await state.locator(".fa-dialog").boundingBox();
      const footer = await state.locator(".fa-dialog-footer").boundingBox();
      boxes.push({ height: surface!.height, footer: footer!.y - surface!.y });
    }
    for (const box of boxes) expect(box).toEqual(boxes[0]);
  });

  test("a skeleton has the loaded rows' geometry", async ({ page }) => {
    const loading = page.getByTestId("file-dialog-loading").locator(".fa-file-dialog-row").first();
    const loaded = page.getByTestId("file-dialog-list").locator('[role="row"].fa-file-dialog-row').first();
    expect((await loading.boundingBox())!.height).toBe((await loaded.boundingBox())!.height);
    const name = (locator: Locator) => locator.locator(".fa-file-dialog-picture").first().boundingBox();
    expect((await name(loading))!.height).toBe((await name(loaded))!.height);
  });

  test("a lapsed session shows the provider's sentence and does not prompt", async ({ page }) => {
    const denied = page.getByTestId("file-dialog-denied");
    await expect(denied.locator(".fa-empty")).toHaveText("Your session has ended. Sign in again from the main window.");
    await expect(denied.getByRole("textbox")).toHaveCount(0);
    await expect(denied.getByRole("button", { name: "Retry" })).toHaveCount(0);
    const failed = page.getByTestId("file-dialog-error");
    await expect(failed.locator(".fa-empty")).toContainText("The archive is offline for maintenance until 18:00.");
    await expect(failed.getByRole("button", { name: "Retry" })).toBeVisible();
  });
});

test.describe("accessibility", () => {
  test("axe: each surface of the dialog @responsive", async ({ page }) => {
    const scan = async () => {
      const results = await new AxeBuilder({ page }).include('[role="dialog"], [role="alertdialog"]').analyze();
      expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(" | ")}`)).toEqual([]);
    };
    const list = await openDialog(page, "Open files");
    await expect(row(list, "Plan.txt")).toBeVisible();
    await scan();
    await page.keyboard.press("Escape");
    await expect(list).toBeHidden();

    const pictures = await openDialog(page, "Choose a picture");
    await expect(grid(pictures).locator("img")).toHaveCount(4);
    await scan();
    await page.keyboard.press("Escape");
    await expect(pictures).toBeHidden();

    const save = await openDialog(page, "Save over a rival");
    await expect(row(save, "Plan.txt")).toBeVisible();
    await save.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Replace" }).click();
    await expect(page.getByRole("alertdialog", { name: "Plan.txt changed while you were working" })).toBeVisible();
    await scan();
  });

  test("axe: the catalogue page in every state", async ({ page }) => {
    // Several previews share a page here; a dialog holds one path, so its landmark is unique.
    const results = await new AxeBuilder({ page }).include(".gallery-page").disableRules(["landmark-unique"]).analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(" | ")}`)).toEqual([]);
  });

  test("the grid is one tab stop, and a focus ring survives the scroller", async ({ page }) => {
    const dialog = await openDialog(page, "Open files");
    await expect(row(dialog, "Plan.txt")).toBeVisible();
    await expect(grid(dialog).locator('[tabindex="0"]')).toHaveCount(1);
    const ring = await row(dialog, "Pictures").evaluate((element) => {
      const style = getComputedStyle(element);
      return style.outlineOffset;
    });
    expect(ring).not.toBe("");
  });

  test("escape closes the dialog, not a tooltip, and returns focus", async ({ page }) => {
    await page.getByRole("button", { name: "Save a copy" }).focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog").last();
    await expect(dialog.getByRole("textbox", { name: "Name" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Save a copy" })).toBeFocused();
  });
});

test.describe("right to left", () => {
  test("the bar, rows and grid keys mirror @responsive", async ({ page }) => {
    await page.goto(`${ROUTE}?dir=rtl&lang=ar`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const opener = page.getByRole("button", { name: "Choose a picture" });
    await opener.click();
    const dialog = page.getByRole("dialog").last();
    const cells = dialog.getByRole("gridcell");
    await expect(cells).toHaveCount(4);
    const first = (await cells.nth(0).boundingBox())!;
    const second = (await cells.nth(1).boundingBox())!;
    expect(first.x).toBeGreaterThan(second.x);
    await cells.nth(0).click();
    await page.keyboard.press("ArrowLeft");
    await expect(cells.nth(1)).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(cells.nth(0)).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    const box = (await dialog.boundingBox())!;
    expect(first.x + first.width).toBeLessThanOrEqual(box.x + box.width);
  });
});

test.describe("phones", () => {
  test("a sheet: no tree, tap goes in, actions stay on screen @responsive", async ({ page }) => {
    test.skip(page.viewportSize()!.width > 700, "phone layout");
    const dialog = await openDialog(page, "Open files");
    await expect(dialog).toHaveAttribute("data-sheet", "");
    await expect(dialog.getByRole("tree")).toHaveCount(0);
    await expect(dialog.getByRole("navigation", { name: "Folder path" })).toBeVisible();
    await row(dialog, "Reports").tap();
    await expect(row(dialog, "Drafts")).toBeVisible();
    const viewport = page.viewportSize()!;
    const footer = (await dialog.locator(".fa-dialog-footer").boundingBox())!;
    expect(footer.y + footer.height).toBeLessThanOrEqual(viewport.height);
    const open = (await dialog.getByRole("button", { name: "Open", exact: true }).boundingBox())!;
    expect(open.height).toBeGreaterThanOrEqual(44);
    const target = (await row(dialog, "Drafts").boundingBox())!;
    expect(target.height).toBeGreaterThanOrEqual(44);
    expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
    await row(dialog, "First quarter summary.pdf").tap();
    await row(dialog, "Regional figures.xlsx").tap();
    await expect(status(dialog)).toHaveText("2 selected");
    await row(dialog, "First quarter summary.pdf").tap();
    await expect(status(dialog)).toHaveText("1 selected");
  });

  test("Save keeps its name and buttons in the first screen @responsive", async ({ page }) => {
    test.skip(page.viewportSize()!.width > 700, "phone layout");
    await page.getByRole("button", { name: "Save a copy" }).tap();
    const dialog = page.getByRole("dialog").last();
    const name = dialog.getByRole("textbox", { name: "Name" });
    await expect(name).toBeVisible();
    const viewport = page.viewportSize()!;
    const save = (await dialog.getByRole("button", { name: "Save", exact: true }).boundingBox())!;
    expect(save.y + save.height).toBeLessThanOrEqual(viewport.height);
    expect((await name.boundingBox())!.x).toBeGreaterThanOrEqual(0);
    expect(await grid(dialog).boundingBox()).not.toBeNull();
    expect((await grid(dialog).boundingBox())!.height).toBeGreaterThan(120);
  });
});

/* ── Geometry against the theme ─────────────────────────────────────────────── */

const APPEARANCES = [
  { density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1 },
  { density: "compact", uiScale: 1.125, radiusScale: 1.4, borderWidth: 1.5 },
  { density: "comfortable", uiScale: 0.9, radiusScale: 0, borderWidth: 2 },
] as const;

const px = (page: Page, value: string) =>
  page.evaluate((expression) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;width:${expression}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, value);

for (const appearance of APPEARANCES) {
  const name = `${appearance.density}, scale ${appearance.uiScale}, radius ${appearance.radiusScale}, line ${appearance.borderWidth}`;

  test(`insets, rows and marks follow the theme: ${name} @responsive`, async ({ page }) => {
    await prefs(page, appearance);
    await page.goto(ROUTE);
    const dialog = await openDialog(page, "Open files");
    await expect(row(dialog, "Plan.txt")).toBeVisible();
    const near = async (actual: number, token: string) => expect(Math.abs(actual - (await px(page, token)))).toBeLessThan(1);

    const surface = (await dialog.boundingBox())!;
    const body = (await dialog.locator(".fa-file-dialog-layout").boundingBox())!;
    const direction = await dialog.evaluate((element) => getComputedStyle(element).direction);
    expect(direction).toBe("ltr");
    const rim = await dialog.evaluate((element) => element.clientLeft);
    await near(body.x - surface.x - rim, "var(--inset-dialog)");
    await near(surface.x + surface.width - (body.x + body.width) - rim, "var(--inset-dialog)");

    const picked = row(dialog, "Plan.txt");
    await near((await picked.boundingBox())!.height, "var(--item-h)");
    const check = picked.locator(".fa-file-dialog-check");
    await near((await check.boundingBox())!.width, "var(--icon-sm)");
    await near(await check.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderBlockStartWidth)), "var(--border-width)");
    await near(await check.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderStartStartRadius)), "var(--radius-check)");
    await near(await picked.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderStartStartRadius)), "var(--radius-item)");

    // Virtual rows sit exactly one row apart, so a measured height reached the virtualiser.
    const next = row(dialog, "Style guide.docx");
    const gap = (await next.boundingBox())!.y - (await row(dialog, "Policy.pdf").boundingBox())!.y;
    await near(gap, "var(--item-h)");

    // The tree and the rows share a row height and nothing clips a focus ring (R11.10).
    const treeRow = dialog.getByRole("treeitem").first();
    if (await treeRow.count()) expect(Math.abs((await treeRow.boundingBox())!.height - (await picked.boundingBox())!.height)).toBeLessThan(1);
    await picked.click();
    await page.keyboard.press("ArrowUp");
    // The ring settles from a wider one (motion.css); it ends inside the row, so no edge cuts it.
    await expect
      .poll(() =>
        page.locator(":focus").evaluate((element) => {
          const style = getComputedStyle(element);
          return Number.parseFloat(style.outlineOffset) + Number.parseFloat(style.outlineWidth);
        })
      )
      .toBeLessThanOrEqual(0.01);

    expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
    expect(await grid(dialog).evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
  });

  test(`tiles fit whole columns and scroll edges show: ${name}`, async ({ page }) => {
    await prefs(page, appearance);
    await page.goto(ROUTE);
    const dialog = await openDialog(page, "Choose a picture");
    await expect(grid(dialog).locator("img")).toHaveCount(4);
    const tile = grid(dialog).getByRole("gridcell").first();
    const tileBox = (await tile.boundingBox())!;
    const picture = (await tile.locator(".fa-file-dialog-picture").boundingBox())!;
    expect(Math.abs(picture.width - picture.height)).toBeLessThan(1);
    const scroller = (await grid(dialog).boundingBox())!;
    const last = (await grid(dialog).getByRole("gridcell").last().boundingBox())!;
    expect(last.x + last.width).toBeLessThanOrEqual(scroller.x + scroller.width);
    expect(tileBox.x).toBeGreaterThanOrEqual(scroller.x);
    expect(await grid(dialog).evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
  });
}

test("a scrolled list marks its edges, and only while content continues", async ({ page }) => {
  const dialog = await openDialog(page, "Open the long folder");
  await expect(status(dialog)).toHaveText("2,400 items");
  const frame = dialog.locator(".fa-file-dialog-entries-frame");
  await expect(frame).toHaveAttribute("data-scrolled-bottom", "");
  await expect(frame).not.toHaveAttribute("data-scrolled-top", "");
  await grid(dialog).evaluate((element) => element.scrollTo(0, 200));
  await expect(frame).toHaveAttribute("data-scrolled-top", "");
});
