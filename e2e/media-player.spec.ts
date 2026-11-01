import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * The media player. View modes are checked against the browser's own state (the open popover,
 * document.fullscreenElement, document.pictureInPictureElement), and every mode against the same
 * media element: it must keep playing, keep its position and never fire loadstart or emptied.
 */

interface Watched {
  element: HTMLVideoElement;
  events: string[];
}

declare global {
  interface Window {
    __watched?: Watched;
  }
}

async function open(page: Page, path = "/components/video-player", appearance: Record<string, unknown> = {}) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((extra) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced", ...extra })), appearance);
  await page.goto(path);
  await page.locator(".fa-media video").first().waitFor({ state: "attached", timeout: 30_000 });
  return errors;
}

const player = (page: Page, id: string) => page.getByTestId(id).locator(".fa-media");
const control = (scope: Locator, name: string | RegExp) => scope.getByRole("button", { name, exact: typeof name === "string" });

/** Remember the element and every event that would mean a reload. */
async function watch(root: Locator) {
  await root.locator("video").evaluate((video: HTMLVideoElement) => {
    const events: string[] = [];
    for (const name of ["loadstart", "emptied", "abort"]) video.addEventListener(name, () => events.push(name));
    window.__watched = { element: video, events };
  });
}

const reading = (root: Locator) =>
  root.locator("video").evaluate((video: HTMLVideoElement) => ({
    same: window.__watched?.element === video,
    events: window.__watched?.events ?? [],
    time: video.currentTime,
    paused: video.paused,
    readyState: video.readyState,
    connected: video.isConnected,
  }));

async function untilReady(root: Locator) {
  await expect.poll(() => root.locator("video").evaluate((video: HTMLVideoElement) => video.readyState), { timeout: 20_000 }).toBeGreaterThan(0);
}

async function playFrom(page: Page, root: Locator, seconds: number) {
  await untilReady(root);
  await root.locator("video").evaluate((video: HTMLVideoElement, at) => {
    video.muted = true;
    video.loop = true;
    video.currentTime = at;
    return video.play();
  }, seconds);
  await expect.poll(async () => (await reading(root)).time).toBeGreaterThan(seconds);
}

/** Playback carried on: same element, nothing reloaded, position moved forward from `from`. */
async function expectKept(root: Locator, from: number) {
  const before = await reading(root);
  expect(before.same).toBe(true);
  expect(before.events).toEqual([]);
  expect(before.time).toBeGreaterThanOrEqual(from);
  await expect.poll(async () => (await reading(root)).time).toBeGreaterThan(before.time);
  expect((await reading(root)).paused).toBe(false);
}

const hover = async (root: Locator) => {
  await root.locator(".fa-media-surface").hover();
};

test("every view mode keeps the media element, its position and the page in place", async ({ page }) => {
  await open(page);
  const root = player(page, "media-views");
  await root.scrollIntoViewIfNeeded();
  await playFrom(page, root, 2);
  await watch(root);
  const note = page.getByTestId("media-views-report");
  const slot = await root.boundingBox();
  const below = await note.boundingBox();
  const shell = root.locator(".fa-media-shell");
  const popoverOpen = () => shell.evaluate((element) => element.matches(":popover-open"));
  const stage = root.locator(".fa-media-stage");
  const viewport = page.viewportSize()!;
  const expectPageStill = async () => {
    expect(await root.boundingBox()).toEqual(slot);
    expect(await note.boundingBox()).toEqual(below);
  };
  await hover(root);

  // Maximised: in the top layer, covering the viewport, despite the page's scrolling parents.
  await control(root, "Maximise").click();
  await expect.poll(popoverOpen).toBe(true);
  const covered = await stage.boundingBox();
  expect(covered).toMatchObject({ x: 0, y: 0, width: viewport.width, height: viewport.height });
  await expect(note).toHaveText(/inline to maximised, reason control/);
  await expectKept(root, 2);
  await expectPageStill();

  // Full screen from maximised, then Escape's stand-in: leaving returns to maximised.
  await control(root, "Full screen").click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.className)).toContain("fa-media-stage");
  await expectKept(root, 2);
  expect(await popoverOpen()).toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await expect(note).toHaveText(/fullscreen to maximised, reason system/);
  expect(await popoverOpen()).toBe(true);
  await expectKept(root, 2);

  // Escape leaves maximised.
  await page.keyboard.press("Escape");
  await expect.poll(popoverOpen).toBe(false);
  await expect(note).toHaveText(/maximised to inline, reason escape/);
  await expectKept(root, 2);
  await expectPageStill();

  // Windowed: a small floating box, with the inline box still reserved and saying where it went.
  await root.locator(".fa-media-surface").hover();
  await control(root, "Mini player").click();
  await expect.poll(popoverOpen).toBe(true);
  const floating = (await stage.boundingBox())!;
  expect(floating.width).toBeLessThan(viewport.width / 2);
  expect(floating.x + floating.width).toBeLessThanOrEqual(viewport.width);
  await expect(root.locator(".fa-media-away")).toContainText("Playing in the mini player");
  await expectKept(root, 2);
  await expectPageStill();

  // Full screen from the mini player keeps its place too.
  await page.getByRole("group", { name: "View mode" }).getByRole("button", { name: "Full screen" }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.className)).toContain("fa-media-stage");
  await expectKept(root, 2);
  await page.evaluate(() => document.exitFullscreen());
  await expect(note).toHaveText(/fullscreen to windowed, reason system/);
  expect((await stage.boundingBox())!.width).toBeCloseTo(floating.width, 0);

  // Close stops the mini player and comes home.
  await hover(root);
  await control(root, "Close player").click();
  await expect.poll(popoverOpen).toBe(false);
  await expect(note).toHaveText(/windowed to inline, reason close/);
  await expectPageStill();
  expect((await reading(root)).paused).toBe(true);
  expect((await reading(root)).events).toEqual([]);
});

