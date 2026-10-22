import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

/*
 * Full screen (0.9.7): a managed window's Full screen control puts its frame in full screen
 * with the Fullscreen API. The app bar and status bar go, the body fills the screen, the body
 * learns it from useWindow().fullscreen and draws its own tools, and popups open inside.
 */

test("Full screen fills the screen with the body, popups open inside, and Exit returns the frame", async ({ page }) => {
  await page.goto("/components/workspace");
  await page.getByRole("button", { name: "Connect" }).first().click();
  const frame = page.locator('[data-window-kind="gallery.screen"]');
  await expect(frame).toBeVisible({ timeout: 30_000 });
  await expect(frame.locator(".fa-window-appbar").getByRole("button", { name: "Send keys" })).toBeVisible();

  await frame.getByRole("button", { name: "Full screen Remote control" }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.getAttribute("data-window-kind"))).toBe("gallery.screen");
  await expect(frame).toHaveAttribute("data-fullscreen", "");

  const viewport = page.viewportSize()!;
  const layout = await frame.evaluate((element) => {
    const box = (node: Element | null) => node?.getBoundingClientRect();
    const body = box(element.querySelector(".fa-window-body"))!;
    return {
      frame: box(element)!.toJSON(),
      body: body.toJSON(),
      appbar: getComputedStyle(element.querySelector(".fa-window-appbar")!).display,
      status: getComputedStyle(element.querySelector(".fa-window-status")!).display,
      radius: getComputedStyle(element).borderTopLeftRadius,
    };
  });
  expect(layout.appbar).toBe("none");
  expect(layout.status).toBe("none");
  expect(layout.radius).toBe("0px");
  // Opaque: the frame paints its own solid fill and drops the translucent glass layer.
  const paint = await frame.evaluate((element) => ({
    clip: getComputedStyle(element).backgroundClip,
    image: getComputedStyle(element).backgroundImage,
    layer: getComputedStyle(element, "::before").display,
    fill: getComputedStyle(element).backgroundColor,
  }));
  expect(paint.clip).toBe("border-box");
  expect(paint.image).toBe("none");
  expect(paint.layer).toBe("none");
  expect(paint.fill).not.toMatch(/\/\s*0?\.\d|rgba\(.*,\s*0?\.\d+\)|transparent/);
  for (const rect of [layout.frame, layout.body]) {
    expect(rect.x).toBeCloseTo(0, 0);
    expect(rect.y).toBeCloseTo(0, 0);
    expect(rect.width).toBeCloseTo(viewport.width, 0);
    expect(rect.height).toBeCloseTo(viewport.height, 0);
  }

  // The body's own tools float over the screen; their menu opens inside the full-screen frame.
  const tools = frame.getByRole("toolbar", { name: "Remote control of NST-C106" });
  await expect(tools).toBeVisible();
  await tools.getByRole("button", { name: "Send keys" }).click();
  const item = page.getByRole("menuitem", { name: "Ctrl+Alt+Del" });
  await expect(item).toBeVisible();
  expect(await item.evaluate((element) => document.fullscreenElement?.contains(element))).toBe(true);
  const hit = await item.evaluate((element) => {
    const r = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  });
  expect(hit).toBe(true);

  const result = await new AxeBuilder({ page }).include('[data-window-kind="gallery.screen"]').analyze();
  expect(result.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);

  // A toast raised in full screen shows there too.
  await item.click();
  const sent = page.getByText("Sent Ctrl+Alt+Del to NST-C106");
  await expect(sent).toBeVisible();
  expect(await sent.evaluate((element) => document.fullscreenElement?.contains(element))).toBe(true);

  await tools.getByRole("button", { name: "Exit full screen" }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
  await expect(frame).not.toHaveAttribute("data-fullscreen");
  await expect(frame.locator(".fa-window-appbar")).toBeVisible();
  await expect(frame.locator(".fa-window-appbar").getByRole("button", { name: "Send keys" })).toBeVisible();
  await expect(tools).toBeHidden();
});

test("the anatomy frame shows Full screen beside Pop out", async ({ page }) => {
  await page.goto("/components/window-frame");
  const controls = page.getByRole("group", { name: "Window controls" }).first();
  await expect(controls).toBeVisible({ timeout: 30_000 });
  const order = await controls.locator("[data-control]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-control")));
  expect(order.slice(0, 2)).toEqual(["popout", "fullscreen"]);
});
