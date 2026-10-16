import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

test("assistant keeps announcements hidden and supports context, local files and result widgets @responsive", async ({
  page,
}) => {
  const errors: string[] = [];
  const posts: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.goto("./#assistant");
  const assistant = page.getByTestId("studio-assistant");
  const composer = assistant.locator(".fa-ai-composer");
  const input = assistant.getByRole("textbox", {
    name: "Ask the studio assistant",
  });
  await expect(
    assistant.getByRole("group", { name: "Studio summary", exact: true }),
  ).toBeVisible();
  await input.fill("@Mer");
  await expect(
    page.getByRole("dialog", { name: "Mention", exact: true }),
  ).toBeVisible();
  await expect(input).toBeFocused();
  await input.press("Enter");
  await expect(
    composer.getByRole("button", {
      name: "Remove Meridian identity",
      exact: true,
    }),
  ).toBeVisible();
  await input.fill("Summarise this project");
  await input.press("Enter");
  await expect(
    assistant.getByRole("region", { name: "Meridian identity", exact: true }),
  ).toBeVisible();
  await expect(
    assistant.getByRole("region", { name: "Meridian identity", exact: true }),
  ).toContainText("72%");
  const live = assistant.locator(".fa-ai-sr");
  await expect(live).toContainText("project lead");
  const announcement = await live.boundingBox();
  expect(announcement!.width).toBeLessThanOrEqual(1);
  expect(announcement!.height).toBeLessThanOrEqual(1);
  await expect(live).toHaveCSS("clip-path", "inset(50%)");
  const inset = await composer.evaluate((element) => {
    const status = element.querySelector(".showcase-composer-status")!;
    const range = document.createRange();
    range.selectNodeContents(status);
    const text = range.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return {
      left: text.left - box.left,
      right: box.right - text.right,
      bottom: box.bottom - text.bottom,
    };
  });
  expect(inset.left).toBeGreaterThanOrEqual(16);
  expect(inset.right).toBeGreaterThanOrEqual(16);
  expect(inset.bottom).toBeGreaterThanOrEqual(10);
  const content = "Local network review\nNo server upload.\n";
  await composer.locator('input[type="file"]').setInputFiles({
    name: "site-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(content),
  });
  await expect(composer).toContainText("site-notes.txt");
  await composer
    .getByRole("button", { name: "Remove site-notes.txt", exact: true })
    .click();
  await expect(composer).not.toContainText("site-notes.txt");
  await composer.locator('input[type="file"]').setInputFiles({
    name: "site-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(content),
  });
  await input.fill("Review this attachment");
  await input.press("Enter");
  const files = assistant.getByRole("group", {
    name: "Attached files",
    exact: true,
  });
  await expect(files).toContainText("Browser memory");
  await expect(composer).not.toContainText("site-notes.txt");
  const downloadLink = files.getByRole("button", {
    name: "Download site-notes.txt",
    exact: true,
  });
  const blob = await downloadLink.getAttribute("href");
  expect(blob).toMatch(/^blob:/);
  await expect(
    assistant
      .locator('[data-role="user"]')
      .last()
      .locator('a[download="site-notes.txt"]'),
  ).toHaveAttribute("href", blob!);
  const downloaded = page.waitForEvent("download");
  await downloadLink.click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("site-notes.txt");
  expect(await readFile((await download.path())!, "utf8")).toBe(content);
  await assistant
    .getByRole("button", { name: "Reset conversation", exact: true })
    .click();
  expect(
    await page.evaluate(async (url) => {
      try {
        await fetch(url!);
        return true;
      } catch {
        return false;
      }
    }, blob),
  ).toBe(false);
  expect(posts).toEqual([]);
  expect(errors).toEqual([]);
});

