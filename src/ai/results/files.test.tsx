// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { TooltipProvider } from "../../ui/tooltip/index.js"
import { FileRowItem } from "./files.js"

afterEach(cleanup)

const FILE = { id: "brief", name: "exhibition-brief.pdf", size: 240000, mime: "application/pdf" }

describe("FileRowItem", () => {
  it("is a list item by default", () => {
    render(
      <TooltipProvider>
        <ul>
          <FileRowItem file={FILE} />
        </ul>
      </TooltipProvider>,
    )
    expect(screen.getByRole("listitem")).toHaveClass("fa-ai-file")
  })

  it("renders the same row in a div outside a list", () => {
    const { container } = render(
      <TooltipProvider>
        <FileRowItem as="div" file={FILE} />
      </TooltipProvider>,
    )
    expect(screen.queryByRole("listitem")).toBeNull()
    expect(container.firstElementChild?.tagName).toBe("DIV")
    expect(container.firstElementChild).toHaveClass("fa-ai-file")
    expect(screen.getByRole("button", { name: /exhibition-brief\.pdf/ })).toBeInTheDocument()
  })
})
