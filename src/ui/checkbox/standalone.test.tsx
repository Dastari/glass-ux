// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Radio, RadioCard, RadioGroup } from "../radio/index.js"
import { Checkbox } from "./index.js"

afterEach(cleanup)

describe("choices outside a Field", () => {
  it("render on their own, as before", () => {
    render(
      <>
        <Checkbox label="Alone" />
        <RadioGroup aria-label="Plan" defaultValue="a">
          <Radio value="a" label="Monthly" />
          <RadioCard value="b" title="Yearly" />
        </RadioGroup>
      </>,
    )
    expect(screen.getByRole("checkbox", { name: "Alone" })).toBeTruthy()
    expect(screen.getByRole("radio", { name: "Monthly" })).toBeTruthy()
    expect(screen.getByRole("radio", { name: "Yearly" })).toBeTruthy()
  })
})
