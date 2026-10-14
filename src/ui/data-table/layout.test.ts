import { describe, expect, it } from "vitest"
import { columnKey, columnVars, computeColumnLayout, detailHeight, orderColumns, type LayoutColumn } from "./layout.js"

const col = (id: string, priority: number, width = 10, extra: Partial<LayoutColumn> = {}): LayoutColumn => ({
  id,
  priority,
  width,
  minWidth: width * 0.8,
  maxWidth: width * 2,
  pinned: false,
  fixed: false,
  userHidden: false,
  grow: true,
  ...extra,
})

// name (pinned) · status p1 · org p2 · os p2 · seen p3 · ip p4 · serial p5
const columns = [
  col("name", 3, 15, { pinned: true }),
  col("status", 1, 8),
  col("org", 2, 12),
  col("os", 2, 12),
  col("seen", 3, 8),
  col("ip", 4, 10),
  col("serial", 5, 10),
]

describe("computeColumnLayout", () => {
  it("shows everything when the minimum widths fit", () => {
    const result = computeColumnLayout(columns, 200)
    expect(result.visible).toEqual(["name", "status", "org", "os", "seen", "ip", "serial"])
    expect(result.autoHidden).toEqual([])
  })

  it("hides the lowest priority first as the container narrows", () => {
    const sequence: string[][] = []
    for (let available = 70; available >= 20; available -= 1) {
      sequence.push(computeColumnLayout(columns, available).autoHidden)
    }
    // Every step hides a superset of the previous step, in reverse priority order.
    const order = ["serial", "ip", "seen", "os", "org"]
    for (const hidden of sequence) {
      const expected = order.slice(0, hidden.length)
      expect(new Set(hidden)).toEqual(new Set(expected))
    }
    expect(sequence.at(-1)).toEqual(["org", "os", "seen", "ip", "serial"])
  })

  it("never hides required columns, even when they overflow", () => {
    const result = computeColumnLayout(columns, 5)
    expect(result.visible).toEqual(["name", "status"])
    expect(result.minTotal).toBeCloseTo(15 + 6.4)
  })

  it("stops at the first column that does not fit instead of skipping ahead", () => {
    // org (p2, needs 9.6) does not fit, so the narrower p3/p4 columns must hide too.
    const result = computeColumnLayout(columns, 15 + 6.4 + 5)
    expect(result.visible).toEqual(["name", "status"])
  })

  it("breaks priority ties by definition order (later columns hide first)", () => {
    const result = computeColumnLayout(columns, 15 + 6.4 + 9.6 + 1)
    expect(result.visible).toEqual(["name", "status", "org"])
    expect(result.autoHidden).toEqual(["os", "seen", "ip", "serial"])
  })

  it("leaves user-hidden columns out of both lists", () => {
    const result = computeColumnLayout(
      columns.map((c) => (c.id === "ip" ? { ...c, userHidden: true } : c)),
      200
    )
    expect(result.visible).not.toContain("ip")
    expect(result.autoHidden).not.toContain("ip")
  })

  it("counts fixed (user-sized) columns at their full width", () => {
    const fixed = columns.map((c) => (c.id === "org" ? { ...c, width: 30, fixed: true } : c))
    const result = computeColumnLayout(fixed, 15 + 6.4 + 29)
    expect(result.visible).toEqual(["name", "status"])
  })
})

describe("orderColumns", () => {
  it("puts pinned columns first in pin order", () => {
    expect(orderColumns(columns, ["os", "name"]).map((c) => c.id)).toEqual(["os", "name", "status", "org", "seen", "ip", "serial"])
  })
})

describe("columnVars", () => {
  it("emits size variables and pinned offsets", () => {
    const vars = columnVars(columns, ["name", "status"], { selectWidth: "var(--fa-dt-select-w)" })
    expect(vars["--fa-dt-c-name-w"]).toBe("15rem")
    expect(vars["--fa-dt-c-name-g"]).toBe("0")
    expect(vars["--fa-dt-c-name-x"]).toBe("calc(var(--fa-dt-select-w))")
    expect(vars["--fa-dt-c-status-g"]).toBe("1")
    expect(vars["--fa-dt-c-status-min"]).toBe("6.4rem")
    expect(vars["--fa-dt-c-ip-w"]).toBeUndefined()
  })

  it("sanitises ids for custom property names", () => {
    expect(columnKey("os.version")).toBe("os_version")
  })
})

describe("detailHeight", () => {
  const metrics = { field: 10, gap: 1, gapY: 0.5, line: 2.5, padTop: 0.25, padBottom: 0.75, inset: 3 }
  it("is zero without hidden fields", () => {
    expect(detailHeight(0, 60, metrics)).toBe(0)
  })
  it("wraps fields into as many lines as the width needs", () => {
    expect(detailHeight(3, 60, metrics)).toBe(3.5)
    expect(detailHeight(6, 25, metrics)).toBe(1 + 3 * 2.5 + 2 * 0.5)
  })
})
