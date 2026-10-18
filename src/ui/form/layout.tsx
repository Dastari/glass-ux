import type { ComponentProps, ReactNode } from "react";
import { cx } from "../../lib/cx.js";
import { Fieldset, type FieldsetProps } from "../field/index.js";

export interface FormStackProps extends ComponentProps<"div"> {}

/**
 * The single form column (R15.2): one field or setting per row, capped at
 * --form-measure. Fields keep their message line, so rows sit on a steady rhythm.
 */
export function FormStack({ className, ...rest }: FormStackProps) {
  return <div {...rest} className={cx("fa-form-stack", className)} />;
}

export interface FormGroupProps extends Omit<
  FieldsetProps,
  "variant" | "legend"
> {
  /** Overline group label ("Placement", "Behaviour"). */
  label: ReactNode;
}

/** Related rows under an overline label; groups are separated by --gap-section (R15.8). */
export function FormGroup({
  label,
  className,
  children,
  ...rest
}: FormGroupProps) {
  return (
    <Fieldset
      {...rest}
      legend={label}
      variant="section"
      className={cx("fa-form-group", className)}
    >
      {children}
    </Fieldset>
  );
}

/** Footer row for a form outside a Panel or Dialog: secondary actions, then Save. */
export function FormActions({ className, ...rest }: ComponentProps<"div">) {
  return <div {...rest} className={cx("fa-form-actions", className)} />;
}