test("map workspace connects search, account, windows and editable rich text @responsive", async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./#network");
  const workspace = page.getByTestId("network-workspace");
  await expect(
    workspace.getByRole("region", {
      name: "Meridian network sites",
      exact: true,
    }),
  ).toBeVisible();
  await workspace
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  const overview = workspace.getByRole("region", {
    name: "Network overview",
    exact: true,
  });
  await expect(overview).toContainText("Devices online");
  await expect(overview).toContainText("154");
  await expect(overview.getByRole("definition").first()).toBeVisible();
  await overview
    .getByRole("button", { name: "Acknowledge alerts", exact: true })
    .click();
  await expect(
    overview.getByRole("button", { name: "Alerts acknowledged", exact: true }),
  ).toBeDisabled();
  await overview
    .getByRole("button", { name: "Close Network overview", exact: true })
    .click();
  await workspace.getByRole("button", { name: "Search", exact: true }).click();
  const search = page.getByRole("dialog", {
    name: "Search network",
    exact: true,
  });
  await search
    .getByRole("searchbox", { name: "Search network sites" })
    .fill("Westhaven");
  await search.getByRole("button", { name: /Westhaven Office/ }).click();
  const site = workspace.getByRole("region", {
    name: "Westhaven Office",
    exact: true,
  });
  await expect(site).toContainText("148 ms");
  await expect(site.locator(".fa-avatar-image")).toBeVisible();
  await site
    .getByRole("button", { name: "Close Westhaven Office", exact: true })
    .click();
  await workspace.getByRole("button", { name: "Notes", exact: true }).click();
  const notes = workspace.getByRole("region", {
    name: "Network review notes",
    exact: true,
  });
  const editor = notes.getByRole("textbox", {
    name: "Network review notes",
    exact: true,
  });
  await expect(editor).toContainText("Network review");
  await expect(editor.locator("strong").first()).toContainText(
    "Meridian regional network",
  );
  await editor.press("ControlOrMeta+End");
  await editor.press("Enter");
  await editor.pressSequentially("Confirm the uplink replacement.");
  await expect(editor).toContainText("Confirm the uplink replacement.");
  await notes.getByRole("button", { name: "Markdown", exact: true }).click();
  await expect(
    notes.getByRole("textbox", { name: "Network review notes" }),
  ).toHaveValue(/Confirm the uplink replacement/);
  await notes.getByRole("button", { name: "Visual", exact: true }).click();
  await expect(
    notes.getByRole("textbox", { name: "Network review notes" }),
  ).toContainText("Confirm the uplink replacement.");
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.map(
      (item) =>
        `${item.id}: ${item.nodes.map((node) => node.target.join(" ")).join(", ")}`,
    ),
  ).toEqual([]);
  await notes
    .getByRole("button", { name: "Close Network review notes", exact: true })
    .click();
  await workspace.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(
    notes.getByRole("textbox", { name: "Network review notes" }),
  ).toContainText("Confirm the uplink replacement.");
  await notes
    .getByRole("button", { name: "Close Network review notes", exact: true })
    .click();
  const account = workspace.getByRole("button", {
    name: "Account: Avery Quinn",
    exact: true,
  });
  await account.click();
  await page.getByRole("menuitem", { name: "Profile", exact: true }).click();
  const profile = page.getByRole("dialog", {
    name: "Avery Quinn",
    exact: true,
  });
  await expect(profile).toContainText("Operations lead");
  await page.keyboard.press("Escape");
  await expect(profile).toHaveCount(0);
  await expect(account).toBeFocused();
  const bounds = await workspace.evaluate((element) => ({
    width: element.clientWidth,
    scroll: element.scrollWidth,
    page: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
  expect(bounds.page).toBeLessThanOrEqual(bounds.viewport);
  if (!isMobile) {
    await workspace
      .getByRole("navigation", { name: "Network navigation" })
      .getByRole("button", { name: "Sites", exact: true })
      .click();
    await expect(
      workspace.getByRole("list", { name: "Network sites" }),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("background styles paint differently, follow palette and mode, and survive reload @responsive", async ({
  page,
}) => {
  await page.goto("./");
  const choices = page.getByRole("group", {
    name: "Canvas background",
    exact: true,
  });
  const paints = new Set<string>();
  for (const name of ["Silk", "Mesh", "Grid", "Contours", "Facets", "Plain"]) {
    await choices.getByRole("button", { name, exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-background",
      name.toLowerCase(),
    );
    const paint = await page
      .locator("body")
      .evaluate((element) => getComputedStyle(element).backgroundImage);
    paints.add(paint);
    const islands = await page.evaluate(() =>
      ["light", "dark"].map((mode) => {
        const canvas = document.createElement("div");
        canvas.className = "canvas-background";
        canvas.dataset.mode = mode;
        document.body.append(canvas);
        const style = getComputedStyle(canvas);
        const result = {
          colour: style.backgroundColor,
          image: style.backgroundImage,
        };
        canvas.remove();
        return result;
      }),
    );
    expect(islands[0]!.colour).not.toBe(islands[1]!.colour);
    if (name !== "Plain") expect(islands[0]!.image).not.toBe(islands[1]!.image);
    await expect(
      choices.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    if (name !== "Silk")
      await expect(page.locator("body > .canvas-silk")).toBeHidden();
  }
  expect(paints.size).toBe(6);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-background",
    "plain",
  );
  await choices.getByRole("button", { name: "Mesh", exact: true }).click();
  const before = await page
    .locator("body")
    .evaluate((element) => getComputedStyle(element).backgroundImage);
  await page.evaluate(() => {
    const key = "glass-ux.appearance.v1";
    const previous = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(
      key,
      JSON.stringify({ ...previous, palette: "ruby", mode: "dark" }),
    );
  });
  await page.reload();
  await expect(page.locator("body")).not.toHaveCSS("background-image", before);
  const dark = await page
    .locator("body")
    .evaluate((element) => getComputedStyle(element).backgroundImage);
  await page.evaluate(() => {
    const key = "glass-ux.appearance.v1";
    const previous = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...previous, mode: "light" }));
  });
  await page.reload();
  await expect(page.locator("body")).not.toHaveCSS("background-image", dark);
});

test("desktop appearance toolbar aligns to the right edge", async ({
  page,
}) => {
  await page.goto("./");
  const header = page.locator(".docs-header");
  const toolbar = header.getByRole("region", {
    name: "Appearance controls",
    exact: true,
  });
  const edge = await header.boundingBox();
  const controls = await toolbar.boundingBox();
  expect(
    Math.abs(edge!.x + edge!.width - controls!.x - controls!.width),
  ).toBeLessThanOrEqual(1);
});
