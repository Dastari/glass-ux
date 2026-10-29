import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * RelationshipCanvas: cards named and described with their rows and links; selection draws a
 * card's edges in the accent; a header drags its card and Shift+arrow moves it, both reported
 * as positions; arrows travel between cards and Enter opens; the wheel pans, Ctrl+wheel and the
 * buttons zoom, and the dot grid moves with the camera. On a phone the fit shows every card.
 * TopologyCanvas carries the same moving dot grid.
 */

async function open(page: Page) {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "warning" && message.text().includes("RelationshipCanvas") && warnings.push(message.text()));
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })),
  );
  await page.goto("/components/relationship-canvas");
  const schema = page.getByTestId("relationship-schema");
  await expect(schema.getByRole("option", { name: "Post", exact: true })).toBeVisible({ timeout: 30_000 });
  await schema.scrollIntoViewIfNeeded();
  return { errors, warnings, schema, canvas: schema.locator(".fa-relationship") };
}

const translate = (card: Locator) => card.evaluate((element: HTMLElement) => element.style.transform);
const worldTransform = (canvas: Locator) => canvas.locator(".fa-relationship-world").evaluate((element: HTMLElement) => element.style.transform);

test("cards say what they hold and link to, and selecting one lights its edges @responsive", async ({ page }) => {
  const { errors, warnings, schema } = await open(page);
  const post = schema.getByRole("option", { name: "Post", exact: true });
  await expect(post).toHaveAccessibleDescription(/^5 rows: id uuid, author uuid, title text, body text\?, published timestamptz\?\. Links: author to Author, featured from Author, post from Comment, tags from Post tag\.$/);
  await expect(schema.getByRole("listbox", { name: "Schema, Active" })).toHaveAccessibleDescription(/Arrow keys move between cards/);
  await expect(schema.locator(".fa-relationship-edge[data-active]")).toHaveCount(0);
  await post.click();
  await expect(post).toHaveAttribute("aria-selected", "true");
  // Post's own edges: author, featured, post (from Comment) and tags (from Post tag).
  await expect(schema.locator(".fa-relationship-edge[data-active]")).toHaveCount(4);
  await page.keyboard.press("Escape");
  await expect(post).toHaveAttribute("aria-selected", "false");
  expect(errors).toEqual([]);
  expect(warnings).toEqual([]);
});

test("a header drags its card and Shift+arrow moves it; edges follow", async ({ page }) => {
  const { schema } = await open(page);
  const tag = schema.getByRole("option", { name: "Tag", exact: true });
  const edge = schema.locator('[data-edge-id="post_tag-tag"] > path');
  const before = await translate(tag);
  const path = await edge.getAttribute("d");
  const header = tag.locator(".fa-relationship-card-header");
  const box = (await header.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let step = 1; step <= 8; step++) await page.mouse.move(box.x + box.width / 2 + step * 8, box.y + box.height / 2 + step * 6);
  await page.mouse.up();
  const dragged = await translate(tag);
  expect(dragged).not.toBe(before);
  expect(await edge.getAttribute("d")).not.toBe(path);
  await expect(tag).toHaveAttribute("aria-selected", "true");

  await tag.focus();
  await page.keyboard.press("Shift+ArrowDown");
  const [, x1, y1] = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(dragged)!;
  await expect.poll(() => translate(tag)).toBe(`translate(${Number(x1)}px, ${Number(y1) + 16}px)`);
});

test("arrows travel between cards, Enter opens, and Auto layout restores order", async ({ page }) => {
  const { schema } = await open(page);
  const post = schema.getByRole("option", { name: "Post", exact: true });
  await post.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Opened Post")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(schema.getByRole("option", { name: "Author", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+ArrowUp");
  const moved = await translate(schema.getByRole("option", { name: "Author", exact: true }));
  await schema.getByRole("button", { name: "Auto layout" }).click();
  await expect.poll(() => translate(schema.getByRole("option", { name: "Author", exact: true }))).not.toBe(moved);
});

test("the wheel pans, Ctrl+wheel and the buttons zoom, and the dot grid moves with the camera", async ({ page }) => {
  const { schema, canvas } = await open(page);
  const stage = canvas.locator(".fa-relationship-stage");
  const readout = schema.locator(".fa-relationship-zoom");
  const grid = () => stage.evaluate((element: HTMLElement) => element.style.getPropertyValue("--dot-grid-x"));
  const fitted = await readout.textContent();
  const start = await worldTransform(canvas);
  const gridStart = await grid();
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + box.height - 40);
  await page.mouse.wheel(120, 0);
  await expect.poll(() => worldTransform(canvas)).not.toBe(start);
  await expect.poll(grid).not.toBe(gridStart);
  await expect(readout).toHaveText(fitted!);

  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -100);
  await page.keyboard.up("Control");
  await expect(readout).not.toHaveText(fitted!);

  await schema.getByRole("button", { name: "Fit to view" }).click();
  await expect(readout).toHaveText(fitted!);
  await schema.getByRole("button", { name: "Zoom in" }).click();
  await expect(readout).not.toHaveText(fitted!);
});

test("a new diagram re-fits, and on a phone the fit shows every card @responsive", async ({ page }) => {
  const { schema, canvas } = await open(page);
  await page.getByRole("group", { name: "Schema" }).getByRole("button", { name: "Draft" }).click();
  await expect(schema.getByRole("option", { name: "Series", exact: true })).toBeVisible();
  const frame = (await canvas.boundingBox())!;
  for (const card of await schema.getByRole("option").all()) {
    const box = (await card.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(frame.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
  }
});

test("loading holds the box, empty says so, and the page passes axe @responsive", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("status", { name: "Loading the diagram" })).toBeVisible();
  await expect(page.locator(".fa-relationship-empty").getByText("No collections to draw yet.")).toBeVisible();
  const result = await new AxeBuilder({ page }).include(".gallery-document-sections").analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
});

test("the topology map has the same moving dot grid", async ({ page }) => {
  await page.goto("/components/topology-canvas");
  const office = page.getByTestId("topology-office");
  const stage = office.locator(".fa-topology-stage");
  await expect(stage).toHaveClass(/fa-dot-grid/, { timeout: 30_000 });
  await expect.poll(() => stage.evaluate((element: HTMLElement) => element.style.getPropertyValue("--dot-grid-scale"))).not.toBe("");
  await office.scrollIntoViewIfNeeded();
  const before = await stage.evaluate((element: HTMLElement) => element.style.getPropertyValue("--dot-grid-x"));
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + box.height - 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + box.height - 60, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => stage.evaluate((element: HTMLElement) => element.style.getPropertyValue("--dot-grid-x"))).not.toBe(before);
});
