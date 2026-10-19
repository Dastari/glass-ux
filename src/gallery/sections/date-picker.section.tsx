import { useState } from "react"
import { z } from "zod"
import { ContainerLab, Example, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import {
  Calendar,
  DateField,
  DateRangeField,
  DateTimeInput,
  TimeInput,
  addDays,
  dateTimeSchema,
  formatTimeText,
  timeSchema,
  timeSlots,
  todayIso,
  type DateRange,
  type IsoDate,
  type TimeValue,
  type WallClock,
} from "../../ui/date-picker/index.js"
import { TimeList } from "../../ui/date-picker/time-list.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

const today = todayIso()
const SYDNEY = "Australia/Sydney"

function SingleCalendar() {
  const [value, setValue] = useState<IsoDate | null>(addDays(today, 3))
  return (
    <Example label={value ?? "Nothing picked"}>
      <div className="glass-overlay fa-popup fa-popover fa-popover-preview fa-date-popover" data-size="sm">
        <div className="fa-popover-body">
          <Calendar value={value} onValueChange={setValue} aria-label="Maintenance day" />
        </div>
      </div>
    </Example>
  )
}

function RangeCalendar() {
  const [value, setValue] = useState<DateRange | null>({ start: addDays(today, -9), end: addDays(today, -2) })
  return (
    <Example label={value ? `${value.start} – ${value.end}` : "Nothing picked"}>
      <div className="glass-overlay fa-popup fa-popover fa-popover-preview fa-date-popover" data-size="sm">
        <div className="fa-popover-body">
          <Calendar mode="range" value={value} onValueChange={setValue} aria-label="Reporting period" />
        </div>
      </div>
    </Example>
  )
}

function TimesDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { opens: "07:30" as TimeValue | null, closes: "17:30" as TimeValue | null, reminder: null as TimeValue | null, rotation: "23:15" as TimeValue | null },
    validators: {
      onDynamic: z.object({
        opens: timeSchema({ required: true, min: "06:00", max: "12:00" }),
        closes: timeSchema({ required: true, min: "12:00", max: "22:00" }),
        reminder: timeSchema(),
        rotation: timeSchema({ hourCycle: 24 }),
      }),
    },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Depot hours" className="w-full" data-testid="time-form">
      <FormStack>
        <form.AppField name="opens">{(field) => <field.TimeField label="Depot opens" required min="06:00" max="12:00" step={30} />}</form.AppField>
        <form.AppField name="closes">{(field) => <field.TimeField label="Depot closes" required min="12:00" max="22:00" step={30} />}</form.AppField>
        <form.AppField name="reminder">{(field) => <field.TimeField label="Daily reminder" optional step={5} />}</form.AppField>
        <form.AppField name="rotation">{(field) => <field.TimeField label="Log rotation" optional hourCycle={24} />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Save</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

function DateTimesDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { starts: `${addDays(today, 2)}T21:00` as WallClock | null, freeze: "2026-10-04T02:30" as WallClock | null, call: null as WallClock | null },
    validators: {
      onDynamic: z.object({
        starts: dateTimeSchema({ required: true, min: `${today}T00:00`, timeZone: SYDNEY }),
        freeze: dateTimeSchema({ timeZone: SYDNEY }),
        call: dateTimeSchema({ timeZone: "America/New_York" }),
      }),
    },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Maintenance schedule" className="w-full" data-testid="date-time-form">
      <FormStack>
        <form.AppField name="starts">{(field) => <field.DateTimeField label="Maintenance starts" required timeZone={SYDNEY} min={`${today}T00:00`} step={30} />}</form.AppField>
        <form.AppField name="freeze">{(field) => <field.DateTimeField label="Change freeze ends" optional timeZone={SYDNEY} />}</form.AppField>
        <form.AppField name="call">{(field) => <field.DateTimeField label="Vendor call" optional timeZone="America/New_York" defaultTime="09:00" step={30} />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Save</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

function DateTimePickerPreview() {
  const [day, setDay] = useState<IsoDate>(addDays(today, 2))
  const [time, setTime] = useState<TimeValue>("09:30")
  const times = timeSlots({ step: 30, min: "07:00", max: "19:00" })
  return (
    <Example label={`${day}T${time}`}>
      <div className="glass-overlay fa-popup fa-popover fa-popover-preview fa-date-popover fa-date-time-popover" data-size="sm">
        <div className="fa-popover-body">
          <div className="fa-date-time-picker">
            <Calendar value={day} onValueChange={setDay} aria-label="Change window day" />
            <div className="fa-date-time-times">
              <TimeList times={times} value={time} format={(next) => formatTimeText(next)} onPick={setTime} aria-label="Change window time" />
            </div>
          </div>
        </div>
      </div>
    </Example>
  )
}

export default function DatePickerSection() {
  return (
    <SectionPage>
      <Specimen
        title="Calendar"
        description="Arrow keys move by day and week, Home and End to the week's ends, Page Up and Page Down by month (Shift: year), Enter picks. In a range, the first pick is the start; the band follows the pointer until the second."
      >
        <SingleCalendar />
        <RangeCalendar />
        <Example label="Bounded: the next 30 days">
          <div className="glass-overlay fa-popup fa-popover fa-popover-preview fa-date-popover" data-size="sm">
            <div className="fa-popover-body">
              <Calendar min={today} max={addDays(today, 30)} aria-label="Next 30 days" />
            </div>
          </div>
        </Example>
      </Specimen>

      <Specimen title="Fields" description="Type in the locale's order (13/10/2026; any separator, two-digit years) or open the calendar with its button or Alt+↓. Text that is not a day turns the box invalid and keeps what was typed." layout="stack">
        <FormStack>
          <Field label="Warranty ends">
            <DateField defaultValue="2027-03-31" />
          </Field>
          <Field label="Next maintenance">
            <DateField min={today} />
          </Field>
          <Field label="Reporting period" nativeLabel={false}>
            <DateRangeField defaultValue={{ start: addDays(today, -30), end: today }} aria-label="Reporting period" />
          </Field>
          <Field label="Retired on" error="Pick a day on or before today">
            <DateField defaultValue={addDays(today, 2)} invalid />
          </Field>
          <Field label="Enrolled">
            <DateField defaultValue="2024-02-12" readOnly />
          </Field>
          <Field label="Archived">
            <DateField disabled />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen
        title="Times"
        description="Type 930, 9:30pm, 21:30 or noon; the time is written in the locale's clock when you leave (9:30 am in en-AU). Arrow keys step the part under the caret, minutes by the step; Page Up and Page Down move an hour; Home and End go to the bounds. The list opens from its button or Alt+↓, at the chosen or nearest time."
        layout="stack"
      >
        <TimesDemo />
      </Specimen>

      <Specimen
        title="Date and time"
        description="One label and one message line for both parts. The value is a wall clock (2026-10-21T21:00); with a time zone the box shows its abbreviation on that day and the hint names the zone. A time the clocks skip reads forward and is explained; a repeated time reads as the first."
        layout="stack"
      >
        <DateTimesDemo />
      </Specimen>

      <Specimen title="Calendar and times" description="The date-and-time popup: the calendar beside the times, which wrap below it in a narrow popup. Picking a time closes it.">
        <DateTimePickerPreview />
      </Specimen>

      <Specimen title="Time states" layout="grid">
        <FormStack>
          <Field label="Empty">
            <TimeInput />
          </Field>
          <Field label="Unreadable" error="Enter a time such as 9:30 am">
            <TimeInput defaultValue="soon" />
          </Field>
          <Field label="Reading taken">
            <TimeInput defaultValue="14:05:30" seconds />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Read-only">
            <TimeInput defaultValue="08:45" readOnly />
          </Field>
          <Field label="Disabled">
            <TimeInput defaultValue="08:45" disabled />
          </Field>
          <Field label="Arrives">
            <DateTimeInput defaultValue="2026-11-02T06:15" readOnly timeZone={SYDNEY} />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Sizes" description="The box follows the control sizes; the calendar and the list keep their own.">
        <DateField size="sm" defaultValue={today} aria-label="Small" />
        <DateField size="md" defaultValue={today} aria-label="Medium" />
        <DateField size="lg" defaultValue={today} aria-label="Large" />
        <TimeInput size="sm" defaultValue="09:30" aria-label="Small time" />
        <TimeInput size="md" defaultValue="09:30" aria-label="Medium time" />
        <TimeInput size="lg" defaultValue="09:30" aria-label="Large time" />
        <DateTimeInput size="sm" defaultValue={`${today}T09:30`} aria-label="Small date and time" />
        <DateTimeInput size="md" defaultValue={`${today}T09:30`} aria-label="Medium date and time" />
        <DateTimeInput size="lg" defaultValue={`${today}T09:30`} aria-label="Large date and time" />
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <DateField defaultValue={today} aria-label="Date over imagery" />
        <TimeInput defaultValue="18:00" aria-label="Time over imagery" />
        <DateTimeInput defaultValue={`${today}T18:00`} timeZone={SYDNEY} aria-label="Date and time over imagery" />
        <DateRangeField defaultValue={{ start: addDays(today, -7), end: today }} aria-label="Range over imagery" />
      </Specimen>

      <ContainerLab>
        {(preset) =>
          preset?.id === "row" || preset?.id === "header" ? (
            <div className="flex h-full items-center gap-2 px-1">
              <DateField size="sm" width="full" defaultValue={today} aria-label="Date" />
              <TimeInput size="sm" width="full" defaultValue="09:30" aria-label="Time" />
            </div>
          ) : (
            <div className="h-full overflow-y-auto" data-scroll-container>
              <FormStack className="p-3">
                <Field label="Warranty ends">
                  <DateField defaultValue="2027-03-31" width="full" />
                </Field>
                <Field label="Reporting period" nativeLabel={false}>
                  <DateRangeField defaultValue={{ start: addDays(today, -30), end: today }} aria-label="Reporting period" />
                </Field>
                <Field label="Maintenance starts">
                  <DateTimeInput defaultValue={`${today}T21:00`} timeZone={SYDNEY} width="full" />
                </Field>
                <Field label="Depot opens">
                  <TimeInput defaultValue="07:30" />
                </Field>
              </FormStack>
            </div>
          )
        }
      </ContainerLab>

      <Rules
        do={[
          "Store and pass calendar days as ISO dates (2026-10-13); they never drift across time zones.",
          "Let people type: most dates are faster to type than to find.",
          "Bound the calendar with min and max when only some days make sense.",
          "Use DateRangeField for a range, not two DateFields side by side.",
          "Hold a time of day as HH:mm, and a date and time as a wall clock with its zone beside it; get the instant with resolveWallClock when you send it.",
          "Use DateTimeField for one moment, not a DateField and a TimeField side by side.",
          "Set the step to the times people choose: 15 or 30 minutes for bookings, 1 for logs.",
        ]}
        dont={[
          "Store a calendar day as a midnight timestamp.",
          "Spell out the format in a hint; the placeholder already shows it.",
          "Open the calendar on focus; it opens from its button or Alt+↓.",
          "Convert a wall clock to the browser's zone while the person types.",
          "Leave out the zone when the time is read in one other than the person's own.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--control-h-sm", "Day cell"],
          ["--accent", "Picked day and range ends"],
          ["--accent-soft", "Range band"],
          ["--accent-text", "Today and days inside the range"],
          ["--fill-hover", "Hovered day"],
          ["--radius-item", "Day and band corners"],
          ["--fg-subtle", "Weekdays and days outside the month"],
          ["--item-h", "Time row"],
          ["--field-short", "Time field, with its button"],
        ]}
      />

      <Usage
        code={`
import { dateTimeSchema, resolveWallClock, timeSchema } from "glass-ux/date-picker"

const schema = z.object({
  opens: timeSchema({ required: true, min: "06:00", max: "12:00" }), // "07:30"
  starts: dateTimeSchema({ required: true, timeZone: "Australia/Sydney" }), // "2026-10-21T09:30"
})

<form.AppField name="opens">{(field) => <field.TimeField label="Depot opens" min="06:00" max="12:00" step={30} />}</form.AppField>
<form.AppField name="starts">{(field) => <field.DateTimeField label="Maintenance starts" timeZone="Australia/Sydney" />}</form.AppField>

resolveWallClock("2026-10-21T09:30", "Australia/Sydney")?.iso // "2026-10-21T09:30:00+11:00"`}
      />
    </SectionPage>
  )
}
