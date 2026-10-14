import { describe, expect, it } from "vitest"
import { fitSegmented, nextSegmentedForm } from "./segmented.js"

// RMM · PSA · CHAT at sm: about 150px with labels; three 28px icons and the track's padding.
const full = 150
const icons = 3 * 28 + 4

describe("fitSegmented", () => {
  it("keeps every label while they fit", () => {
    expect(fitSegmented({ room: 400, full, icons })).toBe("full")
    expect(fitSegmented({ room: 150, full, icons })).toBe("full")
  })

  it("drops to icons when the labels do not fit and every option has an icon", () => {
    expect(fitSegmented({ room: 120, full, icons })).toBe("icons")
  })

  it("goes straight to the menu when an option has no icon", () => {
    expect(fitSegmented({ room: 120, full, icons: null })).toBe("menu")
  })

  it("folds to the menu when even the icons do not fit", () => {
    expect(fitSegmented({ room: 60, full, icons })).toBe("menu")
  })

  it("tolerates sub-pixel rounding at the edge", () => {
    expect(fitSegmented({ room: 149.6, full, icons })).toBe("full")
  })
})

describe("nextSegmentedForm", () => {
  const measures = { full, icons }

  it("steps down when the shown form overflows its own box, and remembers the room it failed in", () => {
    const next = nextSegmentedForm("full", { ...measures, parentRoom: 400, ownRoom: 100, overflowing: true }, null)
    expect(next).toEqual({ form: "icons", failed: { form: "full", room: 400 } })
  })

  it("never retries a form that overflowed until the parent grows past that room", () => {
    const failed = { form: "full" as const, room: 400 }
    // Same parent: the full form would fit the parent's width but not the share it gets.
    expect(nextSegmentedForm("icons", { ...measures, parentRoom: 400, ownRoom: 88, overflowing: false }, failed).form).toBe("icons")
    // The parent grew: try the labels again.
    expect(nextSegmentedForm("icons", { ...measures, parentRoom: 520, ownRoom: 88, overflowing: false }, failed)).toEqual({ form: "full", failed: null })
  })

  it("expands from the menu when the container has room again", () => {
    expect(nextSegmentedForm("menu", { ...measures, parentRoom: 300, ownRoom: 70, overflowing: false }, null).form).toBe("full")
    expect(nextSegmentedForm("menu", { ...measures, parentRoom: 100, ownRoom: 70, overflowing: false }, null).form).toBe("icons")
  })

  it("an overflowing icon row folds to the menu", () => {
    expect(nextSegmentedForm("icons", { ...measures, parentRoom: 400, ownRoom: 60, overflowing: true }, null).form).toBe("menu")
  })
})
