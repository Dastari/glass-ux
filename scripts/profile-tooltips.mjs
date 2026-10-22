/** Tooltip behaviour timelines, for comparing two builds of tooltips.html.
 *   node scripts/profile-tooltips.mjs http://127.0.0.1:4265 /tmp/before.json
 * Each scenario drives real input and samples, every frame, every tooltip popup (text,
 * side, data-instant, starting/ending style, opacity) and the triggers' aria-describedby and
 * data-popup-open. Times are relative to the scenario's last input.
 */
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const [base = "http://127.0.0.1:4265", out = "/tmp/glass-tooltips.json"] =
  process.argv.slice(2);
const browser = await chromium.launch({ channel: "chromium" });

async function open(query = "", touch = false) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    hasTouch: touch,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("PAGE ERROR", e.message));
  await page.goto(`${base}/tooltips.html${query}`);
  await page.waitForFunction(() => window.__ready);
  await page.evaluate(() => {
    window.__timeline = [];
    window.__mark = performance.now();
    window.__events = [];
    document.addEventListener(
      "keydown",
      (e) =>
        e.key === "Escape" &&
        window.__events.push(
          `document saw Escape${e.defaultPrevented ? " (prevented)" : ""}`,
        ),
    );
    const sample = () => {
      const popups = [...document.querySelectorAll('[role="tooltip"]')].map(
        (p) => {
          const s = getComputedStyle(p);
          return [
            p.textContent,
            p.dataset.side,
            p.dataset.instant ?? "-",
            p.hasAttribute("data-starting-style")
              ? "start"
              : p.hasAttribute("data-ending-style")
                ? "end"
                : "open",
            (+s.opacity).toFixed(1),
          ].join("|");
        },
      );
      const triggers = [...document.querySelectorAll("[data-t]")]
        .filter(
          (t) =>
            t.hasAttribute("aria-describedby") ||
            t.hasAttribute("data-popup-open"),
        )
        .map(
          (t) =>
            `${t.dataset.t}:${t.hasAttribute("aria-describedby") ? "described" : ""}${t.hasAttribute("data-popup-open") ? "+open" : ""}`,
        );
      const state = JSON.stringify([popups, triggers]);
      const last = window.__timeline.at(-1);
      if (!last || last.state !== state)
        window.__timeline.push({
          t: Math.round(performance.now() - window.__mark),
          state,
        });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  return { page, context };
}
const mark = (page) => page.evaluate(() => (window.__mark = performance.now()));
const at = (page, t) => page.locator(`[data-t="${t}"]`);
async function hover(page, t, steps = 8) {
  const box = await at(page, t).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps,
  });
}
const results = {};
async function scenario(name, run, options = {}) {
  const { page, context } = await open(options.query, options.touch);
  await page.mouse.move(5, 700);
  await page.waitForTimeout(300);
  await run(page);
  const timeline = await page.evaluate(() =>
    window.__timeline.map(({ t, state }) => ({ t, state: JSON.parse(state) })),
  );
  const events = await page.evaluate(() => window.__events);
  results[name] = { timeline, events };
  console.log(`\n== ${name}`);
  for (const { t, state } of timeline)
    console.log(String(t).padStart(6), JSON.stringify(state));
  if (events.length) console.log("   events", JSON.stringify(events));
  await context.close();
}

await scenario("hover rests, then opens", async (page) => {
  await hover(page, "a");
  await mark(page);
  await page.waitForTimeout(900);
});
await scenario("move to a neighbour", async (page) => {
  await hover(page, "a");
  await page.waitForTimeout(800);
  await mark(page);
  await hover(page, "b", 4);
  await page.waitForTimeout(600);
});
await scenario("leave, come back within the group timeout", async (page) => {
  await hover(page, "a");
  await page.waitForTimeout(800);
  await page.mouse.move(400, 400, { steps: 3 });
  await page.waitForTimeout(150);
  await mark(page);
  await hover(page, "c", 3);
  await page.waitForTimeout(600);
});
await scenario("leave, come back after the group timeout", async (page) => {
  await hover(page, "a");
  await page.waitForTimeout(800);
  await page.mouse.move(400, 400, { steps: 3 });
  await page.waitForTimeout(700);
  await mark(page);
  await hover(page, "c", 3);
  await page.waitForTimeout(900);
});
await scenario("keyboard focus", async (page) => {
  await page.keyboard.press("Tab");
  await mark(page);
  await page.waitForTimeout(400);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(400);
});
await scenario("escape", async (page) => {
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await mark(page);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
});
await scenario(
  "escape inside a dialog closes the tooltip, then the dialog",
  async (page) => {
    await page.waitForTimeout(500);
    await at(page, "g").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);
    await mark(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const dialogOpen = await page.locator('[role="dialog"]').count();
    await page.evaluate(
      (n) => window.__events.push(`dialog open after one Escape: ${n > 0}`),
      dialogOpen,
    );
  },
  { query: "?dialog" },
);
await scenario("click closes and stays closed until leave", async (page) => {
  await hover(page, "a");
  await page.waitForTimeout(800);
  await mark(page);
  await page.mouse.down();
  await page.mouse.up();
  const box = await at(page, "a").boundingBox();
  await page.mouse.move(box.x + box.width / 2 + 3, box.y + box.height / 2 + 1, {
    steps: 4,
  });
  await page.waitForTimeout(900);
});
await scenario("disabled reason", async (page) => {
  await hover(page, "d");
  await mark(page);
  await page.waitForTimeout(900);
});
await scenario("a description, not a name", async (page) => {
  await hover(page, "e");
  await mark(page);
  await page.waitForTimeout(900);
});
await scenario("bottom side", async (page) => {
  await hover(page, "f");
  await mark(page);
  await page.waitForTimeout(900);
});
await scenario(
  "a sweep across triggers without resting opens nothing",
  async (page) => {
    const a = await at(page, "a").boundingBox();
    const c = await at(page, "c").boundingBox();
    await mark(page);
    for (let i = 0; i <= 30; i++) {
      await page.mouse.move(
        a.x + ((c.x + c.width - a.x) * i) / 30,
        a.y + a.height / 2,
      );
      await page.waitForTimeout(16);
    }
    await page.mouse.move(400, 400, { steps: 2 });
    await page.waitForTimeout(700);
  },
);
await scenario("jitter under 2px keeps the rest", async (page) => {
  await hover(page, "a");
  await mark(page);
  const box = await at(page, "a").boundingBox();
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(80);
    await page.mouse.move(
      box.x + box.width / 2 + (i % 2),
      box.y + box.height / 2,
    );
  }
  await page.waitForTimeout(600);
});
await scenario(
  "jitter under 2px on a trigger that has opened before",
  async (page) => {
    await hover(page, "a");
    await page.waitForTimeout(800);
    await page.mouse.move(400, 400, { steps: 3 });
    await page.waitForTimeout(700);
    await hover(page, "a");
    await mark(page);
    const box = await at(page, "a").boundingBox();
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(80);
      await page.mouse.move(
        box.x + box.width / 2 + (i % 2),
        box.y + box.height / 2,
      );
    }
    await page.waitForTimeout(700);
  },
);
await scenario("a trigger removed while its tooltip shows", async (page) => {
  await hover(page, "c");
  await page.waitForTimeout(800);
  await mark(page);
  await page.evaluate(() => window.__fixture.remove());
  await page.waitForTimeout(500);
});
await scenario(
  "touch does not open",
  async (page) => {
    await at(page, "a").tap();
    await mark(page);
    await page.waitForTimeout(900);
  },
  { touch: true },
);
await writeFile(out, JSON.stringify(results, null, 2));
await browser.close();
