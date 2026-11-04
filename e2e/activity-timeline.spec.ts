import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * ActivityFeed's timeline variant: the rail's geometry against the markers it joins, on phone
 * and desktop, left to right and right to left, under the theme's density, UI scale, radius and
 * line weight. Measured from the rendered boxes, not from the classes that ask for them.
 */
const PRESETS = [
  { name: "default", density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1, mode: "light" },
  { name: "dense large", density: "compact", uiScale: 1.25, radiusScale: 0, borderWidth: 2, mode: "dark" },
  { name: "dense small", density: "compact", uiScale: 0.875, radiusScale: 1.5, borderWidth: 0.5, glass: "solid" },
] as const;

/** A length token as the browser draws it; a border needs a style to have a width. */
const token = (page: Page, name: string, property = "height") =>
  page.evaluate(
    ([name, property]) => {
      const probe = document.createElement("div");
      probe.style.setProperty(property!, `var(${name})`);
      probe.style.borderStyle = "solid";
      document.body.append(probe);
      const value = Number.parseFloat(getComputedStyle(probe).getPropertyValue(property!));
      probe.remove();
      return value;
    },
    [name, property],
  );

interface Row {
  glyph: { top: number; bottom: number; centreX: number; centreY: number; left: number };
  line: { left: number; firstCentre: number; lines: number };
  before: { top: number; bottom: number; centreX: number; width: number } | null;
  after: { top: number; bottom: number; centreX: number; width: number } | null;
}

/** Each row of one level of a timeline: its drawn marker, its line and its two pieces of rail. */
const rows = (list: Locator) =>
  list.evaluate((ol): Row[] =>
    [...ol.querySelectorAll<HTMLElement>(":scope > li[data-marker]")].map((li) => {
      const box = li.getBoundingClientRect();
      const glyph = li.querySelector(":scope > .fa-activity-icon > *, :scope > .fa-activity-row > .fa-activity-icon > *")!.getBoundingClientRect();
      const lineElement = li.querySelector<HTMLElement>(":scope > .fa-activity-line, :scope > .fa-activity-row > .fa-activity-line")!;
      const line = lineElement.getBoundingClientRect();
      const lineHeight = Number.parseFloat(getComputedStyle(lineElement).lineHeight);
      const piece = (pseudo: "::before" | "::after") => {
        const style = getComputedStyle(li, pseudo);
        if (style.content === "none") return null;
        const width = Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.borderRightWidth);
        const top = box.top + Number.parseFloat(style.top);
        return {
          top,
          bottom: top + Number.parseFloat(style.height),
          centreX: box.left + Number.parseFloat(style.left) + width / 2,
          width,
        };
      };
      return {
        glyph: {
          top: glyph.top,
          bottom: glyph.bottom,
          left: glyph.left,
          centreX: glyph.left + glyph.width / 2,
          centreY: glyph.top + glyph.height / 2,
        },
        line: { left: line.left, firstCentre: line.top + lineHeight / 2, lines: Math.round(line.height / lineHeight) },
        before: piece("::before"),
        after: piece("::after"),
      };
    }),
  );

/**
 * The rail starts and ends at the first and last markers, joins each pair of neighbours with
 * one unbroken line that stops the same gap short of each, runs through the markers' centres and
 * is the theme's line weight; and each marker centres on its event's first line.
 */
async function expectRail(page: Page, list: Locator) {
  const gap = await token(page, "--space-1");
  const weight = await token(page, "--border-width", "border-top-width");
  const level = await rows(list);
  expect(level.length).toBeGreaterThan(1);
  expect(level[0]!.before).toBeNull();
  expect(level.at(-1)!.after).toBeNull();
  for (const row of level) {
    expect(Math.abs(row.glyph.centreY - row.line.firstCentre)).toBeLessThanOrEqual(1);
    for (const piece of [row.before, row.after]) {
      if (!piece) continue;
      expect(Math.abs(piece.centreX - row.glyph.centreX)).toBeLessThanOrEqual(1);
      expect(piece.width).toBeCloseTo(weight, 1);
    }
  }
  for (let index = 0; index < level.length - 1; index++) {
    const above = level[index]!;
    const below = level[index + 1]!;
    const after = above.after!;
    const before = below.before!;
    const start = after.bottom > after.top ? after.top : before.top;
    const end = before.bottom > before.top ? before.bottom : after.bottom;
    if (after.bottom > after.top && before.bottom > before.top) expect(Math.abs(after.bottom - before.top)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(start - (above.glyph.bottom + gap))).toBeLessThanOrEqual(1);
    expect(Math.abs(end - (below.glyph.top - gap))).toBeLessThanOrEqual(1);
  }
  return level;
}

