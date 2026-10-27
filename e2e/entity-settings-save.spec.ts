import { expect, test } from "@playwright/test";

test("populated draft settings explain unavailable saving without blocking edits @responsive", async ({
  page,
}) => {
  await page.goto("components/entity-settings-dialog");
  const draft = page.getByRole("region", {
    name: "Draft-only settings",
    exact: true,
  });
  const name = draft.getByRole("textbox", { name: "Name", exact: true });
  await expect(name).toHaveValue("Cedar Annex SMTP relay");
  await name.fill("Edited local draft");
  const save = draft.getByRole("button", { name: "Save", exact: true });
  await expect(save).toHaveAttribute("aria-disabled", "true");
  await expect(save).toHaveAttribute(
    "aria-description",
    "Saving this draft is not available",
  );
  await save.focus();
  await expect(page.getByRole("tooltip")).toContainText(
    "Saving this draft is not available",
  );
  await name.press("Enter");
  await expect(name).toHaveValue("Edited local draft");
  await expect(save).not.toHaveAttribute("aria-busy", "true");
});

test("Cancel with confirmOnCancel asks before discarding, and Keep editing keeps the edit @responsive", async ({
  page,
}) => {
  await page.goto("components/entity-settings-dialog");
  await page.getByTestId("relay-open").click();
  const dialog = page
    .getByRole("dialog")
    .filter({ has: page.getByRole("button", { name: "Cancel", exact: true }) })
    .first();
  await expect(dialog).toBeVisible();
  const name = dialog.getByRole("textbox").first();
  const original = await name.inputValue();
  await name.fill(`${original} edited`);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  const ask = page.getByRole("alertdialog");
  await expect(ask).toContainText("Discard changes to Cedar Annex SMTP relay?");
  await ask.getByRole("button", { name: "Keep editing" }).click();
  await expect(ask).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(name).toHaveValue(`${original} edited`);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: /^Discard changes/ })
    .click();
  await expect(dialog).toBeHidden();
});
