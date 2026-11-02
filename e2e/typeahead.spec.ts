import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("the list leaves focus in the field and is one keyboard path @responsive", async ({ page }) => {
  await page.goto("/components/typeahead");
  const field = page.getByRole("combobox", { name: "Find a file", exact: true });
  await field.focus();
  const list = page.getByRole("listbox", { name: "Files" });
  await expect(list.getByRole("option")).toHaveCount(4);
  await expect(field).toBeFocused();
  await expect(field).toHaveAttribute("aria-expanded", "true");
  await expect(field).toHaveAttribute("aria-controls", await list.getAttribute("id") ?? "");
  await page.keyboard.press("ArrowDown");
  const second = list.getByRole("option").nth(1);
  await expect(second).toHaveAttribute("aria-selected", "true");
  await expect(field).toHaveAttribute("aria-activedescendant", (await second.getAttribute("id"))!);
  await expect(field).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(field).toHaveValue("Floor plans");
  await expect(list).toBeHidden();
  await expect(field).toBeFocused();
  await expect(field).toHaveAttribute("aria-expanded", "false");
});

test("a press on a row picks it without blurring the field", async ({ page }) => {
  await page.goto("/components/typeahead");
  const field = page.getByRole("combobox", { name: "Find a file", exact: true });
  await field.focus();
  await page.getByRole("option", { name: /Site photo/ }).click();
  await expect(field).toHaveValue("Site photo.jpg");
  await expect(field).toBeFocused();
});

test("the open list has no axe violations", async ({ page }) => {
  await page.goto("/components/typeahead");
  await page.getByRole("combobox", { name: "Find a file with detail" }).focus();
  await expect(page.getByRole("listbox", { name: "Files" })).toBeVisible();
  const results = await new AxeBuilder({ page }).include(".fa-typeahead").analyze();
  expect(results.violations).toEqual([]);
});

test("late results move nothing: the box is reserved and a pointed-at row stays", async ({ page }) => {
  await page.goto("/components/typeahead");
  const field = page.getByRole("combobox", { name: "Find a file, slowly" });
  await field.focus();
  const popup = page.locator(".fa-typeahead");
  const list = popup.getByRole("listbox");
  await expect(list.getByRole("option")).toHaveCount(2);
  await popup.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
  const before = (await popup.boundingBox())!;
  const row = list.getByRole("option", { name: /Floor plans/ });
  const rowBefore = (await row.boundingBox())!;
  await page.mouse.move(rowBefore.x + 20, rowBefore.y + 6);
  await page.mouse.move(rowBefore.x + 24, rowBefore.y + 8);
  await expect(row).toHaveAttribute("aria-selected", "true");

  await expect(list.getByRole("option")).toHaveCount(6);
  expect(await popup.boundingBox()).toEqual(before);
  expect(await row.boundingBox()).toEqual(rowBefore);
  await expect(list.getByRole("option").nth(2)).toContainText("Budget review");

  // Leaving the list lets the host's order through.
  await page.mouse.move(2, 2);
  await expect(list.getByRole("option").first()).toContainText("Budget review");
  expect(await popup.boundingBox()).toEqual(before);
});

test("the detail pane follows the highlight and describes it", async ({ page }) => {
  await page.goto("/components/typeahead");
  await page.getByRole("combobox", { name: "Find a file with detail" }).focus();
  const detail = page.locator(".fa-typeahead-detail");
  await expect(detail).toHaveText("Edited by Mira Rowan on 12 March");
  await page.keyboard.press("ArrowDown");
  await expect(detail).toHaveText("Holds 14 drawings");
  await expect(page.getByRole("option", { name: /Floor plans/ })).toHaveAttribute("aria-describedby", (await detail.getAttribute("id"))!);
});

test("detail sits beside the list on a desktop and under it on a phone @responsive", async ({ page }) => {
  await page.goto("/components/typeahead");
  await page.getByRole("combobox", { name: "Find a file with detail" }).focus();
  const list = (await page.locator(".fa-typeahead-scroll").boundingBox())!;
  const detail = (await page.locator(".fa-typeahead-detail").boundingBox())!;
  const phone = (page.viewportSize()?.width ?? 1280) < 480;
  if (phone) expect(detail.y).toBeGreaterThanOrEqual(list.y + list.height);
  else expect(detail.x).toBeGreaterThanOrEqual(list.x + list.width);
  const popup = (await page.locator(".fa-typeahead").boundingBox())!;
  expect(popup.x + popup.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 1280) + 0.5);
  expect(popup.x).toBeGreaterThanOrEqual(0);
});

test("an anchor can be a bare rectangle", async ({ page }) => {
  await page.goto("/components/typeahead");
  await page.getByRole("combobox", { name: "Open at the top of the window" }).focus();
  const popup = (await page.locator(".fa-typeahead").boundingBox())!;
  expect(popup.y).toBeLessThan(120);
  expect(Math.abs(popup.x - 24)).toBeLessThan(20);
});

