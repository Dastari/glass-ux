import { expect, test, type Locator, type Page } from "@playwright/test";

const tileHost = "tiles.openfreemap.org";

async function prepareMapReadback(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "glass-ux.appearance.v1",
      JSON.stringify({ mode: "light", palette: "ocean", motion: "reduced" }),
    );
    // Preserve the real WebGL output for pixel inspection. DOM pins and CSS wells
    // cannot satisfy the check: only basemap features paint this canvas.
    const nativeGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      options?: unknown,
    ) {
      return Reflect.apply(nativeGetContext, this, [
        type,
        type === "webgl2" || type === "webgl"
          ? {
              ...(options as WebGLContextAttributes | undefined),
              preserveDrawingBuffer: true,
            }
          : options,
      ]);
    } as typeof nativeGetContext;
  });
}

async function canvasOutput(canvas: Locator) {
  return canvas.evaluate((element: HTMLCanvasElement) => {
    const gl = element.getContext("webgl2") ?? element.getContext("webgl");
    if (!gl) throw new Error("The basemap did not create a WebGL context.");
    const pixels = new Uint8Array(
      gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
    );
    gl.readPixels(
      0,
      0,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    let painted = 0;
    let signature = 2166136261;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3]! > 0) painted++;
      signature = Math.imul(signature ^ pixels[index]!, 16777619);
      signature = Math.imul(signature ^ pixels[index + 1]!, 16777619);
      signature = Math.imul(signature ^ pixels[index + 2]!, 16777619);
    }
    return { painted, signature };
  });
}

function providerResponses(page: Page) {
  return Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.hostname === tileHost && url.pathname === "/planet" && response.ok()
      );
    }),
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.hostname === tileHost &&
        url.pathname.startsWith("/planet/") &&
        url.pathname.endsWith(".pbf") &&
        response.ok()
      );
    }),
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.hostname === tileHost &&
        url.pathname.startsWith("/fonts/") &&
        url.pathname.endsWith(".pbf") &&
        response.ok()
      );
    }),
  ]);
}

test("coordinate picker downloads key-free tiles and paints a theme-aware street background", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await prepareMapReadback(page);
  const sources = providerResponses(page);
  await page.goto("./components/coordinates-field");
  const form = page.locator("#examples").getByTestId("coordinates-form");
  await form.getByRole("button", { name: "Pick on map", exact: true }).click();
  const map = page.locator(".fa-coordinates-popup .fa-pin-map");
  await expect(map).toHaveAttribute("data-phase", "ready");
  for (const response of await sources) {
    expect((await response.body()).byteLength, response.url()).toBeGreaterThan(
      100,
    );
  }
  const canvas = map.locator("canvas");
  await expect
    .poll(async () => (await canvasOutput(canvas)).painted)
    .toBeGreaterThan(1000);
  await expect(
    map.getByRole("link", { name: "© OpenStreetMap", exact: true }),
  ).toBeVisible();
  await expect(
    map.getByRole("link", { name: "© OpenMapTiles", exact: true }),
  ).toBeVisible();
  const initial = await canvasOutput(canvas);
  await page.keyboard.press("Escape");
  await page
    .getByRole("region", { name: "Appearance controls", exact: true })
    .getByRole("button", { name: "Dark", exact: true })
    .click();
  await form.getByRole("button", { name: "Pick on map", exact: true }).click();
  await expect(map).toHaveAttribute("data-phase", "ready");
  await expect
    .poll(async () => (await canvasOutput(canvas)).painted)
    .toBeGreaterThan(1000);
  await expect
    .poll(async () => (await canvasOutput(canvas)).signature)
    .not.toBe(initial.signature);
  const input = form.getByRole("textbox", {
    name: "Site position",
    exact: true,
  });
  const before = await input.inputValue();
  const pin = map.getByRole("button", { name: /^Pin at/ });
  await pin.focus();
  await pin.press("ArrowRight");
  await expect(input).not.toHaveValue(before);
});

test("address previews paint basemap features behind their location pin", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await prepareMapReadback(page);
  const sources = providerResponses(page);
  await page.goto("./components/address-view");
  const map = page.locator("#address-view .fa-pin-map").first();
  await expect(map).toHaveAttribute("data-phase", "ready");
  await sources;
  await expect
    .poll(async () => (await canvasOutput(map.locator("canvas"))).painted)
    .toBeGreaterThan(1000);
  await expect(
    map.getByRole("link", { name: "© OpenStreetMap", exact: true }),
  ).toBeVisible();
});
