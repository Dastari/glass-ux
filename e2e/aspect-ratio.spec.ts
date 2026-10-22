import { expect, test } from "@playwright/test";

interface Box {
  width: number;
  height: number;
  left: number;
  rowLeft: number;
  rowWidth: number;
  radius: string;
  fit: string | null;
  child: { width: number; height: number } | null;
}

test("aspect ratio keeps its shape, narrows under a max height and fits media @responsive", async ({ page }) => {
  await page.goto("/components/aspect-ratio");
  const boxes = page.locator(".fa-aspect-ratio");
  await expect(boxes).toHaveCount(4);
  await page.evaluate(() => Promise.all(Array.from(document.images, (image) => image.decode().catch(() => undefined))));
  const measured: Box[] = await boxes.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      const row = element.parentElement!.getBoundingClientRect();
      const child = element.firstElementChild?.getBoundingClientRect();
      const media = element.querySelector("img");
      return {
        width: box.width,
        height: box.height,
        left: box.left,
        rowLeft: row.left,
        rowWidth: row.width,
        radius: getComputedStyle(element).borderTopLeftRadius,
        fit: media ? getComputedStyle(media).objectFit : null,
        child: child ? { width: child.width, height: child.height } : null,
      };
    }),
  );
  const [screen, cover, contain, phone] = measured;

  // "2560 / 1440" is 16:9, and the drawn screen fills the box.
  expect(screen.width / screen.height).toBeCloseTo(16 / 9, 1);
  expect(screen.child).toEqual({ width: screen.width, height: screen.height });
  expect(parseFloat(screen.radius)).toBeGreaterThan(0);

  for (const box of [cover, contain]) {
    expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
    expect(box.child).toEqual({ width: box.width, height: box.height });
  }
  expect(cover.fit).toBe("cover");
  expect(contain.fit).toBe("contain");

  // maxHeight 240 on 9:16: the box is 240 tall, 135 wide, centred in its row.
  expect(phone.height).toBeCloseTo(240, 0);
  expect(phone.width).toBeCloseTo(135, 0);
  expect(Math.abs(phone.left - phone.rowLeft - (phone.rowWidth - phone.width) / 2)).toBeLessThan(1);
  expect(parseFloat(phone.radius)).toBeGreaterThan(parseFloat(screen.radius));
});
