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
  timeZone: (value0: unknown) => `Time zone ${value0}`,
  chooseADateAndTime: "Choose a date and time",
  clocksSkipOnReadAs: (value0: unknown, value1: unknown, value2: unknown, value3: unknown) => `Clocks skip ${value0} on ${value1}; read as ${value2} ${value3}`,
  occursTwiceOnReadAsThe: (value0: unknown, value1: unknown, value2: unknown) => `${value0} occurs twice on ${value1}; read as the first (${value2})`,
  enterATimeSuchAs: (value0: unknown) => `Enter a time such as ${value0}`,
  enterATimeFromTo: (value0: unknown, value1: unknown) => `Enter a time from ${value0} to ${value1}`,
  enterATimeOfOrEarlier: (value0: unknown) => `Enter a time of ${value0} or earlier`,
  enterATimeOfOrLater: (value0: unknown) => `Enter a time of ${value0} or later`,
  enterATime: "Enter a time",
  enterADateAndTimeFromTo: (value0: unknown, value1: unknown) => `Enter a date and time from ${value0} to ${value1}`,
  enterADateAndTimeOnOrBefore: (value0: unknown) => `Enter a date and time on or before ${value0}`,
  enterADateAndTimeOnOrAfter: (value0: unknown) => `Enter a date and time on or after ${value0}`,
  enterADateAndTime: "Enter a date and time",
  enterADate: "Enter a date",
  enterADateAs: (value0: unknown) => `Enter a date as ${value0}`,
  thisTimeDoesNotExistDuringTheDaylightSaving: "This time does not exist during the daylight-saving change; choose another time",
  thisTimeOccursTwiceDuringTheDaylightSavingChange: "This time occurs twice during the daylight-saving change; choose an unambiguous time",
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
