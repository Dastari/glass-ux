import { useEffect, useRef, useState } from "react";
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
  const element = useRef<HTMLTimeElement>(null);
  const [insideControl, setInsideControl] = useState(false);
  useEffect(() => {
    setInsideControl(
      Boolean(
        element.current?.parentElement?.closest(
          "a[href], button, [role=button], [role=link], [role=tab], [role=treeitem], [role=option], [role=menuitem], [role=row][tabindex], [role=gridcell][tabindex]",
        ),
      ),
    );
  }, [value]);
  if (value === null || value === undefined)
    return <span className="fa-dt-text fa-dt-muted">{fallback}</span>;
  const time = toTime(value);
  if (!Number.isFinite(time))
    return <span className="fa-dt-text fa-dt-muted">{fallback}</span>;
  return (
    <Tooltip
      content={formatAbsolute(time, locale)}
      tabIndex={insideControl ? undefined : 0}
    >
      <time
        ref={element}
        className="fa-dt-text"
        dateTime={new Date(time).toISOString()}
        suppressHydrationWarning
      >
        {formatRelative(time, now || time, locale)}
      </time>
    </Tooltip>
  );
}
