import { mergeProps } from "@base-ui/react/merge-props";
import {
  cloneElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { cx } from "../../lib/cx.js";
import type { ButtonSize, ButtonVariant } from "../button/index.js";

export interface ButtonLinkProps extends Omit<ComponentProps<"a">, "children"> {
  /** Visible link label. */
  children: ReactNode;
  /** Shared Button appearance. Default: secondary. */
  variant?: ButtonVariant;
  /** Shared control height and insets. Default: md. */
  size?: ButtonSize;
  /** Leading icon, automatically sized. */
  icon?: ReactNode;
  /** Trailing icon, automatically sized. */
  iconEnd?: ReactNode;
  /** Stretch to the container width. */
  block?: boolean;
  /** Router-owned anchor. Routing props, styles, ref and event handlers are preserved. */
  render?: ReactElement<Record<string, unknown>>;
}

/** A button-styled link with native navigation and open-in-new-tab behaviour. */
export function ButtonLink({
  variant = "secondary",
  size = "md",
  icon,
  iconEnd,
  block = false,
  render,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  const props = {
    ...rest,
    className: cx("fa-btn fa-pressable", className),
    "data-variant": variant,
    "data-size": size,
    "data-block": block ? "" : undefined,
  };
  const content = (
    <>
      {icon}
      <span className="fa-btn-label">{children}</span>
      {iconEnd}
    </>
  );
  return render ? (
    cloneElement(render, mergeProps(render.props, props), content)
  ) : (
    <a {...props}>{content}</a>
  );
}
