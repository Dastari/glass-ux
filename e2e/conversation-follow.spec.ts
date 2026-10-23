import { expect, test } from "@playwright/test";

/*
 * A reader at the end of a ConversationLog stays at the end while an answer streams in chunks
 * and completes (0.9.9 regression: the log could stop short once the answer completed, with
 * "New messages" showing). The distance from the end is sampled in a ResizeObserver created
 * after the log's own, so each sample is the position as that frame is painted.
 */

for (const throttle of [1, 4])
  test(`a reader at the end stays there while an answer streams and completes (CPU x${throttle})`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() =>
      localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })),
    );
    await page.goto("/components/conversation-log");
    const log = page.getByTestId("conversation-follow");
    await expect(log.locator(".fa-ai-conversation-scroll")).toBeVisible({ timeout: 30_000 });
    await log.scrollIntoViewIfNeeded();
    if (throttle > 1) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
    }
    await log.evaluate((root) => {
      const scroller = root.querySelector<HTMLElement>(".fa-ai-conversation-scroll")!;
      const state = { worst: 0, pill: false };
      const sample = () => {
        state.worst = Math.max(state.worst, scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight);
        state.pill ||= root.querySelector(".fa-ai-new-pill[data-visible]") !== null;
      };
      const observer = new ResizeObserver(sample);
      observer.observe(scroller);
      observer.observe(scroller.firstElementChild!);
      observer.observe(root.querySelector(".fa-ai-conversation-float")!);
      (window as unknown as { __follow: typeof state }).__follow = state;
    });
    const composer = log.getByRole("textbox", { name: "Message the assistant" });
    await composer.fill("Is the queue empty?");
    await composer.press("Enter");
    await expect(log.locator(".fa-ai-msg[data-state='complete'][data-latest]").last()).toContainText("I can update the driver tonight", { timeout: 30_000 });
    const scroller = log.locator(".fa-ai-conversation-scroll");
    await expect.poll(() => scroller.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(4);
    const seen = await page.evaluate(() => (window as unknown as { __follow: { worst: number; pill: boolean } }).__follow);
    expect(seen.worst).toBeLessThan(4);
    expect(seen.pill).toBe(false);
    await expect(log.getByRole("button", { name: "New messages" })).toBeHidden();
  });

test("a reader who scrolled up is not moved, and New messages appears", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/components/conversation-log");
  const log = page.getByTestId("conversation-follow");
  const scroller = log.locator(".fa-ai-conversation-scroll");
  await expect(scroller).toBeVisible({ timeout: 30_000 });
  await log.scrollIntoViewIfNeeded();
  const composer = log.getByRole("textbox", { name: "Message the assistant" });
  await composer.fill("Is the queue empty?");
  await composer.press("Enter");
  await expect(log.locator(".fa-ai-msg[data-state='streaming']")).toHaveCount(1);
  await scroller.evaluate((element) => element.scrollBy({ top: -400 }));
  const top = await scroller.evaluate((element) => element.scrollTop);
  await expect(log.getByRole("button", { name: "New messages" })).toBeVisible({ timeout: 30_000 });
  expect(await scroller.evaluate((element) => element.scrollTop)).toBe(top);
});
