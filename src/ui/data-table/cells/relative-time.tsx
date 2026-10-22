import { useLocale } from "../../../lib/locale/use-locale.js";
import { Tooltip } from "../../tooltip/index.js";
import { formatAbsolute, formatRelative, toTime } from "../format.js";
import { useNow } from "../use-now.js";

export interface RelativeTimeProps {
  value: Date | number | string | null | undefined;
  /** Text for a missing value. */
  fallback?: string;
}

/**
 * "2 min ago", ticking on a shared clock; the absolute time is in a keyboard-accessible tooltip (R2.7).
 */
export function RelativeTime({ value, fallback = "Never" }: RelativeTimeProps) {
  const now = useNow();
  const locale = useLocale();
  if (value === null || value === undefined)
    return <span className="fa-dt-text fa-dt-muted">{fallback}</span>;
  const time = toTime(value);
  if (!Number.isFinite(time))
    return <span className="fa-dt-text fa-dt-muted">{fallback}</span>;
  return (
    <Tooltip content={formatAbsolute(time, locale)}>
      <time
        ref={focusableOutsideControls}
        className="fa-dt-text"
        dateTime={new Date(time).toISOString()}
        suppressHydrationWarning
      >
        {formatRelative(time, now || time, locale)}
      </time>
    </Tooltip>
  );
}

/** Controls (and focusable rows and cells) that already take focus for what they hold. */
const FOCUSABLE_AROUND =
  "a[href], button, [role=button], [role=link], [role=tab], [role=treeitem], [role=option], [role=menuitem], [role=row][tabindex], [role=gridcell][tabindex]";

/**
 * The time takes focus for its tooltip unless something focusable around it already does.
 * Decided once the element is placed, as a DOM attribute, so mounting renders once.
 */
function focusableOutsideControls(element: HTMLTimeElement | null) {
  if (element && !element.parentElement?.closest(FOCUSABLE_AROUND))
    element.tabIndex = 0;
}
