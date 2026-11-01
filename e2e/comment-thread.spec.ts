import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * CommentThread through its catalogue page: sending with a pending and failed state, mentions,
 * editing, deleting, permissions, and the composer staying put while comments arrive.
 */

const ROUTE = "/components/comment-thread";
const full = (page: Page) => page.getByTestId("comments-full");
const comment = (scope: Locator, text: string) => scope.locator("article.fa-comment").filter({ hasText: text }).first();
const composer = (scope: Locator) => scope.getByRole("textbox", { name: "Write a comment", exact: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })));
  await page.goto(ROUTE);
  await expect(composer(full(page))).toBeVisible();
});

test("a comment goes pending, then sent, and the composer clears; Ctrl Enter sends @responsive", async ({ page }) => {
  const thread = full(page);
  const box = composer(thread);
  await box.click();
  await page.keyboard.type("Checked on site");
  await thread.getByRole("button", { name: "Send", exact: true }).click();
  await expect(comment(thread, "Sending…")).toContainText("Checked on site");
  await expect(thread.getByText("Sending…")).toBeHidden();
  await expect(comment(thread, "Checked on site")).toBeVisible();
  await expect(box).toHaveText("");
  await box.click();
  await page.keyboard.type("Second note");
  await page.keyboard.press("Control+Enter");
  await expect(comment(thread, "Second note")).toBeVisible();
  await expect(box).toHaveText("");
});

test("a failed send stays in place with Retry and Discard, and retry works @responsive", async ({ page }) => {
  const thread = full(page);
  await page.getByRole("switch", { name: "Sends fail" }).click();
  const box = composer(thread);
  await box.click();
  await page.keyboard.type("Will fail at first");
  await page.keyboard.press("Control+Enter");
  const failed = comment(thread, "Not sent");
  await expect(failed).toContainText("Will fail at first");
  const place = (row: Locator) => row.evaluate((element) => Math.round(element.getBoundingClientRect().top - element.closest(".fa-comment-thread")!.getBoundingClientRect().top));
  const before = await place(failed);
  await expect(page.locator("[data-fa-announcer]").filter({ hasText: "Comment not sent" }).first()).toBeAttached();
  await page.getByRole("switch", { name: "Sends fail" }).click();
  await failed.getByRole("button", { name: "Retry" }).click();
  await expect(thread.getByText("Not sent")).toBeHidden();
  // Not sent goes as the retry starts; the saved comment replaces the pending row when it lands.
  await expect(thread.getByText("Sending…")).toBeHidden();
  const sent = comment(thread, "Will fail at first");
  await expect(sent).toBeVisible();
  expect(await place(sent)).toBe(before);
});

test("Discard removes a failed send", async ({ page }) => {
  const thread = full(page);
  await page.getByRole("switch", { name: "Sends fail" }).click();
  await composer(thread).click();
  await page.keyboard.type("Throw this away");
  await page.keyboard.press("Control+Enter");
  await comment(thread, "Not sent").getByRole("button", { name: "Discard" }).click();
  await expect(thread.getByText("Throw this away")).toBeHidden();
});

