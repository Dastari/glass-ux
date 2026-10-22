// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPEARANCE_STORAGE_KEY,
  appearanceBootScript,
  applyAppearance,
  configureAppearance,
  normalizeAppearance,
  type Appearance,
} from "./appearance.js";

function snapshot(root: HTMLElement) {
  return { data: { ...root.dataset }, style: root.getAttribute("style") ?? "" };
}

const cases: Array<Partial<Appearance> | null | string> = [
  null,
  "not json",
  {
    mode: "dark",
    palette: "ocean",
    density: "compact",
    glass: "solid",
    motion: "reduced",
  },
  {
    mode: "light",
    radiusScale: 0,
    borderWidth: 1.5,
    uiScale: 1.125,
    accentHue: 300,
  },
  {
    mode: "system",
    palette: "nope" as never,
    radiusScale: 9,
    borderWidth: -1,
    accentHue: 25,
  },
  { fontSans: "geist", fontDisplay: "outfit", fontMono: "geist-mono" },
  { fontSans: "comic-sans", fontDisplay: "nope", fontMono: "nope" },
  { background: "contours" },
  { background: "invalid" as never },
];

function runBoot(stored: Partial<Appearance> | null | string) {
  localStorage.clear();
  if (stored !== null) {
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      typeof stored === "string" ? stored : JSON.stringify(stored),
    );
  }
  const viaScript = document.createElement("html");
  Object.defineProperty(document, "documentElement", {
    value: viaScript,
    configurable: true,
  });
  new Function(appearanceBootScript())();
  return viaScript;
}

function runApply(stored: Partial<Appearance> | null | string) {
  let parsed: unknown = null;
  try {
    parsed = typeof stored === "string" ? JSON.parse(stored) : stored;
  } catch {
    parsed = null;
  }
  const viaApply = document.createElement("html");
  applyAppearance(viaApply, normalizeAppearance(parsed), true);
  return viaApply;
}

describe("appearance boot script", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("dark"),
    }));
  });
  afterEach(() => configureAppearance({}));

  it.each(cases)(
    "applies the same result as applyAppearance for %j",
    (stored) => {
      expect(snapshot(runBoot(stored))).toEqual(snapshot(runApply(stored)));
    },
  );

  it("honours project defaults and locks in both paths", () => {
    configureAppearance({
      defaults: { palette: "ocean", fontSans: "geist" },
      locked: { fontMono: "jetbrains-mono", density: "compact" },
    });
    const stored = {
      density: "comfortable",
      fontMono: "geist-mono",
      fontSans: "manrope",
    } as Partial<Appearance>;
    const boot = snapshot(runBoot(stored));
    expect(boot).toEqual(snapshot(runApply(stored)));
    expect(boot.data).toMatchObject({
      palette: "ocean",
      density: "compact",
      fontMono: "jetbrains-mono",
      fontSans: "manrope",
    });
    expect(snapshot(runBoot(null)).data).toMatchObject({ fontSans: "geist" });
  });

  it("applies the application's glass rendering in both paths", () => {
    expect(snapshot(runBoot(null)).data).not.toHaveProperty("glassRendering");
    configureAppearance({ glassRendering: "baked" });
    const boot = snapshot(runBoot(null));
    expect(boot).toEqual(snapshot(runApply(null)));
    expect(boot.data).toMatchObject({ glassRendering: "baked" });
    configureAppearance({ glassRendering: "nope" as never });
    expect(snapshot(runApply(null)).data).not.toHaveProperty("glassRendering");
  });
});