test("picture-in-picture falls back to the mini player where the browser has none", async ({ page }) => {
  await page.addInitScript(() => {
    delete (HTMLVideoElement.prototype as unknown as Record<string, unknown>).requestPictureInPicture;
    delete (HTMLVideoElement.prototype as unknown as Record<string, unknown>).webkitSetPresentationMode;
    Object.defineProperty(Document.prototype, "pictureInPictureEnabled", { get: () => false });
    delete (window as unknown as Record<string, unknown>).documentPictureInPicture;
  });
  await open(page);
  const root = player(page, "media-views");
  await root.scrollIntoViewIfNeeded();
  await untilReady(root);
  await hover(root);
  await expect(control(root, "Picture in picture")).toHaveCount(0);
  await page.getByRole("group", { name: "View mode" }).getByRole("button", { name: "Picture in picture" }).click();
  await expect(root.locator(".fa-media-shell")).toHaveAttribute("data-layer", "windowed");
  await expect(page.getByTestId("media-views-report")).toHaveText(/inline to windowed, reason fallback/);
  await expect(root).toHaveAttribute("data-view-mode", "windowed");
});

test("native picture-in-picture uses the media element", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "WPE WebKit has no picture-in-picture API; Safari's differs");
  await open(page);
  const root = player(page, "media-views");
  await root.scrollIntoViewIfNeeded();
  await playFrom(page, root, 3);
  await watch(root);
  await hover(root);
  await control(root, "Picture in picture").click();
  await expect.poll(() => page.evaluate(() => document.pictureInPictureElement?.tagName)).toBe("VIDEO");
  await expect(root.locator(".fa-media-away")).toContainText("Playing in picture in picture");
  await expectKept(root, 3);
  await root.getByRole("button", { name: "Return to the page" }).click();
  await expect.poll(() => page.evaluate(() => document.pictureInPictureElement?.tagName ?? null)).toBeNull();
  await expect(root.locator(".fa-media-away")).toHaveCount(0);
  await expectKept(root, 3);
});

test("Document Picture-in-Picture holds the same element with working controls, and gives it back", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Chromium only");
  await open(page);
  const root = player(page, "media-views");
  await root.scrollIntoViewIfNeeded();
  await page.getByRole("group", { name: "Picture-in-picture kind" }).getByRole("button", { name: "Document" }).click();
  await playFrom(page, root, 3);
  await watch(root);
  const video = await root.locator("video").elementHandle();
  await hover(root);
  await control(root, "Picture in picture").click();
  await expect.poll(() => video!.evaluate((element) => element.ownerDocument !== document)).toBe(true);
  await expect.poll(() => video!.evaluate((element) => element.parentElement?.className)).toBe("fa-media-pip");
  const events = () => page.evaluate(() => window.__watched!.events);
  expect(await events()).toEqual([]);
  const paused = () => video!.evaluate((element: HTMLVideoElement) => element.paused);
  expect(await paused()).toBe(false);
  // The portal's React handlers work in the other document.
  await video!.evaluate((element) => (element.ownerDocument.querySelector('[aria-label="Pause"]') as HTMLElement).click());
  await expect.poll(paused).toBe(true);
  await video!.evaluate((element) => (element.ownerDocument.querySelector('[aria-label="Play"]') as HTMLElement).click());
  await expect.poll(paused).toBe(false);
  await root.getByRole("button", { name: "Return to the page" }).click();
  await expect.poll(() => video!.evaluate((element) => element.ownerDocument === document)).toBe(true);
  await expect(root.locator("video")).toHaveCount(1);
  expect(await events()).toEqual([]);
  expect((await reading(root)).same).toBe(true);
  expect(await paused()).toBe(false);
});

