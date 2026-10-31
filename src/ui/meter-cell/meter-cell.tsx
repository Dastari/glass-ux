import { cx } from "../../lib/cx.js";
import { formatPercent } from "../../lib/locale/intl.js";
import { useLocale } from "../../lib/locale/use-locale.js";
import { Meter, type MeterProps } from "../meter/index.js";
import { Tooltip } from "../tooltip/index.js";
export interface MeterCellProps extends Omit<MeterProps, "layout" | "label"> {
  /** Accessible measurement name. */ label: string;
  /** Full tooltip breakdown; defaults to the visible reading. */ description?: string;
}
/**
 * A responsive table meter: the reading remains when the narrow cell drops its track. It
 * takes Meter's thresholds and `tone`; pass `tone="data"` where the column compares levels
 * in the data colour.
 */
export function MeterCell({
  label,
  description,
  className,
  ...props
}: MeterCellProps) {
  const locale = useLocale();
  return (
    <Tooltip
      content={
        description ??
        props.valueText ??
        formatPercent(locale, Math.round(props.max && props.max > 0 ? (props.value / props.max) * 100 : props.value))
      }
    >
      <span className={cx("fa-meter-cell", className)}>
        <Meter {...props} aria-label={label} layout="inline" />
      </span>
    </Tooltip>
  );
}
