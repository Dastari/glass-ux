import { expect, test, type Locator, type Page } from "@playwright/test";

/* #40: a radius around PinMap's pin with a handle that resizes it, and areas around GeoMap points. */

async function openRadius(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "ocean", motion: "reduced" })),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./components/pin-map");
  const demo = page.getByTestId("pin-map-radius");
  await demo.scrollIntoViewIfNeeded();
  const map = demo.locator(".fa-pin-map");
  await expect(map).toHaveAttribute("data-phase", "ready", { timeout: 60_000 });
  return { demo, map, handle: demo.getByRole("slider", { name: "Geofence radius" }), field: demo.getByRole("textbox", { name: "Geofence radius" }) };
}

/** The circle as drawn: its centre and its east edge's distance from the pin, in metres and pixels (dev server only). */
const circle = (map: Locator) =>
  map.evaluate((element) => {
    // oxlint-disable-next-line typescript/no-explicit-any -- a test reaching a dev-only handle
    const engine = (element as any).glassUxPinEngine;
    // oxlint-disable-next-line typescript/no-explicit-any -- MapLibre's serialised source
    const data = (engine.map.getStyle().sources.areas as any).data;
    const ring: [number, number][] = data.features[0]?.geometry.coordinates[0] ?? [];
    const pin = engine.marker.getLngLat();
    const R = 6_371_008.8;
    const rad = (d: number) => (d * Math.PI) / 180;
    const metres = ([lng, lat]: [number, number]) => {
      const h = Math.sin(rad(lat - pin.lat) / 2) ** 2 + Math.cos(rad(pin.lat)) * Math.cos(rad(lat)) * Math.sin(rad(lng - pin.lng) / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    };
    const box = element.getBoundingClientRect();
    const handle = engine.handle?.getLngLat();
    const project = (point: { lng: number; lat: number }) => engine.map.project(point);
    return {
      vertices: ring.length,
      radius: ring.length ? metres(ring[0]!) : null,
      pinPx: { x: box.left + project(pin).x, y: box.top + project(pin).y },
      handlePx: handle ? { x: box.left + project(handle).x, y: box.top + project(handle).y } : null,
    };
  });

test("PinMap draws its radius, and the handle, the keys and the field all resize it", async ({ page }) => {
  const { map, handle, field } = await openRadius(page);
  await expect(handle).toHaveAttribute("aria-valuetext", /^200 metres?$/);
  await expect(handle).toHaveAttribute("aria-valuemin", "25");
  await expect(handle).toHaveAttribute("aria-valuemax", "5000");
  const start = await circle(map);
  expect(start.radius).toBeCloseTo(200, 0);
  // The handle sits on the circle's east edge, level with the pin's point.
  expect(start.handlePx!.x).toBeGreaterThan(start.pinPx.x + 20);
  expect(Math.abs(start.handlePx!.y - start.pinPx.y)).toBeLessThan(1);
  const handleBox = (await handle.boundingBox())!;
  expect(Math.abs(handleBox.x + handleBox.width / 2 - start.handlePx!.x)).toBeLessThan(1.5);

  // Keys: a step, ten steps, and the limits; the field follows.
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", "225");
  await expect(field).toHaveValue("225");
  await page.keyboard.press("PageDown");
  await expect(handle).toHaveAttribute("aria-valuenow", "25");
  await page.keyboard.press("End");
  await expect(handle).toHaveAttribute("aria-valuenow", "5000");
  await page.keyboard.press("Home");
  await expect(handle).toHaveAttribute("aria-valuenow", "25");
  await expect.poll(async () => (await circle(map)).radius).toBeCloseTo(25, 0);

  // The field drives the circle and the handle.
  await field.fill("300");
  await field.press("Tab");
  await expect(handle).toHaveAttribute("aria-valuenow", "300");
  await expect.poll(async () => (await circle(map)).radius).toBeCloseTo(300, 0);

  // Dragging the handle outward grows the radius, in whole steps, and leaves the pin alone.
  // (Leaving the field scrolled the page: bring the map back from under the docs header.)
  await map.evaluate((element) => element.scrollIntoView({ block: "center" }));
  const before = await circle(map);
  const from = before.handlePx!;
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 10; step += 1) await page.mouse.move(from.x + step * 6, from.y);
  await page.mouse.up();
  await expect.poll(async () => Number(await handle.getAttribute("aria-valuenow"))).toBeGreaterThan(300);
  const grown = Number(await handle.getAttribute("aria-valuenow"));
  expect(grown % 25).toBe(0);
  const after = await circle(map);
  expect(after.radius).toBeCloseTo(grown, 0);
  expect(after.pinPx.x).toBeCloseTo(before.pinPx.x, 0);
  // Back on the edge, level with the pin.
  expect(Math.abs(after.handlePx!.y - after.pinPx.y)).toBeLessThan(1);
  await expect(field).toHaveValue(String(grown));
});

test("PinMap's circle follows the pin as it moves", async ({ page }) => {
  const { map, demo } = await openRadius(page);
  const pin = demo.locator(".fa-pin-map-pin");
  await pin.focus();
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect.poll(async () => (await circle(map)).radius).toBeCloseTo(200, 0);
  const moved = await circle(map);
  expect(Math.abs(moved.handlePx!.y - moved.pinPx.y)).toBeLessThan(1);
});

test("GeoMap draws each point's area and frames the circles whole", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./components/geo-map");
  const demo = page.getByTestId("map-areas");
  await demo.scrollIntoViewIfNeeded();
  const map = demo.locator(".fa-map").first();
  await expect.poll(() => map.evaluate((element) => Boolean((element as unknown as { glassUxMapEngine?: unknown }).glassUxMapEngine)), { timeout: 60_000 }).toBe(true);
  const drawn = await map.evaluate((element) => {
    // oxlint-disable-next-line typescript/no-explicit-any -- a test reaching a dev-only handle
    const engine = (element as any).glassUxMapEngine;
    // oxlint-disable-next-line typescript/no-explicit-any -- MapLibre's serialised source
    const features = (engine.map.getStyle().sources.areas as any).data.features as Array<{ properties: { id: string }; geometry: { coordinates: [number, number][][] } }>;
    const bounds = engine.map.getBounds();
    const inside = features.every((feature) => feature.geometry.coordinates[0]!.every(([lng, lat]) => bounds.contains([lng, lat])));
    const layers = engine.map.getStyle().layers.map((layer: { id: string }) => layer.id);
    return { ids: features.map((feature) => feature.properties.id).toSorted(), inside, layers };
  });
  expect(drawn.ids).toEqual(["fence-depot", "fence-quarry", "fence-yard"]);
  expect(drawn.inside).toBe(true);
  expect(drawn.layers).toEqual(expect.arrayContaining(["areas-fill", "areas-line"]));
});
