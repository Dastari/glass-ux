import { describe, expect, it } from "vitest"
import { cardsIn, moveCard, placeOf } from "./move.js"

const cards = [
  { id: "a", columnId: "todo" },
  { id: "b", columnId: "todo" },
  { id: "c", columnId: "doing" },
  { id: "d", columnId: "todo" },
  { id: "e", columnId: "done" },
]
const ids = (list: Array<{ id: string }>) => list.map((card) => card.id)

describe("moveCard", () => {
  it("reorders within a column", () => {
    const next = moveCard(cards, "a", { columnId: "todo", index: 2 })
    expect(ids(cardsIn(next, "todo"))).toEqual(["b", "d", "a"])
    expect(ids(cardsIn(next, "doing"))).toEqual(["c"])
  })

  it("moves to another column at an index and keeps the others in order", () => {
    const next = moveCard(cards, "d", { columnId: "doing", index: 0 })
    expect(ids(cardsIn(next, "doing"))).toEqual(["d", "c"])
    expect(ids(cardsIn(next, "todo"))).toEqual(["a", "b"])
    expect(next.find((card) => card.id === "d")?.columnId).toBe("doing")
  })

  it("appends past the end and into an empty column", () => {
    expect(ids(cardsIn(moveCard(cards, "a", { columnId: "done", index: 9 }), "done"))).toEqual(["e", "a"])
    expect(ids(cardsIn(moveCard(cards, "a", { columnId: "later", index: 0 }), "later"))).toEqual(["a"])
  })

  it("undoes a move by moving back to the old place", () => {
    const from = placeOf(cards, "b")!
    const moved = moveCard(cards, "b", { columnId: "done", index: 0 })
    const back = moveCard(moved, "b", from)
    for (const column of ["todo", "doing", "done"]) expect(cardsIn(back, column)).toEqual(cardsIn(cards, column))
  })

  it("does not change the input", () => {
    const copy = structuredClone(cards)
    moveCard(cards, "a", { columnId: "done", index: 0 })
    expect(cards).toEqual(copy)
  })
})
