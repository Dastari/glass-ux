import { dateTimeFormat } from "../../lib/locale/intl.js"

const DAY = 86_400_000

/** A calendar day in the browser's time zone, comparable across a daylight-saving change. */
function dayNumber(time: number) {
  const date = new Date(time)
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY)
}

/** The day a time falls on, as a heading: Today, Yesterday, a weekday this week, then the date. */
export function dayLabel(time: number, now: number, locale: string, words: { today: string; yesterday: string }) {
  const days = now ? dayNumber(now) - dayNumber(time) : Number.POSITIVE_INFINITY
  if (days === 0) return words.today
  if (days === 1) return words.yesterday
  const date = new Date(time)
  if (days > 1 && days < 7) return dateTimeFormat(locale, { weekday: "long" }).format(date)
  return dateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(date)
}

export { dayNumber }
