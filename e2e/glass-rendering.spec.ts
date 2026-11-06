import { expect, test, type Page } from "@playwright/test";

/*
 * Glass rendering (configureAppearance glassRendering) and per-surface material levels.
 * "none" removes every backdrop filter for the application, gives Glass the Frosted fills and
 * promotes scrollers; a surface still follows its own level, never more transparent than the page's.
 */

const material = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((element) => {
    const before = getComputedStyle(element, "::before");
    return { blur: before.backdropFilter, fill: before.backgroundColor };
  });

async function open(page: Page, glass = "full") {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(
    (settings) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(settings)),
    { mode: "light", glass, palette: "ocean", background: "mesh", motion: "reduced" },
  );
  await page.goto("/components/surface");
  await expect(page.locator(".docs-sidebar")).toBeVisible({ timeout: 30_000 });
}

const setRendering = (page: Page, rendering: string | null) =>
  page.evaluate((value) => {
    if (value) document.documentElement.dataset.glassRendering = value;
    else delete document.documentElement.dataset.glassRendering;
  }, rendering);

/** Every element and pseudo-element on the page that filters its backdrop. */
const filtering = (page: Page) =>
  page.evaluate(() => {
    const found: string[] = [];
    for (const element of document.querySelectorAll("*")) {
      for (const pseudo of [null, "::before", "::after"]) {
        const filter = getComputedStyle(element, pseudo).backdropFilter;
        if (filter && filter !== "none") found.push(`${element.tagName}.${String(element.className).slice(0, 40)}${pseudo ?? ""}`);
      }
    }
    return found;
  });

const PANEL = ".gallery-document-sections .glass-panel";
const PANE = ".docs-sidebar > .fa-sidebar-pane";

test("no blur removes every backdrop filter, and live keeps them", async ({ page }) => {
  await open(page);
  expect((await filtering(page)).length).toBeGreaterThan(0);
  await setRendering(page, "none");
  expect(await filtering(page)).toEqual([]);
  await setRendering(page, null);
  expect((await filtering(page)).length).toBeGreaterThan(0);
});

test("no blur reaches materials opened later, over imagery and on the way out", async ({ page }) => {
  await open(page);
  await setRendering(page, "none");
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "materials";
    host.innerHTML = `
      <div class="glass-overlay"></div>
      <div class="glass-float"></div>
      <div class="glass-scrim"></div>
      <div class="glass-detached" data-ending-style></div>
      <div class="over-imagery"><span class="glass-control"></span><span class="fa-control"></span></div>`;
    document.body.append(host);
  });
  expect(await filtering(page)).toEqual([]);
});

test("Glass without blur takes the Frosted fill and keeps its rims", async ({ page }) => {
  await open(page, "reduced");
  const frosted = await material(page, PANEL);
  expect(frosted.blur).toContain("blur(10px)");
  await page.evaluate(() => {
    document.documentElement.dataset.glass = "full";
  });
  const glass = await material(page, PANEL);
  expect(glass.blur).toContain("blur(22px)");
  expect(glass.fill).not.toBe(frosted.fill);
  await setRendering(page, "none");
  const none = await material(page, PANEL);
  expect(none).toEqual({ blur: "none", fill: frosted.fill });
  const rims = await page.locator(PANEL).first().evaluate((element) => getComputedStyle(element, "::before").boxShadow);
  expect(rims).toContain("inset");
});

test("a Solid surface and a Solid page stay opaque without blur", async ({ page }) => {
  await open(page);
  await setRendering(page, "none");
  const panel = page.locator(PANEL).first();
  await panel.evaluate((element) => {
    element.dataset.glass = "solid";
  });
  const surface = await material(page, PANEL);
  expect(surface.blur).toBe("none");
  const alpha = (colour: string) => {
    const slash = /\/\s*([\d.]+)\s*\)/.exec(colour);
    return slash ? Number(slash[1]) : 1;
  };
  expect(alpha(surface.fill)).toBe(1);
  await panel.evaluate((element) => {
    delete element.dataset.glass;
    document.documentElement.dataset.glass = "solid";
  });
  expect(alpha((await material(page, PANEL)).fill)).toBe(1);
});

test("a scroller is promoted without blur and left alone with it", async ({ page }) => {
  await open(page);
  const scroller = page.locator("[data-scroll-container]").first();
  const willChange = () => scroller.evaluate((element) => getComputedStyle(element).willChange);
  expect(await willChange()).toBe("auto");
  await setRendering(page, "none");
  expect(await willChange()).toBe("scroll-position");
  const body = await page.evaluate(() => {
    const panel = document.createElement("section");
    panel.className = "glass-panel fa-panel";
    panel.dataset.scroll = "";
    panel.innerHTML = '<div class="fa-panel-body"></div>';
    document.body.append(panel);
    return getComputedStyle(panel.firstElementChild!).willChange;
  });
  expect(body).toBe("scroll-position");
});

test("a surface takes its own level, never more transparent than the page's", async ({ page }) => {
  await open(page);
  const panel = page.locator(PANEL).first();
  await panel.evaluate((element) => {
    element.dataset.glass = "reduced";
  });
  expect((await material(page, PANEL)).blur).toContain("blur(10px)");
  await panel.evaluate((element) => {
    element.dataset.glass = "solid";
  });
  expect((await material(page, PANEL)).blur).toBe("none");
  // On a Frosted page a Glass surface stays Frosted.
  await panel.evaluate((element) => {
    element.dataset.glass = "full";
    document.documentElement.dataset.glass = "reduced";
  });
  expect((await material(page, PANEL)).blur).toContain("blur(10px)");
});

test("the documentation toolbar switches blur and remembers it", async ({ page }) => {
  await open(page);
  await page.locator('.docs-header [aria-label="Blur"]').getByText("None").first().click();
  await expect(page.locator("html")).toHaveAttribute("data-glass-rendering", "none");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-glass-rendering", "none");
  expect((await material(page, PANE)).blur).toBe("none");
  await page.locator('.docs-header [aria-label="Blur"]').getByText("Live").first().click();
  await expect(page.locator("html")).not.toHaveAttribute("data-glass-rendering", /./);
  expect((await material(page, PANE)).blur).toContain("blur(");
});
