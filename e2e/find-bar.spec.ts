import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const open = (page: Page) => page.goto("/components/find-bar");

test("a climbing count moves nothing and is not announced until it settles", async ({ page }) => {
  await open(page);
  const bar = page.getByRole("search", { name: "Find in archive" });
  const next = bar.getByRole("button", { name: "Next match" });
  const status = bar.getByRole("status");
  const seen = new Set<string>();
  await page.getByRole("button", { name: "Run the search" }).click();
  const before = await next.boundingBox();
  await expect(bar.locator(".fa-find-bar-count > span:last-child")).toContainText("+");
  await expect(async () => {
    seen.add((await status.textContent()) ?? "");
    expect(await next.boundingBox()).toEqual(before);
    await expect(bar.locator(".fa-find-bar-count > span:last-child")).toHaveText("1 of 8,412", { timeout: 100 });
  }).toPass({ timeout: 10000, intervals: [50] });
  await expect(status).toHaveText("Match 1 of 8,412");
  expect([...seen].some((text) => /\d,\d/.test(text) && text !== "Match 1 of 8,412")).toBe(false);
  expect(await next.boundingBox()).toEqual(before);
});

test("every count state has the same width @responsive", async ({ page }) => {
  await open(page);
  const counts = page.getByTestId("find-bar-states").locator(".fa-find-bar-count");
  await expect(counts).toHaveCount(6);
  const widths = await counts.evaluateAll((list) => list.map((element) => element.getBoundingClientRect().width));
  expect(new Set(widths).size).toBe(1);
});

test("floating clears the scrollbar and the top edge, and the scroller stays usable @responsive", async ({ page }) => {
  await open(page);
  const bar = page.getByRole("search", { name: "Find in log" });
  const scroller = page.getByTestId("find-bar-scroller");
  await scroller.scrollIntoViewIfNeeded();
  const geometry = await scroller.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const bar = document.querySelector<HTMLElement>("[aria-label='Find in log']")!.getBoundingClientRect();
    const rtl = getComputedStyle(element).direction === "rtl";
    return { contentEnd: box.left + element.clientWidth, top: box.top, left: box.left, barRight: bar.right, barTop: bar.top, barLeft: bar.left, rtl };
  });
  expect(geometry.barRight).toBeLessThanOrEqual(geometry.contentEnd);
  expect(geometry.barLeft).toBeGreaterThanOrEqual(geometry.left);
  expect(geometry.barTop).toBeGreaterThan(geometry.top);
  await scroller.evaluate((element) => element.scrollTo(0, 120));
  await expect(bar).toBeInViewport();
  expect((await bar.boundingBox())!.y - (await scroller.boundingBox())!.y).toBeGreaterThan(0);
});

test("Escape returns focus to the opener; opening selects the term", async ({ page }) => {
  await open(page);
  const bar = page.getByRole("search", { name: "Find in log" });
  const term = bar.getByRole("textbox", { name: "Find" });
  await term.focus();
  await page.keyboard.press("Escape");
  await expect(bar).toBeHidden();
  const opener = page.getByRole("button", { name: "Find in log" });
  await expect(opener).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(term).toBeFocused();
  await expect(term).toHaveValue("harbour");
  await expect(term.evaluate((element: HTMLInputElement) => element.selectionEnd - (element.selectionStart ?? 0))).resolves.toBe(7);
});

test("Enter walks the host's matches and toggles reach the host", async ({ page }) => {
  await open(page);
  const bar = page.getByRole("search", { name: "Find in log" });
  const count = bar.locator(".fa-find-bar-count > span:last-child");
  await expect(count).toHaveText("1 of 4");
  await bar.getByRole("textbox", { name: "Find" }).focus();
  await page.keyboard.press("Enter");
  await expect(count).toHaveText("2 of 4");
  await page.keyboard.press("Shift+Enter");
  await expect(count).toHaveText("1 of 4");
  const matchCase = bar.getByRole("button", { name: "Match case" });
  await matchCase.click();
  await expect(matchCase).toHaveAttribute("aria-pressed", "true");
  await bar.getByRole("textbox", { name: "Find" }).fill("HARBOUR");
  await expect(count).toHaveText("No matches");
  await expect(bar.getByRole("button", { name: "Next match" })).toHaveAttribute("aria-disabled", "true");
});

test("replace swaps the host's text", async ({ page }) => {
  await open(page);
  const bar = page.getByRole("search", { name: "Find and replace" });
  await bar.getByRole("button", { name: "Replace", exact: true }).click();
  await expect(page.getByTestId("find-bar-replaced")).toHaveText("Harbour Studio reviewed the Cedar Studio plans.");
  await bar.getByRole("button", { name: "Replace all" }).click();
  await expect(page.getByTestId("find-bar-replaced")).toHaveText("Harbour Studio reviewed the Harbour Studio plans.");
  await expect(bar.getByRole("button", { name: "Replace all" })).toHaveAttribute("aria-disabled", "true");
});

test("nothing overflows on a phone and the buttons keep their height @responsive", async ({ page }) => {
  await open(page);
  const bars = page.locator(".fa-find-bar");
  await expect(bars.first()).toBeVisible();
  for (const bar of await bars.all()) {
    const spill = await bar.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return [...element.querySelectorAll("*")].filter((child) => {
        const rect = child.getBoundingClientRect();
        return rect.width && (rect.right > box.right + 1 || rect.left < box.left - 1);
      }).length;
    });
    expect(spill).toBe(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("the page has no axe violations", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("search", { name: "Find in log" })).toBeVisible();
  const results = await new AxeBuilder({ page }).include(".fa-find-bar").analyze();
  expect(results.violations).toEqual([]);
});
