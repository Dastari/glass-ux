import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * R8.5: a count goes in the component's `count` prop and is drawn in the form that suits
 * where it sits. These check what jsdom cannot: the real accessible names (the browser puts a
 * space between the label and the badge), where the count lands, and Label in Name.
 */

async function open(page: Page, path: string) {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", density: "comfortable", motion: "still" })),
  );
  await page.goto(`./components/${path}`);
}

const specimen = (page: Page, title: string) => page.locator(`section[aria-label$="${title}"]`).first();

async function rect(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

async function noViolations(page: Page, selector: string) {
  const result = await new AxeBuilder({ page })
    .include(selector)
    // Off by default in axe 4.13 (#31); the visible count must be in the name.
    .options({ rules: { "label-content-name-mismatch": { enabled: true } } })
    .analyze();
  expect(result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
}

test("Segmented draws each count after its label, on the icon's corner, and in the menu", async ({ page }) => {
  await open(page, "segmented");
  const counts = specimen(page, "Counts");
  await counts.scrollIntoViewIfNeeded();

  const text = counts.getByRole("group", { name: "Queue", exact: true });
  const open12 = text.getByRole("button", { name: "Open 12", exact: true });
  await expect(open12).toBeVisible();
  await expect(text.getByRole("button", { name: "Closed 999+", exact: true })).toBeVisible();
  // The badge follows the label inside the segment, centred on the same line.
  const label = await rect(open12.locator(".fa-segmented-label"));
  const badge = await rect(open12.locator(".fa-count"));
  const segment = await rect(open12);
  expect(badge.x).toBeGreaterThan(label.x + label.width - 1);
  expect(badge.x + badge.width).toBeLessThanOrEqual(segment.x + segment.width + 0.5);
  expect(Math.abs(badge.y + badge.height / 2 - (label.y + label.height / 2))).toBeLessThan(1.5);
  // The chosen segment's badge takes the pill's tint, not the neutral fill.
  const fills = await text.locator(".fa-count").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor));
  expect(fills[0]).not.toBe(fills[1]);

  // Icons only: the overlay sits inside its segment and the track, so nothing clips it.
  const icons = counts.getByRole("group", { name: "Queue (icons)", exact: true });
  const iconOpen = icons.getByRole("button", { name: "Open 12", exact: true });
  await expect(iconOpen).toHaveAttribute("title", "Open 12");
  const overlay = await rect(iconOpen.locator(".fa-count[data-overlay]"));
  const iconSegment = await rect(iconOpen);
  const track = await rect(icons);
  expect(overlay.x + overlay.width).toBeLessThanOrEqual(iconSegment.x + iconSegment.width + 0.5);
  expect(overlay.y).toBeGreaterThanOrEqual(track.y);

  // Menu: the button names the group, the choice and its count; rows end in exact counts
  // that line up whichever row is chosen.
  const trigger = counts.getByRole("button", { name: "Queue (menu): Open 12", exact: true });
  await trigger.click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitemradio", { name: "Closed 1,204", exact: true })).toBeVisible();
  const ends = await menu.locator(".fa-segmented-menu-count").evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().right)));
  expect(new Set(ends).size).toBe(1);
  await page.keyboard.press("Escape");

  await noViolations(page, `section[aria-label$="Counts"]`);
});

test("Menu rows end in a count before the shortcut and chevron", async ({ page }) => {
  await open(page, "menu");
  const counts = specimen(page, "Counts");
  await counts.scrollIntoViewIfNeeded();
  const row = counts.locator(".fa-menu-item", { hasText: "Assigned to me" });
  const count = await rect(row.locator(".fa-menu-count"));
  const shortcut = await rect(row.locator(".fa-kbd, kbd").first());
  expect(count.x + count.width).toBeLessThan(shortcut.x);
  await expect(counts.locator(".fa-menu-item", { hasText: "Information" }).locator(".fa-menu-count")).toHaveText("1,204");
  // Counts of rows without a shortcut end at the row's trailing edge, together.
  const ends = await counts
    .locator(".fa-menu-item:not(:has(.fa-menu-chevron)):not(:has(kbd, .fa-kbd)) .fa-menu-count")
    .evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().right)));
  expect(ends.length).toBe(3);
  expect(new Set(ends).size).toBe(1);
});

test("Select and Combobox options read their counts with the label", async ({ page }) => {
  await open(page, "select");
  const options = specimen(page, "Options");
  await options.scrollIntoViewIfNeeded();
  await options.getByRole("combobox", { name: "Agent group" }).click();
  await expect(page.getByRole("option", { name: "Workstations 184", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  await open(page, "combobox");
  const combobox = page.getByRole("combobox", { name: "Patch ring" });
  await combobox.scrollIntoViewIfNeeded();
  await combobox.click();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Broad 318", exact: true })).toBeVisible();
});

test("Accordion heads put the count badge right after the title", async ({ page }) => {
  await open(page, "accordion");
  const trigger = page.getByRole("button", { name: "Network adapters 2", exact: true });
  await trigger.scrollIntoViewIfNeeded();
  const title = await rect(trigger.locator(".fa-accordion-title"));
  const badge = await rect(trigger.locator(".fa-accordion-count"));
  expect(badge.x - (title.x + title.width)).toBeGreaterThanOrEqual(0);
  expect(badge.x - (title.x + title.width)).toBeLessThan(16);
  await noViolations(page, `section[aria-label$="Accordion"]`);
});

test("@responsive Kanban's column switcher shows counts as badges, not label text", async ({ page }) => {
  await open(page, "kanban");
  const board = page.getByRole("region", { name: "Narrow board", exact: true });
  await board.scrollIntoViewIfNeeded();
  const switcher = board.locator(".fa-kanban-switch");
  await expect(switcher.locator(".fa-count").first()).toBeVisible();
  await expect(switcher.locator(".fa-segmented-label").first()).not.toContainText(/\d/);
});
