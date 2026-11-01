// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { Masonry } from "./masonry.js"

const real = Element.prototype.getBoundingClientRect
let rootWidth = 500
const natural = new Map<string, number>()

beforeEach(() => {
  rootWidth = 500
  natural.clear()
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const probe = this.classList.contains("fa-masonry-probe")
    const width = probe ? 150 : this.classList.contains("fa-masonry") ? rootWidth : 0
    const height = probe ? 10 : (natural.get(this.textContent ?? "") ?? 0)
    return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON: () => undefined } as DOMRect
  }
})
afterEach(() => {
  cleanup()
  Element.prototype.getBoundingClientRect = real
})

const photos = Array.from({ length: 7 }, (_, index) => ({ id: `p${index + 1}`, ratio: [1, 1.5, 0.75, 2, 1, 0.5, 1.5][index]! }))
const items = () => [...document.querySelectorAll<HTMLElement>(".fa-masonry-item")]

describe("Masonry", () => {
  it("is a named list of items in the order given", () => {
    render(<Masonry items={photos} aria-label="Photographs" getRatio={(photo) => photo.ratio} renderItem={(photo) => <span>{photo.id}</span>} />)
    expect(screen.getByRole("list", { name: "Photographs" })).toBeTruthy()
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(photos.map((photo) => photo.id))
  })

  it("lays the items out in columns from the width and the ratios, reserving each box", () => {
    render(<Masonry items={photos} getRatio={(photo) => photo.ratio} renderItem={(photo) => <span>{photo.id}</span>} />)
    expect(document.querySelector(".fa-masonry")!.hasAttribute("data-ready")).toBe(true)
    const width = (500 - 20) / 3
    expect(items().map((item) => item.dataset.column)).toEqual(["0", "1", "2", "1", "0", "1", "2"])
    const first = items()[0]!
    expect(first.style.insetInlineStart).toBe("0px")
    expect(first.style.insetBlockStart).toBe("0px")
    expect(Number.parseFloat(first.style.inlineSize)).toBeCloseTo(width)
    // A ratio of 1 is a square, 1.5 a third shorter.
    expect(Number.parseFloat(first.style.blockSize)).toBeCloseTo(width)
    expect(Number.parseFloat(items()[1]!.style.blockSize)).toBeCloseTo(width / 1.5)
    const list = document.querySelector<HTMLElement>(".fa-masonry-list")!
    expect(Number.parseFloat(list.style.blockSize)).toBeGreaterThan(width)
  })

  it("keeps DOM order equal to the order of tops, so Tab follows the way the grid reads", () => {
    render(<Masonry items={photos} getRatio={(photo) => photo.ratio} renderItem={(photo) => <button type="button">{photo.id}</button>} />)
    const tops = items().map((item) => Number.parseFloat(item.style.insetBlockStart))
    expect(tops).toEqual([...tops].sort((a, b) => a - b))
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(photos.map((photo) => photo.id))
  })

  it("uses fewer columns in a narrower box", () => {
    rootWidth = 200
    render(<Masonry items={photos} getRatio={(photo) => photo.ratio} renderItem={(photo) => <span>{photo.id}</span>} />)
    expect(new Set(items().map((item) => item.dataset.column))).toEqual(new Set(["0"]))
  })

  it("holds the items back until there is a width to lay them out from", () => {
    rootWidth = 0
    render(<Masonry items={photos} getRatio={(photo) => photo.ratio} renderItem={(photo) => <span>{photo.id}</span>} />)
    expect(document.querySelector(".fa-masonry")!.hasAttribute("data-ready")).toBe(false)
    expect(items()).toHaveLength(7)
  })

  it("measures an item with no ratio and leaves its height to its content", () => {
    natural.set("tall", 300)
    const mixed = [{ id: "a", ratio: 1 as number | undefined }, { id: "tall", ratio: undefined }, { id: "b", ratio: 1 }]
    render(<Masonry items={mixed} columns={2} getRatio={(item) => item.ratio} renderItem={(item) => <span>{item.id}</span>} />)
    const [, measured, below] = items()
    expect(measured!.hasAttribute("data-fixed")).toBe(false)
    expect(measured!.style.blockSize).toBe("")
    // "b" went to the shorter first column (a square), and the measured item took the second.
    expect(below!.dataset.column).toBe("0")
    // The first column is two squares and a gap; the second is the measured item.
    expect(Number.parseFloat(document.querySelector<HTMLElement>(".fa-masonry-list")!.style.blockSize)).toBeCloseTo(245 * 2 + 10)
  })

  it("takes a fixed number of columns", () => {
    render(<Masonry items={photos} columns={2} getRatio={(photo) => photo.ratio} renderItem={(photo) => <span>{photo.id}</span>} />)
    expect(new Set(items().map((item) => item.dataset.column))).toEqual(new Set(["0", "1"]))
  })

  it("keeps an item's place when items are appended", () => {
    const { rerender } = render(<Masonry items={photos.slice(0, 4)} getRatio={(photo) => photo.ratio} renderItem={(photo) => <span>{photo.id}</span>} />)
    const before = items().map((item) => item.getAttribute("style"))
    rerender(<Masonry items={photos} getRatio={(photo) => photo.ratio} renderItem={(photo) => <span>{photo.id}</span>} />)
    expect(items().slice(0, 4).map((item) => item.getAttribute("style"))).toEqual(before)
  })
})
