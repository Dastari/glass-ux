import { describe, expect, it } from "vitest";
import { fixStops, mix, parseColor, splitTop, Unsupported, type Color } from "./frost-render.js";

const close = (actual: number[], expected: number[], digits = 3) =>
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i]!, digits));

describe("baked frost colours", () => {
  it("reads computed colours into Oklab", () => {
    close(parseColor("oklab(0.86 -0.0544898 -0.0778195 / 0.6)").lab, [0.86, -0.0544898, -0.0778195, 0.6]);
    const chroma = parseColor("oklch(0.86 0.095 235)").lab;
    close(chroma, [0.86, 0.095 * Math.cos((235 * Math.PI) / 180), 0.095 * Math.sin((235 * Math.PI) / 180), 1]);
    close(parseColor("rgb(255, 255, 255)").lab, [1, 0, 0, 1]);
    close(parseColor("rgba(0, 0, 0, 0)").lab, [0, 0, 0, 0]);
    close(parseColor("color(srgb 1 1 1 / 0.5)").lab, [1, 0, 0, 0.5]);
  });

  it("marks legacy colours, which interpolate in sRGB", () => {
    expect(parseColor("rgba(0, 0, 0, 0)").legacy).toBe(true);
    expect(parseColor("oklab(0.5 0 0)").legacy).toBe(false);
  });

  it("interpolates premultiplied, so a fade to transparent keeps its colour", () => {
    const blue = parseColor("oklab(0.6 -0.05 -0.15)");
    const clear = parseColor("rgba(0, 0, 0, 0)");
    close(mix(blue, clear, 0.5, true), [0.6, -0.05, -0.15, 0.5]);
    const white: Color = parseColor("rgb(255, 255, 255)");
    const black: Color = parseColor("rgb(0, 0, 0)");
    // Halfway in gamma-encoded sRGB is grey 0.5, Oklab lightness ≈ 0.5982.
    expect(mix(white, black, 0.5, false)[0]).toBeCloseTo(0.5982, 3);
    expect(mix(white, black, 0.5, true)[0]).toBeCloseTo(0.5, 6);
  });
});

describe("baked frost gradients", () => {
  it("splits only at top-level separators", () => {
    expect(splitTop("radial-gradient(at 1% 2%, red, blue), linear-gradient(red, oklab(0 0 0 / 0.5))")).toEqual([
      "radial-gradient(at 1% 2%, red, blue)",
      "linear-gradient(red, oklab(0 0 0 / 0.5))",
    ]);
  });

  it("fixes up stop positions as CSS Images 4 does", () => {
    const c = parseColor("rgb(0, 0, 0)");
    const at = (stops: Parameters<typeof fixStops>[0]) => fixStops(stops, 200).map((stop) => stop.at);
    expect(at([{ color: c, position: null }, { color: c, position: null }, { color: c, position: null }])).toEqual([0, 100, 200]);
    expect(at([{ color: c, position: { px: 0, percent: 0.5 } }, { color: c, position: { px: 20, percent: 0 } }])).toEqual([100, 100]);
    expect(at([{ color: c, position: null }, { color: c, position: null }, { color: c, position: { px: 0, percent: 0.4 } }, { color: c, position: null }])).toEqual([0, 40, 80, 200]);
  });

  it("reports what it cannot draw", () => {
    expect(() => parseColor("oklab(0.5 0)")).toThrow(Unsupported);
  });
});
