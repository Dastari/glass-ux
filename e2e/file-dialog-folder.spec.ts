import { expect, test, type Page } from "@playwright/test";

/* mode="folder" returns a folder, and places jump to common ones. */

const openDialog = async (page: Page, trigger = "Choose a folder") => {
  await page.goto("/components/file-dialog");
  await page.getByRole("button", { name: trigger, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
};
const result = (page: Page) => page.getByTestId("file-dialog-folder");
const choose = (dialog: ReturnType<Page["getByRole"]>) =>
  dialog.getByRole("button", { name: "Choose folder", exact: true });
const choice = (dialog: ReturnType<Page["getByRole"]>) => dialog.locator(".fa-file-dialog-choice");
const row = (dialog: ReturnType<Page["getByRole"]>, name: string) =>
  dialog.locator(`.fa-file-dialog-main [data-kind][data-uri$="${encodeURI(name)}"]`).first();

test("Choose folder returns the folder showing @responsive", async ({ page }) => {
  const dialog = await openDialog(page);
  await expect(dialog.getByRole("heading", { name: "Choose a folder" })).toBeVisible();
  await expect(choice(dialog)).toHaveText("Folder: Workspace");
  await choose(dialog).click();
  await expect(dialog).toBeHidden();
  await expect(result(page)).toContainText("Workspace: workspace:///");
});

test("a folder selected in the list is the one returned, and opening it goes inside", async ({ page }) => {
  const dialog = await openDialog(page);
  await row(dialog, "Reports").click();
  await expect(choice(dialog)).toHaveText("Folder: Reports");
  await row(dialog, "Reports").dblclick();
  await expect(row(dialog, "Drafts")).toBeVisible();
  await expect(choice(dialog)).toHaveText("Folder: Reports");
  await row(dialog, "Drafts").click();
  await choose(dialog).click();
  await expect(result(page)).toContainText("workspace:///Reports/Drafts");
});

test("files stay listed and dimmed, and say why", async ({ page }) => {
  const dialog = await openDialog(page);
  const file = row(dialog, "Budget.xlsx");
  await expect(file).toHaveAttribute("aria-disabled", "true");
  // Dimmed rows report themselves disabled; a person can still press one to learn why.
  await file.click({ force: true });
  await expect(dialog.locator(".fa-file-dialog-status")).toHaveText("Only a folder can be chosen here");
  await expect(file).not.toHaveAttribute("data-selected", "");
});

test("a folder that denies reading can't be chosen", async ({ page }) => {
  const dialog = await openDialog(page);
  await row(dialog, "Restricted").click({ force: true });
  await expect(dialog.locator(".fa-file-dialog-status")).toHaveText("Ask a workspace owner for access");
  await expect(row(dialog, "Restricted")).not.toHaveAttribute("data-selected", "");
});

test("a rejection shows in place and the dialog stays open", async ({ page }) => {
  await page.goto("/components/file-dialog");
  await page.getByRole("button", { name: "Fail the next choice" }).click();
  await page.getByRole("button", { name: "Choose a folder", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await choose(dialog).click();
  await expect(dialog.locator(".fa-file-dialog-status")).toHaveText("The sample refused this folder");
  await expect(dialog).toBeVisible();
  await choose(dialog).click();
  await expect(dialog).toBeHidden();
});

test("places jump to their folder, mark it and leave out an unknown location", async ({ page }) => {
  const dialog = await openDialog(page);
  const places = dialog.getByRole("navigation", { name: "Places" });
  await expect(places.getByRole("button")).toHaveText(["Home", "Pictures", "Drafts", "Archived reports"]);
  // All of them show: the tree below gives way, not the shortcuts.
  const clipped = await places.evaluate((nav) => nav.scrollHeight - nav.clientHeight);
  expect(clipped).toBeLessThanOrEqual(1);
  await expect(places.getByRole("button", { name: "Archived reports" })).toBeInViewport({ ratio: 1 });
  await expect(places.getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "location");
  await places.getByRole("button", { name: "Drafts" }).click();
  await expect(row(dialog, "Outline.txt")).toBeVisible();
  await expect(places.getByRole("button", { name: "Drafts" })).toHaveAttribute("aria-current", "location");
  await expect(places.getByRole("button", { name: "Home" })).not.toHaveAttribute("aria-current", "location");
  // The tree follows: the same folder is marked there.
  await expect(dialog.getByRole("tree").locator('[data-selected]')).toContainText("Drafts");
  await expect(choice(dialog)).toHaveText("Folder: Drafts");
});

test("a place in another location switches location", async ({ page }) => {
  const dialog = await openDialog(page);
  await dialog.getByRole("button", { name: "Archived reports" }).click();
  await expect(dialog.getByRole("combobox", { name: "Location" })).toContainText("Archive");
  await choose(dialog).click();
  await expect(result(page)).toContainText("Archive: archive:///Reports");
});

test("from the keyboard a place takes Enter and keeps focus", async ({ page }) => {
  const dialog = await openDialog(page);
  const pictures = dialog.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Pictures" });
  await pictures.focus();
  await page.keyboard.press("Enter");
  await expect(pictures).toHaveAttribute("aria-current", "location");
  await expect(pictures).toBeFocused();
});

test("places fold into a menu where the dialog is narrow @responsive", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const dialog = await openDialog(page);
  await expect(dialog.getByRole("navigation", { name: "Places" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Places" }).click();
  await page.getByRole("menuitem", { name: "Pictures" }).click();
  // A folder of files alone can still be chosen, and the footer says so.
  await expect(choice(dialog)).toHaveText("Folder: Pictures");
  await expect(choose(dialog)).toBeEnabled();
  const spill = await dialog.locator(".fa-file-dialog-bar").evaluate((bar) => bar.scrollWidth - bar.clientWidth);
  expect(spill).toBeLessThanOrEqual(1);
});

test("Open and Save take places too, and Save leaves out one it can't write to", async ({ page }) => {
  const opening = await openDialog(page, "Open with places");
  await opening.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Pictures" }).click();
  await expect(opening.getByRole("button", { name: "Open", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save with places", exact: true }).click();
  const saving = page.getByRole("dialog");
  await expect(saving.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Pictures" })).toBeVisible();
  await expect(saving.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Published" })).toHaveCount(0);
});

test("the static preview draws the folder flow with places", async ({ page }) => {
  await page.goto("/components/file-dialog");
  const preview = page.getByTestId("file-dialog-folder-preview");
  await preview.scrollIntoViewIfNeeded();
  await expect(preview.getByRole("navigation", { name: "Places" })).toBeVisible();
  await expect(preview.getByRole("button", { name: "Choose folder", exact: true })).toBeVisible();
});

test("the folder choice sits beside its button, and the tree still scrolls under the places", async ({ page }) => {
  const dialog = await openDialog(page);
  const box = await choice(dialog).boundingBox();
  const button = await choose(dialog).boundingBox();
  expect(box!.y + box!.height / 2).toBeCloseTo(button!.y + button!.height / 2, -1);
  const tree = await dialog.getByRole("tree").evaluate((el) => el.getBoundingClientRect().height);
  expect(tree).toBeGreaterThan(0);
  await dialog.screenshot({ path: test.info().outputPath("folder.png") });
});
