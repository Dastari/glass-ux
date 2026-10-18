/**
 * Building blocks for gallery sections. Every section uses these so the gallery itself
 * follows one layout: a page header, then specimens (a labelled glass panel holding live
 * examples), then the rules and the tokens the component reads.
 */
import { useContext, useEffect, useState, type ReactNode } from "react";
import { cx } from "../lib/cx.js";
import { DemoScope } from "./demo-scope.js";
import { Button } from "../ui/button/index.js";

/** The page wrapper every gallery section renders its header and specimens inside. */
export function SectionPage({ children }: { children: ReactNode }) {
  return <div className="gallery-page">{children}</div>;
}

export interface SpecimenProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Lay examples out as a wrapping row (default) or a vertical stack. */
  layout?: "row" | "stack" | "grid" | "bare";
  /** Paint a busy image behind the examples to prove the glass reads over content. */
  backdrop?: boolean;
  /** Span the full page width on wide screens (matrices, tables, compositions). */
  wide?: boolean;
  className?: string;
}

/** A titled gallery panel of live examples, labelled with the demo scope when one is set; `layout` arranges the examples and `backdrop` paints busy content behind them. */
export function Specimen({
  title,
  description,
  children,
  layout = "row",
  backdrop,
  wide,
  className,
}: SpecimenProps) {
  const scope = useContext(DemoScope);
  return (
    <section
      className={cx("gallery-specimen", className)}
      aria-label={scope ? `${scope}: ${title}` : title}
      data-wide={wide ? "" : undefined}
    >
      <header className="gallery-specimen-header">
        <h2 className="gallery-specimen-title">{title}</h2>
        {description ? (
          <p className="gallery-specimen-description">{description}</p>
        ) : null}
      </header>
      <div
        className={cx("gallery-specimen-body", backdrop && "over-imagery")}
        data-layout={layout}
        data-backdrop={backdrop ? "" : undefined}
      >
        <DemoScope value={scope ? `${scope}: ${title}` : title}>
          {children}
        </DemoScope>
      </div>
    </section>
  );
}

/**
 * A specimen with no glass: content sits straight on the ambient canvas, the way L2 tabs,
 * the breadcrumb and entity headers sit in the product (R4.6).
 */
