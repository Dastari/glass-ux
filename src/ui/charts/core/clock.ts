/** "Now" for relative times in charts: the page's shared clock (lib/clock.ts). */
import { useClock } from "../../../lib/clock.js"

/** The current time, or `fixed` when the caller supplies one (tests, fixtures). */
export function useNow(fixed?: Date): Date {
  const live = useClock()
  return fixed ?? new Date(live)
}
