import { describe, expect, it } from "vitest"
import { chartTableToCsv, shareFraction, type ChartTableModel } from "./table.js"

const model: ChartTableModel = {
  columns: [
    { key: "x", label: "Time" },
    { key: "cpu", label: "CPU", numeric: true },
    { key: "memory", label: "Memory", numeric: true },
  ],
  rows: [
    { x: "9:05 PM", cpu: "1,234.5%", memory: "—" },
    { x: "9:06 PM", cpu: "44.4%", memory: "12 GB" },
  ],
  values: [
    { x: new Date(Date.UTC(2026, 2, 10, 10, 5)), cpu: 1234.5, memory: null },
    { x: new Date(Date.UTC(2026, 2, 10, 10, 6)), cpu: 44.4, memory: 12 },
  ],
}

describe("chartTableToCsv", () => {
  it("writes a header of labels, then raw values: plain numbers and ISO 8601 instants", () => {
    expect(chartTableToCsv(model)).toBe(
      ["Time,CPU,Memory", "2026-03-10T10:05:00.000Z,1234.5,", "2026-03-10T10:06:00.000Z,44.4,12"].join("\r\n")
    )
  })

  it("uses LF when asked, consistently, with no trailing separator", () => {
    const csv = chartTableToCsv(model, { lineEnding: "\n" })
    expect(csv.split("\n")).toHaveLength(3)
    expect(csv).not.toContain("\r")
    expect(csv.endsWith("\n")).toBe(false)
  })

  it("falls back to the cell text where there is no raw value", () => {
    const csv = chartTableToCsv({
      columns: [
        { key: "label", label: "Device" },
        { key: "value", label: "Value", numeric: true },
      ],
      rows: [{ label: "NST-C106", value: "12 GB" }],
      values: [{ value: undefined }],
    })
    expect(csv).toBe("Device,Value\r\nNST-C106,12 GB")
    expect(chartTableToCsv({ columns: [{ key: "a", label: "A" }], rows: [{ a: "text" }] })).toBe("A\r\ntext")
  })

  it("quotes fields with commas, quotes, CR or LF and doubles embedded quotes (RFC 4180)", () => {
    const csv = chartTableToCsv({
      columns: [
        { key: "a", label: "Name, full" },
        { key: "b", label: 'Say "hi"' },
        { key: "c", label: "Plain" },
      ],
      rows: [{ a: "line\nbreak", b: "carriage\rreturn", c: 'a "quoted" word' }],
    })
    expect(csv).toBe('"Name, full","Say ""hi""",Plain\r\n"line\nbreak","carriage\rreturn","a ""quoted"" word"')
  })

  it("writes non-finite numbers and invalid dates as empty cells, and keeps negative and zero values", () => {
    const csv = chartTableToCsv({
      columns: [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
        { key: "c", label: "C" },
        { key: "d", label: "D" },
      ],
      rows: [{ a: "", b: "", c: "", d: "" }],
      values: [{ a: Number.NaN, b: new Date(Number.NaN), c: -0.5, d: 0 }],
    })
    expect(csv).toBe("A,B,C,D\r\n,,-0.5,0")
  })

  it("writes a column's raw header value in place of its label", () => {
    const csv = chartTableToCsv({
      columns: [
        { key: "row", label: "Day / Time" },
        { key: "c0", label: "09:00", numeric: true, value: new Date(Date.UTC(2026, 0, 5, 9)) },
      ],
      rows: [{ row: "Monday", c0: "3" }],
      values: [{ c0: 3 }],
    })
    expect(csv).toBe("Day / Time,2026-01-05T09:00:00.000Z\r\nMonday,3")
  })

  it("writes only the header for an empty table", () => {
    expect(chartTableToCsv({ columns: [{ key: "a", label: "A" }], rows: [] })).toBe("A")
  })
})

describe("shareFraction", () => {
  it("is the part over the whole, or null without a whole", () => {
    expect(shareFraction(1, 4)).toBe(0.25)
    expect(shareFraction(1, 0)).toBeNull()
  })
})
