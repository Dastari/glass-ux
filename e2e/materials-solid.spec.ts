import { expect, test } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { componentFamilies } from "../src/gallery/component-families.js";

// Solid (R4.4): on every family page, in both modes, nothing filters the backdrop and nothing
// lets the canvas show through, apart from what is translucent by design: the dialog's dimming
// layer, ScrollArea's edge shading and a highlighted list item. AUDIT_MATERIALS=reduced (or
// other materials) writes a report to test-results/materials instead of asserting.
const materials = (process.env.AUDIT_MATERIALS ?? "solid").split(",");
const modes = (process.env.AUDIT_MODES ?? "dark,light").split(",");
const pages = [...componentFamilies.map((family) => `/components/${family.id}`), "/", "/showcase"];

const CHUNK = 8;
const chunks = Array.from({ length: Math.ceil(pages.length / CHUNK) }, (_, index) => pages.slice(index * CHUNK, index * CHUNK + CHUNK));
test.describe.configure({ mode: "parallel" });
for (const glass of materials)
  for (const mode of modes)
    for (const [chunk, group] of chunks.entries())
    test(`materials audit ${glass} ${mode} ${chunk}`, async ({ page }) => {
      test.setTimeout(10 * 60_000);
      await page.setViewportSize({ width: 1600, height: 1000 });
      await page.addInitScript(
        (settings) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(settings)),
        { mode, glass, palette: "sunset", background: "grid", motion: "reduced", density: "comfortable" },
      );
      const findings: Array<Record<string, unknown>> = [];
      for (const path of group) {
        await page.goto(path);
        await page.waitForTimeout(1200);
        const found = await page.evaluate(() => {
          const alpha = (colour: string) => {
            if (!colour || colour === "transparent") return 0;
            const slash = /\/\s*([\d.]+%?)\s*\)/.exec(colour);
            if (slash) return slash[1]!.endsWith("%") ? Number.parseFloat(slash[1]!) / 100 : Number.parseFloat(slash[1]!);
            const rgba = /rgba\([^)]*,\s*([\d.]+)\)/.exec(colour);
            if (rgba) return Number.parseFloat(rgba[1]!);
            return 1;
          };
          const name = (el: Element) => {
            const classes = [...el.classList].filter((c) => !/^(?:[a-z]+:)?(?:p|m|px|py|gap|w|h|min|max|flex|grid|items|justify|text|font|rounded|border|bg|size|col|row|self|shrink|grow|overflow|relative|absolute|inset|top|left|right|bottom|z|truncate|block|inline|hidden|sr)\b/.test(c));
            const slot = el.getAttribute("data-slot") ?? el.getAttribute("data-variant") ?? "";
            return `${el.tagName.toLowerCase()}${classes.length ? "." + classes.slice(0, 3).join(".") : ""}${slot ? `[${slot}]` : ""}`;
          };
          const opaque = new Map<Element, boolean>();
          const opaqueBehind = (el: Element): boolean => {
            const node = el.parentElement;
            if (!node || node === document.body || node.matches(".canvas-ambient, .canvas-background")) return false;
            const cached = opaque.get(node);
            if (cached !== undefined) return cached;
            const cs = getComputedStyle(node);
            const before = getComputedStyle(node, "::before");
            const result =
              alpha(cs.backgroundColor) >= 0.97 ||
              (before.content !== "none" && alpha(before.backgroundColor) >= 0.97 && before.position === "absolute") ||
              opaqueBehind(node);
            opaque.set(node, result);
            return result;
          };
          const results: Array<{ kind: string; name: string; value: string; pseudo?: string }> = [];
          // The live examples and the application chrome; API tables and usage code are text.
          const scope = [...document.querySelectorAll(".gallery-document-sections > section:not(#usage):not(#api), .docs-sidebar, .docs-topbar, .gallery-page, main > :not(.gallery-document-layout)")];
          const elements = new Set<Element>();
          for (const root of scope) {
            elements.add(root);
            for (const el of root.querySelectorAll("*")) elements.add(el);
          }
          for (const el of elements) {
            if (el.closest(".fa-dnd-ghost, [data-audit-ignore]")) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 12 || r.height < 12) continue;
            // Fully transparent layers (a hover scrim at rest) show nothing, canvas included.
            if (getComputedStyle(el).opacity === "0") continue;
            for (const pseudo of [null, "::before", "::after"] as const) {
              const cs = getComputedStyle(el, pseudo);
              if (pseudo && cs.content === "none") continue;
              // Hairlines (separators, edges) are lines, not surfaces.
              if (pseudo && (Number.parseFloat(cs.height) <= 2 || Number.parseFloat(cs.width) <= 2)) continue;
              const blur = cs.backdropFilter || (cs as unknown as { webkitBackdropFilter?: string }).webkitBackdropFilter || "none";
              if (blur !== "none") results.push({ kind: "blur", name: name(el), value: blur, pseudo: pseudo ?? undefined });
              const a = alpha(cs.backgroundColor);
              if (a > 0.015 && a < 0.97 && !opaqueBehind(el)) results.push({ kind: "see-through", name: name(el), value: cs.backgroundColor, pseudo: pseudo ?? undefined });
            }
          }
          return results;
        });
        for (const f of found) findings.push({ path, ...f });
      }
      mkdirSync("test-results/materials", { recursive: true });
      writeFileSync(`test-results/materials/${glass}-${mode}-${chunk}.json`, JSON.stringify(findings));
      if (glass !== "solid") return;
      const BY_DESIGN = /^(?:div\.glass-overlay\.fa-dialog::after|div\.fa-scroll::(?:before|after)|div\.fa-item\b)/;
      expect(findings.filter((finding) => !BY_DESIGN.test(`${finding.name}${finding.pseudo ?? ""}`))).toEqual([]);
    });