test("Escape closes the list and keeps the field focused", async ({ page }) => {
  await page.goto("/components/typeahead");
  const field = page.getByRole("combobox", { name: "Find a file", exact: true });
  await field.focus();
  await expect(page.getByRole("listbox", { name: "Files" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox", { name: "Files" })).toBeHidden();
  await expect(field).toBeFocused();
});

test.describe("in RichTextInput", () => {
  const editor = (page: Page) =>
    page.getByTestId("rich-text-typeahead-demo").getByRole("textbox", { name: "Handover notes" });
  const markdown = (page: Page) => page.getByTestId("rich-text-typeahead-markdown");
  async function caretAtEnd(page: Page) {
    await editor(page).click();
    await page.keyboard.press("ControlOrMeta+End");
  }

  test("a mention opens at the @, inserts a Markdown link and keeps focus @responsive", async ({ page }) => {
    await page.goto("/components/rich-text-input");
    await caretAtEnd(page);
    await page.keyboard.type(" Ask @a");
    const list = page.getByRole("listbox", { name: "Mentions" });
    await expect(list.getByRole("option")).toHaveCount(3);
    await expect(editor(page)).toBeFocused();
    await expect(editor(page)).toHaveAttribute("role", "textbox");
    await expect(editor(page)).toHaveAttribute("aria-multiline", "true");
    const active = await list.getByRole("option").first().getAttribute("id");
    await expect(editor(page)).toHaveAttribute("aria-activedescendant", active!);

    // It opens at 0.9 scale: its box is only true once the transition has finished.
    await page.locator(".fa-typeahead").evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
    const popup = (await page.locator(".fa-typeahead").boundingBox())!;
    await page.keyboard.type("v");
    await expect(list.getByRole("option")).toHaveCount(1);
    const after = (await page.locator(".fa-typeahead").boundingBox())!;
    expect(after.x).toBeCloseTo(popup.x, 0);

    await page.keyboard.press("Enter");
    await expect(list).toBeHidden();
    await expect(markdown(page)).toContainText("Ask [@Avery Quinn](/people/avery)");
    await expect(editor(page)).toBeFocused();
    await expect(editor(page)).not.toHaveAttribute("aria-activedescendant", /.+/);
    await page.keyboard.type("next");
    await expect(markdown(page)).toContainText("(/people/avery) next");
  });

  test("Enter in an open list adds no paragraph, and Escape stays dismissed", async ({ page }) => {
    await page.goto("/components/rich-text-input");
    await caretAtEnd(page);
    await page.keyboard.type(" @m");
    const list = page.getByRole("listbox", { name: "Mentions" });
    await expect(list).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(list).toBeHidden();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowRight");
    await expect(list).toBeHidden();
    await page.keyboard.press("Enter");
    await expect(editor(page).locator("p")).toHaveCount(2);
  });

  test("a mention without an address inserts plain text", async ({ page }) => {
    await page.goto("/components/rich-text-input");
    await caretAtEnd(page);
    await page.keyboard.type(" @noor");
    await page.getByRole("option", { name: /Noor Haddad/ }).click();
    await expect(markdown(page)).toContainText("@Noor Haddad");
    await expect(editor(page)).toBeFocused();
  });

  test("the slash menu turns the block and is not offered mid-text or in code", async ({ page }) => {
    await page.goto("/components/rich-text-input");
    await caretAtEnd(page);
    await page.keyboard.type(" /h");
    await expect(page.getByRole("listbox", { name: "Commands" })).toBeHidden();
    await page.keyboard.press("Enter");
    await page.keyboard.type("/heading 2");
    const list = page.getByRole("listbox", { name: "Commands" });
    await expect(list.getByRole("option")).toHaveCount(1);
    await page.keyboard.press("Enter");
    await page.keyboard.type("Next steps");
    await expect(editor(page).locator("h2")).toHaveText("Next steps");
    await expect(markdown(page)).toContainText("## Next steps");

    await page.keyboard.press("Enter");
    await page.keyboard.type("/bullet");
    await page.keyboard.press("Tab");
    await page.keyboard.type("First");
    await expect(editor(page).locator("ul li")).toHaveText("First");

    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/code");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/h");
    await expect(list).toBeHidden();
  });

  test("the open editor list has no axe violations", async ({ page }) => {
    await page.goto("/components/rich-text-input");
    await caretAtEnd(page);
    await page.keyboard.type(" @");
    await expect(page.getByRole("listbox", { name: "Mentions" })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('[data-testid="rich-text-typeahead-demo"]')
      .include(".fa-typeahead")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test("the composer's menus still open from the textarea", async ({ page }) => {
  await page.goto("/components/composer");
  const text = page.getByRole("textbox", { name: "Message Assistant" }).first();
  await text.fill("/");
  const list = page.getByRole("listbox", { name: "Commands" });
  await expect(list).toBeVisible();
  await expect(text).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(list.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(list).toBeHidden();
  await text.fill("Ask @");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(text).toBeFocused();
});
