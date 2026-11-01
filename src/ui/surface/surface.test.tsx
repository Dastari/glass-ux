// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Panel, PanelBody, Surface } from "./index.js"

afterEach(cleanup)

describe("compact insets", () => {
  it("marks a compact Panel and leaves a regular one unmarked", () => {
    render(
      <>
        <Panel aria-label="Dense" compact>
          <PanelBody>Body</PanelBody>
        </Panel>
        <Panel aria-label="Regular" />
      </>,
    )
    expect(screen.getByLabelText("Dense").hasAttribute("data-compact")).toBe(true)
    expect(screen.getByLabelText("Regular").hasAttribute("data-compact")).toBe(false)
  })

  it("gives Surface the compact padding role", () => {
    render(<Surface padding="compact" aria-label="Tools" />)
    expect(screen.getByLabelText("Tools").getAttribute("data-padding")).toBe("compact")
  })
})
