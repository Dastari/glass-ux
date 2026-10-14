import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const catalogue = JSON.parse(
  readFileSync("src/gallery/catalogue.generated.json", "utf8"),
) as Array<{ id: string; name: string }>;
for (const component of catalogue) {
  test(`${component.name} loads focused examples and matching usage`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/components/${component.id}`);
    await expect(page.locator(".gallery-document-intro h1")).toHaveText(
      component.name,
    );
    await expect(
      page
        .locator(
          "#examples .gallery-specimen, #examples [data-canvas-specimen]",
        )
        .first(),
    ).toBeAttached();
    await expect(page.locator("#usage .fa-ai-code").first()).toBeAttached();
    await expect(
      page.locator("#api .gallery-api-table").first(),
    ).toBeAttached();
    await page.waitForTimeout(150);
    expect(errors).toEqual([]);
  });
}

test("Highlight examples and copied source contain only the selected component", async ({
  page,
}) => {
  await page.goto("/components/highlight");
  await expect(page.locator("#examples")).not.toContainText("Autocomplete");
  await expect(page.locator("#examples mark").first()).toHaveText("Café");
  await page
    .getByRole("textbox", { name: "Search text", exact: true })
    .fill("workspace");
  await expect(page.locator("#examples mark")).toHaveCount(1);
  await expect(page.locator("#examples mark")).toHaveText("workspace");
  // The rendered usage is loaded from the built package asset, with public imports.
  await expect(page.locator("#usage")).toContainText("glass-ux/combobox");
  await expect(page.locator("#usage")).not.toContainText("Autocomplete");
});
