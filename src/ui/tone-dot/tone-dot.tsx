import type { ComponentProps } from "react";
import { cx } from "../../lib/cx.js";
import type { BadgeTone } from "../badge/index.js";

export interface ToneDotProps extends Omit<ComponentProps<"span">, "children"> {
  /** Semantic state, or data for informational activity such as a running timer. */
  tone?: BadgeTone | "data";
  /** A solid dot, hollow ring, or compositor-only live pulse. */
  marker?: "dot" | "ring" | "pulse";
  /** Accessible state name; omit only beside a visible equivalent label. */
  label?: string;
  /** Solid corner mark with a separating surface ring. */
  overlay?: boolean;
}
/** A tone-keyed state marker without an application-specific status vocabulary. */
export function ToneDot({
  tone = "neutral",
  marker = "dot",
  label,
  overlay = false,
  className,
  ...rest
}: ToneDotProps) {
  return (
    <span
      {...rest}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cx("fa-status-dot", className)}
      data-tone={tone}
      data-marker={marker}
      data-overlay={overlay ? "" : undefined}
    />
  );
}
