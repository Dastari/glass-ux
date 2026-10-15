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
