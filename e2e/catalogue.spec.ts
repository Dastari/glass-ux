import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { componentDestination } from "../src/gallery/component-families.js";
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
    const destination = componentDestination(component.id);
    const parent = catalogue.find((item) => item.id === destination.id)!;
    await expect(page.locator(".gallery-document-intro h1")).toHaveText(
      parent.name,
    );
    const examples = page.locator(
      destination.hash ? `#${destination.hash}` : "#examples",
    );
    await expect(
      examples.locator(".gallery-specimen, [data-canvas-specimen]").first(),
    ).toBeAttached();
    await expect(
      page
        .locator(`#usage-${component.id}`)
        .locator("..")
        .locator(".fa-ai-code"),
    ).toBeAttached();
    await expect(
      page
        .locator(`#api-${component.id}`)
        .locator("..")
        .locator(".gallery-api-table")
        .first(),
    ).toBeAttached();
    await page.waitForTimeout(150);
    expect(errors).toEqual([]);
  });
}

test("Highlight examples and copied source contain only the selected component", async ({
  page,
}) => {
  await page.goto("/components/highlight");
  await expect(page.locator("#highlight")).not.toContainText("Autocomplete");
  await expect(page.locator("#highlight mark").first()).toHaveText("Café");
  await page
    .locator("#highlight")
    .getByRole("textbox", { name: "Search text", exact: true })
    .fill("workspace");
  await expect(page.locator("#highlight mark")).toHaveCount(1);
  await expect(page.locator("#highlight mark")).toHaveText("workspace");
  // The rendered usage is loaded from the built package asset, with public imports.
  const source = page.locator("#usage-highlight").locator("..");
  await expect(source).toContainText("glass-ux/combobox");
  await expect(source).not.toContainText("Autocomplete");
});
