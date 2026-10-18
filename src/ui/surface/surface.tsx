import type { ComponentProps, ElementType, ReactNode } from "react";
import { cx } from "../../lib/cx.js";

export type SurfaceMaterial =
  "chrome" | "panel" | "card" | "overlay" | "float" | "control" | "inset";
export type SurfaceRadius =
  "control" | "tile" | "surface" | "overlay" | "dialog" | "none";
export type SurfacePadding = "none" | "overlay" | "tile" | "panel" | "dialog";

type SurfaceProps<T extends ElementType> = {
  /** Semantic element rendered by the polymorphic component. */
  as?: T;
  /** Shared glass material. Use card for repeated tiles: the panel rim and fill without backdrop blur. */
  material?: SurfaceMaterial;
  /** Semantic corner-radius role. */
  radius?: SurfaceRadius;
  /** Semantic padding role. `overlay` is the item-list inset; pair it with `radius="overlay"` so `.fa-item` rows nest. */
  padding?: SurfacePadding;
  /** Make this surface a size container so its contents can respond with @container. */
  container?: boolean;
} & Omit<ComponentProps<T>, "as">;

/**
 * A piece of glass. Picks a material from glass.css and a radius role; layout is the
 * caller's. Prefer Panel for content panes — it adds the header/body/footer slots.
 */
export function Surface<T extends ElementType = "div">({
  as,
  material = "panel",
  radius = "surface",
  padding = "none",
  container = false,
  className,
  ...rest
}: SurfaceProps<T>) {
  const Component: ElementType = as ?? "div";
  return (
    <Component
      {...rest}
      className={cx(`glass-${material}`, "fa-surface", className)}
      data-radius={radius}
      data-padding={padding}
      data-container={container ? "" : undefined}
    />
  );
}

export interface PanelProps extends ComponentProps<"section"> {
  /** Let the body scroll inside a bounded panel instead of growing the page. */
  scroll?: boolean;
}

/**
 * The standard content pane: glass-panel, surface radius, header/body/footer slots.
 * Every Panel is an inline-size container named `panel`, so anything inside it lays out
 * against the panel's width — never the viewport's.
 */
export function Panel({ scroll = false, className, ...rest }: PanelProps) {
  return (
    <section
      {...rest}
      className={cx("glass-panel fa-surface fa-panel", className)}
      data-radius="surface"
      data-scroll={scroll ? "" : undefined}
    />
  );
}

export interface PanelHeaderProps extends Omit<
  ComponentProps<"header">,
  "title"
> {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned controls. Keep to ghost/secondary buttons, tabs or a segmented control. */
  actions?: ReactNode;
  /** Heading level for the title; panels on a page are normally h2. */
  level?: 2 | 3 | 4;
}

/** A Panel heading with an optional icon, description and trailing actions. */
export function PanelHeader({
  icon,
  title,
  description,
  actions,
  level = 2,
  className,
  children,
  ...rest
}: PanelHeaderProps) {
  const Heading = `h${level}` as const;
  return (
    <header {...rest} className={cx("fa-panel-header", className)}>
      {icon ? <span className="fa-panel-header-icon">{icon}</span> : null}
      <div className="fa-panel-header-text">
        <Heading className="fa-panel-title">{title}</Heading>
        {description ? (
          <p className="fa-panel-description">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="fa-panel-actions">{actions}</div> : null}
      {children}
    </header>
  );
}

/** The content slot of a Panel, with consistent padding and support for a bounded scrolling parent. */
export function PanelBody({ className, ...rest }: ComponentProps<"div">) {
  return <div {...rest} className={cx("fa-panel-body", className)} />;
}

/** The supporting content and actions slot at the bottom of a Panel. */
export function PanelFooter({ className, ...rest }: ComponentProps<"footer">) {
  return <footer {...rest} className={cx("fa-panel-footer", className)} />;
}
