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

test.describe("a composer's own control, badges and attachments", () => {
  const notes = (page: Page) => page.getByTestId("comments-notes");
  const main = (page: Page) => notes(page).locator(".fa-comment-compose-row");
  const kind = (scope: Locator, name: string) => scope.getByRole("group", { name });
  const row = (page: Page, text: string) => comment(notes(page), text);

  test("the label follows the composer's choice, the draft carries it, and its badge shows at once @responsive", async ({ page }) => {
    const composing = main(page);
    await expect(composer(composing)).toBeVisible();
    const send = composing.getByRole("button", { name: "Add team note", exact: true });
    await expect(send).toBeVisible();
    const place = (button: Locator) =>
      button.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const row = element.closest(".fa-comment-compose-row")!.getBoundingClientRect();
        return { end: box.right - row.left, top: box.top - row.top };
      });
    const before = await place(send);
    await kind(composing, "Kind of note").getByRole("button", { name: "Client note" }).click();
    const client = composing.getByRole("button", { name: "Add client note", exact: true });
    await expect(client).toBeVisible();
    // The label's words change its width, and the button keeps its place at the row's end.
    expect(await place(client)).toEqual(before);
    await composer(composing).click();
    await page.keyboard.type("Access confirmed");
    await page.keyboard.press("Control+Enter");
    const added = row(page, "Access confirmed");
    await expect(added.locator(".fa-comment-badges")).toHaveText("Client");
    await expect(composer(composing)).toHaveText("");
    await expect(kind(composing, "Kind of note").getByRole("button", { name: "Client note" })).toHaveAttribute("aria-pressed", "true");
  });

  test("each reply holds its own choice, starting from its parent's @responsive", async ({ page }) => {
    const parent = row(page, "Site access is confirmed");
    await parent.hover();
    await parent.getByRole("button", { name: "Reply to Jamie Wells" }).click();
    const replying = notes(page).locator(".fa-comment-branch").filter({ has: page.getByRole("textbox", { name: "Reply to Jamie Wells" }) });
    await expect(replying.getByRole("textbox", { name: "Reply to Jamie Wells" })).toBeFocused();
    const own = kind(replying, "Kind of reply to Jamie Wells");
    await expect(own.getByRole("button", { name: "Client note" })).toHaveAttribute("aria-pressed", "true");
    await expect(kind(main(page), "Kind of note").getByRole("button", { name: "Team note" })).toHaveAttribute("aria-pressed", "true");
    await own.getByRole("button", { name: "Team note" }).click();
    await kind(main(page), "Kind of note").getByRole("button", { name: "Client note" }).click();
    await expect(own.getByRole("button", { name: "Team note" })).toHaveAttribute("aria-pressed", "true");
    await expect(replying.getByRole("button", { name: "Add team note", exact: true })).toBeVisible();
    await expect(main(page).getByRole("button", { name: "Add client note", exact: true })).toBeVisible();
    await replying.getByRole("textbox", { name: "Reply to Jamie Wells" }).click();
    await page.keyboard.type("Internal follow-up");
    await replying.getByRole("button", { name: "Add team note", exact: true }).click();
    const sent = row(page, "Internal follow-up");
    await expect(sent.locator(".fa-comment-badges")).toHaveText("Team");
    expect(await sent.evaluate((element) => element.closest(".fa-comment-branch") !== null)).toBe(true);
  });

  test("the keyboard reaches the control from the editor, and Escape in it leaves a reply open", async ({ page }) => {
    const parent = row(page, "Site access is confirmed");
    await parent.hover();
    await parent.getByRole("button", { name: "Reply to Jamie Wells" }).click();
    const editor = notes(page).getByRole("textbox", { name: "Reply to Jamie Wells" });
    await expect(editor).toBeFocused();
    // Back over the editor's toolbar, which is one tab stop, to the control above it.
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    const own = kind(notes(page), "Kind of reply to Jamie Wells");
    await expect(own.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(editor).toBeVisible();
    await own.getByRole("button", { name: "Client note" }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(own.getByRole("button", { name: "Team note" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(own.getByRole("button", { name: "Team note" })).toHaveAttribute("aria-pressed", "true");
    await editor.click();
    await page.keyboard.press("Escape");
    await expect(editor).toBeHidden();
  });

  test("slots line up with the text and the control with the editor, under every preference @responsive", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "dark", motion: "reduced", density: "compact", uiScale: 1.25, radiusScale: 0.5, borderWidth: 2 })));
    await page.reload();
    const first = row(page, "north beam survey");
    await expect(first).toBeVisible();
    const measured = await first.evaluate((element) => {
      const edge = (selector: string) => element.querySelector(selector)!.getBoundingClientRect();
      const probe = document.createElement("div");
      probe.style.marginBlockStart = "var(--space-1)";
      element.append(probe);
      const gap = Number.parseFloat(getComputedStyle(probe).marginBlockStart);
      probe.remove();
      return { body: edge(".fa-comment-body"), files: edge(".fa-comment-attachments"), badge: edge(".fa-comment-badges"), author: edge(".fa-comment-author"), gap };
    });
    expect(measured.files.left).toBeCloseTo(measured.body.left, 0);
    expect(measured.files.top).toBeGreaterThanOrEqual(measured.body.bottom);
    expect(measured.files.top - measured.body.bottom).toBeLessThanOrEqual(measured.gap + 4);
    expect(measured.badge.left).toBeGreaterThanOrEqual(measured.author.right);
    const stack = await main(page).evaluate((element) => {
      const edge = (selector: string) => element.querySelector(selector)!.getBoundingClientRect();
      return { control: edge(".fa-comment-composer-control"), editor: edge(".fa-rich-text"), actions: edge(".fa-comment-composer-actions"), composer: edge(".fa-comment-composer") };
    });
    expect(stack.control.bottom).toBeLessThanOrEqual(stack.editor.top);
    expect(stack.editor.bottom).toBeLessThanOrEqual(stack.actions.top);
    expect(stack.control.left).toBeCloseTo(stack.composer.left, 0);
    const overflow = await page.evaluate(() => {
      const scroller = document.querySelector("[data-scroll-container]");
      return scroller ? scroller.scrollWidth - scroller.clientWidth : 0;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("in RTL the control and slots read from the right @responsive", async ({ page }) => {
    await page.goto(`${ROUTE}?dir=rtl`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const first = row(page, "north beam survey");
    await expect(first).toBeVisible();
    const author = (await first.locator(".fa-comment-author").boundingBox())!;
    const badge = (await first.locator(".fa-comment-badges").boundingBox())!;
    expect(badge.x).toBeLessThan(author.x);
    const body = (await first.locator(".fa-comment-body").boundingBox())!;
    const files = (await first.locator(".fa-comment-attachments").boundingBox())!;
    expect(files.x + files.width).toBeCloseTo(body.x + body.width, 0);
    await expect(main(page).locator(".fa-comment-composer-control")).toBeVisible();
    const control = (await main(page).locator(".fa-comment-composer-control .fa-segmented").first().boundingBox())!;
    const editor = (await main(page).locator(".fa-rich-text").boundingBox())!;
    expect(control.x + control.width).toBeCloseTo(editor.x + editor.width, 0);
  });

  test("a thread with slots passes axe @responsive", async ({ page }) => {
    await expect(composer(main(page))).toBeVisible();
    const results = await new AxeBuilder({ page }).include('[data-testid="comments-notes"]').analyze();
    expect(results.violations.filter((violation) => violation.id !== "region")).toEqual([]);
  });
});

test("loading and error hold the comments' place", async ({ page }) => {
  await expect(page.getByTestId("comments-error").getByRole("alert")).toContainText("did not load");
  await expect(page.getByTestId("comments-loading").locator("[aria-busy=true]")).toBeVisible();
});
