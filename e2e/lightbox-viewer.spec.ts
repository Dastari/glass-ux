import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * The full viewer through its catalogue page: gestures on the camera, the view tools, full
 * screen, the slideshow, loading and failure, and actual geometry under every preference.
 * Scene images are data URIs, so the failing and slow cases route a URL of their own.
 */

const prefs = (page: Page, more: object = {}) =>
  page.addInitScript((extra) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced", ...extra })), more);

async function openDialog(page: Page) {
  await page.getByRole("button", { name: /^Open Sample landscape/ }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".fa-lightbox-stage")).toBeVisible();
  await expect(dialog.locator(".fa-lightbox-picture")).toHaveAttribute("data-state", "loaded");
  // Boxes are measured once the popup has finished materialising from its entry scale.
  await expect(dialog).not.toHaveAttribute("data-starting-style", "");
  await expect.poll(() => dialog.evaluate((popup) => getComputedStyle(popup).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  return dialog;
}

const camera = (dialog: Locator) =>
  dialog.locator(".fa-lightbox-plane").evaluate((plane: HTMLElement) => {
    const match = /translate3d\(([-\d.]+)px, ([-\d.]+)px, 0px\) scale\(([\d.]+)\)/.exec(plane.style.transform)!;
    return { x: Number(match[1]), y: Number(match[2]), k: Number(match[3]) };
  });

const box = async (locator: Locator) => (await locator.boundingBox())!;

test.describe("gestures", () => {
  test.beforeEach(async ({ page }) => {
    await prefs(page);
    await page.goto("./components/lightbox");
  });

  test("the wheel zooms about the pointer and the point under it stays put", async ({ page }) => {
    const dialog = await openDialog(page);
    const stage = await box(dialog.locator(".fa-lightbox-stage"));
    const fitted = await camera(dialog);
    const pointer = { x: stage.x + stage.width * 0.7, y: stage.y + stage.height * 0.4 };
    await page.mouse.move(pointer.x, pointer.y);
    await page.mouse.wheel(0, -600);
    await expect.poll(async () => (await camera(dialog)).k).toBeGreaterThan(fitted.k * 1.5);
    const zoomed = await camera(dialog);
    const local = { x: pointer.x - stage.x, y: pointer.y - stage.y };
    const ratio = zoomed.k / fitted.k;
    // Where the point was in the picture is where it still is, unless the edge held the picture in.
    // Pointer events carry whole pixels, which the ratio multiplies.
    expect(Math.abs(zoomed.x - Math.min(0, local.x - (local.x - fitted.x) * ratio))).toBeLessThan(4);
    await expect(dialog.locator(".fa-lightbox-zoom")).toHaveText(/^\d+%$/);
    await expect(dialog.locator(".fa-lightbox-stage")).toHaveAttribute("data-zoomed", "");
  });

  test("the wheel never passes maxZoom and never goes below fit", async ({ page }) => {
    const dialog = await openDialog(page);
    const stage = await box(dialog.locator(".fa-lightbox-stage"));
    const fitted = await camera(dialog);
    await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
    for (let turn = 0; turn < 8; turn += 1) await page.mouse.wheel(0, -2000);
    await expect.poll(async () => (await camera(dialog)).k).toBe(4);
    await expect(dialog.getByRole("button", { name: "Zoom in" })).toHaveAttribute("aria-disabled", "true");
    for (let turn = 0; turn < 8; turn += 1) await page.mouse.wheel(0, 2000);
    await expect.poll(async () => (await camera(dialog)).k).toBeCloseTo(fitted.k, 5);
    await expect(dialog.locator(".fa-lightbox-zoom")).toHaveText("Fit");
  });

  test("a drag pans a zoomed picture with one commit and stays inside the stage", async ({ page }) => {
    const dialog = await openDialog(page);
    // 150%, then the stop at actual size, then 200%.
    await page.keyboard.press("+");
    await page.keyboard.press("+");
    await expect(dialog.locator(".fa-lightbox-zoom")).toHaveText("1:1");
    await page.keyboard.press("+");
    await expect(dialog.locator(".fa-lightbox-zoom")).toHaveText("200%");
    await dialog.locator(".fa-lightbox-zoom").evaluate((readout) => {
      const window_ = window as unknown as { commits: number };
      window_.commits = 0;
      new MutationObserver(() => (window_.commits += 1)).observe(readout, { characterData: true, childList: true, subtree: true });
    });
    const stage = await box(dialog.locator(".fa-lightbox-stage"));
    const before = await camera(dialog);
    await page.mouse.move(stage.x + 400, stage.y + 200);
    await page.mouse.down();
    await page.mouse.move(stage.x + 300, stage.y + 170, { steps: 8 });
    await expect.poll(async () => (await camera(dialog)).x).toBeCloseTo(before.x - 100, 0);
    await page.mouse.up();
    // Moving changes no text: the scale did not change, so React had nothing to commit.
    expect(await page.evaluate(() => (window as unknown as { commits: number }).commits)).toBe(0);
    // Far past the edge, several times over: the picture stops at its corner.
    for (let drag = 0; drag < 3; drag += 1) {
      await page.mouse.move(stage.x + 20, stage.y + 20);
      await page.mouse.down();
      await page.mouse.move(stage.x + stage.width - 20, stage.y + stage.height - 20, { steps: 4 });
      await page.mouse.up();
    }
    await expect.poll(async () => (await camera(dialog)).x).toBe(0);
    expect((await camera(dialog)).y).toBe(0);
  });

  test("a double press toggles fit and actual size at the point pressed", async ({ page }) => {
    const dialog = await openDialog(page);
    const stage = await box(dialog.locator(".fa-lightbox-stage"));
    await page.mouse.dblclick(stage.x + stage.width / 2, stage.y + stage.height / 2);
    await expect(dialog.locator(".fa-lightbox-zoom")).toHaveText("1:1");
    expect((await camera(dialog)).k).toBe(1);
    await page.mouse.dblclick(stage.x + stage.width / 2, stage.y + stage.height / 2);
    await expect(dialog.locator(".fa-lightbox-zoom")).toHaveText("Fit");
  });

  test("a fitted drag swipes to the next picture, a zoomed one does not", async ({ page }) => {
    const dialog = await openDialog(page);
    const stage = dialog.locator(".fa-lightbox-stage");
    const first = await stage.getAttribute("aria-label");
    const rect = await box(stage);
    await page.mouse.move(rect.x + 500, rect.y + 200);
    await page.mouse.down();
    await page.mouse.move(rect.x + 300, rect.y + 200, { steps: 4 });
    await page.mouse.up();
    await expect(stage).not.toHaveAttribute("aria-label", first!);
    const second = await stage.getAttribute("aria-label");
    await page.keyboard.press("+");
    await page.mouse.move(rect.x + 500, rect.y + 200);
    await page.mouse.down();
    await page.mouse.move(rect.x + 300, rect.y + 200, { steps: 4 });
    await page.mouse.up();
    await expect(stage).toHaveAttribute("aria-label", second!);
  });

  test("a pinch zooms about the fingers @responsive", async ({ page }) => {
    const dialog = await openDialog(page);
    const stage = dialog.locator(".fa-lightbox-stage");
    const rect = await box(stage);
    const fitted = await camera(dialog);
    await stage.evaluate((element, rectangle) => {
      const event = (type: string, pointerId: number, x: number, y: number) =>
        element.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerType: "touch", isPrimary: pointerId === 1, button: 0, pointerId, clientX: rectangle.x + x, clientY: rectangle.y + y }));
      element.setPointerCapture = () => {};
      element.hasPointerCapture = () => true;
      const mid = rectangle.height / 2;
      event("pointerdown", 1, 140, mid);
      event("pointerdown", 2, 200, mid);
      for (let step = 1; step <= 6; step += 1) {
        event("pointermove", 1, 140 - step * 12, mid);
        event("pointermove", 2, 200 + step * 12, mid);
      }
      event("pointerup", 1, 68, mid);
      event("pointerup", 2, 272, mid);
    }, rect);
    await expect.poll(async () => (await camera(dialog)).k).toBeGreaterThan(fitted.k * 2);
    await expect(stage).toHaveAttribute("data-zoomed", "");
  });
});

