/**
 * BrandLogo and BrandMark — two-tone brand marks drawn inline from path data, so a mark
 * never costs a request, never flashes, and follows the theme.
 *
 * A brand source (generated from an SVG with `…-logo-primary` and `…-logo-secondary`
 * elements; Glass UX runs `pnpm brand`) holds the paths of each tone. The fills are roles:
 *
 *   --brand-primary    the mark's colour half: the palette's accent at a legible lightness
 *   --brand-secondary  the ink half: charcoal on light canvases, near-white on dark
 *
 * set per palette and mode in src/styles/brand.css. Over imagery (`.over-imagery`) a mark
 * gets the same canvas halo as every bare icon.
 *
 * Tones:
 *   palette  (default) follow the current palette and mode
 *   brand    keep the brand's own palette (the configured `brandPalette`) in either mode
 *   mono     one colour, `currentColor` (a solid accent button, a monochrome surface)
 *
 * A product configures its marks once, like its appearance (`configureBrand` at module scope,
 * server and client), and screens draw them by name: <BrandMark mark="product" />.
 */
import { useId, type ComponentProps } from "react";
import { cx } from "../../lib/cx.js";

export interface BrandPath {
  d: string;
  /** The transforms between the tone element and this path, as an SVG transform list. */
  transform?: string;
  /** Path opacity from 0 to 1; useful for glass highlights. Default: 1. */
  opacity?: number;
}

export interface BrandGradientStop {
  /** Position along the gradient, from 0 to 1. */
  offset: number;
  /** Semantic tone used in palette mode and as a fallback in brand mode. Default: primary. */
  tone?: "primary" | "secondary";
  /** The brand's own CSS colour, used in brand mode. Palette mode follows the semantic tone. */
  color?: string;
  /** Stop opacity from 0 to 1. Default: 1. */
  opacity?: number;
}

export interface BrandGradient {
  /** Start coordinates in the path's bounding box, from 0 to 1. Default: [0, 0]. */
  from?: readonly [number, number];
  /** End coordinates in the path's bounding box, from 0 to 1. Default: [1, 1]. */
  to?: readonly [number, number];
  stops: readonly BrandGradientStop[];
}

export interface BrandSource {
  /** The source file's name, e.g. "glassUx". */
  id: string;
  viewBox: string;
  primary: readonly BrandPath[];
  secondary: readonly BrandPath[];
  /** Optional inline gradient for the primary paths. Mono mode uses currentColor. */
  primaryGradient?: BrandGradient;
  /** Optional inline gradient for the secondary paths. Mono mode uses currentColor. */
  secondaryGradient?: BrandGradient;
}

export type BrandTones = "palette" | "brand" | "mono";

/** The marks a product names: its product mark, its wordmark and its assistant's mark. */
export type BrandMarkName = "product" | "wordmark" | "ai";

export interface BrandConfig {
  marks: Partial<Record<BrandMarkName, BrandSource>>;
  /** How marks are coloured unless a screen asks otherwise. Default: palette. */
  tones?: Exclude<BrandTones, "mono">;
  /** The palette whose tones `brand` keeps (a data-palette value). Default: the first palette. */
  brandPalette?: string;
}

let config: Required<BrandConfig> = {
  marks: {},
  tones: "palette",
  brandPalette: "graphite",
};

/** Set the product's marks and tones. Call once at module scope (server and client). */
export function configureBrand(next: BrandConfig) {
  config = {
    marks: next.marks,
    tones: next.tones ?? "palette",
    brandPalette: next.brandPalette ?? "graphite",
  };
}

export function brandConfig(): Readonly<Required<BrandConfig>> {
  return config;
}

export interface BrandLogoProps extends Omit<
  ComponentProps<"svg">,
  "children" | "viewBox"
> {
  /** The typed source adapter or asset definition consumed by this component. */
  source: BrandSource;
  /** Accessible name ("Glass UX"). Omit when a visible label or the parent names it. */
  label?: string;
  /** Default: the configured tones. */
  tones?: BrandTones;
}

/** A brand source drawn in its two tones. Size it from the outside (width/height or CSS). */
export function BrandLogo({
  source,
  label,
  tones,
  className,
  ...rest
}: BrandLogoProps) {
  const resolved = tones ?? config.tones;
  const instanceId = useId();
  const primaryId = `${instanceId}-primary`;
  const secondaryId = `${instanceId}-secondary`;
  const gradient = (definition: BrandGradient | undefined, id: string) =>
    definition && resolved !== "mono" ? (
      <linearGradient
        id={id}
        x1={definition.from?.[0] ?? 0}
        y1={definition.from?.[1] ?? 0}
        x2={definition.to?.[0] ?? 1}
        y2={definition.to?.[1] ?? 1}
      >
        {definition.stops.map((stop, index) => (
          <stop
            key={index}
            offset={stop.offset}
            stopColor={
              resolved === "brand" && stop.color
                ? stop.color
                : `var(--brand-${stop.tone ?? "primary"})`
            }
            stopOpacity={stop.opacity}
          />
        ))}
      </linearGradient>
    ) : null;
  return (
    <svg
      viewBox={source.viewBox}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
      className={cx("fa-brand", className)}
      data-brand={source.id}
      data-tones={resolved}
      // `brand` re-declares the palette on the mark alone (an island, R3.5), so its tones are
      // the brand's whatever palette or custom accent the user chose; the mode still applies.
      data-palette={resolved === "brand" ? config.brandPalette : undefined}
    >
      {resolved !== "mono" &&
      (source.primaryGradient || source.secondaryGradient) ? (
        <defs>
          {gradient(source.primaryGradient, primaryId)}
          {gradient(source.secondaryGradient, secondaryId)}
        </defs>
      ) : null}
      <g
        className="fa-brand-primary"
        data-tone="primary"
        style={
          source.primaryGradient && resolved !== "mono"
            ? { fill: `url(#${primaryId})` }
            : undefined
        }
      >
        {source.primary.map((path, index) => (
          <path
            key={index}
            d={path.d}
            transform={path.transform}
            opacity={path.opacity}
          />
        ))}
      </g>
      <g
        className="fa-brand-secondary"
        data-tone="secondary"
        style={
          source.secondaryGradient && resolved !== "mono"
            ? { fill: `url(#${secondaryId})` }
            : undefined
        }
      >
        {source.secondary.map((path, index) => (
          <path
            key={index}
            d={path.d}
            transform={path.transform}
            opacity={path.opacity}
          />
        ))}
      </g>
    </svg>
  );
}

export interface BrandMarkProps extends Omit<BrandLogoProps, "source"> {
  /** The configured product, wordmark or assistant mark to render. */
  mark: BrandMarkName;
}

/** A configured mark by name. Renders nothing when the product has not configured it. */
export function BrandMark({ mark, ...rest }: BrandMarkProps) {
  const source = config.marks[mark];
  return source ? <BrandLogo source={source} {...rest} /> : null;
}
