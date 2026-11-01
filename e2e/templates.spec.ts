import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { templates } from "../src/gallery/template-catalogue.js";

/** What a view starts with: the first thing on screen must be its content. */
const PRIMARY: Record<string, string> = {
  overview: ".glass-card",
  settings: ".fa-panel",
  records: ".fa-panel",
  inbox: ".fa-panel",
  files: ".fa-panel",
};

const ids = templates.map((template) => template.id);
const settle = (page: Page) => expect(page.locator("html[data-hydrated]")).toBeAttached();

async function openPreview(page: Page, id: string, query = "") {
  await page.goto(`/templates/${id}/preview${query}`);
  await settle(page);
  await expect(page.locator(".fa-shell-slot-work .fa-panel, .fa-shell-slot-work .glass-card").first()).toBeVisible();
}

/** Nothing reaches past the viewport, and no scroller hides its width. */
async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const { clientWidth, clientHeight, scrollWidth, scrollHeight } = document.documentElement;
    const beyond = [...document.querySelectorAll<HTMLElement>(".fa-shell-slot-work *")]
      .filter((element) => {
        if (!element.getClientRects().length) return false;
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        // Tab strips keep an invisible copy to measure which tabs fit.
        if (box.width === 0 || style.position === "fixed" || style.visibility === "hidden") return false;
        // Visually hidden text is a pixel square by design.
        if (box.width <= 1) return false;
        return box.right > clientWidth + 1 || box.left < -1;
      })
      .filter((element) => !element.closest("[data-table-scroll], .fa-table-scroll, [role='grid']"))
      .slice(0, 5)
      .map((element) => element.className || element.tagName);
    return { document: scrollWidth - clientWidth, documentY: scrollHeight - clientHeight, beyond };
  });
  expect(overflow).toEqual({ document: 0, documentY: 0, beyond: [] });
}

