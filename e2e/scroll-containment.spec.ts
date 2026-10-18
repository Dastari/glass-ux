import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * Scroll regions contain the wheel only along an axis whose content overflows. Chromium ends
 * the scroll chain at any scroll container with overscroll-behavior: contain, even one with
 * nothing to scroll, so a region whose content fits must not set it: the wheel belongs to the
 * page around it. An overflowing region still scrolls itself.
 */

const scrollTop = (locator: Locator) =>
  locator.evaluate((element) => element.scrollTop);

async function wheelOver(page: Page, target: Locator, deltaY = 200) {
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, deltaY);
}

/** The docs column, given room to scroll past the example. */
async function openPage(page: Page, path: string) {
  await page.goto(path);
  const column = page.locator(".docs-content");
  await expect(column).toBeVisible({ timeout: 30_000 });
  await column.evaluate((element) => {
    const spacer = document.createElement("div");
    spacer.style.height = "200vh";
    element.append(spacer);
  });
  return column;
}

const cases = [
  {
    name: "Panel body",
    path: "/components/panel",
    region: (page: Page) =>
      page.locator(".fa-panel[data-scroll]").filter({ hasText: "Loan requests" }),
    scroller: (region: Locator) => region.locator(".fa-panel-body"),
    edges: (region: Locator) => region.locator(".fa-panel-body"),
  },
  {
    name: "ScrollArea",
    path: "/components/scroll-area",
    region: (page: Page) =>
      page.getByRole("region", { name: "Endpoints, hairline edges" }).locator(".."),
    scroller: (region: Locator) => region.locator(".fa-scroll-viewport"),
    edges: (region: Locator) => region,
  },
];

for (const item of cases) {
  test(`an overflowing ${item.name} scrolls itself and contains the wheel`, async ({
    page,
  }) => {
    const column = await openPage(page, item.path);
    const region = item.region(page);
    const scroller = item.scroller(region);
    await scroller.scrollIntoViewIfNeeded();
    await expect(item.edges(region)).toHaveAttribute("data-scrolled-bottom", "");
    await expect(scroller).toHaveCSS("overscroll-behavior-y", "contain");
    const before = await scrollTop(column);
    await wheelOver(page, scroller, 100);
    await expect.poll(() => scrollTop(scroller)).toBeGreaterThan(50);
    expect(await scrollTop(column)).toBe(before);
  });

  test(`a ${item.name} whose content fits lets the page scroll`, async ({
    page,
  }) => {
    const column = await openPage(page, item.path);
    const region = item.region(page);
    const scroller = item.scroller(region);
    await expect(item.edges(region)).toHaveAttribute("data-scrolled-bottom", "");
    // Give the region room for all of its content.
    await region.evaluate((element) => {
      const host =
        element.classList.contains("fa-scroll") ? element.parentElement! : element;
      host.style.height = "1600px";
    });
    await expect(item.edges(region)).not.toHaveAttribute("data-scrolled-bottom");
    await expect(scroller).toHaveCSS("overscroll-behavior-y", "auto");
    await scroller.evaluate((element) => element.scrollIntoView({ block: "start" }));
    const before = await scrollTop(column);
    await page.mouse.move(0, 0);
    const box = (await scroller.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 60);
    await page.mouse.wheel(0, 200);
    await expect.poll(() => scrollTop(column)).toBeGreaterThan(before + 100);
  });
}

// Library scroll containers that publish their own edges (data-scrolled-*).
const PUBLISHING = [
  ".fa-window-body",
  ".fa-shell-drawer-body",
  ".fa-shell-inspector-body",
  ".fa-vtabs-scroll",
  ".fa-tree-scroll",
  ".fa-chart-table-scroll",
].join(", ");

test("window bodies, trees and tab lists contain the wheel exactly while they overflow", async ({
  page,
}) => {
  for (const [path, selector] of [
    ["/components/window-frame", '.fa-window-body[data-variant="scroll"]'],
    ["/components/tree", ".fa-tree-scroll"],
    ["/components/vertical-tabs", ".fa-vtabs-scroll"],
  ] as const) {
    await page.goto(path);
    await expect(page.locator(selector).first()).toBeVisible({ timeout: 30_000 });
    // useScrollEdges measures a frame after layout; then every region matches.
    await expect
      .poll(() =>
        page.locator("[data-scroll-container]").evaluateAll(
          (elements, selector) => {
            const regions = elements.filter((element) => element.matches(selector));
            const wrong = regions.filter(
              (element) =>
                element.scrollHeight > element.clientHeight + 1 !==
                (getComputedStyle(element).overscrollBehaviorY === "contain"),
            );
            return { regions: regions.length > 0, wrong: wrong.length };
          },
          PUBLISHING,
        ),
      )
      .toEqual({ regions: true, wrong: 0 });
  }
});
