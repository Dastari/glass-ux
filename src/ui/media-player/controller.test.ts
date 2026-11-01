// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { createMediaController, type MediaPlayerController } from "./controller.js"
import type { CastAdapter, CastSession, MediaAttach } from "./types.js"

// jsdom's track elements have no text track.
Object.defineProperty(HTMLTrackElement.prototype, "track", {
  configurable: true,
  get() {
    return (this.__track ??= { mode: "disabled", activeCues: null, addEventListener() {}, removeEventListener() {} })
  },
})

/** jsdom has no media: a real element with the parts the controller touches stubbed. */
function fakeMedia() {
  const media = document.createElement("video")
  let time = 0
  let paused = true
  Object.defineProperties(media, {
    currentTime: { get: () => time, set: (value: number) => ((time = value), media.dispatchEvent(new Event("seeked"))) },
    paused: { configurable: true, get: () => paused },
    duration: { configurable: true, value: 60 },
    seekable: { configurable: true, value: { length: 1, start: () => 0, end: () => 60 } },
    buffered: { value: { length: 1, start: () => 0, end: () => 20 } },
  })
  media.load = vi.fn()
  media.play = vi.fn(async () => {
    paused = false
    media.dispatchEvent(new Event("play"))
  })
  media.pause = vi.fn(() => {
    paused = true
    media.dispatchEvent(new Event("pause"))
  })
  return media
}

function fakeCast() {
  let session: CastSession = { status: "available" }
  const listeners = new Set<() => void>()
  const adapter = {
    getSession: () => session,
    subscribe: (listener: () => void) => (listeners.add(listener), () => listeners.delete(listener)),
    connect: vi.fn(),
    disconnect: vi.fn(),
    load: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    stop: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
  } satisfies CastAdapter
  const set = (next: CastSession) => {
    session = next
    for (const listener of listeners) listener()
  }
  return { adapter, set }
}

const players: Array<() => void> = []
function mount(player: MediaPlayerController, media = fakeMedia()) {
  const stop = player.mediaRef(media)
  if (stop) players.push(stop)
  return media
}
afterEach(() => {
  for (const stop of players.splice(0)) stop()
})

describe("the controller", () => {
  it("sets the source once and reports metadata", () => {
    const player = createMediaController({ src: "a.webm" })
    const media = mount(player)
    expect(media.getAttribute("src")).toBe("a.webm")
    expect(player.getState().ready).toBe(false)
    media.dispatchEvent(new Event("loadedmetadata"))
    expect(player.getState().ready).toBe(true)
    expect(player.getTime()).toMatchObject({ duration: 60, seekableEnd: 60 })
  })

  it("does not reload for options that only look new", () => {
    const player = createMediaController({ src: "a.webm", tracks: [{ src: "a.vtt", label: "English", language: "en" }] })
    const media = mount(player)
    vi.mocked(media.load).mockClear()
    player.configure({ src: "a.webm", tracks: [{ src: "a.vtt", label: "English", language: "en" }] })
    expect(media.load).not.toHaveBeenCalled()
    player.configure({ src: "b.webm" })
    expect(media.load).toHaveBeenCalledOnce()
  })

  it("reads the seekable window again once the media can play", () => {
    const player = createMediaController({ src: "a.webm" })
    const media = mount(player)
    media.dispatchEvent(new Event("canplay"))
    expect(player.getTime().seekableEnd).toBe(60)
  })

  it("toggles from what the element says, not a state one event behind", () => {
    const player = createMediaController({ src: "a.webm" })
    const media = mount(player)
    Object.defineProperty(media, "paused", { configurable: true, value: false })
    expect(player.getState().paused).toBe(true)
    player.toggle()
    expect(media.pause).toHaveBeenCalled()
  })

  it("believes the element when a late playing event follows a pause", () => {
    const player = createMediaController({ src: "a.webm" })
    const media = mount(player)
    media.dispatchEvent(new Event("playing"))
    expect(player.getState().paused).toBe(true)
  })

  it("uses the duration when the seekable window is empty", () => {
    const player = createMediaController({ src: "a.webm" })
    const media = mount(player)
    Object.defineProperty(media, "seekable", { value: { length: 1, start: () => 0, end: () => 0 } })
    media.dispatchEvent(new Event("loadedmetadata"))
    expect(player.getTime().seekableEnd).toBe(60)
  })

  it("keeps state changes and time changes apart", () => {
    const player = createMediaController({ src: "a.webm" })
    const media = mount(player)
    const state = vi.fn()
    const time = vi.fn()
    player.subscribe(state)
    player.subscribeTime(time)
    media.dispatchEvent(new Event("timeupdate"))
    expect(time).toHaveBeenCalledOnce()
    expect(state).not.toHaveBeenCalled()
  })

  it("clamps seeks to the media", () => {
    const player = createMediaController({ src: "a.webm" })
    const media = mount(player)
    media.dispatchEvent(new Event("loadedmetadata"))
    player.seek(500)
    expect(media.currentTime).toBe(60)
    player.seek(-5)
    expect(media.currentTime).toBe(0)
    player.seek(10)
    player.seekBy(5)
    expect(media.currentTime).toBe(15)
  })

  it("restarts after the end", () => {
    const player = createMediaController({ src: "a.webm" })
    const media = mount(player)
    media.dispatchEvent(new Event("loadedmetadata"))
    player.seek(60)
    media.dispatchEvent(new Event("ended"))
    player.play()
    expect(media.currentTime).toBe(0)
    expect(media.play).toHaveBeenCalled()
  })

  it("names a failure and clears it on retry, keeping the position", () => {
    const onError = vi.fn()
    const player = createMediaController({ src: "a.webm", onError })
    const media = mount(player)
    media.dispatchEvent(new Event("loadedmetadata"))
    player.seek(30)
    Object.defineProperty(media, "error", { configurable: true, value: { code: 2 } })
    media.dispatchEvent(new Event("error"))
    expect(player.getState().error).toBe("network")
    expect(onError).toHaveBeenCalledWith("network")
    player.retry()
    expect(player.getState().error).toBeNull()
    media.currentTime = 0
    media.dispatchEvent(new Event("loadedmetadata"))
    expect(media.currentTime).toBe(30)
  })

  it("says so when playback stalls, and stops saying so", () => {
    vi.useFakeTimers()
    const player = createMediaController({ src: "a.webm", stallAfter: 2 })
    const media = mount(player)
    media.dispatchEvent(new Event("waiting"))
    expect(player.getState()).toMatchObject({ buffering: true, stalled: false })
    vi.advanceTimersByTime(2000)
    expect(player.getState().stalled).toBe(true)
    media.dispatchEvent(new Event("playing"))
    expect(player.getState()).toMatchObject({ buffering: false, stalled: false })
    vi.useRealTimers()
  })

  it("waits for Play when nothing is preloaded", () => {
    const player = createMediaController({ src: "a.webm", preload: "none" })
    const media = mount(player)
    media.dispatchEvent(new Event("suspend"))
    expect(player.getState().loading).toBe(false)
  })

  it("lets a controlled volume win", async () => {
    const onVolumeChange = vi.fn()
    const player = createMediaController({ src: "a.webm", volume: 0.5, onVolumeChange })
    const media = mount(player)
    expect(media.volume).toBe(0.5)
    media.volume = 0.8
    media.dispatchEvent(new Event("volumechange"))
    expect(onVolumeChange).toHaveBeenCalledWith(0.8)
    await Promise.resolve()
    expect(media.volume).toBe(0.5)
  })
})

