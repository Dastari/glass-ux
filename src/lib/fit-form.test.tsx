// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react"
import { useRef } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fitForm, nextFitForm, useFitForm, type FitWidths } from "./fit-form.js"

const FORMS = ["full", "icons", "menu"] as const
type Form = (typeof FORMS)[number]
const widths: FitWidths<Form> = { full: 150, icons: 88 }

describe("fitForm", () => {
  it("returns the widest form that fits, and the last form when none does", () => {
    expect(fitForm(FORMS, widths, 400)).toBe("full")
    expect(fitForm(FORMS, widths, 120)).toBe("icons")
    expect(fitForm(FORMS, widths, 60)).toBe("menu")
  })

  it("skips a form that is not available", () => {
    expect(fitForm(FORMS, { full: 150, icons: null }, 120)).toBe("menu")
    expect(fitForm(FORMS, { full: 150 }, 120)).toBe("menu")
  })

  it("tolerates sub-pixel rounding", () => {
    expect(fitForm(FORMS, widths, 149.6)).toBe("full")
  })

  it("works for two forms", () => {
    expect(fitForm(["full", "menu"] as const, { full: 182 }, 200)).toBe("full")
    expect(fitForm(["full", "menu"] as const, { full: 182 }, 100)).toBe("menu")
  })
})

describe("nextFitForm", () => {
  it("steps down when the shown form overflows its own box, remembering the parent's room", () => {
    expect(nextFitForm(FORMS, "full", { widths, parentRoom: 400, ownRoom: 100, overflowing: true }, null)).toEqual({
      form: "icons",
      failed: { form: "full", room: 400 },
    })
  })

  it("goes to the last form when the own box fits nothing narrower", () => {
    expect(nextFitForm(FORMS, "icons", { widths, parentRoom: 400, ownRoom: 60, overflowing: true }, null).form).toBe("menu")
  })

  it("does not retry a failed form until the parent grows past the room it failed in", () => {
    const failed = { form: "full" as const, room: 400 }
    expect(nextFitForm(FORMS, "icons", { widths, parentRoom: 400, ownRoom: 88, overflowing: false }, failed)).toEqual({ form: "icons", failed })
    expect(nextFitForm(FORMS, "icons", { widths, parentRoom: 400.4, ownRoom: 88, overflowing: false }, failed).form).toBe("icons")
    expect(nextFitForm(FORMS, "icons", { widths, parentRoom: 401, ownRoom: 88, overflowing: false }, failed)).toEqual({ form: "full", failed: null })
  })

  it("still steps further down while blocked", () => {
    const failed = { form: "full" as const, room: 400 }
    expect(nextFitForm(FORMS, "icons", { widths, parentRoom: 60, ownRoom: 60, overflowing: false }, failed)).toEqual({ form: "menu", failed })
  })

  it("never alternates over a sequence of the same measurements", () => {
    let shown: Form = "full"
    let failed: { form: Form; room: number } | null = null
    const seen: Form[] = []
    // The flex row gives the control 100px of a 400px parent: it overflows once, then holds.
    for (let step = 0; step < 6; step++) {
      const spills = shown === "full"
      const next = nextFitForm(FORMS, shown, { widths, parentRoom: 400, ownRoom: 100, overflowing: spills }, failed)
      shown = next.form
      failed = next.failed
      seen.push(shown)
    }
    expect(seen).toEqual(["icons", "icons", "icons", "icons", "icons", "icons"])
  })
})

// ── useFitForm against a stubbed layout ─────────────────────────────────────

class StubObserver {
  static instances: StubObserver[] = []
  constructor(readonly callback: ResizeObserverCallback) {
    StubObserver.instances.push(this)
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

let parentWidth = 400
let overflowing = false
const NATURAL = 300

function Probe({ enabled = true }: { enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const form = useFitForm<"full" | "menu">({
    forms: ["full", "menu"],
    enabled,
    ref,
    measure: (_root, shown) => ({ widths: { full: NATURAL }, overflowing: shown === "full" && overflowing }),
  })
  return (
    <div className="parent">
      <div ref={ref} data-form={form} />
    </div>
  )
}

/** Deliver a resize to every observer and run the frame it schedules. */
async function resize() {
  await act(async () => {
    const parent = document.querySelector(".parent")!
    for (const observer of StubObserver.instances) observer.callback([{ target: parent } as ResizeObserverEntry], observer as unknown as ResizeObserver)
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  })
}

beforeEach(() => {
  StubObserver.instances = []
  vi.stubGlobal("ResizeObserver", class extends StubObserver {})
  parentWidth = 400
  overflowing = false
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("parent") ? parentWidth : 0
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("useFitForm", () => {
  const shown = () => document.querySelector("[data-form]")!.getAttribute("data-form")

  it("shows the widest form that fits the parent, before the first paint", () => {
    parentWidth = 200
    render(<Probe />)
    expect(shown()).toBe("menu")
  })

  it("folds and unfolds as the parent resizes", async () => {
    render(<Probe />)
    expect(shown()).toBe("full")
    parentWidth = 250
    await resize()
    expect(shown()).toBe("menu")
    parentWidth = 320
    await resize()
    expect(shown()).toBe("full")
  })

  it("folds when squeezed inside a flex row, and holds until the parent grows past that room", async () => {
    render(<Probe />)
    overflowing = true
    await resize()
    expect(shown()).toBe("menu")
    // The same parent: the full form fits the parent but not the share the row gives it.
    await resize()
    expect(shown()).toBe("menu")
    // The parent grows and the row now has room: the full form returns.
    overflowing = false
    parentWidth = 420
    await resize()
    expect(shown()).toBe("full")
  })

  it("does not measure while disabled", () => {
    parentWidth = 100
    render(<Probe enabled={false} />)
    expect(shown()).toBe("full")
  })
})