test("the mini player drags on transforms, commits once, snaps, and moves from the keyboard", async ({ page }) => {
  await open(page, "/components/video-player?media-demo=windowed");
  const root = page.getByTestId("media-fixed").locator(".fa-media");
  const shell = root.locator(".fa-media-shell");
  await expect.poll(() => shell.evaluate((element) => element.matches(":popover-open"))).toBe(true);
  const stage = root.locator(".fa-media-stage");
  await untilReady(root);
  const start = (await stage.boundingBox())!;
  await page.evaluate(() => {
    const target = document.querySelector('.fa-media-shell[data-layer="windowed"]') as HTMLElement;
    (window as unknown as { writes: string[] }).writes = [];
    new MutationObserver(() => (window as unknown as { writes: string[] }).writes.push(target.style.translate)).observe(target, { attributes: true, attributeFilter: ["style"] });
  });
  const bar = root.locator(".fa-media-window-bar");
  await root.locator(".fa-media-surface").hover();
  const box = (await bar.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let step = 1; step <= 12; step += 1) await page.mouse.move(box.x + box.width / 2 - step * 20, box.y + box.height / 2 - step * 15);
  await expect(root.locator(".fa-media-shell[data-moving]")).toHaveCount(1);
  await page.mouse.up();
  await expect(root.locator(".fa-media-shell[data-moving]")).toHaveCount(0);
  const moved = (await stage.boundingBox())!;
  expect(moved.x).toBeLessThan(start.x - 200);
  expect(moved.y).toBeLessThan(start.y - 150);
  const writes = await page.evaluate(() => (window as unknown as { writes: string[] }).writes);
  // One write per frame, none of them React's: the path shows in several positions before the commit.
  expect(new Set(writes).size).toBeGreaterThan(1);

  // Drag into a corner: it snaps to the margin.
  await page.mouse.move(moved.x + moved.width / 2, moved.y + 12);
  await page.mouse.down();
  await page.mouse.move(40, 30, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await stage.boundingBox())!.x).toBe(12);
  await expect.poll(async () => (await stage.boundingBox())!.y).toBe(12);

  // Keyboard: the handle moves it; Shift resizes; the menu reaches a corner.
  const handle = control(root, "Move player");
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await expect.poll(async () => (await stage.boundingBox())!.x).toBe(36);
  expect((await stage.boundingBox())!.y).toBe(36);
  const wide = (await stage.boundingBox())!.width;
  await page.keyboard.press("Shift+ArrowRight");
  await expect.poll(async () => (await stage.boundingBox())!.width).toBe(wide + 24);
  await control(root, "Position and size").click();
  await page.getByRole("menuitem", { name: "Bottom right" }).click();
  const viewport = page.viewportSize()!;
  await expect.poll(async () => {
    const now = (await stage.boundingBox())!;
    return Math.round(now.x + now.width);
  }).toBe(viewport.width - 12);

  // The menu opened inside the player: visible above it in the top layer.
  await control(root, "Close player").focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => shell.evaluate((element) => element.matches(":popover-open"))).toBe(false);
  await expect(root.locator(".fa-media-stage")).toBeFocused();
});