describe("playlists", () => {
  const playlist = [
    { id: "one", src: "1.webm", title: "One" },
    { id: "two", src: "2.webm", title: "Two" },
  ]

  it("moves between entries on the same element", () => {
    const onSelectedIdChange = vi.fn()
    const player = createMediaController({ playlist, onSelectedIdChange })
    const media = mount(player)
    player.next()
    expect(media.getAttribute("src")).toBe("2.webm")
    expect(onSelectedIdChange).toHaveBeenCalledWith("two", expect.objectContaining({ reason: "next" }))
    expect(player.getState().index).toBe(1)
    player.next()
    expect(player.getState().index).toBe(1)
    player.previous()
    expect(media.getAttribute("src")).toBe("1.webm")
  })

  it("stays on the entry when a paused seek reaches its end", () => {
    const player = createMediaController({ playlist })
    const media = mount(player)
    media.dispatchEvent(new Event("loadedmetadata"))
    player.seek(60)
    media.dispatchEvent(new Event("ended"))
    expect(player.getState().index).toBe(0)
  })

  it("advances at the end and stops after the last", () => {
    const player = createMediaController({ playlist })
    const media = mount(player)
    media.dispatchEvent(new Event("loadedmetadata"))
    player.play()
    media.dispatchEvent(new Event("ended"))
    expect(player.getState().index).toBe(1)
    media.dispatchEvent(new Event("loadedmetadata"))
    expect(media.play).toHaveBeenCalledTimes(2)
    media.dispatchEvent(new Event("ended"))
    expect(player.getState().index).toBe(1)
  })

  it("asks a controlling host and waits for its answer", () => {
    const onSelectedIdChange = vi.fn()
    const player = createMediaController({ playlist, selectedId: "one", onSelectedIdChange })
    const media = mount(player)
    player.next()
    expect(onSelectedIdChange).toHaveBeenCalledWith("two", expect.anything())
    expect(media.getAttribute("src")).toBe("1.webm")
    player.configure({ playlist, selectedId: "two", onSelectedIdChange })
    expect(media.getAttribute("src")).toBe("2.webm")
  })
})

