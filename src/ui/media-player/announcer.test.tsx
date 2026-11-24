// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MediaAnnouncer } from "./announcer.js"
import type { MediaPlayerController, MediaPlayerState } from "./controller.js"
import { mediaPlayerMessages } from "./messages.js"

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function fakePlayer(initial: Partial<MediaPlayerState>) {
  let state = { item: null, cast: { status: "idle" }, paused: true, muted: false, volume: 1, playbackRate: 1, caption: null, captions: [], quality: null, qualities: [], loop: false, stalled: false, ...initial } as unknown as MediaPlayerState
  const listeners = new Set<() => void>()
  const player = {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  } as unknown as MediaPlayerController
  const set = (change: Partial<MediaPlayerState>) =>
    act(() => {
      state = { ...state, ...change }
      for (const listener of listeners) listener()
    })
  return { player, set }
}

describe("MediaAnnouncer", () => {
  it("says a new volume once it settles, and not again when playback reports the same level (#33)", () => {
    vi.useFakeTimers()
    const { player, set } = fakePlayer({ volume: 1 })
    const view = render(<MediaAnnouncer player={player} t={mediaPlayerMessages.defaults} locale="en" mode={null} />)
    const region = () => view.container.querySelector("[aria-live]")!.textContent
    set({ volume: 0.95 })
    act(() => void vi.advanceTimersByTime(600))
    expect(region()).toBe("Volume 95%")
    // Starting playback: the element reports its volume again with a rounding difference.
    set({ paused: false })
    set({ volume: 0.9500001 })
    act(() => void vi.advanceTimersByTime(600))
    expect(region()).toBe("Playing")
  })

  it("lets a later change replace a volume not yet said", () => {
    vi.useFakeTimers()
    const { player, set } = fakePlayer({ volume: 1 })
    const view = render(<MediaAnnouncer player={player} t={mediaPlayerMessages.defaults} locale="en" mode={null} />)
    set({ volume: 0.5 })
    set({ paused: false })
    act(() => void vi.advanceTimersByTime(600))
    expect(view.container.querySelector("[aria-live]")!.textContent).toBe("Playing")
  })
})
