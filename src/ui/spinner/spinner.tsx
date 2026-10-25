import type { ComponentProps } from "react";
import { IconSpinner } from "../../icons/generated/icons.js";
import type { IconSize } from "../icon/index.js";
import { cx } from "../../lib/cx.js";
import { useMessages } from "../../lib/i18n/use-messages.js";
import { VisuallyHidden } from "../visually-hidden/index.js";
import { spinnerMessages } from "./messages.js";

/** Props for an accessible, token-sized work indicator. */
export interface SpinnerProps extends Omit<ComponentProps<"span">, "children"> {
  /** Icon token size; defaults to md. */
  size?: IconSize;
  /** Spoken status, defaulting to the translated Loading message. Empty hides the indicator from assistive technology. */
  label?: string;
  /** Semantic foreground colour. */
  tone?: "current" | "accent" | "muted";
}

/** A work indicator with a reserved icon box and a visually hidden status label. Motion follows the appearance preference. */
export function Spinner({
  size = "md",
  label,
  tone = "current",
  className,
  ...props
}: SpinnerProps) {
  const messages = useMessages(spinnerMessages);
  const text = label ?? messages.loading;
  return (
    <span
      {...props}
      className={cx("fa-spinner", className)}
      data-tone={tone}
      role={text ? "status" : undefined}
      aria-hidden={text ? undefined : true}
    >
      <IconSpinner size={size} />
      {text ? <VisuallyHidden>{text}</VisuallyHidden> : null}
    </span>
  );
}