test("keyboard shortcuts are scoped to the focused player and respect configureShortcuts @responsive", async ({ page, browserName }) => {
  await open(page);
  const root = player(page, "media-full");
  await root.scrollIntoViewIfNeeded();
  await untilReady(root);
  const video = root.locator("video");
  const time = () => video.evaluate((element: HTMLVideoElement) => element.currentTime);
  const seekInput = root.getByRole("slider", { name: "Seek" });

  // Outside the player, its keys do nothing.
  await page.keyboard.press("k");
  expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);

  await seekInput.focus();
  await page.keyboard.press("5");
  await expect.poll(time).toBeCloseTo(12, 0);
  await expect(seekInput).toHaveAttribute("aria-valuetext", /12 seconds of 24 seconds/);
  await page.keyboard.press("ArrowRight");
  await expect.poll(time).toBeCloseTo(17, 0);
  await page.keyboard.press("j");
  await expect.poll(time).toBeCloseTo(7, 0);
  await page.keyboard.press("l");
  await expect.poll(time).toBeCloseTo(17, 0);
  await page.keyboard.press("Home");
  await expect.poll(time).toBeCloseTo(0, 0);
  await page.keyboard.press("End");
  // WebKit's GStreamer port lands on an earlier keyframe for a seek to the exact duration.
  if (browserName !== "webkit") await expect.poll(time).toBeGreaterThan(23);
  await page.keyboard.press("0");
  await expect.poll(time).toBeCloseTo(0, 0);

  await page.keyboard.press("m");
  await expect(video).toHaveJSProperty("muted", true);
  await page.keyboard.press("m");
  await expect(video).toHaveJSProperty("muted", false);
  const volume = () => video.evaluate((element: HTMLVideoElement) => element.volume);
  await page.keyboard.press("ArrowDown");
  await expect.poll(volume).toBeCloseTo(0.95, 2);

  await page.keyboard.press("Shift+.");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.playbackRate)).toBe(1.25);
  await page.keyboard.press("Shift+,");
  await page.keyboard.press("Shift+,");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.playbackRate)).toBe(0.75);

  await page.keyboard.press("c");
  await expect(control(root, "Captions")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("c");
  await expect(control(root, "Captions")).toHaveAttribute("aria-pressed", "false");

  // Space on a focused button presses that button rather than toggling playback.
  await control(root, "Captions").focus();
  await page.keyboard.press("Space");
  await expect(control(root, "Captions")).toHaveAttribute("aria-pressed", "true");
  await expect(video).toHaveJSProperty("paused", true);

  await seekInput.focus();
  await page.keyboard.press("k");
  await expect(video).toHaveJSProperty("paused", false);
  await page.keyboard.press("Space");
  await expect(video).toHaveJSProperty("paused", true);
  await expect(root.locator("[aria-live='polite']")).toHaveText("Paused");
  await page.keyboard.press("f");
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.className)).toContain("fa-media-stage");
  await page.keyboard.press("f");
  await expect.poll(() => page.evaluate(() => document.fullscreenElement ?? null)).toBeNull();
});

test("ticking time stays out of live regions, and the slider value freezes while it has focus", async ({ page }) => {
  await open(page);
  const root = player(page, "media-views");
  await root.scrollIntoViewIfNeeded();
  await playFrom(page, root, 1);
  const seekInput = root.getByRole("slider", { name: "Seek" });
  await seekInput.focus();
  const text = await seekInput.getAttribute("aria-valuetext");
  const live = await root.locator("[aria-live]").textContent();
  await page.waitForTimeout(1500);
  expect(await seekInput.getAttribute("aria-valuetext")).toBe(text);
  expect(await root.locator("[aria-live]").textContent()).toBe(live);
  await expect(root.locator(".fa-media-clock")).toHaveAttribute("aria-hidden", "true");
});

