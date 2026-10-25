import type { ComponentProps } from "react";
import { cx } from "../../lib/cx.js";

/** Props for content available to assistive technology without a visible box. */
export interface VisuallyHiddenProps extends ComponentProps<"span"> {}

/** Keep a label in the accessibility tree while clipping its visual presentation. Do not hide focusable controls. */
export function VisuallyHidden({ className, ...props }: VisuallyHiddenProps) {
  return <span {...props} className={cx("fa-visually-hidden", className)} />;
}