test.describe("view tools", () => {
  test.beforeEach(async ({ page }) => {
    await prefs(page);
    await page.goto("./components/lightbox");
  });

  test("R turns the picture within the fit, without moving a control, and the next picture is upright", async ({ page }) => {
    const dialog = await openDialog(page);
    const stage = await box(dialog.locator(".fa-lightbox-stage"));
    const zoomOut = await box(dialog.getByRole("button", { name: "Zoom out" }));
    await page.keyboard.press("r");
    const picture = await box(dialog.locator(".fa-lightbox-picture"));
    expect(picture.height).toBeLessThanOrEqual(stage.height + 0.5);
    expect(picture.width).toBeLessThanOrEqual(stage.width + 0.5);
    expect(picture.height).toBeGreaterThan(picture.width);
    expect(await box(dialog.getByRole("button", { name: "Zoom out" }))).toEqual(zoomOut);
    await page.keyboard.press("Shift+R");
    await page.keyboard.press("Shift+R");
    await expect(dialog.locator(".fa-lightbox-picture")).toHaveAttribute("style", /rotate\(-90deg\)/);
    await dialog.getByRole("button", { name: "Flip horizontally" }).click();
    await expect(dialog.locator(".fa-lightbox-picture")).toHaveAttribute("style", /scale\(-1, 1\)/);
    await page.keyboard.press("ArrowRight");
    await expect(dialog.locator(".fa-lightbox-picture")).toHaveAttribute("style", /scale\(1, 1\) rotate\(0deg\)/);
  });

  test("Escape closes and returns focus to the opener, and a keyboard open starts on the stage @responsive", async ({ page }, { project }) => {
    const opener = page.getByRole("button", { name: /^Open Sample landscape/ }).first();
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".fa-lightbox-stage")).toBeVisible();
    // A bottom sheet focuses itself when it opens; a centred dialog its first control (R13.1).
    if (project.name === "desktop") await expect(dialog.locator(".fa-lightbox-stage")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("the thumbnail strip is one tab stop and the arrow keys carry focus along it", async ({ page }) => {
    const dialog = await openDialog(page);
    await expect(dialog.locator('.fa-lightbox-thumbnail[tabindex="0"]')).toHaveCount(1);
    const current = dialog.locator(".fa-lightbox-thumbnail[aria-current]");
    await current.focus();
    await page.keyboard.press("ArrowRight");
    await expect(dialog.locator(".fa-lightbox-thumbnail").nth(1)).toBeFocused();
    await expect(dialog.locator(".fa-lightbox-thumbnail").nth(1)).toHaveAttribute("aria-current", "true");
    await page.keyboard.press("End");
    await expect(dialog.locator(".fa-lightbox-thumbnail").last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.locator(".fa-lightbox-thumbnail:focus")).toHaveCount(0);
  });
});

test.describe("full screen", () => {
  test.beforeEach(async ({ page }) => {
    await prefs(page);
    await page.goto("./components/lightbox");
  });

  test("F fills the screen with the viewer, popups stay inside it, and Escape leaves, then closes", async ({ page }) => {
    const dialog = await openDialog(page);
    await page.keyboard.press("f");
    const viewer = page.locator(".fa-lightbox-viewer[data-fullscreen]");
    await expect(viewer).toBeVisible();
    expect(await page.evaluate(() => document.fullscreenElement?.classList.contains("fa-lightbox-viewer"))).toBe(true);
    const viewport = page.viewportSize()!;
    const stage = await box(viewer.locator(".fa-lightbox-stage"));
    expect(stage.width).toBe(viewport.width);
    expect(stage.height).toBe(viewport.height);
    expect((await camera(viewer)).k).toBeCloseTo(Math.min(viewport.width / 1600, viewport.height / 1200), 3);

    // A tooltip follows popupContainer into the full-screen element.
    await viewer.getByRole("button", { name: "Zoom in" }).hover();
    await expect(viewer.locator('[role="tooltip"], .fa-tooltip').first()).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: /^Open Sample landscape/ }).first()).toBeFocused();
  });

  test("the chrome fades without moving anything and comes back on input", async ({ page }) => {
    await openDialog(page);
    await page.keyboard.press("f");
    const viewer = page.locator(".fa-lightbox-viewer[data-fullscreen]");
    await expect(viewer).toBeVisible();
    await page.mouse.move(500, 400);
    const before = await box(viewer.getByRole("button", { name: "Zoom in" }));
    const picture = await box(viewer.locator(".fa-lightbox-picture"));
    await expect(viewer).toHaveAttribute("data-chrome-idle", "", { timeout: 6000 });
    await expect(viewer.locator(".fa-dialog-footer")).toHaveCSS("opacity", "0");
    await page.mouse.move(520, 420);
    await expect(viewer).not.toHaveAttribute("data-chrome-idle", "");
    await expect(viewer.locator(".fa-dialog-footer")).toHaveCSS("opacity", "1");
    expect(await box(viewer.getByRole("button", { name: "Zoom in" }))).toEqual(before);
    expect(await box(viewer.locator(".fa-lightbox-picture"))).toEqual(picture);
  });
});