describe("stream engines", () => {
  it("attaches in place of src and detaches on the next entry", () => {
    const detach = vi.fn()
    const selectQuality = vi.fn()
    const attach = vi.fn<MediaAttach>((_media, stream) => {
      stream.setQualities([{ id: "720", label: "720p" }])
      stream.setActiveQuality("720")
      return { detach, selectQuality }
    })
    const player = createMediaController({ playlist: [{ id: "a", src: "a.m3u8" }, { id: "b", src: "b.m3u8" }], attach })
    const media = mount(player)
    expect(media.hasAttribute("src")).toBe(false)
    expect(attach).toHaveBeenCalledOnce()
    expect(player.getState().qualities).toEqual([{ id: "720", label: "720p" }])
    player.setQuality("720")
    expect(selectQuality).toHaveBeenCalledWith("720")
    player.next()
    expect(detach).toHaveBeenCalledOnce()
    expect(attach).toHaveBeenCalledTimes(2)
  })

  it("does not re-attach for an inline function", () => {
    const attach = vi.fn<MediaAttach>()
    const player = createMediaController({ src: "a.m3u8", attach })
    mount(player)
    player.configure({ src: "a.m3u8", attach: (media, stream) => attach(media, stream) })
    expect(attach).toHaveBeenCalledOnce()
  })

  it("ignores a stale engine's reports", () => {
    let early: Parameters<MediaAttach>[1] | undefined
    const attach = vi.fn<MediaAttach>((_media, stream) => {
      early ??= stream
    })
    const player = createMediaController({ playlist: [{ id: "a", src: "a" }, { id: "b", src: "b" }], attach })
    mount(player)
    player.next()
    early?.setQualities([{ id: "old", label: "Old" }])
    expect(player.getState().qualities).toEqual([])
  })

  it("shows a stream failure", () => {
    const player = createMediaController({ src: "a.m3u8", attach: (_media, stream) => stream.fail() })
    mount(player)
    expect(player.getState().error).toBe("stream")
  })
})

describe("casting", () => {
  it("pauses here and loads there from the same place when a session starts", () => {
    const { adapter, set } = fakeCast()
    const player = createMediaController({ src: "a.webm", title: "Tide", castAdapter: adapter })
    const media = mount(player)
    media.dispatchEvent(new Event("loadedmetadata"))
    media.currentTime = 12
    player.play()
    set({ status: "connected", deviceName: "Hall" })
    expect(media.pause).toHaveBeenCalled()
    expect(adapter.load).toHaveBeenCalledWith(expect.objectContaining({ startTime: 12, autoplay: true }))
  })

  it("sends the controls to the receiver while connected", () => {
    const { adapter, set } = fakeCast()
    const player = createMediaController({ src: "a.webm", castAdapter: adapter })
    const media = mount(player)
    set({ status: "connected", paused: false, currentTime: 5, duration: 60 })
    vi.mocked(media.play).mockClear()
    player.pause()
    player.seek(20)
    player.setVolume(0.3)
    player.setMuted(true)
    set({ status: "connected", paused: true, currentTime: 20, duration: 60 })
    player.play()
    expect(adapter.pause).toHaveBeenCalled()
    expect(adapter.seek).toHaveBeenCalledWith(20)
    expect(adapter.setVolume).toHaveBeenCalledWith(0.3)
    expect(adapter.setMuted).toHaveBeenCalledWith(true)
    expect(adapter.play).toHaveBeenCalled()
    expect(media.play).not.toHaveBeenCalled()
    expect(player.getTime().currentTime).toBe(20)
  })

  it("resumes here from the receiver's position when the session ends", () => {
    const { adapter, set } = fakeCast()
    const player = createMediaController({ src: "a.webm", castAdapter: adapter })
    const media = mount(player)
    set({ status: "connected", paused: false, currentTime: 5, duration: 60 })
    set({ status: "connected", paused: false, currentTime: 42, duration: 60 })
    set({ status: "available" })
    expect(media.currentTime).toBe(42)
    expect(media.play).toHaveBeenCalled()
  })

  it("stays paused when the receiver was paused", () => {
    const { adapter, set } = fakeCast()
    const player = createMediaController({ src: "a.webm", castAdapter: adapter })
    const media = mount(player)
    set({ status: "connected", paused: true, currentTime: 42, duration: 60 })
    set({ status: "available" })
    expect(media.play).not.toHaveBeenCalled()
    expect(player.getState().paused).toBe(true)
  })

  it("ignores the local element's own events during a session", () => {
    const { adapter, set } = fakeCast()
    const player = createMediaController({ src: "a.webm", castAdapter: adapter })
    const media = mount(player)
    set({ status: "connected", paused: false, currentTime: 5, duration: 60 })
    media.dispatchEvent(new Event("pause"))
    expect(player.getState().paused).toBe(false)
  })

  it("connects and disconnects through the adapter", () => {
    const { adapter, set } = fakeCast()
    const player = createMediaController({ src: "a.webm", castAdapter: adapter })
    mount(player)
    player.toggleCast()
    expect(adapter.connect).toHaveBeenCalled()
    set({ status: "connected" })
    player.toggleCast()
    expect(adapter.disconnect).toHaveBeenCalled()
  })

  it("stops listening when unmounted", () => {
    const { adapter, set } = fakeCast()
    const player = createMediaController({ src: "a.webm", castAdapter: adapter })
    const stop = player.mediaRef(fakeMedia())
    if (stop) stop()
    set({ status: "connected" })
    expect(player.getState().cast.status).toBe("unavailable")
  })
})