for (const preset of PRESETS)
  for (const direction of ["ltr", "rtl"] as const)
    test.describe(`${preset.name}, ${direction}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.addInitScript((settings) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(settings)), {
          ...preset,
          motion: "reduced",
        });
      });

      test(`the rail meets every marker and ends at the first and last @responsive`, async ({ page }, info) => {
        await page.goto(`/components/activity-feed${direction === "rtl" ? "?dir=rtl&lang=ar" : ""}`);
        if (direction === "rtl") await expect(page.locator("html")).toHaveAttribute("lang", "ar");
        const ticket = page.getByRole("list", { name: "Ticket history" });
        await expect(ticket.locator(":scope > li")).toHaveCount(8);
        // The appearance applies after the first paint: wait until the rail is the theme's weight.
        const weight = await token(page, "--border-width", "border-top-width");
        await expect
          .poll(() => ticket.locator(":scope > li").nth(1).evaluate((li) => getComputedStyle(li, "::before").borderInlineStartWidth))
          .toBe(`${weight}px`);
        const level = await expectRail(page, ticket);
        // The marker column is on the reading-start side.
        for (const row of level)
          if (direction === "rtl") expect(row.glyph.left).toBeGreaterThan(row.line.left);
          else expect(row.glyph.left).toBeLessThan(row.line.left);
        if (info.project.name === "phone") expect(level.some((row) => row.line.lines > 1)).toBe(true);

        const versions = page.getByRole("listbox", { name: "Version timeline" });
        await expectRail(page, versions);
        await expectRail(page, versions.locator(".fa-activity-branch"));
        const option = (await versions.getByRole("option").first().boundingBox())!;
        expect(option.height).toBeGreaterThanOrEqual((await token(page, "--item-h")) - 0.5);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      });
    });

test("a detail card sits under its line in the content column on the theme's tile geometry @responsive", async ({ page }) => {
  await page.goto("/components/activity-feed");
  const post = page.getByRole("list", { name: "Ticket history" }).locator(":scope > li").nth(1);
  const line = (await post.locator(".fa-activity-line").boundingBox())!;
  const card = post.locator(".fa-activity-detail");
  const box = (await card.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(line.y + line.height);
  expect(Math.abs(box.x - line.x)).toBeLessThanOrEqual(0.5);
  await expect(card).toHaveCSS("border-top-left-radius", `${await token(page, "--radius-tile", "border-top-left-radius")}px`);
  await expect(card).toHaveCSS("padding-inline-start", `${await token(page, "--inset-tile", "padding-inline-start")}px`);
});

test("an arrival joins the end without moving anything above it @responsive", async ({ page }) => {
  await page.goto("/components/activity-feed");
  const ticket = page.getByRole("list", { name: "Ticket history" });
  const rowsNow = ticket.locator(":scope > li");
  await expect(rowsNow).toHaveCount(8);
  const button = page.getByRole("button", { name: "Add a monitoring event" });
  // Every line, detail and marker, and the button, measured from the list's top, so a scroll
  // the click causes does not count; the row that was last gains only its trailing space.
  const boxes = () =>
    page.getByTestId("activity-ticket").evaluate((demo) => {
      const origin = demo.querySelector("ol")!.getBoundingClientRect();
      const relative = (element: Element) => {
        const box = element.getBoundingClientRect();
        return [box.left - origin.left, box.top - origin.top, box.width, box.height].map((value) => Math.round(value * 10) / 10);
      };
      return [
        relative(demo.querySelector("button")!),
        ...[...demo.querySelectorAll("ol > li")]
          .slice(0, 8)
          .flatMap((li) => [...li.querySelectorAll(":scope > .fa-activity-icon, :scope > .fa-activity-line, :scope > .fa-activity-detail")].map(relative)),
      ];
    });
  const before = await boxes();
  await button.click();
  await expect(rowsNow).toHaveCount(9);
  expect(await boxes()).toEqual(before);
  await expect(rowsNow.last()).toContainText("online");
  await expectRail(page, ticket);
});

test("times stay readable: inline after the sentence, with the full date for assistive technology", async ({ page }) => {
  await page.goto("/components/activity-feed");
  const first = page.getByRole("list", { name: "Ticket history" }).locator(":scope > li").first();
  const line = first.locator(".fa-activity-line");
  // The middle dot is drawn and has empty alternative text: the time follows the sentence after a space.
  await expect(line).toHaveText(/^Priya Nair opened the ticket from the portal for HF-PRN-07 42 min ago$/);
  expect(await line.locator(".fa-activity-time").evaluate((element) => getComputedStyle(element, "::before").content)).toBe('"·" / ""');
  await expect(line.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}T/);
  await line.locator("time").focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
});

test("the rail and nodes keep a system colour in forced colours", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/components/activity-feed");
  const ticket = page.getByRole("list", { name: "Ticket history" });
  await expect(ticket.locator(":scope > li")).toHaveCount(8);
  const colours = await ticket.evaluate((ol) => {
    const probe = document.createElement("span");
    probe.style.color = "CanvasText";
    document.body.append(probe);
    const canvasText = getComputedStyle(probe).color;
    probe.remove();
    const row = ol.querySelectorAll("li")[1]!;
    return {
      canvasText,
      rail: getComputedStyle(row, "::after").borderInlineStartColor,
      railStyle: getComputedStyle(row, "::after").borderInlineStartStyle,
      node: getComputedStyle(ol.querySelector(".fa-activity-node")!).borderTopColor,
    };
  });
  expect(colours.railStyle).toBe("solid");
  expect(colours.rail).toBe(colours.canvasText);
  expect(colours.node).toBe(colours.canvasText);
});

test("both timelines have no axe violations, left to right and right to left", async ({ page }) => {
  for (const query of ["", "?dir=rtl&lang=ar"]) {
    await page.goto(`/components/activity-feed${query}`);
    await expect(page.getByRole("listbox", { name: "Version timeline" })).toBeVisible();
    const results = await new AxeBuilder({ page }).include("[data-testid=activity-ticket]").include("[data-testid=activity-version-timeline]").analyze();
    expect(results.violations).toEqual([]);
  }
});

test("a selectable timeline keeps one tab stop and arrow keys through its branches", async ({ page }) => {
  await page.goto("/components/activity-feed");
  const list = page.getByRole("listbox", { name: "Version timeline" });
  const options = list.getByRole("option");
  await expect(options).toHaveCount(6);
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  await options.nth(1).focus();
  await page.keyboard.press("ArrowDown");
  await expect(options.nth(2)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(options.nth(2)).toHaveAttribute("aria-selected", "true");
});
