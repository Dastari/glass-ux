// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import de from "../../i18n/de.js"
import { registerMessagePack } from "../../lib/i18n/index.js"
import { Rating } from "./rating.js"
import { ratingSchema } from "./schema.js"

beforeAll(() => registerMessagePack(de))
afterEach(cleanup)

const radios = () => screen.getAllByRole("radio")
const checked = () => radios().filter((radio) => radio.getAttribute("aria-checked") === "true")

describe("Rating", () => {
  it("is a radio group of one radio per icon, named with the value out of the total", () => {
    render(<Rating aria-label="Service" defaultValue={3} />)
    expect(screen.getByRole("radiogroup", { name: "Service" })).toBeTruthy()
    expect(radios().map((radio) => radio.getAttribute("aria-label"))).toEqual(["1 of 5 stars", "2 of 5 stars", "3 of 5 stars", "4 of 5 stars", "5 of 5 stars"])
    expect(checked().map((radio) => radio.getAttribute("aria-label"))).toEqual(["3 of 5 stars"])
  })

  it("agrees the unit with the total through the locale's plural rules", () => {
    render(<Rating max={1} />)
    expect(radios()[0]!.getAttribute("aria-label")).toBe("1 of 1 star")
  })

  it("formats the numbers in the locale", () => {
    render(<Rating locale="de" step={0.5} max={3} />)
    expect(radios()[1]!.getAttribute("aria-label")).toBe("1 von 3 Sternen")
    expect(radios()[0]!.getAttribute("aria-label")).toBe("0,5 von 3 Sternen")
  })

  it("is one tab stop: the chosen radio, or the first when none is", () => {
    const { rerender } = render(<Rating defaultValue={null} />)
    expect(radios().map((radio) => radio.tabIndex)).toEqual([0, -1, -1, -1, -1])
    rerender(<Rating value={4} />)
    expect(radios().map((radio) => radio.tabIndex)).toEqual([-1, -1, -1, 0, -1])
  })

  it("works uncontrolled, and reports each choice", () => {
    const onValueChange = vi.fn()
    render(<Rating onValueChange={onValueChange} />)
    fireEvent.click(radios()[2]!)
    expect(onValueChange).toHaveBeenLastCalledWith(3)
    expect(checked()).toHaveLength(1)
    fireEvent.click(radios()[2]!)
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it("is controlled when given a value", () => {
    const onValueChange = vi.fn()
    render(<Rating value={2} onValueChange={onValueChange} />)
    fireEvent.click(radios()[4]!)
    expect(onValueChange).toHaveBeenLastCalledWith(5)
    expect(checked()[0]!.getAttribute("aria-label")).toBe("2 of 5 stars")
  })

  it("moves and chooses with the arrow keys, forward being down and right, and stops at the ends", () => {
    const onValueChange = vi.fn()
    render(<Rating defaultValue={2} onValueChange={onValueChange} />)
    fireEvent.keyDown(radios()[1]!, { key: "ArrowRight" })
    expect(onValueChange).toHaveBeenLastCalledWith(3)
    expect(document.activeElement).toBe(radios()[2])
    fireEvent.keyDown(radios()[2]!, { key: "ArrowUp" })
    expect(onValueChange).toHaveBeenLastCalledWith(2)
    fireEvent.keyDown(radios()[1]!, { key: "End" })
    expect(onValueChange).toHaveBeenLastCalledWith(5)
    fireEvent.keyDown(radios()[4]!, { key: "ArrowDown" })
    expect(onValueChange).toHaveBeenCalledTimes(3)
    fireEvent.keyDown(radios()[4]!, { key: "Home" })
    expect(onValueChange).toHaveBeenLastCalledWith(1)
  })

  it("reads the arrows by the reading direction", () => {
    const onValueChange = vi.fn()
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <Rating defaultValue={2} onValueChange={onValueChange} />
      </div>,
    )
    fireEvent.keyDown(radios()[1]!, { key: "ArrowLeft" })
    expect(onValueChange).toHaveBeenLastCalledWith(3)
    fireEvent.keyDown(radios()[2]!, { key: "ArrowRight" })
    expect(onValueChange).toHaveBeenLastCalledWith(2)
  })

  it("splits each icon into two choices with half steps", () => {
    const onValueChange = vi.fn()
    render(<Rating step={0.5} max={3} defaultValue={1.5} onValueChange={onValueChange} />)
    expect(radios()).toHaveLength(6)
    expect(checked()[0]!.getAttribute("aria-label")).toBe("1.5 of 3 stars")
    fireEvent.keyDown(radios()[2]!, { key: "ArrowRight" })
    expect(onValueChange).toHaveBeenLastCalledWith(2)
    fireEvent.click(radios()[0]!)
    expect(onValueChange).toHaveBeenLastCalledWith(0.5)
  })

  it("clears only when clearable, by choosing the value again or by Delete and Backspace", () => {
    render(<Rating defaultValue={3} />)
    fireEvent.click(radios()[2]!)
    fireEvent.keyDown(radios()[2]!, { key: "Delete" })
    expect(checked()).toHaveLength(1)
    cleanup()

    const onValueChange = vi.fn()
    render(<Rating defaultValue={3} clearable onValueChange={onValueChange} />)
    fireEvent.click(radios()[2]!)
    expect(onValueChange).toHaveBeenLastCalledWith(null)
    expect(checked()).toHaveLength(0)
    fireEvent.click(radios()[0]!)
    fireEvent.keyDown(radios()[0]!, { key: "Backspace" })
    expect(onValueChange).toHaveBeenLastCalledWith(null)
  })

  it("is not operable when disabled", () => {
    const onValueChange = vi.fn()
    render(<Rating disabled defaultValue={1} onValueChange={onValueChange} />)
    expect(radios().every((radio) => (radio as HTMLButtonElement).disabled)).toBe(true)
    fireEvent.keyDown(radios()[0]!, { key: "ArrowRight" })
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole("radiogroup").getAttribute("aria-disabled")).toBe("true")
  })

  it("is a single named image when read-only, with the exact value", () => {
    const { container } = render(<Rating readOnly value={4.3} aria-label="Reviews" />)
    expect(screen.queryAllByRole("radio")).toHaveLength(0)
    const image = screen.getByRole("img", { name: "Reviews: 4.3 of 5 stars" })
    expect((image as HTMLElement).style.getPropertyValue("--_value")).toBe("4.3")
    expect(container.querySelectorAll("button")).toHaveLength(0)
  })

  it("says so when a display has no rating", () => {
    render(<Rating readOnly value={null} />)
    expect(screen.getByRole("img", { name: "Rating: Not rated" })).toBeTruthy()
  })

  it("takes another icon and other words", () => {
    render(<Rating icon={<span data-testid="heart" />} max={3} valueText={(value, max) => `${value}/${max} hearts`} />)
    expect(screen.getAllByTestId("heart")).toHaveLength(6)
    expect(radios()[1]!.getAttribute("aria-label")).toBe("2/3 hearts")
  })

  it("carries the rating in a hidden input for native forms", () => {
    const { container } = render(<Rating name="score" defaultValue={4} />)
    expect((container.querySelector("input[name=score]") as HTMLInputElement).value).toBe("4")
  })

  it("previews on hover without rendering again", () => {
    let renders = 0
    function Probe() {
      renders++
      return <Rating />
    }
    const { container } = render(<Probe />)
    const group = container.querySelector(".fa-rating") as HTMLElement
    const before = renders
    fireEvent.pointerEnter(radios()[3]!, { pointerType: "mouse" })
    expect(group.hasAttribute("data-hovering")).toBe(true)
    expect(group.style.getPropertyValue("--_hover")).toBe("4")
    fireEvent.pointerLeave(group)
    expect(group.hasAttribute("data-hovering")).toBe(false)
    expect(renders).toBe(before)
  })

  it("calls onBlur once focus leaves the group", () => {
    const onBlur = vi.fn()
    render(
      <>
        <Rating onBlur={onBlur} />
        <button type="button">Elsewhere</button>
      </>,
    )
    radios()[0]!.focus()
    fireEvent.blur(radios()[0]!, { relatedTarget: radios()[1] })
    expect(onBlur).not.toHaveBeenCalled()
    fireEvent.blur(radios()[0]!, { relatedTarget: screen.getByText("Elsewhere") })
    expect(onBlur).toHaveBeenCalledTimes(1)
  })

  it("follows a controlled parent that refuses a change", () => {
    function Stuck() {
      const [value] = useState<number | null>(2)
      return <Rating value={value} onValueChange={() => undefined} />
    }
    render(<Stuck />)
    fireEvent.click(radios()[4]!)
    expect(checked()[0]!.getAttribute("aria-label")).toBe("2 of 5 stars")
  })
})

describe("ratingSchema", () => {
  it("allows no rating unless required, and keeps the rating within the maximum", () => {
    expect(ratingSchema().safeParse(null).success).toBe(true)
    expect(ratingSchema({ required: true }).safeParse(null).success).toBe(false)
    expect(ratingSchema({ required: true }).safeParse(3).success).toBe(true)
    expect(ratingSchema({ max: 5 }).safeParse(6).success).toBe(false)
    expect(ratingSchema({ required: true }).safeParse(null).error?.issues[0]?.message).toBe("Choose a rating")
    expect(ratingSchema({ required: true, locale: "de" }).safeParse(null).error?.issues[0]?.message).toBe("Wählen Sie eine Bewertung")
  })
})
