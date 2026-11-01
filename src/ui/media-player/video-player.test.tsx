// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { configureShortcuts } from "../kbd/index.js"
import { AudioPlayer, VideoPlayer, VideoPlayerSkeleton } from "./index.js"

const matchMediaStub = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }))

beforeEach(() => {
  vi.stubGlobal("matchMedia", matchMediaStub)
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  HTMLMediaElement.prototype.load = vi.fn()
  HTMLMediaElement.prototype.play = vi.fn(async () => {})
  HTMLMediaElement.prototype.pause = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  configureShortcuts({ characterKeys: true })
})

describe("VideoPlayer", () => {
  it("reserves its shape while loading and holds the same box loaded", () => {
    const { container, rerender } = render(<VideoPlayer src="a.webm" loading aspectRatio="4 / 3" />)
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe("4 / 3")
    rerender(<VideoPlayer src="a.webm" aspectRatio="4 / 3" />)
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe("4 / 3")
  })

  it("names the stage after the title and the seek bar after its job", () => {
    render(<VideoPlayer src="a.webm" title="Tide survey" />)
    expect(screen.getByRole("group", { name: "Tide survey" })).toBeTruthy()
    expect(screen.getByRole("slider", { name: "Seek" })).toBeTruthy()
  })

  it("hides modes the browser cannot do: jsdom has neither popovers nor full screen", () => {
    render(<VideoPlayer src="a.webm" />)
    expect(screen.queryByRole("button", { name: "Maximise" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Mini player" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Full screen" })).toBeNull()
  })

  it("offers only the allowed modes", () => {
    Object.assign(HTMLElement.prototype, { showPopover: vi.fn(), hidePopover: vi.fn() })
    render(<VideoPlayer src="a.webm" viewModes={["windowed"]} />)
    expect(screen.getByRole("button", { name: "Mini player" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Maximise" })).toBeNull()
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).showPopover
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).hidePopover
  })

  it("falls back and says so when a requested mode is unavailable", () => {
    const onViewModeChange = vi.fn()
    render(<VideoPlayer src="a.webm" viewMode="pip" onViewModeChange={onViewModeChange} />)
    expect(onViewModeChange).toHaveBeenCalledOnce()
    expect(onViewModeChange).toHaveBeenCalledWith("inline", expect.objectContaining({ reason: "fallback", requested: "pip" }))
    expect(document.querySelector(".fa-media")).toHaveAttribute("data-view-mode", "inline")
  })

  it("scopes shortcuts to the player and honours configureShortcuts", () => {
    render(<VideoPlayer src="a.webm" />)
    const stage = screen.getByRole("group", { name: "Video player" })
    const play = vi.mocked(HTMLMediaElement.prototype.play)
    fireEvent.keyDown(document.body, { key: "k" })
    expect(play).not.toHaveBeenCalled()
    fireEvent.keyDown(stage, { key: "k" })
    expect(play).toHaveBeenCalledOnce()
    configureShortcuts({ characterKeys: false })
    fireEvent.keyDown(stage, { key: "k" })
    expect(play).toHaveBeenCalledOnce()
    fireEvent.keyDown(stage, { key: " " })
    expect(play).toHaveBeenCalledTimes(2)
  })

  it("leaves text fields and a focused button's Space alone", () => {
    render(<VideoPlayer src="a.webm" controlsEnd={<input aria-label="Note" />} />)
    const play = vi.mocked(HTMLMediaElement.prototype.play)
    fireEvent.keyDown(screen.getByLabelText("Note"), { key: "k" })
    fireEvent.keyDown(screen.getByRole("button", { name: "Mute" }), { key: " " })
    expect(play).not.toHaveBeenCalled()
  })

  it("names what failed and offers Retry in place", () => {
    render(<VideoPlayer src="a.webm" />)
    const video = document.querySelector("video")!
    Object.defineProperty(video, "error", { configurable: true, value: { code: 4 } })
    act(() => {
      video.dispatchEvent(new Event("error"))
    })
    expect(screen.getByRole("alert")).toHaveTextContent("This browser cannot play this file")
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("announces state changes politely and keeps the clock out of the tree", () => {
    render(<VideoPlayer src="a.webm" />)
    const video = document.querySelector("video")!
    act(() => {
      video.dispatchEvent(new Event("play"))
    })
    expect(document.querySelector("[aria-live='polite']")).toHaveTextContent("Playing")
    expect(document.querySelector(".fa-media-clock")).toHaveAttribute("aria-hidden", "true")
  })
})

describe("AudioPlayer", () => {
  it("lists a playlist and marks the entry in play", () => {
    render(
      <AudioPlayer
        playlist={[
          { id: "a", src: "a.webm", title: "First" },
          { id: "b", src: "b.webm", title: "Second" },
        ]}
      />,
    )
    expect(screen.getByRole("button", { name: /First/ })).toHaveAttribute("aria-current", "true")
    fireEvent.click(screen.getByRole("button", { name: /Second/ }))
    expect(screen.getByRole("button", { name: /Second/ })).toHaveAttribute("aria-current", "true")
    expect(document.querySelector("audio")).toHaveAttribute("src", "b.webm")
  })
})

describe("VideoPlayerSkeleton", () => {
  it("holds the ratio", () => {
    const { container } = render(<VideoPlayerSkeleton aspectRatio="21 / 9" />)
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe("21 / 9")
  })
})
