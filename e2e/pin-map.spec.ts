import { expect, test, type Locator, type Page } from "@playwright/test";

/* PinMap: what moves the camera, where the pin lands, its cursors, the wheel, and the picker around it. */

async function openPicker(page: Page, testId = "coordinates-paste") {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "ocean", motion: "reduced" })),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./components/coordinates-field");
  const field = page.getByTestId(testId);
  await field.scrollIntoViewIfNeeded();
  await field.getByRole("button", { name: "Pick on map", exact: true }).click();
  const map = page.locator(".fa-coordinates-popup .fa-pin-map");
  await expect(map).toHaveAttribute("data-phase", "ready", { timeout: 60_000 });
  return { field, map, input: field.getByRole("textbox") };
}

/** The dev server exposes the engine on the map's element. */
const state = (map: Locator) =>
  map.evaluate((element) => {
    // oxlint-disable-next-line typescript/no-explicit-any -- a test reaching a dev-only handle
    const engine = (element as any).glassUxPinEngine;
    const center = engine.map.getCenter();
    const pin = engine.placed ? engine.marker.getLngLat() : null;
    const box = element.getBoundingClientRect();
    return {
      zoom: engine.map.getZoom() as number,
      center: { lng: center.lng as number, lat: center.lat as number },
      pin: pin ? { lng: pin.lng as number, lat: pin.lat as number } : null,
      pinPx: pin ? { x: box.left + engine.map.project(pin).x, y: box.top + engine.map.project(pin).y } : null,
    };
  });
/** Screen pixels between two points at a zoom. */
const pixels = (a: { lng: number; lat: number }, b: { lng: number; lat: number }, zoom: number) => {
  const degrees = 360 / (512 * 2 ** zoom);
  return { x: (b.lng - a.lng) / degrees, y: (b.lat - a.lat) / (degrees * Math.cos((a.lat * Math.PI) / 180)) };
};
async function placePin(map: Locator, page: Page) {
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await expect(map.locator(".fa-pin-map-pin")).toBeVisible();
  await expect.poll(async () => (await state(map)).pin).not.toBeNull();
}
async function drag(page: Page, map: Locator, grab: number, by: number) {
  const box = (await map.locator(".fa-pin-map-pin").boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2 + grab;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 12; step += 1) await page.mouse.move(x + (by * step) / 12, y);
  await page.mouse.up();
}

test.describe("the camera", () => {
  test("stays put for a drag, a click and a nudge inside the map", async ({ page }) => {
    const { map } = await openPicker(page);
    await placePin(map, page);
    const start = await state(map);
    await drag(page, map, 0, 40);
    await page.waitForTimeout(300);
    let now = await state(map);
    expect(now.center).toEqual(start.center);
    expect(now.zoom).toBe(start.zoom);
    expect(now.pin).not.toEqual(start.pin);

    const box = (await map.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.3);
    await page.waitForTimeout(300);
    now = await state(map);
    expect(now.center).toEqual(start.center);
    expect(now.zoom).toBe(start.zoom);

    await map.locator(".fa-pin-map-pin").focus();
    const before = now.pin;
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    now = await state(map);
    expect(now.center).toEqual(start.center);
    expect(now.pin).not.toEqual(before);
  });

  test("moves for a value from outside", async ({ page }) => {
    const { map, input } = await openPicker(page);
    await placePin(map, page);
    const start = await state(map);
    await input.fill("-42.88334, 147.32688");
    await expect.poll(async () => (await state(map)).pin?.lat).toBeCloseTo(-42.88334, 4);
    await expect.poll(async () => (await state(map)).center.lat).toBeCloseTo(-42.88334, 3);
    expect((await state(map)).center).not.toEqual(start.center);
  });
});

