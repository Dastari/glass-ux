import { expect, test } from "@playwright/test";

const typography = (element: Element) => {
  const style = getComputedStyle(element);
  return {
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
  };
};

test("a chip in a header's or compact entity's state slot keeps chip typography", async ({ page }) => {
  await page.goto("./components/entity-identity");
  const nested = page.getByTestId("entity-nested");
  const reference = await page
    .getByTestId("entity-nested-reference")
    .locator('.fa-entity[data-tier="chip"] .fa-entity-title')
    .evaluate(typography);
  for (const tier of ["header", "compact"]) {
    const outer = nested.locator(`.fa-entity[data-tier="${tier}"]`);
    await expect(outer).toBeVisible();
    const chip = outer.locator('.fa-entity-state .fa-entity[data-tier="chip"]');
    await expect(chip).toBeVisible();
    expect(await chip.locator(".fa-entity-title").evaluate(typography)).toEqual(reference);
    // The outer title keeps its own heading size, larger than the chip's.
    const title = await outer.locator(":scope > * .fa-entity-title").first().evaluate(typography);
    expect(parseFloat(title.fontSize)).toBeGreaterThan(parseFloat(reference.fontSize));
    // The chip's height matches the standalone chip.
    const height = await chip.evaluate((element) => element.getBoundingClientRect().height);
    const referenceHeight = await page
      .getByTestId("entity-nested-reference")
      .locator('.fa-entity[data-tier="chip"]')
      .evaluate((element) => element.getBoundingClientRect().height);
    expect(Math.abs(height - referenceHeight)).toBeLessThan(0.5);
  }
});
