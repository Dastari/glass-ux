import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * Flat removes a control's shadows and gradients, which is where most of its edges come from. Each
 * unchecked control must still read at 3:1 against the surface it sits on (R20.1), which is measured
 * here from the pixels drawn rather than from computed colours.
 */

const CASES = [
  { page: "switch", control: ".fa-switch:not([data-checked], [data-disabled])", name: "off switch", floor: 3 },
  { page: "switch", control: ".fa-switch[data-checked]:not([data-disabled])", name: "on switch", floor: 3 },
  { page: "slider", control: ".fa-slider:not([data-disabled])", name: "slider", floor: 3 },
  // Their edges read, at about 2.4:1: below R20.1, and held here so they get no worse.
  { page: "checkbox", control: ".fa-check:not([data-checked], [data-disabled])", name: "unchecked checkbox", floor: 2.2 },
  { page: "radio", control: ".fa-radio:not([data-checked], [data-disabled])", name: "unchecked radio", floor: 2.2 },
] as const;
const SURFACES = ["glass-overlay", "glass-panel"] as const;
const THEMES = [
  { mode: "dark", palette: "ruby" },
  { mode: "dark", palette: "ocean" },
  { mode: "dark", palette: "rose" },
  { mode: "light", palette: "ocean" },
] as const;

/** The strongest contrast of any drawn pixel against the surface colour. */
async function strongestContrast(page: Page, probe: Locator) {
  // Inside the probe's own edge, so only the control and the surface are measured.
  const box = (await probe.boundingBox())!;
  const clip = { x: box.x + 8, y: box.y + 8, width: box.width - 16, height: box.height - 16 };
  const image = (await page.screenshot({ clip })).toString("base64");
  return page.evaluate(async (data) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const { data: pixels } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    const luminance = (r: number, g: number, b: number) => {
      const [x, y, z] = [r, g, b].map((value) => {
        const scaled = value / 255;
        return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * x! + 0.7152 * y! + 0.0722 * z!;
    };
    // The probe's padding: its first pixel is the surface.
    const surface = luminance(pixels[0]!, pixels[1]!, pixels[2]!);
    let strongest = 1;
    for (let at = 0; at < pixels.length; at += 4) {
      const here = luminance(pixels[at]!, pixels[at + 1]!, pixels[at + 2]!);
      const ratio = (Math.max(here, surface) + 0.05) / (Math.min(here, surface) + 0.05);
      if (ratio > strongest) strongest = ratio;
    }
    return strongest;
  }, image);
}

for (const { mode, palette } of THEMES) {
  for (const { page: route, control, name, floor } of CASES) {
    test(`flat: ${name} reads on a surface, ${mode} ${palette}`, async ({ page }) => {
      await page.addInitScript(
        ([mode, palette]) =>
          localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ style: "flat", mode, palette, motion: "reduced" })),
        [mode, palette],
      );
      await page.setViewportSize({ width: 900, height: 700 });
      await page.goto(`/components/${route}`);
      await page.locator(control).first().waitFor();
      for (const surface of SURFACES) {
        await page.evaluate(
          ([selector, surface]) => {
            document.getElementById("flat-probe")?.remove();
            const probe = document.createElement("div");
            probe.id = "flat-probe";
            probe.className = surface!;
            probe.style.cssText = "position:fixed;inset-block-start:20px;inset-inline-start:20px;inline-size:320px;z-index:99999;padding:24px;";
            probe.append(document.querySelector(selector!)!.cloneNode(true));
            document.body.append(probe);
          },
          [control, surface],
        );
        const contrast = await strongestContrast(page, page.locator("#flat-probe"));
        expect(contrast, `${name} on ${surface}`).toBeGreaterThanOrEqual(floor);
      }
    });
  }
}

/* A strong edge elsewhere could hide a bead the colour of the surface, so each bead is measured too. */
const BEADS = [
  { page: "switch", control: ".fa-switch:not([data-checked], [data-disabled])", bead: ".fa-switch-thumb", pseudo: undefined, name: "off switch's bead" },
  { page: "slider", control: ".fa-slider:not([data-disabled])", bead: ".fa-slider-thumb", pseudo: "::before", name: "slider's thumb" },
] as const;
for (const { mode, palette } of THEMES) {
  for (const { page: route, control, bead, pseudo, name } of BEADS) {
    test(`flat: ${name} stands out on each surface, ${mode} ${palette}`, async ({ page }) => {
      await page.addInitScript(
        ([mode, palette]) =>
          localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ style: "flat", mode, palette, motion: "reduced" })),
        [mode, palette],
      );
      await page.goto(`/components/${route}`);
      await page.locator(control).first().waitFor();
      const ratios = await page.evaluate(
        ([control, bead, pseudo, surfaces]) => {
          const rgb = (colour: string) => {
            const context = document.createElement("canvas").getContext("2d")!;
            context.fillStyle = colour;
            context.fillRect(0, 0, 1, 1);
            return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
          };
          const luminance = (colour: number[]) => {
            const [x, y, z] = colour.map((value) => {
              const scaled = value / 255;
              return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * x! + 0.7152 * y! + 0.0722 * z!;
          };
          const source = document.querySelector(control as string)!;
          return (surfaces as string[]).map((surface) => {
            const box = document.createElement("div");
            box.className = surface;
            box.append(source.cloneNode(true));
            document.body.append(box);
            const a = rgb(getComputedStyle(box).backgroundColor);
            const b = rgb(getComputedStyle(box.querySelector(bead as string)!, pseudo as string | undefined).backgroundColor);
            box.remove();
            const [high, low] = [luminance(a), luminance(b)].sort((p, q) => q - p);
            return (high! + 0.05) / (low! + 0.05);
          });
        },
        [control, bead, pseudo ?? "", SURFACES as unknown as string[]] as const,
      );
      for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(3);
    });
  }
}