test("captions switch track and size in place, menus open over the player", async ({ page }) => {
  await open(page, "/components/video-player?media-demo=captions");
  const root = page.getByTestId("media-fixed").locator(".fa-media");
  await untilReady(root);
  const cue = root.locator(".fa-media-cue");
  await expect(cue).toContainText("The survey line runs east");
  const size = await cue.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  await root.locator(".fa-media-surface").hover();
  await control(root, "Settings").click();
  await page.getByRole("menuitem", { name: "Captions" }).click();
  await page.getByRole("menuitemradio", { name: "Français" }).click();
  await expect(cue).toContainText("La ligne de relevé");
  await page.getByRole("menuitemradio", { name: "Small" }).click();
  await expect.poll(() => cue.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeLessThan(size);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
});

test("chapters, loop, speed and the playlist work from the menu", async ({ page }) => {
  await open(page);
  const root = player(page, "media-full");
  await root.scrollIntoViewIfNeeded();
  await untilReady(root);
  const video = root.locator("video");
  await hover(root);
  await expect(root.locator(".fa-media-seek-mark")).toHaveCount(2);
  await control(root, "Settings").click();
  await page.getByRole("menuitem", { name: "Chapters" }).click();
  await page.getByRole("menuitem", { name: /High water/ }).click();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(16, 0);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await hover(root);
  await control(root, "Settings").click();
  await page.getByRole("menuitemcheckbox", { name: "Loop" }).click();
  await expect(video).toHaveJSProperty("loop", true);
  await page.keyboard.press("Escape");

  const handle = await video.elementHandle();
  const src = () => video.evaluate((element: HTMLVideoElement) => element.currentSrc);
  await hover(root);
  await control(root, "Next").click();
  await expect.poll(src).toContain("ridge-walk");
  expect(await handle!.evaluate((element) => element.isConnected)).toBe(true);
  await expect(root.locator(".fa-media-seek-mark")).toHaveCount(0);
  await control(root, "Previous").click();
  await expect.poll(src).toContain("tide-survey");
});

test("seek bar: a drag commits once, hover shows the storyboard, and the track shows buffered ranges", async ({ page }) => {
  await open(page);
  const root = player(page, "media-full");
  await root.scrollIntoViewIfNeeded();
  await untilReady(root);
  const video = root.locator("video");
  const seek = root.locator(".fa-media-seek");
  await hover(root);
  const box = (await seek.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  const preview = root.locator(".fa-media-preview");
  await expect(preview).toHaveAttribute("data-shown", "");
  await expect(preview).toContainText("0:12");
  await expect(preview).toContainText("Flood");
  await expect(preview.locator(".fa-media-preview-frame")).toHaveCSS("background-position", "-160px -90px");
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(18, 0);
  await expect(root.locator(".fa-media-clock")).toContainText("0:18");
  await expect(root.locator(".fa-media-seek-buffered").first()).toBeAttached();
});

test("casting drives the receiver and hands position over in both directions", async ({ page }) => {
  await open(page);
  const root = player(page, "media-cast");
  await root.scrollIntoViewIfNeeded();
  await playFrom(page, root, 5);
  const log = page.getByTestId("media-cast-log");
  await hover(root);
  await control(root, "Cast to a device").click();
  await expect(root.locator('[data-kind="cast"]')).toContainText("Casting to Harbour Room display");
  await expect(root.locator("video")).toHaveJSProperty("paused", true);
  await expect(log).toContainText(/load Tide survey, Cedar Inlet at (?:[5-9]|1\d)\.\d/);
  await expect(root.locator("[aria-live='polite']")).toHaveText("Casting to Harbour Room display");

  await hover(root);
  await control(root, "Pause").click();
  await expect(log).toContainText("pause");
  await root.getByRole("slider", { name: "Seek" }).focus();
  await page.keyboard.press("5");
  await expect(log).toContainText("seek 12.0");
  await expect(root.locator(".fa-media-clock")).toContainText("0:12");
  await page.keyboard.press("k");
  await expect(log).toContainText("play");
  await expect.poll(() => root.locator(".fa-media-clock").textContent()).not.toContain("0:12");
  await hover(root);
  await control(root, /Stop casting/).click();
  await expect(root.locator('[data-kind="cast"]')).toHaveCount(0);
  await expect(log).toContainText("disconnect");
  await expect.poll(() => root.locator("video").evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(12);
  await expect(root.locator("video")).toHaveJSProperty("paused", false);
});

test("a stream engine reports quality levels through attach", async ({ page }) => {
  await open(page);
  const root = player(page, "media-stream");
  await root.scrollIntoViewIfNeeded();
  await untilReady(root);
  await hover(root);
  await control(root, "Settings").click();
  await page.getByRole("menuitem", { name: "Quality" }).click();
  await expect(page.getByRole("menuitemradio", { name: "Auto (720p)" })).toBeChecked();
  await page.getByRole("menuitemradio", { name: "1080p", exact: true }).click();
  await expect(page.getByRole("menuitemradio", { name: "1080p", exact: true })).toBeChecked();
  await expect(page.getByRole("menuitemradio", { name: "Auto (1080p)" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
});

test("a live stream shows the Live control, which jumps to the edge", async ({ page }) => {
  await open(page);
  const root = player(page, "media-live");
  await root.scrollIntoViewIfNeeded();
  await untilReady(root);
  await hover(root);
  await expect(root.locator(".fa-media-clock")).toHaveCount(0);
  const live = control(root, "Go to live");
  await live.click();
  await expect.poll(() => root.locator("video").evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(20);
  await expect(root.locator(".fa-media-live-dot")).toHaveAttribute("data-edge", "true");
});

test("audio shares the core and plays a playlist @responsive", async ({ page }) => {
  await open(page);
  const root = player(page, "media-audio");
  await root.scrollIntoViewIfNeeded();
  const audio = root.locator("audio");
  await expect(root.getByRole("group", { name: "Harbour bells" }).or(root).first()).toBeVisible();
  await untilReady2(audio);
  await root.getByRole("slider", { name: "Seek" }).focus();
  await page.keyboard.press("5");
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeCloseTo(12, 0);
  await root.getByRole("button", { name: "Ridge wind", exact: false }).click();
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentSrc)).toContain("tone");
  await expect(root.locator(".fa-media-playlist-item[aria-current]")).toContainText("Ridge wind");
});

async function untilReady2(audio: Locator) {
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.readyState), { timeout: 20_000 }).toBeGreaterThan(0);
}

test("failure says what went wrong in the player's box, and Retry reloads", async ({ page }) => {
  await open(page);
  const root = player(page, "media-error");
  await root.scrollIntoViewIfNeeded();
  const box = await root.boundingBox();
  const failure = root.locator('[data-kind="error"]');
  await expect(failure).toContainText(/cannot play this file|connection dropped/);
  expect(await root.boundingBox()).toEqual(box);
  await failure.getByRole("button", { name: "Retry" }).click();
  await expect(failure).toBeVisible();
  const stalled = page.getByTestId("media-stalled").locator('[data-kind="stalled"]');
  await expect(stalled).toContainText("Playback is waiting for the network");
});

test("skeletons hold the loaded shape", async ({ page }) => {
  await open(page);
  const skeleton = page.getByTestId("media-skeleton").locator(".fa-media");
  const loaded = player(page, "media-error");
  await loaded.scrollIntoViewIfNeeded();
  const a = (await skeleton.boundingBox())!;
  const b = (await loaded.boundingBox())!;
  expect(a.width).toBeCloseTo(b.width, 0);
  expect(a.height).toBeCloseTo(b.height, 0);
  expect(a.width / a.height).toBeCloseTo(16 / 9, 1);
});

test("hiding the controls moves nothing, and focus brings them back", async ({ page }) => {
  await open(page);
  const root = player(page, "media-views");
  await root.scrollIntoViewIfNeeded();
  await playFrom(page, root, 0);
  const stage = root.locator(".fa-media-stage");
  await hover(root);
  const button = control(root, "Settings");
  const before = await button.boundingBox();
  await page.mouse.move(0, 0);
  await expect(stage).toHaveAttribute("data-controls", "hidden", { timeout: 8000 });
  expect(await button.boundingBox()).toEqual(before);
  await expect(root.locator(".fa-media-controls")).toHaveCSS("opacity", "0");
  await root.getByRole("slider", { name: "Seek" }).focus();
  await expect(stage).not.toHaveAttribute("data-controls", "hidden");
});

test("the timeline stays left to right in a right-to-left page, and → still goes forward", async ({ page }) => {
  await open(page, "/components/video-player?dir=rtl&lang=ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const root = player(page, "media-full");
  await root.scrollIntoViewIfNeeded();
  await untilReady(root);
  const seek = root.locator(".fa-media-seek");
  await expect(seek).toHaveCSS("direction", "ltr");
  await root.getByRole("slider").first().focus();
  await page.keyboard.press("5");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => root.locator("video").evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(17, 0);
  const fill = await seek.locator(".fa-media-seek-fill").boundingBox();
  const track = await seek.locator(".fa-media-seek-track").boundingBox();
  expect(fill!.x).toBeCloseTo(track!.x, 0);
  // Transport keeps its order; the row itself follows reading direction.
  const box = await root.locator(".fa-media-bar").boundingBox();
  const play = await root.locator(".fa-media-group").first().boundingBox();
  expect(play!.x).toBeGreaterThan(box!.x + box!.width / 2);
  const mini = await root.locator(".fa-media-stage").evaluate((element) => getComputedStyle(element).direction);
  expect(mini).toBe("rtl");
  await expect(root.locator('svg[data-icon-dir="mirror"]')).toHaveCount(0);
});

test("the controls fit a phone, with every view mode one menu away @responsive", async ({ page }) => {
  const errors = await open(page);
  const root = player(page, "media-full");
  await root.scrollIntoViewIfNeeded();
  await untilReady(root);
  // Buttons, not scrollWidth: a touch hit area deliberately reaches past the last button.
  const room = await root.locator(".fa-media-bar").evaluate((element) => element.getBoundingClientRect().right - Math.max(...Array.from(element.querySelectorAll("button")).filter((button) => button.offsetParent !== null).map((button) => button.getBoundingClientRect().right)));
  expect(room).toBeGreaterThanOrEqual(0);
  const viewport = page.viewportSize()!;
  const box = (await root.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await control(root, "Settings").click();
  await page.getByRole("menuitem", { name: "View" }).click();
  await expect(page.getByRole("menuitemradio", { name: "Mini player" })).toBeVisible();
  await page.getByRole("menuitemradio", { name: "Mini player" }).click();
  const stage = root.locator(".fa-media-stage");
  await expect.poll(async () => (await stage.boundingBox())!.width).toBeLessThan(viewport.width);
  const floating = (await stage.boundingBox())!;
  expect(floating.x).toBeGreaterThanOrEqual(0);
  expect(floating.x + floating.width).toBeLessThanOrEqual(viewport.width);
  expect(errors).toEqual([]);
});

test("the bar never overflows, from the narrowest mini player to a wide page @responsive", async ({ page }) => {
  await open(page);
  const root = player(page, "media-full");
  await root.scrollIntoViewIfNeeded();
  await untilReady(root);
  for (const width of [240, 280, 320, 360, 416, 480, 620, 700]) {
    const fit = await root.evaluate((element, size) => {
      const box = element.parentElement as HTMLElement;
      box.style.width = `${size}px`;
      const bar = element.querySelector(".fa-media-bar") as HTMLElement;
      const stage = element.querySelector(".fa-media-stage")!.getBoundingClientRect();
      const visible = Array.from(bar.querySelectorAll("button")).filter((button) => button.offsetParent !== null);
      const right = bar.getBoundingClientRect().right;
      return {
        outside: visible.filter((button) => button.getBoundingClientRect().right > Math.min(right, stage.right) + 0.5).length,
        names: visible.map((button) => button.getAttribute("aria-label")),
      };
    }, width);
    expect(fit.outside, `${width}px`).toBe(0);
    expect(fit.names, `${width}px`).toContain("Settings");
    expect(fit.names, `${width}px`).toContain("Play");
  }
});

test("a tap shows the controls, a double tap seeks, and a swipe on the bar scrubs @responsive", async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== "chromium" || !isMobile, "touch input through the Chromium protocol");
  await open(page);
  const root = player(page, "media-views");
  await root.scrollIntoViewIfNeeded();
  await playFrom(page, root, 8);
  const video = root.locator("video");
  const box = (await root.boundingBox())!;
  const client = await page.context().newCDPSession(page);
  const tapAt = async (x: number, y: number) => {
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const before = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
  await tapAt(box.x + box.width * 0.85, box.y + box.height / 2);
  await page.waitForTimeout(40);
  await tapAt(box.x + box.width * 0.85, box.y + box.height / 2);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(before + 8);

  const seek = (await root.locator(".fa-media-seek").boundingBox())!;
  const y = seek.y + seek.height / 2;
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: seek.x + seek.width * 0.1, y }] });
  for (let step = 2; step <= 8; step += 1) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: seek.x + seek.width * (step / 10), y }] });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(18);
});