test.describe("slideshow", () => {
  test("runs, stops on a press, says so once each and never through the zoom readout", async ({ page }) => {
    await prefs(page);
    await page.goto("./components/lightbox");
    const viewer = page.getByRole("group", { name: "Sample landscapes" });
    await viewer.scrollIntoViewIfNeeded();
    await viewer.evaluate((root) => {
      const said: string[] = [];
      (window as unknown as { said: string[] }).said = said;
      const live = root.querySelector('[aria-live="polite"][aria-atomic="true"]')!;
      new MutationObserver(() => said.push(live.textContent ?? "")).observe(live, { characterData: true, childList: true, subtree: true });
    });
    // Still: a change of picture does not fade.
    const fade = await viewer.locator(".fa-lightbox-image").evaluate((image) => Number.parseFloat(getComputedStyle(image).transitionDuration));
    expect(fade).toBeLessThan(0.02);
    await page.clock.install();
    await viewer.getByRole("button", { name: "Start slideshow" }).click();
    const stage = viewer.locator(".fa-lightbox-stage");
    const first = await stage.getAttribute("aria-label");
    await expect(viewer.getByRole("button", { name: "Stop slideshow" })).toBeFocused();
    await page.clock.fastForward(5100);
    await expect(stage).not.toHaveAttribute("aria-label", first!);
    await viewer.getByRole("button", { name: "Stop slideshow" }).click();
    await expect(viewer.getByRole("button", { name: "Start slideshow" })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { said: string[] }).said)).toEqual(["Slideshow started", "Slideshow stopped"]);
    const held = await stage.getAttribute("aria-label");
    await page.clock.fastForward(11000);
    await expect(stage).toHaveAttribute("aria-label", held!);
  });
});

