import { cx } from "../../lib/cx.js";
import { Meter, type MeterProps } from "../meter/index.js";
import { Tooltip } from "../tooltip/index.js";
export interface MeterCellProps extends Omit<MeterProps, "layout" | "label"> {
  /** Accessible measurement name. */ label: string;
  /** Full tooltip breakdown; defaults to the visible reading. */ description?: string;
}
/** A responsive table meter: the reading remains when the narrow cell drops its track. */
export function MeterCell({
  label,
  description,
  className,
  ...props
}: MeterCellProps) {
  return (
    <Tooltip
      content={
        description ??
        props.valueText ??
        `${Math.round(props.max && props.max > 0 ? (props.value / props.max) * 100 : props.value)}%`
      }
    >
      <span className={cx("fa-meter-cell", className)}>
        <Meter {...props} aria-label={label} layout="inline" />
      </span>
    </Tooltip>
  );
}