for (const [name, appearance] of Object.entries({
  "compact, large scale, square, heavy lines": { density: "compact", uiScale: 1.25, radiusScale: 0, lineWeight: "bold" },
  "dark, small scale, round": { mode: "dark", uiScale: 0.875, radiusScale: 1.5 },
  solid: { glass: "solid" },
})) {
  test(`the player keeps its geometry: ${name}`, async ({ page }) => {
    await open(page, "/components/video-player", appearance);
    const root = player(page, "media-full");
    await root.scrollIntoViewIfNeeded();
    await untilReady(root);
    const measures = await root.evaluate((element) => {
      const bar = element.querySelector(".fa-media-bar")!;
      const controls = element.querySelector(".fa-media-controls")!;
      const stage = element.querySelector(".fa-media-stage")!;
      const box = stage.getBoundingClientRect();
      const barBox = bar.getBoundingClientRect();
      const inner = getComputedStyle(controls);
      const button = bar.querySelector("button")!.getBoundingClientRect();
      return {
        ratio: box.width / box.height,
        barLeft: barBox.left - box.left,
        barRight: box.right - barBox.right,
        padding: parseFloat(inner.paddingInlineStart),
        insideX: barBox.left >= box.left && barBox.right <= box.right,
        insideY: barBox.bottom <= box.bottom,
        button: button.height,
        token: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--control-h-sm")) * parseFloat(getComputedStyle(document.documentElement).fontSize),
      };
    });
    expect(measures.ratio).toBeCloseTo(16 / 9, 1);
    expect(measures.barLeft).toBeCloseTo(measures.padding, 0);
    expect(measures.barRight).toBeCloseTo(measures.padding, 0);
    expect(measures.insideX && measures.insideY).toBe(true);
    expect(measures.button).toBeGreaterThan(0);
    expect(Math.abs(measures.button - measures.token)).toBeLessThanOrEqual(1);
  });
}