for (const id of ids) {
  test(`${id}: the first screen is the content, with no repeated title @responsive`, async ({ page }) => {
    await openPreview(page, id);
    await expectNoOverflow(page);
    // The breadcrumb names the route; the view adds no heading that repeats it (R6.5).
    const current = await page.locator(".fa-shell-slot-top [aria-current='page']").first().innerText();
    await expect(page.locator(".fa-shell-slot-work").getByRole("heading", { name: current, exact: true })).toHaveCount(0);
    await expect(page.locator(".fa-shell-slot-work h1")).toHaveCount(0);
    // Primary content starts in the top quarter of the screen on a desktop and a phone (R21.3).
    const viewport = page.viewportSize()!;
    const top = await page.locator(PRIMARY[id]!).first().evaluate((element) => element.getBoundingClientRect().top);
    expect(top).toBeLessThan(viewport.height * 0.25);
  });

  test(`${id}: axe finds no violations @responsive`, async ({ page }) => {
    await openPreview(page, id);
    const results = await new AxeBuilder({ page }).include(".fa-shell").analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.html}`)).toEqual([]);
  });

  test(`${id}: reads right to left @responsive`, async ({ page }) => {
    await openPreview(page, id, "?dir=rtl&lang=ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expectNoOverflow(page);
    const results = await new AxeBuilder({ page }).include(".fa-shell-slot-work").analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.html}`)).toEqual([]);
  });

  test(`${id}: its catalogue page shows the live screen and public source @responsive`, async ({ page }) => {
    await page.goto(`/templates/${id}`);
    await settle(page);
    const stage = page.locator(`.gallery-template-stage[data-template='${id}']`);
    await expect(stage.locator(".fa-surface").first()).toBeVisible();
    const source = page.locator(".gallery-usage-example").first();
    await expect(source.getByRole("heading", { name: "Source" })).toBeVisible();
    await expect(source).toContainText("glass-ux/");
    await expect(source).not.toContainText("gallery");
    const results = await new AxeBuilder({ page }).include(".gallery-template-document").analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.html}`)).toEqual([]);
    // The frame scrolls inside itself: the page never gains width from the screen.
    const widths = await page.evaluate(() => {
      const { scrollWidth, clientWidth } = document.querySelector<HTMLElement>("[data-scroll-container]")!;
      return { scrollWidth, clientWidth };
    });
    expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth);
  });

  for (const appearance of [
    { density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1 },
    { density: "compact", uiScale: 1.125, radiusScale: 1.5, borderWidth: 1.5 },
    { density: "compact", uiScale: 0.875, radiusScale: 0, borderWidth: 2 },
  ]) {
    test(`${id}: geometry follows the theme at ${appearance.density}, ${appearance.uiScale}, ${appearance.radiusScale}, ${appearance.borderWidth} @responsive`, async ({ page }) => {
      await page.addInitScript((settings) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(settings)), appearance);
      await openPreview(page, id);
      await expectNoOverflow(page);
      const geometry = await page.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.cssText = "position:absolute;visibility:hidden;padding:var(--inset-panel);border-radius:var(--radius-surface);border:var(--border-width) solid transparent";
        document.body.append(probe);
        const expected = getComputedStyle(probe);
        const panel = { padding: expected.paddingLeft, radius: expected.borderTopLeftRadius };
        probe.style.borderRadius = "var(--radius-tile)";
        probe.style.padding = "var(--inset-tile)";
        const tile = { padding: expected.paddingLeft, radius: expected.borderTopLeftRadius };
        const measured = (selector: string, part: string) =>
          [...document.querySelectorAll<HTMLElement>(`.fa-shell-slot-work ${selector}`)]
            .filter((element) => element.getClientRects().length)
            .map((element) => ({
              radius: getComputedStyle(element).borderTopLeftRadius,
              padding: getComputedStyle(element.querySelector<HTMLElement>(part) ?? element).paddingLeft,
            }));
        return { panel, tile, panels: measured(".fa-panel", ".fa-panel-body"), cards: measured(".glass-card.fa-surface", ":scope") };
      });
      for (const panel of geometry.panels) expect(panel.radius).toBe(geometry.panel.radius);
      if (id !== "files") for (const panel of geometry.panels) expect(panel.padding).toBe(geometry.panel.padding);
      for (const card of geometry.cards) expect(card).toEqual(geometry.tile);
    });
  }

  test(`${id}: scrolls inside its own region and reaches the end above the tab bar @responsive`, async ({ page }) => {
    await page.setViewportSize({ width: page.viewportSize()!.width, height: 460 });
    await openPreview(page, id);
    const scrollers = await page.locator(".fa-shell-slot-work").evaluate((work) => {
      const clipped = [...work.querySelectorAll<HTMLElement>("*")].filter((element) => {
        const { overflowY } = getComputedStyle(element);
        return /auto|scroll/.test(overflowY) && element.scrollHeight > element.clientHeight + 1 && element.getClientRects().length;
      });
      return clipped.map((element) => {
        element.scrollTop = element.scrollHeight;
        const tabBar = document.querySelector(".fa-shell-slot-tabbar")?.getBoundingClientRect().top ?? innerHeight;
        const box = element.getBoundingClientRect();
        return {
          keyboard: element.tabIndex >= 0 || Boolean(element.querySelector("a, button, input, [tabindex='0']")),
          bottom: box.bottom,
          limit: Math.max(tabBar, innerHeight),
          rest: element.scrollHeight - element.clientHeight - element.scrollTop,
        };
      });
    });
    for (const scroller of scrollers) {
      expect(scroller.keyboard).toBe(true);
      expect(scroller.rest).toBeLessThanOrEqual(1);
      expect(scroller.bottom).toBeLessThanOrEqual(scroller.limit + 1);
    }
    await expect(page.locator("html")).toHaveJSProperty("scrollTop", 0);
  });
}

test("the overview's period swaps figures in place without moving a control @responsive", async ({ page }) => {
  await openPreview(page, "overview");
  const period = page.getByRole("radio", { name: "This quarter" }).or(page.getByRole("button", { name: "This quarter" }));
  const before = await period.boundingBox();
  const tile = await page.locator(".glass-card").first().boundingBox();
  await period.click();
  await expect(page.locator(".glass-card").first()).toContainText("26");
  expect(await period.boundingBox()).toEqual(before);
  expect(await page.locator(".glass-card").first().boundingBox()).toEqual(tile);
});

test("every overview figure keeps its label, in the shell and in the catalogue frame @responsive", async ({ page }) => {
  await openPreview(page, "overview");
  const labels = page.locator(".fa-shell-slot-work .fa-metric-label");
  await expect(labels).toHaveCount(4);
  for (const label of await labels.all()) await expect(label).toBeVisible();
  await page.goto("/templates/overview");
  await settle(page);
  const framed = page.locator(".gallery-template-stage .fa-metric-label");
  await expect(framed).toHaveCount(4);
  for (const label of await framed.all()) await expect(label).toBeVisible();
});

test("inbox filters fold to a menu instead of clipping, in both directions @responsive", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "the narrow layout");
  for (const query of ["", "?dir=rtl&lang=ar"]) {
    await openPreview(page, "inbox", query);
    const filters = page.locator(".fa-notification-toolbar .fa-segmented");
    await expect(filters).toHaveAttribute("data-form", "menu");
    const { scrollWidth, clientWidth } = await filters.evaluate((element) => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  }
});

test("settings: a section opens in place, and Save enables only after a change @responsive", async ({ page }) => {
  await openPreview(page, "settings");
  const save = page.getByRole("button", { name: "Save changes" });
  await expect(save).toBeDisabled();
  await page.getByLabel("Name").fill("Avery Q. Quinn");
  await expect(save).toBeEnabled();
  await save.click();
  await expect(save).toBeDisabled();
  const notifications = page.getByRole("tab", { name: "Notifications" });
  await notifications.click();
  await expect(page.getByRole("switch", { name: "Mentions" })).toBeChecked();
});

test("settings: density from the Appearance section restyles the page", async ({ page }) => {
  await openPreview(page, "settings");
  await page.getByRole("tab", { name: "Appearance" }).click();
  await page.getByRole("radio", { name: "Compact" }).or(page.getByRole("button", { name: "Compact" })).click();
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
});

test("list and detail: the pane opens beside the table, which stays put", async ({ page }) => {
  await openPreview(page, "records");
  const table = page.getByRole("region", { name: "Projects" }).or(page.locator("section[aria-label='Projects']")).first();
  const before = await table.boundingBox();
  await page.getByText("Harbour Library").first().click();
  const pane = page.locator("section[aria-label='Project details']");
  await expect(pane.getByRole("heading", { name: "Harbour Library" })).toBeVisible();
  await expect(pane).toBeFocused();
  expect(await table.boundingBox()).toEqual(before);
  await expect(pane.getByRole("button", { name: "All projects" })).toBeHidden();
});

test("list and detail: on a phone the pane replaces the table and comes back @responsive", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "the narrow layout");
  await openPreview(page, "records");
  await page.getByText("Harbour Library").first().click();
  const pane = page.locator("section[aria-label='Project details']");
  await expect(pane.getByRole("heading", { name: "Harbour Library" })).toBeVisible();
  await expect(page.locator("section[aria-label='Projects']")).toBeHidden();
  await pane.getByRole("button", { name: "All projects" }).click();
  await expect(page.locator("section[aria-label='Projects']")).toBeVisible();
  await expect(pane).toBeHidden();
});

test("inbox: opening a message marks it read; a phone goes back to the list @responsive", async ({ page }, info) => {
  await openPreview(page, "inbox");
  const pane = page.locator("section[aria-label='Message']");
  await page.getByText("Budget review requested").click();
  await expect(pane.getByRole("heading", { name: "Budget review requested" })).toBeVisible();
  await expect(pane).toContainText("Orchard House is 8% over plan");
  if (info.project.name === "phone") {
    await pane.getByRole("button", { name: "Inbox" }).click();
    await expect(page.getByText("Budget review requested")).toBeVisible();
  } else await expect(pane.getByRole("button", { name: "Inbox" })).toBeHidden();
});

test("file manager: the tree, table and path stay on one folder", async ({ page }) => {
  await openPreview(page, "files");
  await expect(page.getByRole("grid", { name: "Folder contents" }).or(page.getByRole("table", { name: "Folder contents" }))).toContainText("brief.pdf");
  await page.getByRole("treeitem", { name: /Templates/ }).click();
  await expect(page.locator("nav[aria-label='Folder path']")).toContainText("Templates");
  await expect(page.getByText("drawing-sheet.dwg")).toBeVisible();
  await expect(page.getByText("brief.pdf")).toBeHidden();
});

test("file manager: a file deletes after confirming, and upload adds a row", async ({ page }) => {
  await openPreview(page, "files");
  await page.getByText("brief.pdf").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Delete brief.pdf?");
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("brief.pdf")).toBeHidden();
  await page.setInputFiles("input[type='file']", { name: "fictional-notes.txt", mimeType: "text/plain", buffer: Buffer.from("notes") });
  await expect(page.getByText("fictional-notes.txt")).toBeVisible();
});

test("templates are in the directory and static routes", async ({ page }) => {
  await page.goto("/");
  await settle(page);
  for (const template of templates) await expect(page.getByRole("link", { name: template.title })).toBeAttached();
  const site = readFileSync("scripts/docs-site.mjs", "utf8");
  expect(site).toContain("templates/${id}/preview");
});

test.describe("theme export", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.removeItem("glass-ux.appearance.v1");
        sessionStorage.setItem("seeded", "1");
      }
    });
    await page.goto("/foundations/theme-export");
    await settle(page);
    await expect(page.locator("[data-theme-file='theme.ts']")).toBeVisible();
  });

  const update = (page: Page, patch: Record<string, unknown>) =>
    page.evaluate((patch) => {
      const raw = JSON.parse(localStorage.getItem("glass-ux.appearance.v1") ?? "{}");
      const key = "glass-ux.appearance.v1";
      const value = JSON.stringify({ ...raw, ...patch });
      localStorage.setItem(key, value);
      window.dispatchEvent(new StorageEvent("storage", { key, newValue: value }));
    }, patch);

  const applied = (page: Page) =>
    page.evaluate(() => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      return {
        mode: root.dataset.mode,
        palette: root.dataset.palette,
        density: root.dataset.density,
        glass: root.dataset.glass,
        background: root.dataset.background,
        radius: style.getPropertyValue("--radius-scale").trim(),
        line: style.getPropertyValue("--border-width").trim(),
        scale: style.getPropertyValue("--ui-scale").trim(),
        accent: style.getPropertyValue("--accent-h").trim(),
        tint: style.getPropertyValue("--neutral-h").trim(),
      };
    });

  test("the export follows the appearance, and restoring it brings every knob back @responsive", async ({ page }) => {
    await update(page, { mode: "dark", palette: "ruby", accentColor: "#0b6e4f", canvasTint: "#334455", glass: "reduced", density: "compact", uiScale: 1.125, radiusScale: 0.5, borderWidth: 1.5, background: "contours" });
    const file = page.locator("[data-theme-file='theme.ts']");
    await expect(file).toContainText('"accentColor": "#0b6e4f"');
    await expect(file).toContainText('"density": "compact"');
    await expect(page.locator("[data-theme-file='theme.css']")).toContainText("--radius-scale: 0.5;");
    const expected = await applied(page);
    const text = await file.locator("code").first().innerText();
    await page.getByRole("button", { name: "Reset to defaults" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-density", "comfortable");
    await page.getByTestId("theme-import-text").fill(text);
    await page.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByTestId("theme-import-status")).toContainText("Theme restored.");
    expect(await applied(page)).toEqual(expected);
  });

  test("bad input is refused and changes nothing, without moving the page below", async ({ page }) => {
    const before = await applied(page);
    const box = page.getByTestId("theme-import-status");
    const height = (await box.boundingBox())!.height;
    await page.getByTestId("theme-import-text").fill('{"defaults":{"palette":"nope","uiScale":40}}');
    await page.getByRole("button", { name: "Restore" }).click();
    await expect(box).toContainText("palette has a value");
    await expect(box).toContainText("uiScale has a value");
    expect(await applied(page)).toEqual(before);
    expect((await box.boundingBox())!.height).toBe(height);
    await page.getByTestId("theme-import-text").fill("not a theme");
    await page.getByRole("button", { name: "Restore" }).click();
    await expect(box).toContainText("This is not a theme");
    await page.getByTestId("theme-import-text").fill('{"defaults":{"backgroundImage":"https://example.test/x.png"}}');
    await page.getByRole("button", { name: "Restore" }).click();
    await expect(box).toContainText("loads from another site");
  });

  test("a theme with an embedded picture stays copyable, and a session picture is named as left out", async ({ page }) => {
    const embedded = `data:image/webp;base64,${"A".repeat(30_000)}`;
    await update(page, { background: "image", backgroundImage: embedded });
    const file = page.locator("[data-theme-file='theme.ts']");
    await expect(file).toContainText("too long to show");
    await expect(file.getByRole("button", { name: "Copy theme.ts" })).toBeVisible();
    await expect(file.locator("code")).toHaveCount(0);
    await expect(page.locator("[data-theme-file='theme.css']")).not.toContainText("base64");
    await update(page, { backgroundImage: "blob:http://127.0.0.1/picture" });
    await expect(page.getByText("exists only in this browser")).toBeVisible();
    await expect(page.locator("[data-theme-file='theme.ts']")).not.toContainText("blob:");
  });

  test("both files download, and the page has no axe violations", async ({ page }) => {
    const ts = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download theme.ts" }).click();
    expect((await ts).suggestedFilename()).toBe("theme.ts");
    const css = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download theme.css" }).click();
    expect((await css).suggestedFilename()).toBe("theme.css");
    const results = await new AxeBuilder({ page }).include(".gallery-foundation-document").analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.html}`)).toEqual([]);
  });
});
