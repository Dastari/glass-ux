import { expect, test } from "@playwright/test";
import { componentFamilies } from "../src/gallery/component-families.js";

// A box that overflows itself by a few pixels is almost always a layout slip (an offset
// decoration, a closed bar's resting translate, a rim light), and around a scroll container it
// shows as a second scrollbar. On every family page, nothing overflows its own box by 1–8 px.
const pages = [...componentFamilies.map((family) => `/components/${family.id}`), "/showcase"];
const CHUNK = 10;
const chunks = Array.from({ length: Math.ceil(pages.length / CHUNK) }, (_, index) => pages.slice(index * CHUNK, index * CHUNK + CHUNK));

test.describe.configure({ mode: "parallel" });
for (const [chunk, group] of chunks.entries())
  test(`no element overflows its box by a few pixels ${chunk}`, async ({ page }) => {
    test.setTimeout(5 * 60_000);
    await page.setViewportSize({ width: 1600, height: 1000 });
    const findings: string[] = [];
    for (const path of group) {
      await page.goto(path);
      await page.waitForTimeout(1200);
      const found = await page.evaluate(() => {
        const name = (el: Element) => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 3).join(".")}`;
        const results: string[] = [];
        const scope = document.querySelectorAll(".gallery-document-sections > section:not(#usage):not(#api) *, .docs-sidebar *, main > :not(.gallery-document-layout) *");
        for (const el of scope) {
          if (!(el instanceof HTMLElement) || !el.offsetParent) continue;
          const style = getComputedStyle(el);
          const scrolls = /(auto|scroll)/.test(style.overflowX + style.overflowY);
          // Scroll containers, and the components whose overflow becomes their host's scrollbar.
          if (!scrolls && !el.matches(".fa-dt, .fa-dt-footer")) continue;
          const dx = el.scrollWidth - el.clientWidth;
          const dy = el.scrollHeight - el.clientHeight;
          if (!((dx > 0 && dx <= 8) || (dy > 0 && dy <= 8))) continue;
          // Content that is a little wider or taller than its box is real overflow. A slip is
          // overflow that visible content and the end padding do not account for: something
          // invisible (a faded bar, a measuring probe) or a decoration (a pseudo-element).
          const box = el.getBoundingClientRect();
          const originX = box.left + el.clientLeft - el.scrollLeft;
          const originY = box.top + el.clientTop - el.scrollTop;
          let right = 0;
          let bottom = 0;
          for (const child of el.querySelectorAll("*")) {
            let visible = true;
            for (let node: Element | null = child; node && node !== el; node = node.parentElement) {
              const cs = getComputedStyle(node);
              if (cs.visibility === "hidden" || cs.opacity === "0" || cs.display === "none") {
                visible = false;
                break;
              }
            }
            if (!visible) continue;
            const r = child.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            right = Math.max(right, r.right - originX);
            bottom = Math.max(bottom, r.bottom - originY);
          }
          const own = getComputedStyle(el);
          const contentX = Math.ceil(right + Number.parseFloat(own.paddingRight)) + 0.5;
          const contentY = Math.ceil(bottom + Number.parseFloat(own.paddingBottom)) + 0.5;
          const slipX = dx > 0 && dx <= 8 && el.scrollWidth > Math.max(contentX, el.clientWidth);
          const slipY = dy > 0 && dy <= 8 && el.scrollHeight > Math.max(contentY, el.clientHeight);
          if (slipX || slipY) results.push(`${name(el)} overflows by ${dx}×${dy}px beyond its visible content`);
        }
        return results;
      });
      for (const finding of found) findings.push(`${path}: ${finding}`);
    }
    expect(findings).toEqual([]);
  });