test("playing publishes to Media Session, and pausing updates it", async ({ page }) => {
  await open(page);
  const root = player(page, "media-full");
  await root.scrollIntoViewIfNeeded();
  await playFrom(page, root, 1);
  await expect.poll(() => page.evaluate(() => navigator.mediaSession.metadata?.title)).toBe("Tide survey, Cedar Inlet");
  await expect.poll(() => page.evaluate(() => navigator.mediaSession.playbackState)).toBe("playing");
  await root.locator("video").evaluate((video: HTMLVideoElement) => video.pause());
  await expect.poll(() => page.evaluate(() => navigator.mediaSession.playbackState)).toBe("paused");
});

test("Still leaves nothing to animate", async ({ page }) => {
  await open(page);
  const root = player(page, "media-full");
  const seconds = (selector: string) => root.locator(selector).evaluate((element) => Math.max(...getComputedStyle(element).transitionDuration.split(",").map(parseFloat)));
  expect(await seconds(".fa-media-controls")).toBeLessThan(0.02);
  expect(await seconds(".fa-media-seek-track")).toBeLessThan(0.02);
});

test("fill takes the parent's height and offers only the modes it was given", async ({ page }) => {
  await open(page);
  const box = page.getByTestId("media-fill");
  await box.scrollIntoViewIfNeeded();
  const root = box.locator(".fa-media");
  await untilReady(root);
  await hover(root);
  const parent = (await box.boundingBox())!;
  const stage = (await root.locator(".fa-media-stage").boundingBox())!;
  expect(stage.height).toBeCloseTo(parent.height, 0);
  expect(stage.width).toBeCloseTo(parent.width, 0);
  await expect(control(root, "Maximise")).toHaveCount(0);
  await expect(control(root, "Mini player")).toHaveCount(0);
  await expect(control(root, "Full screen")).toBeVisible();
});

