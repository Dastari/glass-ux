import { expect, test } from "@playwright/test";

/**
 * Focus rings and the text-entry halo paint up to --focus-reach outside a control. A
 * container that clips (it scrolls, hides overflow or clips to its corners) must leave that
 * room, or a control flush with its edge loses part of its ring (R11.10). These pages hold
 * the library's clipping containers: dialog and settings panes, panels, disclosures, scrollers,
 * truncated titles with links, maps and the gallery's own frames.
 */
const PAGES = [
  "entity-settings-dialog",
  "dialog",
  "vertical-tabs",
  "accordion",
  "panel",
  "kanban",
  "json-tree",
  "generic-result",
  "approval-card",
  "entity-header",
  "entity-identity",
  "chart-frame",
  "map-view-toggle",
  "pin-map",
  "email-field",
  "signature-pad",
  "avatar",
  "relationship-canvas",
  "login-flow",
  "select",
  "button",
  "data-table",
  "scheduler",
];

type Clip = { control: string; clipper: string; sides: string };

/** In the page: each focusable whose resting ring or halo crosses the edge of an ancestor that clips it. */
function clippedRings(): Clip[] {
  const out: Clip[] = [];
  const focusables =
    "input:not([type=hidden]), textarea, select, button, [role=combobox], [role=switch], [role=checkbox], [role=radio], [role=slider], [role=tab], a[href], [tabindex='0']";
  const root = document.querySelector(".gallery-document-sections")!;
  const stop = document.querySelector(".gallery-documentation")!;
  const name = (node: Element) =>
    [...node.classList].filter((name) => /^(fa-|gallery-)/.test(name)).slice(0, 2).join(".") ||
    node.tagName.toLowerCase();
  for (const element of [...root.querySelectorAll<HTMLElement>(focusables)].slice(0, 400)) {
    const rect = element.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4 || element.closest("[inert], [aria-hidden=true]")) continue;
    const control = element.closest(".fa-control") ?? element;
    element.focus({ preventScroll: true });
    if (document.activeElement !== element) continue;
    const style = getComputedStyle(element);
    let reach = style.outlineStyle === "none" ? 0 : parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
    for (const shadow of getComputedStyle(control).boxShadow.split(/,(?![^(]*\))/)) {
      if (shadow.includes("inset")) continue;
      const lengths = shadow.replace(/[a-z-]+\([^)]*\)/g, "").match(/-?[\d.]+px/g);
      if (lengths && lengths.length >= 4 && lengths[0] === "0px" && lengths[1] === "0px") reach = Math.max(reach, parseFloat(lengths[3]!));
    }
    element.blur();
    if (reach <= 0.5) continue;
    const box = control.getBoundingClientRect();
    for (let node = control.parentElement; node && node !== stop; node = node.parentElement) {
      const css = getComputedStyle(node);
      const clipX = css.overflowX !== "visible";
      const clipY = css.overflowY !== "visible";
      if (!clipX && !clipY) continue;
      const edge = node.getBoundingClientRect();
      const margin = css.overflowX === "clip" && css.overflowY === "clip" ? parseFloat(css.overflowClipMargin) || 0 : 0;
      const clip = {
        left: edge.left + parseFloat(css.borderLeftWidth) - margin,
        right: edge.right - parseFloat(css.borderRightWidth) + margin,
        top: edge.top + parseFloat(css.borderTopWidth) - margin,
        bottom: edge.bottom - parseFloat(css.borderBottomWidth) + margin,
      };
      // A control already cut by its container (scrolled, or a demo overflowing its frame) is not a resting ring.
      const cut = margin > 0 ? margin : 0;
      if (box.left < clip.left + cut - 0.5 || box.right > clip.right - cut + 0.5 || box.top < clip.top + cut - 0.5 || box.bottom > clip.bottom - cut + 0.5) break;
      // A scroller cuts what reaches its far edge on purpose; its start edge, at rest, is the content's.
      const scrolls = (value: string) => value === "auto" || value === "scroll";
      const overX = scrolls(css.overflowX) && node.scrollWidth > node.clientWidth + 1;
      const overY = scrolls(css.overflowY) && node.scrollHeight > node.clientHeight + 1;
      const sides = [
        clipX && (!overX || Math.abs(node.scrollLeft) < 1) && box.left - reach < clip.left - 0.5 ? "start" : "",
        clipX && !overX && box.right + reach > clip.right + 0.5 ? "end" : "",
        clipY && (!overY || node.scrollTop < 1) && box.top - reach < clip.top - 0.5 ? "top" : "",
        clipY && !overY && box.bottom + reach > clip.bottom + 0.5 ? "bottom" : "",
      ].filter(Boolean);
      if (sides.length) out.push({ control: name(control), clipper: name(node), sides: sides.join(",") });
    }
  }
  return out;
}

for (const path of PAGES) {
  test(`no container clips a focus ring on ${path} @responsive`, async ({ page }) => {
    await page.goto(`./components/${path}`);
    await page.locator(".gallery-document-sections").waitFor();
    await page.waitForTimeout(500);
    // Resting rings: the ring's entry animation starts wider.
    await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important }" });
    await page.keyboard.press("Tab");
    expect(await page.evaluate(clippedRings)).toEqual([]);
  });
}

test("the focus reach reaches overflow-clip-margin", async ({ page }) => {
  // Chromium drops a calc() or max() there, which would silently clip rings again.
  await page.goto("./components/truncated-text");
  const margin = await page
    .locator(".gallery-document-sections .fa-truncate")
    .first()
    .evaluate((element) => getComputedStyle(element).overflowClipMargin);
  expect(margin).toBe("4px");
});