test.describe("loading", () => {
  test("a slow picture holds its shape, a failure offers a retry, and the tools never move", async ({ page }) => {
    await prefs(page);
    await page.goto("./components/lightbox");
    const states = page.getByRole("group", { name: "Failed state" });
    await states.scrollIntoViewIfNeeded();
    await expect(states.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(states.getByText("This image didn't load")).toBeVisible();
    const held = page.getByRole("group", { name: "Skeleton state" });
    await expect(held.locator(".fa-lightbox-skeleton")).toBeVisible();
    const soft = page.getByRole("group", { name: "Placeholder state" });
    await expect(soft.locator(".fa-lightbox-placeholder")).toBeVisible();
    for (const group of [states, held, soft]) {
      const stage = await box(group.locator(".fa-lightbox-stage"));
      const shape = await box(group.locator(".fa-lightbox-picture"));
      expect(shape.width / shape.height).toBeCloseTo(4 / 3, 1);
      expect(shape.width).toBeLessThanOrEqual(stage.width + 0.5);
      expect(shape.height).toBeLessThanOrEqual(stage.height + 0.5);
    }
    const tools = await Promise.all([states, held, soft].map((group) => box(group.getByRole("button", { name: "Zoom in" }))));
    expect(new Set(tools.map(({ y }) => Math.round(y))).size).toBe(1);
  });
});

test.describe("a long set", () => {
  test("loads only the thumbnails near the strip's view and keeps the current one in view", async ({ page }) => {
    await prefs(page);
    await page.goto("./components/lightbox");
    const viewer = page.getByRole("group", { name: "Long set of frames" });
    await viewer.scrollIntoViewIfNeeded();
    const strip = viewer.locator(".fa-lightbox-thumbnails");
    await expect(viewer.locator(".fa-lightbox-thumbnail")).toHaveCount(240);
    const loaded = () => strip.evaluate((element) => element.querySelectorAll("img[src]").length);
    await expect.poll(loaded).toBeGreaterThan(5);
    const room = await box(strip);
    const size = await box(viewer.locator(".fa-lightbox-thumbnail").first());
    expect(await loaded()).toBeLessThanOrEqual(Math.ceil(room.width / size.width) + 4);
    const inView = async () => {
      const place = await box(viewer.locator(".fa-lightbox-thumbnail[aria-current]"));
      return place.x >= room.x - 1 && place.x + place.width <= room.x + room.width + 1;
    };
    expect(await inView()).toBe(true);
    await viewer.locator(".fa-lightbox-stage").focus();
    for (let step = 0; step < 24; step += 1) await page.keyboard.press("ArrowRight");
    await expect(viewer.locator(".fa-lightbox-stage")).toHaveAttribute("aria-label", "Sample frame 145");
    await expect.poll(inView).toBe(true);
  });
});

test.describe("right to left", () => {
  test("→ goes back, a swipe follows the reading direction, and the picture does not mirror @responsive", async ({ page }) => {
    await prefs(page);
    await page.goto("./components/lightbox?dir=rtl&lang=ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.getByRole("button", { name: /^Open Sample landscape/ }).first().click();
    const dialog = page.getByRole("dialog");
    const stage = dialog.locator(".fa-lightbox-stage");
    await expect(stage).toBeVisible();
    await expect(dialog.locator(".fa-lightbox-picture")).toHaveAttribute("style", /scale\(1, 1\)/);
    const label = await stage.getAttribute("aria-label");
    await page.keyboard.press("ArrowLeft");
    await expect(stage).not.toHaveAttribute("aria-label", label!);
    await page.keyboard.press("ArrowRight");
    await expect(stage).toHaveAttribute("aria-label", label!);

    // Zoomed: the stage's scroll reports the camera in right-to-left terms, and → moves the picture.
    await page.keyboard.press("+");
    await stage.focus();
    const before = await stage.evaluate((element) => element.scrollLeft);
    expect(before).toBeLessThanOrEqual(0);
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => stage.evaluate((element) => element.scrollLeft)).toBeLessThan(before);
    await expect(stage).toHaveAttribute("aria-label", label!);

    // The strip starts at the reading start and keeps the current thumbnail in view.
    const strip = await box(dialog.locator(".fa-lightbox-thumbnails"));
    const current = await box(dialog.locator(".fa-lightbox-thumbnail[aria-current]"));
    expect(current.x + current.width).toBeLessThanOrEqual(strip.x + strip.width + 1);
    expect(current.x).toBeGreaterThanOrEqual(strip.x - 1);
  });
});

test.describe("in AI results", () => {
  test("an image result loads the viewer when opened, and focus returns to it @responsive", async ({ page }) => {
    await prefs(page);
    await page.goto("./components/result-frame");
    const tile = page.locator(".fa-ai-image-button").first();
    await expect(tile).toBeVisible({ timeout: 30_000 });
    await tile.scrollIntoViewIfNeeded();
    await tile.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".fa-lightbox-stage")).toBeVisible();
    await page.keyboard.press("+");
    await expect(dialog.locator(".fa-lightbox-zoom")).toHaveText("150%");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(tile).toBeFocused();
  });
});