export function OnCanvas({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const scope = useContext(DemoScope);
  return (
    <section
      className={cx("flex min-w-0 flex-col gap-4 px-5 py-2", className)}
      aria-label={scope ? `${scope}: ${title}` : title}
      data-wide=""
      data-canvas-specimen=""
    >
      <header>
        <h2 className="gallery-specimen-title">{title}</h2>
        {description ? (
          <p className="gallery-specimen-description">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/**
 * One slot that swaps a skeleton for its content in place, so a test can measure both in the
 * same box (R9.3). Starts on the skeleton.
 */
export function SwapSlot({
  id,
  skeleton,
  loaded,
  className,
}: {
  id: string;
  skeleton: ReactNode;
  loaded: ReactNode;
  className?: string;
}) {
  const [state, setState] = useState<"skeleton" | "loaded">("skeleton");
  return (
    <div className="flex min-w-0 max-w-full flex-col items-start gap-3">
      <Button
        size="sm"
        variant="secondary"
        aria-pressed={state === "loaded"}
        data-testid={`${id}-swap`}
        onClick={() =>
          setState((current) =>
            current === "skeleton" ? "loaded" : "skeleton",
          )
        }
      >
        {state === "skeleton" ? "Show loaded" : "Show skeleton"}
      </Button>
      <div
        data-testid={`${id}-slot`}
        data-state={state}
        className={cx("min-w-0", className ?? "w-full")}
      >
        {state === "skeleton" ? skeleton : loaded}
      </div>
    </div>
  );
}

/** A captioned example inside a specimen. */
export function Example({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cx("gallery-example", className)}>
      <div className="gallery-example-stage">{children}</div>
      {label ? (
        <figcaption className="gallery-example-label">{label}</figcaption>
      ) : null}
    </figure>
  );
}

/** Variant × state matrix. Rows are variants, columns are states. */
export function Matrix({
  columns,
  rows,
}: {
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: string[];
  /** Records or matrix rows in display order. */
  rows: Array<{ label: string; cells: ReactNode[] }>;
}) {
  const scope = useContext(DemoScope);
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- comparison grids scroll horizontally on phones
    <div
      className="gallery-matrix"
      tabIndex={0}
      role="region"
      aria-label={scope ? `${scope}: Comparison` : "Comparison"}
      style={{
        gridTemplateColumns: `var(--gallery-matrix-label) repeat(${columns.length}, max-content)`,
      }}
    >
      <span />
      {columns.map((column) => (
        <span key={column} className="gallery-matrix-head">
          {column}
        </span>
      ))}
      {rows.map((row) => (
        <MatrixRow key={row.label} label={row.label} cells={row.cells} />
      ))}
    </div>
  );
}

function MatrixRow({ label, cells }: { label: string; cells: ReactNode[] }) {
  return (
    <>
      <span className="gallery-matrix-label">{label}</span>
      {cells.map((cell, index) => (
        <span key={index} className="gallery-matrix-cell">
          {cell}
        </span>
      ))}
    </>
  );
}

/** Do / Don't guidance. Keep each rule to one sentence. */
export function Rules({ do: dos, dont }: { do: string[]; dont: string[] }) {
  return (
    <div className="gallery-rules" data-wide="">
      <div className="gallery-rules-col" data-tone="do">
        <h3 className="type-overline">Do</h3>
        <ul>
          {dos.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
      <div className="gallery-rules-col" data-tone="dont">
        <h3 className="type-overline">Don’t</h3>
        <ul>
          {dont.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Lists custom properties with their live computed values in the current theme. */
export function TokenTable({
  tokens,
  title = "Tokens",
}: {
  tokens: Array<[name: string, note?: string]>;
  title?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement);
      setValues(
        Object.fromEntries(
          tokens.map(([name]) => [name, style.getPropertyValue(name).trim()]),
        ),
      );
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "data-mode",
        "data-palette",
        "data-density",
        "data-glass",
        "style",
      ],
    });
    return () => observer.disconnect();
  }, [tokens]);

  return (
    <section className="gallery-specimen" aria-label={title} data-wide="">
      <header className="gallery-specimen-header">
        <h2 className="gallery-specimen-title">{title}</h2>
      </header>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrolls sideways on narrow screens, so it must be keyboard scrollable (R20.6) */}
      <div
        className="gallery-token-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${title} tokens`}
      >
        <table className="gallery-token-table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Value now</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map(([name, note]) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                </td>
                <td>
                  <code className="gallery-token-value">
                    {values[name] || "—"}
                  </code>
                </td>
                <td>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export interface ContainerPreset {
  id: "row" | "header" | "tile" | "pane" | "tall";
  label: string;
  /** Available width or named width tier. */
  width: number;
  /** Available height used for the component’s size tier. */
  height: number;
}

/** R7.5: the five boxes every component must survive. */
export const CONTAINER_PRESETS: ContainerPreset[] = [
  { id: "row", label: "Row 600×40", width: 600, height: 40 },
  { id: "header", label: "Header 360×56", width: 360, height: 56 },
  { id: "tile", label: "Tile 280×180", width: 280, height: 180 },
  { id: "pane", label: "Pane 720×480", width: 720, height: 480 },
  { id: "tall", label: "Tall narrow 240×640", width: 240, height: 640 },
];

/**
 * Render a component inside each preset box (size containers, so the component's
 * container queries respond on both axes) plus a free frame you can drag to resize.
 * e2e/containers.spec.ts scans every [data-lab-frame] for clipped text.
 */
export function ContainerLab({
  title = "Container lab",
  description = "The same component in a table row, a header, a grid tile, a pane and a tall narrow column. Drag the last frame's corner to resize freely.",
  presets = CONTAINER_PRESETS,
  children,
}: {
  title?: string;
  description?: string;
  presets?: ContainerPreset[];
  children: ReactNode | ((preset: ContainerPreset | null) => ReactNode);
}) {
  const scope = useContext(DemoScope);
  const label = scope ? `${scope}: ${title}` : title;
  const render = (preset: ContainerPreset | null) =>
    typeof children === "function" ? children(preset) : children;
  return (
    <Specimen title={title} description={description} layout="bare" wide>
      {/* Presets keep their true widths, so on a phone the lab scrolls inside its panel instead of the page. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll region must be keyboard scrollable (R20.6) */}
      <div
        className="gallery-lab"
        tabIndex={0}
        role="region"
        aria-label={`${label} frames`}
      >
        {[...presets]
          .sort((a, b) => a.width * a.height - b.width * b.height)
          .map((preset) => (
            <figure
              key={preset.id}
              className="gallery-lab-cell"
              data-preset-area={preset.width * preset.height}
            >
              <div
                className="gallery-lab-frame"
                data-lab-frame={preset.id}
                style={{ width: preset.width, height: preset.height }}
              >
                <DemoScope value={`${label}: ${preset.label}`}>
                  {render(preset)}
                </DemoScope>
              </div>
              <figcaption className="gallery-example-label">
                {preset.label}
              </figcaption>
            </figure>
          ))}
        <figure className="gallery-lab-cell">
          <div
            className="gallery-lab-frame"
            data-lab-frame="free"
            data-resizable=""
            style={{ width: 420, height: 220 }}
          >
            <DemoScope value={`${label}: Free frame`}>{render(null)}</DemoScope>
          </div>
          <figcaption className="gallery-example-label">
            Free — drag the corner
          </figcaption>
        </figure>
      </div>
    </Specimen>
  );
}

export type TierBoxSize = "micro" | "compact" | "full" | "wide" | "tall";

/** The boxes that put a container-aware component in each tier (R7.2): Metric's and the charts'. */
const TIER_BOXES: Record<TierBoxSize, { label: string; className: string }> = {
  micro: {
    label: "micro · 360×48",
    className: "h-12 w-90 rounded-control px-3",
  },
  compact: {
    label: "compact · 280×180",
    className: "h-45 w-70 rounded-tile p-tile",
  },
  full: {
    label: "full · 640×360",
    className: "h-90 w-160 rounded-tile p-tile",
  },
  wide: {
    label: "full · 960×400",
    className: "h-100 w-240 rounded-tile p-tile",
  },
  tall: {
    label: "compact · 240×420",
    className: "h-105 w-60 rounded-tile p-tile",
  },
};

/** The glass-control box of a tier, for SwapSlot and other custom stages. */
export function tierBoxClass(size: TierBoxSize) {
  return cx("glass-control gallery-tier-box", TIER_BOXES[size].className);
}

/** A component in a box of one tier's size, captioned. It narrows on a phone rather than overhang. */
export function TierBox({
  size,
  label,
  children,
  testId,
  className,
}: {
  size: TierBoxSize;
  label?: string;
  children: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <Example label={label ?? TIER_BOXES[size].label} className="gallery-tier">
      <div className={cx(tierBoxClass(size), className)} data-testid={testId}>
        {children}
      </div>
    </Example>
  );
}

/** One component at micro, compact and full, stacked from smallest to largest. Test ids are `${testId}-${tier}`. */
export function TierRow({
  children,
  testId,
}: {
  children: (size: TierBoxSize) => ReactNode;
  testId?: string;
}) {
  return (
    <div className="gallery-tiers">
      {(["micro", "compact", "full"] as const).map((size) => (
        <TierBox
          key={size}
          size={size}
          testId={testId ? `${testId}-${size}` : undefined}
        >
          {children(size)}
        </TierBox>
      ))}
    </div>
  );
}
