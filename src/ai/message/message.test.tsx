// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "../../ui/tooltip/index.js"
import { ConversationHandlersProvider } from "../handlers.js"
import type { AiMessage } from "../types.js"
import { AssistantMessage } from "./message.js"

afterEach(cleanup)

const MESSAGE: AiMessage = { id: "a1", role: "assistant", createdAt: 0, state: "complete", blocks: [{ kind: "markdown", text: "Twelve reservations are confirmed." }] }

describe("AssistantMessage actions", () => {
  it("shows feedback and Open in a window by default", () => {
    const feedback = vi.fn()
    const openMessageWindow = vi.fn()
    render(
      <TooltipProvider>
        <ConversationHandlersProvider handlers={{ feedback, openMessageWindow }}>
          <AssistantMessage message={MESSAGE} />
        </ConversationHandlersProvider>
      </TooltipProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Good response" }))
    expect(feedback).toHaveBeenCalledWith(MESSAGE, "up")
    fireEvent.click(screen.getByRole("button", { name: "Open in a window" }))
    expect(openMessageWindow).toHaveBeenCalledWith(MESSAGE)
  })

  it("leaves out feedback alone with feedback={false}", () => {
    render(
      <TooltipProvider>
        <AssistantMessage message={MESSAGE} feedback={false} />
      </TooltipProvider>,
    )
    expect(screen.queryByRole("group", { name: "Feedback" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Good response" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Bad response" })).toBeNull()
    expect(screen.getByRole("button", { name: "Open in a window" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeInTheDocument()
  })

  it("leaves out Open in a window alone with openInWindow={false}", () => {
    render(
      <TooltipProvider>
        <AssistantMessage message={MESSAGE} openInWindow={false} />
      </TooltipProvider>,
    )
    expect(screen.queryByRole("button", { name: "Open in a window" })).toBeNull()
    expect(screen.getByRole("button", { name: "Good response" })).toBeInTheDocument()
  })
})
