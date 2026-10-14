import { formatAbsolute, formatRelative, toTime } from "../format.js"
import { useNow } from "../use-now.js"

export interface RelativeTimeProps {
  value: Date | number | string | null | undefined
  /** Text for a missing value. */
  fallback?: string
}

/**
 * "2 min ago", ticking on a shared clock; the absolute time is in the title (R2.7).
 */
export function RelativeTime({ value, fallback = "Never" }: RelativeTimeProps) {
  const now = useNow()
  if (value === null || value === undefined) return <span className="fa-dt-text fa-dt-muted">{fallback}</span>
  const time = toTime(value)
  return (
    <time className="fa-dt-text" dateTime={new Date(time).toISOString()} title={formatAbsolute(time)} suppressHydrationWarning>
      {formatRelative(time, now || time)}
    </time>
  )
}
