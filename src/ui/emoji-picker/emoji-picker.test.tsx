// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { EmojiPicker } from "./emoji-picker.js"

afterEach(cleanup)

describe("EmojiPicker", () => {
  it("loads its data, then lists a group as one tab stop", async () => {
    render(<EmojiPicker onPick={() => undefined} />)
    const first = await screen.findByRole("option", { name: "grinning face" })
    expect(first.getAttribute("tabindex")).toBe("0")
    expect(screen.getByRole("option", { name: "beaming face with smiling eyes" }).getAttribute("tabindex")).toBe("-1")
  })

  it("picks with a click and with Enter", async () => {
    const onPick = vi.fn()
    render(<EmojiPicker onPick={onPick} />)
    fireEvent.click(await screen.findByRole("option", { name: "grinning face" }))
    expect(onPick).toHaveBeenCalledWith({ emoji: "😀", base: "😀", name: "grinning face", skinTone: 0 })
    fireEvent.keyDown(screen.getByRole("option", { name: "grinning face" }), { key: "Enter" })
    expect(onPick).toHaveBeenCalledTimes(2)
  })

  it("applies a tone to what takes one, and leaves the rest", async () => {
    const onPick = vi.fn()
    render(<EmojiPicker skinTone={2} onPick={onPick} />)
    fireEvent.change(await screen.findByRole("searchbox", { name: "Search emoji" }), { target: { value: "waving hand" } })
    fireEvent.click(await screen.findByRole("option", { name: "waving hand" }))
    expect(onPick).toHaveBeenCalledWith({ emoji: "👋🏼", base: "👋", name: "waving hand", skinTone: 2 })
  })

  it("starts on Recent when the host gives it, keeping a recent emoji as it was chosen", async () => {
    const onPick = vi.fn()
    render(<EmojiPicker recent={["👋🏽"]} skinTone={5} onPick={onPick} />)
    fireEvent.click(await screen.findByRole("option", { name: "waving hand" }))
    expect(onPick.mock.calls[0]?.[0]).toMatchObject({ emoji: "👋🏽" })
  })

  it("has no Recent tab without a list, and no tone menu when turned off", async () => {
    render(<EmojiPicker skinTones={false} onPick={() => undefined} />)
    await screen.findByRole("option", { name: "grinning face" })
    expect(screen.queryByRole("tab", { name: "Recent" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Skin tone" })).toBeNull()
  })

  it("uses names from the application", async () => {
    const loadNames = vi.fn(() => Promise.resolve({ "😀": "visage souriant" }))
    render(<EmojiPicker loadNames={loadNames} onPick={() => undefined} />)
    await waitFor(() => expect(screen.getByRole("option", { name: "visage souriant" })).toBeTruthy())
    expect(loadNames).toHaveBeenCalledWith("en-AU")
  })
})
