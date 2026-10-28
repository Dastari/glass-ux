import { expect, type Page } from "@playwright/test";

/**
 * The document's "On this page" rail. On a phone it is a horizontal tab strip, and sections
 * that do not fit sit in its More menu, so a section link may be in either place.
 */
export function documentRail(page: Page) {
  return page.getByRole("navigation", { name: "On this page", exact: true });
}

const moreTabs = /^More tabs/;

/** Follow a section link, opening the strip's More menu when the section has moved into it. */
export async function openSection(page: Page, name: string) {
  const rail = documentRail(page);
  await expect(rail.getByRole("link").first()).toBeVisible();
  const link = rail.getByRole("link", { name, exact: true });
  if (await link.count()) return link.click();
  await rail.getByRole("button", { name: moreTabs }).click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}

/** Every section the rail offers, in the strip or its More menu. */
export async function sectionNames(page: Page): Promise<string[]> {
  const rail = documentRail(page);
  await expect(rail.getByRole("link").first()).toBeVisible();
  const names = await rail.getByRole("link").allTextContents();
  const more = rail.getByRole("button", { name: moreTabs });
  if (await more.count()) {
    await more.click();
    names.push(...(await page.getByRole("menuitem").allTextContents()));
    await page.keyboard.press("Escape");
  }
  return names.map((name) => name.trim());
}
