// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "../../ui/tooltip/index.js"
import { ConversationHandlersProvider } from "../handlers.js"
import type { AiApproval } from "../types.js"
import { ApprovalCard } from "./approval.js"
import { AskCard } from "./asks.js"

afterEach(cleanup)

const ASK: AiApproval = {
  type: "approval",
  id: "restart",
  question: "Restart the booking service?",
  action: "Restart the booking service",
  targets: [{ kind: "service", id: "bookings", label: "Bookings" }],
  risk: "warning",
  effect: "Bookings pause for about a minute.",
  allowForSession: true,
  state: "pending",
}

function renderCard(ask: AiApproval, decide = vi.fn(() => Promise.resolve())) {
  render(
    <TooltipProvider>
      <ConversationHandlersProvider handlers={{ decide }}>
        <ApprovalCard ask={ask} />
      </ConversationHandlersProvider>
    </TooltipProvider>,
  )
  return decide
}

describe("ApprovalCard", () => {
  it("decides as usual when it is not disabled", async () => {
    const decide = renderCard(ASK)
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: /^Approve once/ })))
    expect(decide).toHaveBeenCalledWith("restart", { decision: "approve", allowForMinutes: undefined })
  })

  it("keeps the card and turns its decisions off with disabled", () => {
    const decide = renderCard({ ...ASK, disabled: true })
    expect(screen.getByRole("group", { name: "Restart the booking service?" })).toBeInTheDocument()
    expect(screen.queryByRole("note")).toBeNull()
    for (const name of [/^Approve once/, /^Deny/]) {
      const button = screen.getByRole("button", { name })
      expect(button).toHaveAttribute("aria-disabled", "true")
      fireEvent.click(button)
    }
    expect(decide).not.toHaveBeenCalled()
    const allow = screen.getByRole("switch")
    fireEvent.click(allow)
    expect(allow).toHaveAttribute("aria-checked", "false")
  })

  it("states the reason in the card and on the buttons, and the reason alone disables", () => {
    const reason = "The command preview could not be loaded"
    const decide = renderCard({ ...ASK, disabledReason: reason })
    expect(screen.getByText(reason)).toBeInTheDocument()
    const approve = screen.getByRole("button", { name: /^Approve once/ })
    expect(approve).toHaveAttribute("aria-disabled", "true")
    expect(approve).toHaveAttribute("aria-description", reason)
    expect(screen.getByRole("button", { name: /^Deny/ })).toHaveAttribute("aria-description", reason)
    fireEvent.click(approve)
    expect(decide).not.toHaveBeenCalled()
  })

  it("cannot enter the second step while disabled, and can leave it if disabled there", () => {
    const danger: AiApproval = { ...ASK, risk: "danger" }
    const { rerender } = render(
      <TooltipProvider>
        <ApprovalCard ask={danger} />
      </TooltipProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Review and approve" }))
    rerender(
      <TooltipProvider>
        <ApprovalCard ask={{ ...danger, disabled: true }} />
      </TooltipProvider>,
    )
    expect(screen.getByRole("button", { name: /^Approve once/ })).toHaveAttribute("aria-disabled", "true")
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    const review = screen.getByRole("button", { name: "Review and approve" })
    expect(review).toHaveAttribute("aria-disabled", "true")
    fireEvent.click(review)
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull()
  })

  it("is reached from ask data through AskCard", () => {
    render(
      <TooltipProvider>
        <AskCard ask={{ ...ASK, disabledReason: "Not available here" }} />
      </TooltipProvider>,
    )
    expect(screen.getByRole("button", { name: /^Approve once/ })).toHaveAttribute("aria-description", "Not available here")
  })
})
