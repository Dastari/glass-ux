// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { configureLocale, configuredLocale } from "../../lib/locale/locale.js"
import { LocaleProvider } from "../../lib/locale/use-locale.js"
import { Field } from "../field/index.js"
import { Form, formBehaviour, useAppForm } from "../form/index.js"
import { DateField } from "./date-field.js"
import { DateTimeInput } from "./date-time-input.js"
import { describeZonedValue } from "./fields.js"
import { dateSchema, dateTimeSchema, timeSchema } from "./schema.js"
import { TimeInput } from "./time-input.js"

afterEach(cleanup)

const type = (input: HTMLElement, text: string) => fireEvent.change(input, { target: { value: text } })
const key = (input: HTMLElement, name: string, caret?: number) => {
  if (caret !== undefined) (input as HTMLInputElement).setSelectionRange(caret, caret)
  fireEvent.keyDown(input, { key: name })
}

describe("TimeInput", () => {
  it("reads typed text on blur and writes the locale's clock", () => {
    const onValueChange = vi.fn()
    render(<TimeInput aria-label="Opens" onValueChange={onValueChange} />)
    const input = screen.getByRole("textbox", { name: "Opens" })
    expect(input).toHaveAttribute("placeholder", "h:mm am")
    type(input, "930pm")
    expect(onValueChange).not.toHaveBeenCalled()
    fireEvent.blur(input)
    expect(onValueChange).toHaveBeenLastCalledWith("21:30")
    expect(input).toHaveValue("9:30 pm")
    type(input, "")
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onValueChange).toHaveBeenLastCalledWith(null)
  })

  it("follows a controlled value and a 24-hour clock", () => {
    function Controlled() {
      const [value, setValue] = useState<string | null>("09:30")
      return (
        <>
          <TimeInput aria-label="Starts" hourCycle={24} value={value} onValueChange={setValue} />
          <button type="button" onClick={() => setValue("18:45")}>
            Evening
          </button>
          <output>{value ?? "none"}</output>
        </>
      )
    }
    render(<Controlled />)
    const input = screen.getByRole("textbox", { name: "Starts" })
    expect(input).toHaveValue("09:30")
    fireEvent.click(screen.getByRole("button", { name: "Evening" }))
    expect(input).toHaveValue("18:45")
    type(input, "7.05")
    fireEvent.keyDown(input, { key: "Enter" })
    expect(screen.getByRole("status")).toHaveTextContent("07:05")
    expect(input).toHaveValue("07:05")
  })

  it("steps the part under the caret", () => {
    const onValueChange = vi.fn()
    render(<TimeInput aria-label="Opens" defaultValue="09:32" min="06:00" onValueChange={onValueChange} />)
    const input = screen.getByRole("textbox", { name: "Opens" })
    expect(input).toHaveValue("9:32 am")
    key(input, "ArrowUp", 3)
    expect(input).toHaveValue("9:45 am")
    key(input, "ArrowUp", 0)
    expect(input).toHaveValue("10:45 am")
    key(input, "ArrowDown", 7)
    expect(input).toHaveValue("10:45 pm")
    key(input, "PageDown", 3)
    expect(input).toHaveValue("9:45 pm")
    key(input, "Home")
    expect(input).toHaveValue("6:00 am")
    expect(onValueChange).toHaveBeenLastCalledWith("06:00")
    // No max: End moves the caret as usual.
    const end = fireEvent.keyDown(input, { key: "End" })
    expect(end).toBe(true)
    expect(input).toHaveValue("6:00 am")
  })

  it("keeps unreadable or out-of-range text and reports it", () => {
    const onValueChange = vi.fn()
    const onReject = vi.fn()
    render(<TimeInput aria-label="Opens" min="09:00" onValueChange={onValueChange} onReject={onReject} />)
    const input = screen.getByRole("textbox", { name: "Opens" })
    type(input, "soon")
    fireEvent.blur(input)
    expect(onReject).toHaveBeenLastCalledWith("soon")
    expect(input).toHaveValue("soon")
    expect(input).toHaveAttribute("aria-invalid", "true")
    type(input, "8")
    fireEvent.blur(input)
    expect(onReject).toHaveBeenLastCalledWith("08:00")
    expect(input).toHaveValue("8:00 am")
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("picks from the list with the keyboard", async () => {
    const onValueChange = vi.fn()
    render(<TimeInput aria-label="Opens" defaultValue="09:00" step={30} onValueChange={onValueChange} />)
    const input = screen.getByRole("textbox", { name: "Opens" })
    fireEvent.keyDown(input, { key: "ArrowDown", altKey: true })
    const list = await screen.findByRole("listbox", { name: "Times" })
    expect(list.getAttribute("aria-activedescendant")).toBeTruthy()
    const active = document.getElementById(list.getAttribute("aria-activedescendant")!)
    expect(active).toHaveTextContent("9:00 am")
    expect(active).toHaveAttribute("aria-selected", "true")
    expect(active).toHaveAttribute("aria-setsize", "48")
    fireEvent.keyDown(list, { key: "ArrowDown" })
    fireEvent.keyDown(list, { key: "Enter" })
    expect(onValueChange).toHaveBeenLastCalledWith("09:30")
    expect(input).toHaveValue("9:30 am")
  })
})

describe("DateTimeInput", () => {
  it("commits both parts when focus leaves the field", () => {
    const onValueChange = vi.fn()
    render(
      <Field label="Maintenance starts">
        <DateTimeInput timeZone="Australia/Sydney" onValueChange={onValueChange} />
      </Field>
    )
    const group = screen.getByRole("group", { name: "Maintenance starts" })
    const date = screen.getByRole("textbox", { name: "Maintenance starts Date" })
    const time = screen.getByRole("textbox", { name: "Maintenance starts Time" })
    expect(group).toContainElement(time)
    type(date, "21/10/2026")
    fireEvent.blur(date, { relatedTarget: time })
    expect(onValueChange).not.toHaveBeenCalled()
    type(time, "930")
    fireEvent.blur(time)
    expect(onValueChange).toHaveBeenLastCalledWith("2026-10-21T09:30")
    expect(time).toHaveValue("9:30 am")
    expect(group).toHaveTextContent("AEDT")
    expect(time.getAttribute("aria-describedby")).toBeTruthy()
  })

  it("fills the default time and reports an incomplete entry", () => {
    const onValueChange = vi.fn()
    const onReject = vi.fn()
    const { rerender } = render(<DateTimeInput aria-label="Call" defaultTime="09:00" onValueChange={onValueChange} onReject={onReject} />)
    const date = screen.getByRole("textbox", { name: "Date" })
    type(date, "2/11/2026")
    fireEvent.blur(date)
    expect(onValueChange).toHaveBeenLastCalledWith("2026-11-02T09:00")
    rerender(<DateTimeInput aria-label="Call" onValueChange={onValueChange} onReject={onReject} />)
    type(screen.getByRole("textbox", { name: "Time" }), "")
    fireEvent.blur(date)
    expect(onReject).toHaveBeenLastCalledWith("2026-11-02T")
  })
})

describe("bound fields", () => {
  function Schedule() {
    const form = useAppForm({
      ...formBehaviour,
      defaultValues: { opens: "07:30" as string | null, starts: null as string | null },
      validators: { onDynamic: z.object({ opens: timeSchema({ required: true, min: "06:00", max: "12:00" }), starts: dateTimeSchema({ required: true }) }) },
    })
    return (
      <>
        <form.AppField name="opens">{(field) => <field.TimeField label="Depot opens" min="06:00" max="12:00" />}</form.AppField>
        <form.AppField name="starts">{(field) => <field.DateTimeField label="Starts" />}</form.AppField>
      </>
    )
  }

  it("explain unreadable, out-of-range and incomplete entries", async () => {
    render(<Schedule />)
    const opens = screen.getByRole("textbox", { name: "Depot opens" })
    type(opens, "soon")
    await act(async () => fireEvent.blur(opens))
    expect(await screen.findByText("Enter a time such as 9:30 am")).toBeInTheDocument()
    type(opens, "1pm")
    await act(async () => fireEvent.blur(opens))
    expect(await screen.findByText("Enter a time from 6:00 am to 12:00 pm")).toBeInTheDocument()
    const date = screen.getByRole("textbox", { name: "Starts Date" })
    type(date, "21/10/2026")
    await act(async () => fireEvent.blur(date))
    expect(await screen.findByText("Enter a time")).toBeInTheDocument()
  })
})

describe("zone messages", () => {
  it("name the zone, and explain skipped and repeated times", () => {
    expect(describeZonedValue("2026-10-21T09:30", "Australia/Sydney")).toEqual({ hint: "Australia/Sydney · UTC+11:00" })
    expect(describeZonedValue("2026-10-04T02:30", "Australia/Sydney")).toEqual({ warning: "Clocks skip 2:30 am on 4 Oct; read as 3:30 am AEDT" })
    expect(describeZonedValue("2026-04-05T02:30", "Australia/Sydney")).toEqual({ hint: "2:30 am occurs twice on 5 Apr; read as the first (AEDT)" })
    expect(describeZonedValue("2026-11-01T01:30", "America/New_York")).toEqual({ hint: "1:30 am occurs twice on 1 Nov; read as the first (EDT)" })
  })
})

describe("schemas", () => {
  it("name the problem", () => {
    const time = timeSchema({ required: true, min: "09:00", max: "17:00" })
    expect(time.safeParse("10:00").success).toBe(true)
    expect(time.safeParse(null).error?.issues[0]?.message).toBe("Enter a time")
    expect(time.safeParse("08:00").error?.issues[0]?.message).toBe("Enter a time from 9:00 am to 5:00 pm")
    expect(timeSchema().safeParse(null).success).toBe(true)
    const when = dateTimeSchema({ min: "2026-10-19T09:00", timeZone: "Australia/Sydney", daylightSaving: "reject" })
    expect(when.safeParse("2026-10-21T09:30").success).toBe(true)
    expect(when.safeParse("2026-10-19T08:00").error?.issues[0]?.message).toBe("Enter a date and time on or after 19/10/2026 9:00 am")
    expect(when.safeParse("31/02/2026T09:30").error?.issues[0]?.message).toBe("Enter a date as dd/mm/yyyy")
    expect(when.safeParse("2026-10-21Tsoon").error?.issues[0]?.message).toBe("Enter a time such as 9:30 am")
    expect(when.safeParse("T09:30").error?.issues[0]?.message).toBe("Enter a date")
    expect(dateTimeSchema({ timeZone: "Australia/Sydney", daylightSaving: "reject" }).safeParse("2026-10-04T02:30").error?.issues[0]?.message).toMatch(/does not exist/)
    expect(dateTimeSchema({ timeZone: "Australia/Sydney" }).safeParse("2026-10-04T02:30").success).toBe(true)
  })

  it("write messages in the locale current when a value is checked", () => {
    const previous = configuredLocale()
    const when = dateTimeSchema({ min: "2026-10-19T09:00" })
    try {
      configureLocale("en-US")
      expect(when.safeParse("2026-10-19T08:00").error?.issues[0]?.message).toBe("Enter a date and time on or after 10/19/2026 9:00 AM")
      expect(when.safeParse("31/02/2026T09:30").error?.issues[0]?.message).toBe("Enter a date as mm/dd/yyyy")
      expect(dateTimeSchema({ min: "2026-10-19T09:00", locale: "en-AU" }).safeParse("2026-10-19T08:00").error?.issues[0]?.message).toBe("Enter a date and time on or after 19/10/2026 9:00 am")
    } finally {
      configureLocale(previous)
    }
  })
})

describe("locale", () => {
  it("follows the nearest LocaleProvider, and a locale prop overrides it", () => {
    render(
      <LocaleProvider locale="en-US">
        <DateTimeInput aria-label="US" defaultValue="2026-10-03T21:05" />
        <DateTimeInput aria-label="Australian" locale="en-AU" defaultValue="2026-10-03T21:05" />
      </LocaleProvider>
    )
    const values = screen.getAllByRole("textbox").map((input) => (input as HTMLInputElement).value)
    expect(values).toEqual(["10/03/2026", "9:05 PM", "03/10/2026", "9:05 pm"])
  })

  it("rewrites a shown day and time when the locale changes", () => {
    const view = (locale: string) => (
      <LocaleProvider locale={locale}>
        <DateField aria-label="Day" defaultValue="2026-10-03" />
        <TimeInput aria-label="At" defaultValue="21:05" />
      </LocaleProvider>
    )
    const { rerender } = render(view("en-AU"))
    expect(screen.getByRole("textbox", { name: "Day" })).toHaveValue("03/10/2026")
    rerender(view("de-DE"))
    expect(screen.getByRole("textbox", { name: "Day" })).toHaveValue("03.10.2026")
    expect(screen.getByRole("textbox", { name: "At" })).toHaveValue("21:05")
  })
})

describe("field.DateField", () => {
  function Dates({ onSubmit }: { onSubmit?: (value: { review: string | null }) => void }) {
    const form = useAppForm({
      ...formBehaviour,
      defaultValues: { review: "2026-10-13" as string | null },
      validators: { onDynamic: z.object({ review: dateSchema({ required: true, min: "2026-10-01", max: "2026-12-31", locale: "en-AU" }) }) },
      onSubmit: ({ value }) => onSubmit?.(value),
    })
    return (
      <Form form={form} aria-label="Dates">
        <form.AppField name="review">{(field) => <field.DateField label="Next review" required locale="en-AU" min="2026-10-01" max="2026-12-31" />}</form.AppField>
        <form.AppForm>
          <form.SubmitButton>Save</form.SubmitButton>
        </form.AppForm>
        <form.Subscribe selector={(state) => state.values.review}>{(value) => <output>{String(value)}</output>}</form.Subscribe>
      </Form>
    )
  }
  const box = () => screen.getByRole("textbox", { name: /Next review/ }) as HTMLInputElement
  const leave = (text: string) => {
    type(box(), text)
    fireEvent.blur(box())
  }

  it("is labelled, required and shows the day in the locale's order", () => {
    render(<Dates />)
    expect(box().value).toBe("13/10/2026")
    expect(box().required).toBe(true)
  })

  it("writes a typed day to the form as a calendar day", async () => {
    render(<Dates />)
    leave("14/10/26")
    expect(await screen.findByText("2026-10-14")).toBeTruthy()
    expect(box().value).toBe("14/10/2026")
    expect(box()).not.toHaveAttribute("aria-invalid")
  })

  it("hands unreadable text to the schema and keeps it in the box", async () => {
    render(<Dates />)
    leave("soon")
    expect(await screen.findByText("Enter a date as dd/mm/yyyy")).toBeTruthy()
    expect(box().value).toBe("soon")
    expect(box()).toHaveAttribute("aria-invalid", "true")
    leave("15/10/2026")
    await vi.waitFor(() => expect(screen.queryByText("Enter a date as dd/mm/yyyy")).toBeNull())
    expect(screen.getByText("2026-10-15")).toBeTruthy()
  })

  it("hands a day outside the bounds to the schema as read", async () => {
    render(<Dates />)
    leave("1/1/2027")
    expect(await screen.findByText("Enter a date from 01/10/2026 to 31/12/2026")).toBeTruthy()
    expect(screen.getByText("2027-01-01")).toBeTruthy()
    expect(box()).toHaveAttribute("aria-invalid", "true")
  })

  it("asks for a date when a required one is emptied", async () => {
    render(<Dates />)
    leave("")
    expect(await screen.findByText("Enter a date")).toBeTruthy()
  })
})

describe("DateField onReject", () => {
  it("reports what it could not accept and leaves the value alone", () => {
    const onValueChange = vi.fn()
    const onReject = vi.fn()
    render(<DateField aria-label="Day" locale="en-AU" min="2026-10-01" defaultValue="2026-10-13" onValueChange={onValueChange} onReject={onReject} />)
    const input = screen.getByRole("textbox", { name: "Day" })
    type(input, "soon")
    fireEvent.blur(input)
    expect(onReject).toHaveBeenLastCalledWith("soon")
    type(input, "1/1/2026")
    fireEvent.blur(input)
    expect(onReject).toHaveBeenLastCalledWith("2026-01-01")
    expect(onValueChange).not.toHaveBeenCalled()
    expect(input).toHaveAttribute("aria-invalid", "true")
  })
})

describe("dateSchema", () => {
  const message = (schema: ReturnType<typeof dateSchema>, value: unknown) => {
    const result = schema.safeParse(value)
    return result.success ? null : result.error.issues[0]!.message
  }

  it("accepts a day or nothing", () => {
    const schema = dateSchema()
    expect(schema.safeParse("2026-10-13").success).toBe(true)
    expect(schema.safeParse(null).success).toBe(true)
    expect(schema.safeParse("").success).toBe(true)
  })

  it("names what is wrong", () => {
    expect(message(dateSchema({ required: true, locale: "en-AU" }), null)).toBe("Enter a date")
    expect(message(dateSchema({ locale: "en-AU" }), "soon")).toBe("Enter a date as dd/mm/yyyy")
    expect(message(dateSchema({ locale: "en-US" }), "soon")).toBe("Enter a date as mm/dd/yyyy")
    expect(message(dateSchema({ min: "2026-10-01", locale: "en-AU" }), "2026-09-30")).toBe("Enter a date on or after 01/10/2026")
    expect(message(dateSchema({ max: "2026-10-01", locale: "en-AU" }), "2026-10-02")).toBe("Enter a date on or before 01/10/2026")
    expect(message(dateSchema({ min: "2026-10-01", max: "2026-10-31", locale: "en-AU" }), "2026-11-01")).toBe("Enter a date from 01/10/2026 to 31/10/2026")
  })
})
