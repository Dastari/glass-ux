// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BrandLogo,
  BrandMark,
  configureBrand,
  type BrandSource,
} from "./brand.js";

const SOURCE: BrandSource = {
  id: "test",
  viewBox: "0 0 10 10",
  primary: [{ d: "M0 0L5 0L5 5Z", transform: "translate(1 1)" }],
  secondary: [{ d: "M5 5L10 10L5 10Z" }, { d: "M0 9L1 10Z" }],
};

describe("BrandLogo", () => {
  it("draws both tones as groups of paths, decorative unless labelled", () => {
    const { container } = render(<BrandLogo source={SOURCE} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 10 10");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.querySelectorAll(".fa-brand-primary path")).toHaveLength(1);
    expect(
      svg.querySelector(".fa-brand-primary path")!.getAttribute("transform"),
    ).toBe("translate(1 1)");
    expect(svg.querySelectorAll(".fa-brand-secondary path")).toHaveLength(2);
    expect(
      render(<BrandLogo source={SOURCE} label="Glass UX" />)
        .container.querySelector("svg")!
        .getAttribute("aria-label"),
    ).toBe("Glass UX");
  });

  it("keeps the brand's own palette as an island only for brand tones", () => {
    configureBrand({ marks: { product: SOURCE }, brandPalette: "orbit" });
    expect(
      render(<BrandLogo source={SOURCE} />)
        .container.querySelector("svg")!
        .getAttribute("data-palette"),
    ).toBeNull();
    const brand = render(
      <BrandLogo source={SOURCE} tones="brand" />,
    ).container.querySelector("svg")!;
    expect(brand.getAttribute("data-palette")).toBe("orbit");
    expect(brand.getAttribute("data-tones")).toBe("brand");
  });

  it("draws configured marks by name and nothing for a missing one", () => {
    configureBrand({ marks: { product: SOURCE } });
    expect(
      render(<BrandMark mark="product" />).container.querySelector("svg"),
    ).not.toBeNull();
    expect(render(<BrandMark mark="ai" />).container.firstChild).toBeNull();
  });

  it("keeps repeated gradient ids separate and supports brand, palette and mono paint", () => {
    const source: BrandSource = {
      ...SOURCE,
      primaryGradient: {
        stops: [
          { offset: 0, color: "cyan", tone: "secondary" },
          { offset: 1, color: "violet" },
        ],
      },
    };
    const { container } = render(
      <>
        <BrandLogo source={source} tones="brand" />
        <BrandLogo source={source} tones="palette" />
        <BrandLogo source={source} tones="mono" />
      </>,
    );
    const [brand, palette, mono] = [...container.querySelectorAll("svg")];
    const brandId = brand!.querySelector("linearGradient")!.id;
    const paletteId = palette!.querySelector("linearGradient")!.id;
    expect(brandId).not.toBe(paletteId);
    expect(
      brand!.querySelector(".fa-brand-primary")!.getAttribute("style"),
    ).toContain(brandId);
    expect(
      palette!.querySelector(".fa-brand-primary")!.getAttribute("style"),
    ).toContain(paletteId);
    expect(brand!.querySelector("stop")!.getAttribute("stop-color")).toBe(
      "cyan",
    );
    expect(palette!.querySelector("stop")!.getAttribute("stop-color")).toBe(
      "var(--brand-secondary)",
    );
    expect(mono!.querySelector("defs")).toBeNull();
    expect(
      mono!.querySelector(".fa-brand-primary")!.getAttribute("style"),
    ).toBeNull();
  });
});