test.describe("phone width", () => {
  test("every tool stays reachable, nothing overflows, and details open under the stage @responsive", async ({ page }, { project }) => {
    test.skip(project.name !== "phone", "the phone layout");
    await prefs(page);
    await page.goto("./components/lightbox");
    const dialog = await openDialog(page);
    const popup = await box(dialog);
    const stage = await box(dialog.locator(".fa-lightbox-stage"));
    const footer = dialog.locator(".fa-dialog-footer");
    const zoomIn = await box(dialog.getByRole("button", { name: "Zoom in" }));
    expect(popup.width - stage.width).toBeLessThanOrEqual(4);
    for (const button of await footer.getByRole("button").all()) {
      const rect = await box(button);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(popup.width);
    }
    expect(await footer.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
    await expect(dialog.getByRole("button", { name: "Rotate right" })).toBeHidden();
    await dialog.getByRole("button", { name: "More image tools" }).click();
    await page.getByRole("menuitem", { name: "Details" }).click();
    const details = dialog.getByRole("complementary", { name: "Details" });
    await expect(details).toBeVisible();
    const panel = await box(details);
    expect(panel.y).toBeGreaterThanOrEqual((await box(dialog.locator(".fa-lightbox-stage"))).y);
    expect(panel.width).toBeLessThanOrEqual(popup.width);
    expect(await box(dialog.getByRole("button", { name: "Zoom in" }))).toEqual(zoomIn);
  });
});

for (const { name, appearance } of [
  { name: "comfortable", appearance: {} },
  { name: "compact density", appearance: { density: "compact" } },
  { name: "small UI scale", appearance: { uiScale: 0.875 } },
  { name: "large UI scale", appearance: { uiScale: 1.25 } },
  { name: "square corners", appearance: { radiusScale: 0 } },
  { name: "round corners", appearance: { radiusScale: 1.5 } },
  { name: "thin lines", appearance: { borderWidth: 0.5 } },
  { name: "heavy lines", appearance: { borderWidth: 2 } },
  { name: "dark solid", appearance: { mode: "dark", glass: "solid" } },
]) {
  test(`geometry, ${name} @responsive`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await prefs(page, appearance);
    await page.goto("./components/lightbox");
    const dialog = await openDialog(page);
    const stage = dialog.locator(".fa-lightbox-stage");
    const rect = await box(stage);
    const picture = await box(dialog.locator(".fa-lightbox-picture"));
    // Fitted and centred, on the stage's own box.
    expect(picture.x - rect.x).toBeCloseTo(rect.x + rect.width - (picture.x + picture.width), 0);
    expect(picture.y - rect.y).toBeCloseTo(rect.y + rect.height - (picture.y + picture.height), 0);
    expect(Math.max(picture.width / rect.width, picture.height / rect.height)).toBeCloseTo(1, 1);

    // The picture's corner is the media role whatever the scale.
    const corner = await dialog.locator(".fa-lightbox-image").evaluate((image) => {
      const probe = document.createElement("div");
      probe.style.borderRadius = "var(--radius-media)";
      document.body.append(probe);
      const expected = Number.parseFloat(getComputedStyle(probe).borderTopLeftRadius);
      probe.remove();
      const k = Number(getComputedStyle(image).getPropertyValue("--_k") || 1);
      return { drawn: Number.parseFloat(getComputedStyle(image).borderTopLeftRadius) * k, expected };
    });
    expect(corner.drawn).toBeCloseTo(corner.expected, 0);

    // Line weight follows the theme on the thumbnails.
    const line = await dialog.locator(".fa-lightbox-thumbnail").first().evaluate((element) => {
      const probe = document.createElement("div");
      probe.style.borderWidth = "var(--border-width)";
      probe.style.borderStyle = "solid";
      document.body.append(probe);
      const expected = getComputedStyle(probe).borderTopWidth;
      probe.remove();
      return { drawn: getComputedStyle(element).borderTopWidth, expected };
    });
    expect(line.drawn).toBe(line.expected);

    // A focus ring on a thumbnail keeps its room inside the strip (R11.10).
    const strip = await box(dialog.locator(".fa-lightbox-thumbnails"));
    const thumbnail = await box(dialog.locator(".fa-lightbox-thumbnail").first());
    const reach = await dialog.evaluate((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue("--focus-reach")));
    expect(thumbnail.x - strip.x).toBeGreaterThanOrEqual(reach);
    expect(thumbnail.y - strip.y).toBeGreaterThanOrEqual(reach);

    // Nothing moves between pictures or a change of zoom.
    const tools = await box(dialog.getByRole("button", { name: "Zoom in" }));
    await page.keyboard.press("+");
    await dialog.getByRole("button", { name: "Next image" }).click();
    await expect(dialog.locator(".fa-lightbox-zoom")).toHaveText("Fit");
    expect(await box(dialog.getByRole("button", { name: "Zoom in" }))).toEqual(tools);
    expect(await box(stage)).toEqual(rect);

    // The stage clips the zoomed picture to itself and the dialog does not grow.
    await page.keyboard.press("+");
    await page.keyboard.press("+");
    await expect(stage).toHaveAttribute("data-zoomed", "");
    expect(await box(stage)).toEqual(rect);
    expect(await dialog.locator(".fa-dialog-body").evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test("the dialog, the page viewer and full screen pass axe @responsive", async ({ page }) => {
  await prefs(page);
  await page.goto("./components/lightbox");
  await page.getByRole("group", { name: "Sample landscapes" }).scrollIntoViewIfNeeded();
  const inPage = await new AxeBuilder({ page }).include('[data-frame="inline"]').analyze();
  expect(inPage.violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target).join(" | ")}`)).toEqual([]);
  await openDialog(page);
  const open = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(open.violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target).join(" | ")}`)).toEqual([]);
  await page.keyboard.press("f");
  const fullscreen = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(fullscreen.violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target).join(" | ")}`)).toEqual([]);
});