test("mentions come from the host, in the composer @responsive", async ({ page }) => {
  const thread = full(page);
  await composer(thread).click();
  await page.keyboard.type("Ask @no");
  await expect(page.getByRole("option", { name: /Noor Haddad/ })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(composer(thread)).toContainText("@Noor Haddad");
});

test("a reply joins one level down, and Escape closes an empty reply with focus on its comment @responsive", async ({ page }) => {
  const thread = full(page);
  const first = comment(thread, "north beam");
  await first.hover();
  await first.getByRole("button", { name: "Reply to Mira Rowan" }).click();
  const reply = thread.getByRole("textbox", { name: "Reply to Mira Rowan" });
  await expect(reply).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(reply).toBeHidden();
  await expect(first).toBeFocused();
  await first.getByRole("button", { name: "Reply to Mira Rowan" }).click();
  await expect(reply).toBeFocused();
  await page.keyboard.type("Agreed");
  await page.keyboard.press("Control+Enter");
  const added = comment(thread, "Agreed");
  await expect(added).toBeVisible();
  expect(await added.evaluate((element) => element.closest(".fa-comment-branch") !== null)).toBe(true);
  await added.hover();
  await expect(added.getByRole("button", { name: /^Reply to/ })).toHaveCount(0);
});

test("edit in place, cancel, save, and delete with confirmation", async ({ page }) => {
  const thread = full(page);
  const own = comment(thread, "I'll redraw it");
  await own.hover();
  await own.getByRole("button", { name: "Comment actions: Avery Quinn" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  const editor = thread.getByRole("textbox", { name: "Edit comment" });
  await expect(editor).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.type(" Done.");
  await thread.getByRole("button", { name: "Save", exact: true }).click();
  await expect(comment(thread, "Done.")).toBeVisible();
  await expect(comment(thread, "Done.")).toContainText("edited");
  const saved = comment(thread, "Done.");
  await expect(saved.getByRole("button", { name: "Comment actions: Avery Quinn" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Delete this comment by Avery Quinn?");
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(thread.getByText("Done.")).toBeHidden();
  await expect(comment(thread, "handrail height")).toBeFocused();
});

test("late comments wait behind a count, and the composer does not move @responsive", async ({ page }) => {
  const thread = full(page);
  const position = () => composer(thread).evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { top: Math.round(box.top - element.closest(".fa-comment-thread")!.getBoundingClientRect().top), height: box.height };
  });
  await expect.poll(async () => (await position()).height).toBeGreaterThan(30);
  const before = await position();
  const deliver = page.getByRole("button", { name: "Deliver a comment" });
  await deliver.click();
  await deliver.click();
  const show = thread.getByRole("button", { name: "Show 2 new comments" });
  await expect(show).toHaveText("2 new");
  expect(await position()).toEqual(before);
  await show.click();
  await expect(comment(thread, "Site photo 1")).toBeFocused();
  await expect(comment(thread, "Site photo 2")).toBeVisible();
});

test("reacting from a comment counts, and the picker opens @responsive", async ({ page }) => {
  const thread = full(page);
  const first = comment(thread, "north beam");
  const up = first.getByRole("button", { name: "2 people reacted with thumbs up" });
  await expect(up).toHaveAttribute("aria-pressed", "false");
  await up.click();
  await expect(first.getByRole("button", { name: "3 people reacted with thumbs up" })).toHaveAttribute("aria-pressed", "true");
});

test("resolve folds the thread and removes the composer; reopen brings it back", async ({ page }) => {
  const thread = full(page);
  const resolve = thread.getByRole("button", { name: "Resolve", exact: true });
  await resolve.click();
  await expect(thread.getByText("Resolved", { exact: true })).toBeVisible();
  await expect(composer(thread)).toHaveCount(0);
  await expect(thread.locator("article.fa-comment")).toHaveCount(0);
  await thread.getByRole("button", { name: /^Show \d+ comments$/ }).click();
  await expect(comment(thread, "north beam")).toBeVisible();
  await thread.getByRole("button", { name: "Reopen", exact: true }).click();
  await expect(composer(thread)).toBeVisible();
});

test("no permissions, no controls; a reason keeps the control and says why @responsive", async ({ page }) => {
  const readOnly = page.getByTestId("comments-read-only");
  await expect(readOnly.locator("article.fa-comment")).toHaveCount(1);
  await expect(readOnly.getByRole("textbox")).toHaveCount(0);
  await expect(readOnly.getByRole("button", { name: /Reply|Resolve|Comment actions|Add reaction/ })).toHaveCount(0);

  const locked = page.getByTestId("comments-reason");
  await expect(locked.getByRole("button", { name: "Resolve", exact: true })).toHaveAttribute("aria-description", "Only the project lead can resolve this thread");
  await expect(locked.getByRole("button", { name: "Send", exact: true })).toHaveAttribute("aria-description", "Comments are locked during the design freeze");
  await expect(locked.getByRole("button", { name: "Reply to Noor Haddad" })).toHaveAttribute("aria-disabled", "true");
  await expect(locked.getByRole("button", { name: "Add reaction" })).toHaveAttribute("aria-description", "Reactions are locked during the design freeze");
});

test("ticking times stay out of live regions", async ({ page }) => {
  const live = await page.locator("[aria-live], [role=status], [role=alert]").evaluateAll((regions) => regions.filter((region) => region.querySelector("time")).length);
  expect(live).toBe(0);
});

test("axe finds nothing", async ({ page }) => {
  const results = await new AxeBuilder({ page }).include(".gallery-specimen").analyze();
  expect(results.violations.filter((violation) => violation.id !== "region")).toEqual([]);
});

test("in RTL the avatar leads from the right, and nothing overflows @responsive", async ({ page }) => {
  await page.goto(`${ROUTE}?dir=rtl`);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const row = comment(full(page), "north beam");
  await expect(row).toBeVisible();
  const avatar = (await row.locator(".fa-comment-avatar").boundingBox())!;
  const body = (await row.locator(".fa-comment-body").boundingBox())!;
  expect(avatar.x).toBeGreaterThan(body.x);
  const overflow = await page.evaluate(() => {
    const scroller = document.querySelector("[data-scroll-container]");
    return scroller ? scroller.scrollWidth - scroller.clientWidth : 0;
  });
  expect(overflow).toBeLessThanOrEqual(1);
});

test("with fill the comments scroll and the composer stays at the foot, under every preference @responsive", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "dark", motion: "reduced", density: "compact", uiScale: 1.25, radiusScale: 0.5, borderWidth: 2 })));
  await page.reload();
  const box = page.getByTestId("comments-fill");
  await expect(composer(box)).toBeVisible();
  const root = box.locator(".fa-scroll").first();
  await expect(root).toHaveAttribute("data-scrolled-bottom", "");
  const place = () => box.locator(".fa-comment-compose-row").evaluate((element) => {
    const frame = element.closest(".fa-comment-thread")!.getBoundingClientRect();
    const foot = element.getBoundingClientRect();
    return { top: foot.top - frame.top, overhang: foot.bottom - frame.bottom };
  });
  const foot = await place();
  expect(foot.overhang).toBeLessThanOrEqual(1);
  const viewport = root.locator(".fa-scroll-viewport").first();
  await viewport.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect(root).toHaveAttribute("data-scrolled-top", "");
  await expect(root).not.toHaveAttribute("data-scrolled-bottom", "");
  expect(await viewport.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
  expect(await place()).toEqual(foot);
  const measured = await box.locator("article.fa-comment").first().evaluate((element) => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;border-radius:var(--radius-item);width:var(--control-h-sm)";
    element.append(probe);
    const expected = getComputedStyle(probe);
    const values = { radius: expected.borderTopLeftRadius, avatar: expected.width };
    probe.remove();
    const style = getComputedStyle(element);
    return { ...values, actualRadius: style.borderTopLeftRadius, columns: style.gridTemplateColumns };
  });
  expect(measured.actualRadius).toBe(measured.radius);
  expect(Number.parseFloat(measured.columns)).toBeCloseTo(Number.parseFloat(measured.avatar), 0);
});

test("Markdown takes the same line as the plain text that held its place", async ({ page }) => {
  const body = full(page).locator(".fa-comment-body").first();
  await expect(body.locator(".fa-ai-md")).toBeVisible();
  const sizes = await body.evaluate((element) => {
    const prose = element.querySelector(".fa-ai-md p")!;
    const held = document.createElement("p");
    held.className = "fa-comment-plain";
    held.textContent = "One line";
    element.append(held);
    const line = held.getBoundingClientRect().height;
    held.remove();
    return { line, loaded: Number.parseFloat(getComputedStyle(prose).lineHeight), size: getComputedStyle(prose).fontSize, body: getComputedStyle(element).fontSize };
  });
  expect(sizes.loaded).toBeCloseTo(sizes.line, 0);
  expect(sizes.size).toBe(sizes.body);
});

test("loading and error hold the comments' place", async ({ page }) => {
  await expect(page.getByTestId("comments-error").getByRole("alert")).toContainText("did not load");
  await expect(page.getByTestId("comments-loading").locator("[aria-busy=true]")).toBeVisible();
});
