import { expect, test, type Page } from "@playwright/test";
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

/** Blurred elements (on themselves or their ::before) that sit inside another blurred element. */
const nestedBlur = (page: Page) =>
  page.evaluate(() => {
    const blurred = (element: Element) =>
      [
        getComputedStyle(element).backdropFilter,
        getComputedStyle(element, "::before").backdropFilter,
      ].some((value) => value && value !== "none");
    const nested: string[] = [];
    for (const element of document.querySelectorAll(
      "[data-testid=network-workspace] *",
    )) {
      if (!blurred(element)) continue;
      for (
        let parent = element.parentElement;
        parent && parent !== document.body;
        parent = parent.parentElement
      )
        if (blurred(parent)) {
          nested.push(`${element.className} in ${parent.className}`);
          break;
        }
    }
    return nested;
  });

const openPalette = async (page: Page, query: string) => {
  await page.keyboard.press("ControlOrMeta+k");
  const search = page.getByRole("combobox", { name: "Search commands" });
  await expect(search).toBeFocused();
  await search.fill(query);
  return page.getByRole("dialog", { name: "Command palette" });
};

test("network workspace syncs map, table, details and shared site actions @responsive", async ({
  page,
}, testInfo) => {
  const phone = testInfo.project.name === "phone";
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
    .getByRole("button", { name: "Pause live updates", exact: true })
    .click();
  await expect(workspace.getByTestId("network-live-state")).toHaveText(
    "Paused",
  );
  // One layer of blur at a time: panes are siblings on the frame's canvas.
  expect(await nestedBlur(page)).toEqual([]);
  // The status is stated once, in the table's status bar.
  await expect(workspace.getByText("Local demo")).toHaveCount(0);

  const sites = workspace.getByRole("grid", { name: "Network sites" });
  await expect(sites).toContainText("Westhaven Office");
  await expect(workspace).toContainText("12 sites");
  const events = workspace
    .getByRole("navigation", { name: "Network navigation" })
    .getByRole("button", { name: "Events", exact: true });

  // A site opens from the table: docked details on wide frames, a sheet on phones.
  await sites.getByRole("button", { name: /Field House, Offline/ }).click();
  const details = page.getByTestId("network-detail");
  await expect(details).toContainText("0 of 8");
  await expect(details).toContainText(
    "No latency samples while the gateway is offline.",
  );
  if (phone) {
    await page.keyboard.press("Escape");
    await expect(details).toHaveCount(0);
  }

  // The palette lists sites and the selected site's actions (defined once, R1).
  let palette = await openPalette(page, "Westhaven");
  await palette.getByRole("option", { name: /Westhaven Office/ }).click();
  await expect(details).toContainText("11 of 16");
  await expect(details).toContainText("2 open alerts");
  await details
    .getByRole("button", { name: "Acknowledge", exact: true })
    .click();
  await expect(details).toContainText("Alerts acknowledged");
  await expect(details).toContainText("2 alerts acknowledged by Avery Quinn.");
  if (phone) await page.keyboard.press("Escape");
  else await expect(events).toContainText("3");
  palette = await openPalette(page, "Ping gateway");
  await palette.getByRole("option", { name: /Ping gateway/ }).click();
  await expect(page.getByText(/WHV-GW01 replied in \d+ ms/)).toBeVisible();

  if (!phone) {
    // Quick filters narrow the table and the map together.
    const show = workspace.getByRole("group", { name: "Show sites" });
    await show.getByRole("button", { name: "Offline", exact: true }).click();
    await expect(workspace).toContainText("1 site");
    await expect(
      sites.getByRole("button", { name: /Westhaven Office/ }),
    ).toHaveCount(0);
    await expect(
      workspace
        .getByRole("region", { name: "Meridian network sites" })
        .getByRole("button", { name: /Westhaven Office/ }),
    ).toHaveCount(0);
    await show.getByRole("button", { name: "All", exact: true }).click();
    await expect(workspace).toContainText("12 sites");
  }

  // The device map is a managed window with the site's topology.
  palette = await openPalette(page, "Device map");
  await palette.getByRole("option", { name: /Device map/ }).click();
  const devices = workspace.getByRole("region", {
    name: "Westhaven Office devices",
    exact: true,
  });
  await expect(
    devices.getByRole("listbox", { name: "Devices at Westhaven Office" }),
  ).toBeVisible();
  await expect(devices).toContainText("5 offline");
  expect(await nestedBlur(page)).toEqual([]);
  await devices
    .getByRole("button", {
      name: "Close Westhaven Office devices",
      exact: true,
    })
    .click();

  // Events are a separate view: grouped by recency, newest first.
  if (phone) {
    // The rail is hidden on a phone; the palette's view commands remain.
    palette = await openPalette(page, "events");
    await palette.getByRole("option", { name: /Show network events/ }).click();
  } else await events.click();
  const log = workspace.getByRole("grid", { name: "Network events" });
  await expect(
    log.getByRole("button", { name: /^Last 24 hours, 9 events/ }),
  ).toBeVisible();
  await expect(log).toContainText("Gateway stopped reporting");
  await log
    .getByRole("button", { name: /Tideline Office/ })
    .first()
    .click();
  await expect(details).toContainText("TDL-GW01");
  if (phone) await page.keyboard.press("Escape");
  await expect(sites).toBeVisible();

  const bounds = await workspace.evaluate((element) => ({
    width: element.clientWidth,
    scroll: element.scrollWidth,
    page: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
  expect(bounds.page).toBeLessThanOrEqual(bounds.viewport);
  expect(errors).toEqual([]);
});

test("network live updates change values in place without moving controls", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("./#network");
  const workspace = page.getByTestId("network-workspace");
  const details = page.getByTestId("network-detail");
  await expect(details).toContainText("Westhaven Office");
  await workspace.scrollIntoViewIfNeeded();
  const targets = [
    workspace.getByRole("button", { name: "Pause live updates", exact: true }),
    details.getByRole("button", { name: "Acknowledge", exact: true }),
    details.getByRole("button", { name: "Acknowledge alerts", exact: true }),
    workspace
      .getByRole("group", { name: "Show sites" })
      .getByRole("button", { name: "Attention", exact: true }),
    workspace.getByRole("button", {
      name: "Actions for Westhaven Office",
      exact: true,
    }),
  ];
  const boxes = () =>
    Promise.all(targets.map(async (target) => await target.boundingBox()));
  const latency = () => details.locator(".fa-metric").first().textContent();
  const before = await boxes();
  const reading = await latency();
  for (let tick = 0; tick < 3; tick++) {
    await page.clock.runFor(4100);
    await page.waitForTimeout(50);
  }
  await expect.poll(latency).not.toBe(reading);
  expect(await boxes()).toEqual(before);
  await workspace
    .getByRole("button", { name: "Pause live updates", exact: true })
    .click();
  const paused = await latency();
  await page.clock.runFor(12_000);
  expect(await latency()).toBe(paused);
});

test("network workspace keeps one blur layer and fits in compact density", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "glass-ux.appearance.v1",
      JSON.stringify({ mode: "dark", density: "compact", glass: "full" }),
    ),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./#network");
  const workspace = page.getByTestId("network-workspace");
  await expect(page.getByTestId("network-detail")).toContainText(
    "Westhaven Office",
  );
  expect(await nestedBlur(page)).toEqual([]);
  const layout = await workspace.evaluate((frame) => {
    const box = (selector: string) =>
      frame.querySelector(selector)!.getBoundingClientRect();
    const map = box(".network-map");
    const detail = box(".network-detail-panel");
    const table = box(".network-table");
    const outer = frame.getBoundingClientRect();
    return {
      side: Math.abs(map.top - detail.top) < 2 && map.right < detail.left,
      below: table.top > Math.max(map.bottom, detail.bottom),
      inside: table.bottom <= outer.bottom && detail.right <= outer.right + 1,
      clipped: [
        ...frame.querySelectorAll(
          ".network-detail-panel .fa-detail-tile, .network-detail-panel h4",
        ),
      ].filter((element) => element.scrollWidth > element.clientWidth + 1)
        .length,
    };
  });
  expect(layout).toEqual({ side: true, below: true, inside: true, clipped: 0 });
  await workspace.screenshot({
    path: "test-results/network-1440-dark-compact.png",
  });
});

test("network notes, account and profile keep focus and edits @responsive", async ({
  page,
}) => {
  await page.goto("./#network");
  const workspace = page.getByTestId("network-workspace");
  await expect(
    workspace.getByRole("region", { name: "Meridian network sites" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  const account = workspace.getByRole("button", {
    name: "Account: Avery Quinn",
    exact: true,
  });
  const notes = workspace.getByRole("region", {
    name: "Network review notes",
    exact: true,
  });
  await account.click();
  await page
    .getByRole("menuitem", { name: "Network review notes", exact: true })
    .click();
  await expect(notes).toBeVisible();
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
  // Notes kept their edit while the window was closed.
  await account.click();
  await page
    .getByRole("menuitem", { name: "Network review notes", exact: true })
    .click();
  await expect(
    notes.getByRole("textbox", { name: "Network review notes" }),
  ).toContainText("Confirm the uplink replacement.");
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
