// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { RelativeTime } from "./relative-time.js"

afterEach(cleanup)

const VALUE = Date.UTC(2026, 9, 1, 9, 58)

describe("RelativeTime", () => {
  it("takes focus for its tooltip on its own", () => {
    const { container } = render(<RelativeTime value={VALUE} />)
    expect(container.querySelector("time")).toHaveAttribute("tabindex", "0")
  })

  it("leaves focus to a focusable row or control around it", () => {
    const { container } = render(
      <div role="row" tabIndex={-1}>
        <RelativeTime value={VALUE} />
      </div>
    )
    expect(container.querySelector("time")).not.toHaveAttribute("tabindex")
  })

  it("shows the fallback for a missing value", () => {
    const { container } = render(<RelativeTime value={null} fallback="Never" />)
    expect(container.textContent).toBe("Never")
  })
})
