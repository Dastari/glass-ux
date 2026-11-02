// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { EmojiPicker } from "./emoji-picker.js"

// The list follows the search at low priority: hold it back, as a busy page does.
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), useDeferredValue: () => "" }))

afterEach(cleanup)

it("Enter picks from what was typed, not the list still catching up", async () => {
  const onPick = vi.fn()
  render(<EmojiPicker onPick={onPick} />)
  await screen.findByRole("option", { name: "grinning face" })
  const search = screen.getByRole("searchbox")
  fireEvent.change(search, { target: { value: "rocket" } })
  fireEvent.keyDown(search, { key: "Enter" })
  expect(onPick.mock.calls[0]?.[0]).toMatchObject({ emoji: "🚀" })
})
