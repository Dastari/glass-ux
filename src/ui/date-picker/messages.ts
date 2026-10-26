import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for datePicker. */
export const datePickerMessages = defineMessages("datePicker", {
  previousMonth: "Previous month",
  noEarlierDatesCanBeChosen: "No earlier dates can be chosen",
  nextMonth: "Next month",
  noLaterDatesCanBeChosen: "No later dates can be chosen",
  chooseADate: "Choose a date",
  startDate: "Start date",
  endDate: "End date",
  chooseDates: "Choose dates",
  date: "Date",
  time: "Time",
  timeZone: (zone: string) => `Time zone ${zone}`,
  chooseADateAndTime: "Choose a date and time",
  gapHint: ({ typed, day, resolved, zone }: { typed: string; day: string; resolved: string; zone: string }) => `Clocks skip ${typed} on ${day}; read as ${resolved} ${zone}`,
  overlapHint: ({ typed, day, zone }: { typed: string; day: string; zone: string }) => `${typed} occurs twice on ${day}; read as the first (${zone})`,
  enterATimeSuchAs: (example: string) => `Enter a time such as ${example}`,
  enterATimeFromTo: (minimum: string, maximum: string) => `Enter a time from ${minimum} to ${maximum}`,
  enterATimeOfOrEarlier: (maximum: string) => `Enter a time of ${maximum} or earlier`,
  enterATimeOfOrLater: (minimum: string) => `Enter a time of ${minimum} or later`,
  enterATime: "Enter a time",
  enterADateAndTimeFromTo: (minimum: string, maximum: string) => `Enter a date and time from ${minimum} to ${maximum}`,
  enterADateAndTimeOnOrBefore: (maximum: string) => `Enter a date and time on or before ${maximum}`,
  enterADateAndTimeOnOrAfter: (minimum: string) => `Enter a date and time on or after ${minimum}`,
  enterADateAndTime: "Enter a date and time",
  enterADate: "Enter a date",
  enterADateAs: (format: string) => `Enter a date as ${format}`,
  skippedTime: "This time does not exist during the daylight-saving change; choose another time",
  repeatedTime: "This time occurs twice during the daylight-saving change; choose an unambiguous time",
  chooseATime: "Choose a time",
  times: "Times",
  noTimesAvailable: "No times available",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    datePicker: typeof datePickerMessages.defaults
  }
}

/** Resolve datePicker wording outside React; pass the component's locale. */
export function getDatePickerMessages(locale = getLocale()): typeof datePickerMessages.defaults {
  return resolveMessages(datePickerMessages.namespace, datePickerMessages.defaults, locale)
}