test("controls keep the dark shade on a light page", async ({ page }) => {
  await open(page);
  const root = player(page, "media-full");
  const colours = await root.evaluate((element) => {
    const controls = element.querySelector(".fa-media-controls") as HTMLElement;
    const probe = document.createElement("span");
    probe.style.color = "var(--_shade)";
    controls.append(probe);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    const luminance = (colour: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = colour;
      context.fillRect(0, 0, 1, 1);
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
      return (0.2126 * red! + 0.7152 * green! + 0.0722 * blue!) / 255;
    };
    const shade = luminance(getComputedStyle(probe).color);
    const text = luminance(getComputedStyle(controls).color);
    probe.remove();
    return { shade, text };
  });
  expect(colours.shade).toBeLessThan(0.3);
  expect(colours.text).toBeGreaterThan(0.7);
});

test("focus rings are not cut by the frame or the page's clip", async ({ page }) => {
  await open(page);
  const root = player(page, "media-full");
  await root.scrollIntoViewIfNeeded();
  await untilReady(root);
  await root.getByRole("button", { name: "Play" }).first().focus();
  await page.keyboard.press("Tab");
  const room = await root.evaluate((element) => {
    const stage = element.querySelector(".fa-media-stage")!.getBoundingClientRect();
    const reach = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--focus-reach"));
    const buttons = Array.from(element.querySelectorAll<HTMLElement>(".fa-media-bar button")).map((button) => button.getBoundingClientRect());
    return {
      reach,
      left: Math.min(...buttons.map((box) => box.left)) - stage.left,
      right: stage.right - Math.max(...buttons.map((box) => box.right)),
      bottom: stage.bottom - Math.max(...buttons.map((box) => box.bottom)),
    };
  });
  expect(room.left).toBeGreaterThanOrEqual(room.reach);
  expect(room.right).toBeGreaterThanOrEqual(room.reach);
  expect(room.bottom).toBeGreaterThanOrEqual(room.reach);
});

test("axe finds nothing on the page or in a covering mode", async ({ page }) => {
  await open(page);
  const inline = await new AxeBuilder({ page }).include(".gallery-document-sections").analyze();
  expect(inline.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
  await page.goto("/components/video-player?media-demo=maximised");
  await expect(page.getByTestId("media-fixed").locator(".fa-media-shell")).toHaveAttribute("data-layer", "maximised");
  const covered = await new AxeBuilder({ page }).include(".fa-media-stage").analyze();
  expect(covered.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
  await page.goto("/components/video-player?media-demo=windowed");
  await expect(page.getByTestId("media-fixed").locator(".fa-media-shell")).toHaveAttribute("data-layer", "windowed");
  const floating = await new AxeBuilder({ page }).include(".fa-media").analyze();
  expect(floating.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
});

test("Tab stays inside maximised, and a menu opens over it", async ({ page }) => {
  await open(page, "/components/video-player?media-demo=maximised");
  const root = page.getByTestId("media-fixed").locator(".fa-media");
  await expect(root.locator(".fa-media-shell")).toHaveAttribute("data-layer", "maximised");
  await untilReady(root);
  await expect(root.locator(".fa-media-stage")).toHaveRole("dialog");
  await root.locator(".fa-media-stage").focus();
  for (let press = 0; press < 22; press += 1) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest(".fa-media-stage")))).toBe(true);
  }
  await page.mouse.move(400, 300);
  await control(root, "Settings").click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  // Painted above the top-layer player: the hit test at its centre finds the menu.
  const box = (await menu.boundingBox())!;
  const hit = await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest(".fa-menu")), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  expect(hit).toBe(true);
  // One Escape closes the menu, not the mode.
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(root.locator(".fa-media-shell")).toHaveAttribute("data-layer", "maximised");
  await page.keyboard.press("Escape");
  await expect(root.locator(".fa-media-shell")).toHaveAttribute("data-layer", "inline");
});
