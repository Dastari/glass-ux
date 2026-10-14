import type { ComponentProps, ReactNode } from "react";
import { cx } from "../../lib/cx.js";
import { useAiSurface } from "../surface/index.js";

export type AiCardTone =
  "default" | "accent" | "success" | "warning" | "danger" | "info";

export interface AiCardProps extends ComponentProps<"section"> {
  tone?: AiCardTone;
  /**
   * A recessed well inside panels (code, logs, JSON) instead of a raised card. On the
   * canvas every card is a glass layer.
   */
  well?: boolean;
  /** A wide block (tables, charts, code, images): in a conversation it may break out wider than the text (R5.4). */
  breakout?: boolean;
}

/**
 * The one card for everything the assistant renders beyond prose: code, results, tool
 * details and asks. Its material follows the surface (R4.2): a glass layer on the canvas,
 * a fill inside a panel. It is an inline-size container named `ai-card`, so what it holds
 * lays out against the card, never the viewport.
 */
function Root({
  tone = "default",
  well = false,
  breakout = false,
  className,
  ...rest
}: AiCardProps) {
  const surface = useAiSurface();
  // Repeated cards in a long conversation use glass-card: the panel look without a blur pass (R4.8).
  // Floating (the ask dock), the dock is the surface: the card adds no layer of its own.
  const material =
    surface === "canvas"
      ? "glass-card"
      : well
        ? "glass-inset"
        : surface === "float"
          ? undefined
          : "glass-control";
  return (
    <section
      {...rest}
      className={cx(material, "fa-ai-card", className)}
      data-tone={tone === "default" ? undefined : tone}
      data-surface={surface}
      data-well={well ? "" : undefined}
      data-breakout={breakout ? "" : undefined}
    />
  );
}

export interface AiCardHeaderProps extends Omit<
  ComponentProps<"header">,
  "title"
> {
  /** A glyph before the title. Pass it without a size. */
  icon?: ReactNode;
  /** Put the icon in a toned tile (asks, entity cards). */
  iconTile?: boolean;
  title: ReactNode;
  /** Data only (R2.2): row count, source, target. */
  meta?: ReactNode;
  /** Trailing ghost actions: copy, export, open in window. */
  actions?: ReactNode;
  /** Heading level inside the conversation outline. */
  level?: 2 | 3 | 4 | 5 | 6;
}

function Header({
  icon,
  iconTile = false,
  title,
  meta,
  actions,
  level = 3,
  className,
  children,
  ...rest
}: AiCardHeaderProps) {
  const Heading = `h${level}` as const;
  return (
    <header
      {...rest}
      className={cx("fa-ai-card-header", className)}
      data-tile={iconTile ? "" : undefined}
    >
      {icon ? (
        <span
          className={cx("fa-ai-card-icon", iconTile && "fa-tile-icon")}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <div className="fa-ai-card-heading">
        <Heading className="fa-ai-card-title">{title}</Heading>
        {meta ? <p className="fa-ai-card-meta">{meta}</p> : null}
      </div>
      {children}
      {actions ? <div className="fa-ai-card-actions">{actions}</div> : null}
    </header>
  );
}

export interface AiCardBodyProps extends ComponentProps<"div"> {
  /** No inset: tables, images and code bring their own. */
  flush?: boolean;
}

function Body({ flush = false, className, ...rest }: AiCardBodyProps) {
  return (
    <div
      {...rest}
      className={cx("fa-ai-card-body", className)}
      data-flush={flush ? "" : undefined}
    />
  );
}

function Footer({ className, ...rest }: ComponentProps<"footer">) {
  return <footer {...rest} className={cx("fa-ai-card-footer", className)} />;
}

/** A composable assistant card with header, body and footer slots. Its material follows the surrounding AiSurfaceProvider. */
export const AiCard = { Root, Header, Body, Footer };