test.describe("the pin", () => {
  for (const [where, grab] of [["its body", 0], ["near its tip", 14], ["its head", -8]] as const) {
    test(`lands exactly as far as it was dragged, grabbed by ${where}`, async ({ page }) => {
      const { map, input } = await openPicker(page);
      await placePin(map, page);
      const start = await state(map);
      await drag(page, map, grab, 60);
      await page.waitForTimeout(300);
      const end = await state(map);
      const moved = pixels(start.pin!, end.pin!, end.zoom);
      expect(moved.x).toBeCloseTo(60, 0);
      expect(Math.abs(moved.y)).toBeLessThan(1);
      // What the host was given is the dropped point, not the cursor's.
      const [lat, lng] = (await input.inputValue()).split(",").map(Number);
      expect(lat).toBeCloseTo(end.pin!.lat, 4);
      expect(lng).toBeCloseTo(end.pin!.lng, 4);
    });
  }

  test("marks the point with its very tip, where it was clicked", async ({ page }) => {
    const { map } = await openPicker(page);
    const box = (await map.boundingBox())!;
    const at = { x: Math.round(box.x + box.width * 0.4), y: Math.round(box.y + box.height * 0.6) };
    await page.mouse.click(at.x, at.y);
    const icon = map.locator(".fa-pin-map-pin svg");
    await expect(icon).toBeVisible();
    const tip = await icon.evaluate((svg) => {
      const rect = svg.getBoundingClientRect();
      // The icon's outline comes to its point at (12, 21.5) of 24.
      return { x: rect.left + rect.width / 2, y: rect.top + (rect.height * 21.5) / 24 };
    });
    expect(Math.abs(tip.x - at.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(tip.y - at.y)).toBeLessThanOrEqual(1);
  });
});

test.describe("the cursor", () => {
  const canvasCursor = (map: Locator) =>
    map.locator(".maplibregl-canvas-container").evaluate((element) => getComputedStyle(element).cursor);

  test("is a crosshair where a click places the pin, and grabs while dragging", async ({ page }) => {
    const { map } = await openPicker(page);
    expect(await canvasCursor(map)).toBe("crosshair");
    await placePin(map, page);
    expect(await map.locator(".fa-pin-map-pin").evaluate((pin) => getComputedStyle(pin).cursor)).toBe("grab");
    // Panning the map.
    const box = (await map.boundingBox())!;
    await page.mouse.move(box.x + 30, box.y + 40);
    await page.mouse.down();
    await expect.poll(() => canvasCursor(map)).toBe("crosshair");
    await page.mouse.move(box.x + 60, box.y + 60, { steps: 4 });
    await page.mouse.move(box.x + 90, box.y + 80, { steps: 4 });
    await expect.poll(() => canvasCursor(map)).toBe("grabbing");
    await page.mouse.up();
    await expect.poll(() => canvasCursor(map)).toBe("crosshair");
  });

  test("is left alone on a read-only map", async ({ page }) => {
    await page.goto("./components/address-view");
    const map = page.locator("#address-view .fa-pin-map").first();
    await expect(map).toHaveAttribute("data-phase", "ready", { timeout: 60_000 });
    const cursor = await map.locator(".maplibregl-canvas-container").evaluate((element) => getComputedStyle(element).cursor);
    expect(cursor).toBe("grab");
  });
});

test.describe("the wheel", () => {
  /** The map on the page itself, which is what a form's scroll passes over. */
  async function pageMap(page: Page) {
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.goto("./components/address-view");
    const map = page.locator("#address-view .fa-pin-map").first();
    await expect(map).toHaveAttribute("data-phase", "ready", { timeout: 60_000 });
    await map.scrollIntoViewIfNeeded();
    return map;
  }
  const scrollTop = (page: Page) =>
    page.evaluate(() => {
      let top = document.scrollingElement?.scrollTop ?? 0;
      for (const element of document.querySelectorAll("*")) top += element.scrollTop;
      return top;
    });

  test("zooms at the cursor, without scrolling what is behind", async ({ page }) => {
    const map = await pageMap(page);
    const box = (await map.boundingBox())!;
    const at = { x: box.x + box.width * 0.25, y: box.y + box.height * 0.3 };
    await page.mouse.move(at.x, at.y);
    await page.waitForTimeout(500);
    const under = () =>
      map.evaluate((element, at) => {
        const rect = element.getBoundingClientRect();
        // oxlint-disable-next-line typescript/no-explicit-any -- a test reaching a dev-only handle
        const point = (element as any).glassUxPinEngine.map.unproject([at.x - rect.left, at.y - rect.top]);
        return { lng: point.lng as number, lat: point.lat as number };
      }, at);
    const before = await state(map);
    const point = await under();
    const top = await scrollTop(page);
    await page.mouse.wheel(0, -240);
    await expect.poll(async () => (await state(map)).zoom).toBeGreaterThan(before.zoom + 0.1);
    await page.waitForTimeout(600);
    const after = await under();
    const zoom = (await state(map)).zoom;
    const drift = pixels(point, after, zoom);
    expect(Math.abs(drift.x)).toBeLessThan(3);
    expect(Math.abs(drift.y)).toBeLessThan(3);
    expect(await scrollTop(page)).toBe(top);
  });

  test("lets a scroll that began elsewhere carry on past the map, until it settles", async ({ page }) => {
    const map = await pageMap(page);
    const box = (await map.boundingBox())!;
    // Scrolling beside the map, then the same scroll with the map under the cursor.
    await page.mouse.move(box.x + box.width + 40 > 1400 ? 10 : box.x + box.width + 40, box.y);
    await page.mouse.wheel(0, 60);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const before = await state(map);
    const top = await scrollTop(page);
    await page.mouse.wheel(0, 60);
    await page.waitForTimeout(100);
    expect((await state(map)).zoom).toBe(before.zoom);
    await expect.poll(() => scrollTop(page)).toBeGreaterThanOrEqual(top);
    // The wheel has been still: now the person has stopped on the map.
    await page.waitForTimeout(600);
    const current = (await map.boundingBox())!;
    await page.mouse.move(current.x + current.width / 2, current.y + current.height / 2);
    await page.mouse.wheel(0, -240);
    await expect.poll(async () => (await state(map)).zoom).toBeGreaterThan(before.zoom + 0.1);
  });
});

test.describe("Go to my location", () => {
  const position = { latitude: -41.45, longitude: 147.13 };

  test("moves the map there without placing the pin", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation(position);
    const { map, input } = await openPicker(page);
    const popup = page.locator(".fa-coordinates-popup");
    const go = popup.locator(".fa-popover-header").getByRole("button", { name: "Go to my location" });
    await go.click();
    await expect.poll(async () => (await state(map)).center.lat).toBeCloseTo(position.latitude, 3);
    expect((await state(map)).center.lng).toBeCloseTo(position.longitude, 3);
    expect((await state(map)).pin).toBeNull();
    await expect(input).toHaveValue("");
    await expect(map.locator(".fa-pin-map-pin")).toHaveCount(0);
  });

  test("is hidden where the browser has no geolocation", async ({ page }) => {
    await page.addInitScript(() => {
      delete (Navigator.prototype as unknown as { geolocation?: unknown }).geolocation;
    });
    await openPicker(page);
    await expect(page.locator(".fa-coordinates-popup .fa-popover-title")).toBeVisible();
    await expect(page.getByRole("button", { name: "Go to my location" })).toHaveCount(0);
  });
});

test.describe("the picker in a scrolling dialog", () => {
  test("closes when its button leaves the view, without pulling the dialog back", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("./components/coordinates-field");
    await page.getByRole("button", { name: "Open site settings" }).click();
    const body = page.getByTestId("coordinates-dialog-body");
    await body.getByRole("button", { name: "Pick on map", exact: true }).click();
    const popup = page.locator(".fa-coordinates-popup");
    await expect(popup).toBeVisible();
    await body.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(popup).toHaveCount(0);
    await page.waitForTimeout(200);
    expect(await body.evaluate((element) => element.scrollTop)).toBeGreaterThan(100);
  });

  test("stays open while its button is in view", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("./components/coordinates-field");
    await page.getByRole("button", { name: "Open site settings" }).click();
    const body = page.getByTestId("coordinates-dialog-body");
    await body.getByRole("button", { name: "Pick on map", exact: true }).click();
    const popup = page.locator(".fa-coordinates-popup");
    await expect(popup).toBeVisible();
    await body.evaluate((element) => {
      element.scrollTop = 4;
    });
    await page.waitForTimeout(300);
    await expect(popup).toBeVisible();
  });
});
