/**
 * The player's engine: one media element, its sources and tracks, a stream engine and a
 * casting session behind plain state. No React, so `useMediaPlayer` and the tests both drive
 * it. The element is configured here and never replaced: a new entry changes `src` on the same
 * element, and nothing about a view mode reaches this module.
 *
 * Two stores keep renders cheap (R18.5): `state` changes on discrete events and `time` on
 * every `timeupdate`; only the seek bar and the clock listen to `time`, and they write the DOM.
 */
import { chapterAt, clamp, isAtLiveEdge, normaliseChapters, readRanges, sameRanges } from "./state.js"
import type {
  CastAdapter,
  CastSession,
  MediaAttach,
  MediaChapter,
  MediaErrorKind,
  MediaItem,
  MediaItemChangeDetails,
  MediaItemChangeReason,
  MediaQualityLevel,
  MediaRange,
  MediaStreamHandle,
} from "./types.js"

/** A caption or subtitle track as the player offers it. */
export interface MediaCaptionOption {
  /** The track's `id`, or its `src`. */
  id: string
  /** The name in the menu. */
  label: string
  /** BCP 47 language of the text. */
  language: string
}

/** The player's state apart from its position. */
export interface MediaPlayerState {
  /** The media can start: metadata has loaded, or a receiver holds it. */
  ready: boolean
  /** The browser is fetching what it needs to start. False while `preload="none"` waits for Play. */
  loading: boolean
  paused: boolean
  ended: boolean
  /** Playback is waiting for data. */
  buffering: boolean
  /** Playback has waited long enough to say so. */
  stalled: boolean
  /** A failure, until Retry or a new entry. */
  error: MediaErrorKind | null
  /** 0 to 1. */
  volume: number
  /** The sound is off, whatever the volume. */
  muted: boolean
  /** 1 is normal speed. */
  playbackRate: number
  /** The entry repeats. */
  loop: boolean
  /** The entry is a live stream. */
  live: boolean
  /** What the browser holds, in seconds. */
  buffered: readonly MediaRange[]
  /** The entry's chapters, sorted, without any past the end. */
  chapters: readonly MediaChapter[]
  /** The entry's caption tracks. */
  captions: readonly MediaCaptionOption[]
  /** The caption track showing, or null for none. */
  caption: string | null
  /** The cue text on screen now. */
  cues: readonly string[]
  /** The renditions the stream engine offers. */
  qualities: readonly MediaQualityLevel[]
  /** The chosen rendition, or null for automatic. */
  quality: string | null
  /** The rendition playing, as the engine reports it. */
  activeQuality: string | null
  /** The entry in play. */
  item: MediaItem | null
  /** The zero-based position of the entry in the playlist. */
  index: number
  /** The playlist, or the single entry. */
  items: readonly MediaItem[]
  /** The casting session; `unavailable` without an adapter. */
  cast: CastSession
}

/** The position, which changes many times a second. */
export interface MediaPlayerTime {
  /** Seconds. */
  currentTime: number
  /** Seconds; Infinity for a live stream with no end. */
  duration: number
  /** The start of the window a viewer can seek in. */
  seekableStart: number
  /** The end of that window: the duration, or the live edge. */
  seekableEnd: number
  /** The position is at the live edge. */
  atLiveEdge: boolean
}

/** Configuration of a player. Everything here can change between renders. */
export interface MediaPlayerOptions extends Omit<MediaItem, "id"> {
  /** Entries to play in order, in place of `src`. */
  playlist?: readonly MediaItem[]
  /** The entry in play, by `id`. Pair with `onSelectedIdChange` to control it. */
  selectedId?: string
  /** The first entry when uncontrolled. Default: the first. */
  defaultSelectedId?: string
  /** Called with the id of the new entry and why it changed. */
  onSelectedIdChange?: (id: string, details: MediaItemChangeDetails) => void
  /** Play the next entry when one ends. Default true. */
  autoAdvance?: boolean
  /** Start as soon as the browser allows. */
  autoPlay?: boolean
  /** 0 to 1. Pair with `onVolumeChange` to control it. */
  volume?: number
  /** Default 1. */
  defaultVolume?: number
  /** Called when the volume changes, from 0 to 1. */
  onVolumeChange?: (volume: number) => void
  /** Pair with `onMutedChange` to control it. */
  muted?: boolean
  /** Start muted when uncontrolled. Default false. */
  defaultMuted?: boolean
  /** Called when the player mutes or unmutes. */
  onMutedChange?: (muted: boolean) => void
  /** Pair with `onPlaybackRateChange` to control it. */
  playbackRate?: number
  /** Default 1. */
  defaultPlaybackRate?: number
  /** Called when the speed changes. */
  onPlaybackRateChange?: (rate: number) => void
  /** Repeat the entry. Pair with `onLoopChange` to control it. */
  loop?: boolean
  /** Start repeating when uncontrolled. Default false. */
  defaultLoop?: boolean
  /** Called when repeat turns on or off. */
  onLoopChange?: (loop: boolean) => void
  /** How much the browser loads up front. Default `metadata`. */
  preload?: "none" | "metadata" | "auto"
  /** For sources and tracks on another origin. */
  crossOrigin?: "anonymous" | "use-credentials"
  /** Connect a stream engine; see {@link MediaAttach}. */
  attach?: MediaAttach
  /** A casting session; see {@link CastAdapter}. */
  castAdapter?: CastAdapter
  /** Publish to the operating system's media controls. Default true. */
  mediaSession?: boolean
  /** Seconds playback may wait before the stall message shows. Default 8. */
  stallAfter?: number
  /** Called when playback fails, with what failed. */
  onError?: (error: MediaErrorKind) => void
  /** Called when the entry ends. */
  onEnded?: () => void
}

/** A headless player: state, position and every action of the built-in controls. */
export interface MediaPlayerController {
  /** Pass as the `ref` of your `<video>` or `<audio>`. */
  mediaRef: (element: HTMLMediaElement | null) => void | (() => void)
  /** The media element, once mounted. */
  media: { readonly current: HTMLMediaElement | null }
  getState(): MediaPlayerState
  getTime(): MediaPlayerTime
  /** Listen for state changes. */
  subscribe(listener: () => void): () => void
  /** Listen for position changes. */
  subscribeTime(listener: () => void): () => void
  /** Apply new options. `useMediaPlayer` does this on every commit. */
  configure(options: MediaPlayerOptions): void
  /** Start playing, from the start after the end. */
  play(): void
  /** Pause. */
  pause(): void
  /** Play or pause. */
  toggle(): void
  /** Go to a time in seconds. */
  seek(seconds: number): void
  /** Move by seconds; negative goes back. */
  seekBy(seconds: number): void
  /** Set the volume, 0 to 1. Above 0 also unmutes. */
  setVolume(volume: number): void
  /** Mute or unmute. */
  setMuted(muted: boolean): void
  /** Mute, or unmute. */
  toggleMuted(): void
  /** Set the speed; 1 is normal. */
  setPlaybackRate(rate: number): void
  /** Repeat the entry, or stop repeating. */
  setLoop(loop: boolean): void
  /** Show a caption track, or null for none. */
  setCaption(id: string | null): void
  /** Turn captions off, or back on with the last track shown. */
  toggleCaptions(): void
  /** Choose a rendition, or null for automatic. */
  setQuality(id: string | null): void
  /** Jump to the live edge. */
  goLive(): void
  /** Move to an entry of the playlist. */
  select(id: string, reason?: MediaItemChangeReason): void
  /** Move to the next entry. */
  next(): void
  /** Move to the previous entry. */
  previous(): void
  /** Reload after an error or a stall, keeping the position. */
  retry(): void
  /** Connect a casting session, or end the one that is connected. */
  toggleCast(): void
}

const NO_CAST: CastSession = { status: "unavailable" }
const STOPPED: MediaPlayerTime = { currentTime: 0, duration: 0, seekableStart: 0, seekableEnd: 0, atLiveEdge: false }

/** The key of a playlist entry: its `id`, or its first source. */
export const mediaItemId = (item: MediaItem | undefined) => item?.id ?? item?.src ?? item?.sources?.[0]?.src ?? ""
const trackId = (track: { id?: string; src: string }) => track.id ?? track.src
/** The parts of an entry that need the element to load again. */
const signature = (item: MediaItem | null) => JSON.stringify([item?.src, item?.sources, item?.tracks?.map((track) => [track.src, track.language, track.label])])

const ERROR_KINDS: Record<number, MediaErrorKind> = { 1: "aborted", 2: "network", 3: "decode", 4: "unsupported" }

function listOf(options: MediaPlayerOptions): MediaItem[] {
  if (options.playlist) return [...options.playlist]
  const { src, sources, title, subtitle, poster, tracks, chapters, storyboard, live } = options
  return src || sources || options.attach ? [{ src, sources, title, subtitle, poster, tracks, chapters, storyboard, live }] : []
}

/** Create the engine behind `useMediaPlayer`. */
export function createMediaController(initial: MediaPlayerOptions = {}): MediaPlayerController {
  let options = initial
  let element: HTMLMediaElement | null = null
  const listeners = new Set<() => void>()
  const timeListeners = new Set<() => void>()
  const items = listOf(initial)
  const firstIndex = Math.max(0, items.findIndex((item) => mediaItemId(item) === (initial.selectedId ?? initial.defaultSelectedId)))

  let state: MediaPlayerState = {
    ready: false,
    loading: false,
    paused: true,
    ended: false,
    buffering: false,
    stalled: false,
    error: null,
    volume: initial.volume ?? initial.defaultVolume ?? 1,
    muted: initial.muted ?? initial.defaultMuted ?? false,
    playbackRate: initial.playbackRate ?? initial.defaultPlaybackRate ?? 1,
    loop: initial.loop ?? initial.defaultLoop ?? false,
    live: false,
    buffered: [],
    chapters: [],
    captions: [],
    caption: null,
    cues: [],
    qualities: [],
    quality: null,
    activeQuality: null,
    item: items[firstIndex] ?? null,
    index: firstIndex,
    items,
    cast: initial.castAdapter?.getSession() ?? NO_CAST,
  }
  state.live = Boolean(state.item?.live)
  state.chapters = normaliseChapters(state.item?.chapters, 0)
  let time = STOPPED

  let loaded = ""
  let listKey = JSON.stringify(items)
  let resumeAt: number | null = null
  let playWhenReady = Boolean(initial.autoPlay)
  let stallTimer: ReturnType<typeof setTimeout> | undefined
  let handle: MediaStreamHandle | null = null
  let cleanupAttach: (() => void) | null = null
  let reattach = 0
  let cleanupCast: (() => void) | null = null
  let adapter: CastAdapter | undefined
  let casting = false
  let lastRemote: CastSession = NO_CAST
  let activeTrack: TextTrack | null = null
  let lastCaption: string | null = null
  let trackElements: HTMLTrackElement[] = []
  const removeMedia: Array<() => void> = []

  function update(patch: Partial<MediaPlayerState>) {
    let changed = false
    for (const key of Object.keys(patch) as Array<keyof MediaPlayerState>) {
      if (!Object.is(state[key], patch[key])) changed = true
    }
    if (!changed) return
    state = { ...state, ...patch }
    for (const listener of listeners) listener()
  }

  function updateTime(patch: Partial<MediaPlayerTime>) {
    const next = { ...time, ...patch }
    next.atLiveEdge = state.live && isAtLiveEdge(next.currentTime, next.seekableEnd)
    time = next
    for (const listener of timeListeners) listener()
  }

  function readTime() {
    const media = element
    if (!media || casting) return
    const seekable = media.seekable
    const last = seekable?.length ? seekable.length - 1 : -1
    const duration = Number.isFinite(media.duration) || media.duration === Infinity ? media.duration : 0
    updateTime({
      currentTime: media.currentTime,
      duration,
      seekableStart: last >= 0 ? seekable.start(last) : 0,
      seekableEnd: last >= 0 ? seekable.end(last) : Number.isFinite(duration) ? duration : 0,
    })
  }

  function readBuffered() {
    const next = readRanges(element?.buffered)
    if (!sameRanges(next, state.buffered)) update({ buffered: next })
  }

  function clearStall() {
    clearTimeout(stallTimer)
    if (state.buffering || state.stalled) update({ buffering: false, stalled: false })
  }

  function fail(kind: MediaErrorKind) {
    clearStall()
    update({ error: kind, ready: false })
    options.onError?.(kind)
  }

  function showTrack(id: string | null) {
    activeTrack?.removeEventListener("cuechange", onCueChange)
    activeTrack = null
    for (const node of trackElements) {
      const on = node.dataset.trackId === id
      node.track.mode = on ? "hidden" : "disabled"
      if (on) activeTrack = node.track
    }
    ;(activeTrack as TextTrack | null)?.addEventListener("cuechange", onCueChange)
    update({ caption: id, cues: [] })
    onCueChange()
  }

  function onCueChange() {
    const cues = activeTrack?.activeCues
    const text: string[] = []
    for (let index = 0; index < (cues?.length ?? 0); index += 1) {
      const cue = cues![index] as (TextTrackCue & { text?: string }) | undefined
      if (cue?.text) text.push(cue.text.replace(/<[^>]+>/g, ""))
    }
    update({ cues: text })
  }

  function writeTracks(item: MediaItem | null) {
    const media = element
    if (!media) return
    for (const node of trackElements) node.remove()
    const tracks = item?.tracks ?? []
    trackElements = tracks.map((track) => {
      const node = media.ownerDocument.createElement("track")
      node.kind = track.kind ?? "subtitles"
      node.src = track.src
      node.srclang = track.language
      node.label = track.label
      node.dataset.trackId = trackId(track)
      media.append(node)
      return node
    })
    const captions = tracks.map((track) => ({ id: trackId(track), label: track.label, language: track.language }))
    const previous = state.captions.find((track) => track.id === state.caption)?.language
    const keep = previous ? tracks.find((track) => track.language === previous) : undefined
    const chosen = keep ?? tracks.find((track) => track.default)
    update({ captions })
    showTrack(chosen ? trackId(chosen) : null)
  }

  function writeSources(item: MediaItem | null) {
    const media = element
    if (!media) return
    media.querySelectorAll("source").forEach((node) => node.remove())
    media.removeAttribute("src")
    if (item?.sources?.length) {
      for (const source of item.sources) {
        const node = media.ownerDocument.createElement("source")
        node.src = source.src
        if (source.type) node.type = source.type
        media.prepend(node)
      }
    } else if (item?.src) media.src = item.src
  }

  function runAttach() {
    cleanupAttach?.()
    cleanupAttach = null
    handle = null
    const media = element
    const attach = options.attach
    if (!media || !attach) return
    const run = (reattach += 1)
    const live = (fn: () => void) => {
      if (run === reattach) fn()
    }
    const result = attach(media, {
      item: state.item,
      setQualities: (levels) => live(() => update({ qualities: levels })),
      setActiveQuality: (id) => live(() => update({ activeQuality: id })),
      setLive: (value) => live(() => update({ live: value })),
      fail: () => live(() => fail("stream")),
    })
    if (typeof result === "function") cleanupAttach = result
    else if (result) {
      handle = result
      cleanupAttach = () => result.detach?.()
    }
  }

  /** Point the element at the current entry. */
  function load() {
    const media = element
    if (!media) return
    const item = state.item
    loaded = signature(item)
    clearStall()
    update({ ready: false, loading: true, ended: false, error: null, buffered: [], qualities: [], activeQuality: null, quality: null, live: Boolean(item?.live), chapters: normaliseChapters(item?.chapters, 0) })
    updateTime({ currentTime: resumeAt ?? 0, duration: 0, seekableStart: 0, seekableEnd: 0 })
    if (item?.poster) media.setAttribute("poster", item.poster)
    else media.removeAttribute("poster")
    if (options.attach) {
      media.removeAttribute("src")
      runAttach()
    } else {
      writeSources(item)
      media.load()
    }
    writeTracks(item)
    if (casting && item) void adapter?.load({ item, startTime: 0, autoplay: true })
    else if (playWhenReady && media.preload === "none") {
      // No metadata arrives until playback is asked for.
      playWhenReady = false
      startLocal()
    }
  }

  const on = (media: HTMLMediaElement, name: string, handler: () => void) => {
    media.addEventListener(name, handler)
    removeMedia.push(() => media.removeEventListener(name, handler))
  }

  function bind(media: HTMLMediaElement) {
    on(media, "loadedmetadata", () => {
      if (casting) return
      if (resumeAt !== null) {
        media.currentTime = resumeAt
        resumeAt = null
      }
      const live = state.live || media.duration === Infinity
      update({ ready: true, loading: false, live, chapters: normaliseChapters(state.item?.chapters, media.duration) })
      readTime()
      if (playWhenReady) {
        playWhenReady = false
        startLocal()
      }
    })
    on(media, "loadstart", () => update({ loading: true }))
    for (const name of ["suspend", "abort", "emptied", "canplay", "error"]) on(media, name, () => update({ loading: false }))
    // The system's own players draw `showing` tracks and never our overlay.
    const showNatively = (shown: boolean) => {
      if (activeTrack) activeTrack.mode = shown ? "showing" : "hidden"
    }
    on(media, "webkitbeginfullscreen", () => showNatively(true))
    on(media, "webkitendfullscreen", () => showNatively(false))
    on(media, "webkitpresentationmodechanged", () => showNatively((media as HTMLMediaElement & { webkitPresentationMode?: string }).webkitPresentationMode === "picture-in-picture"))
    on(media, "durationchange", () => {
      update({ chapters: normaliseChapters(state.item?.chapters, media.duration) })
      readTime()
    })
    on(media, "timeupdate", readTime)
    on(media, "seeked", readTime)
    on(media, "progress", readBuffered)
    on(media, "loadeddata", readBuffered)
    on(media, "seeked", readBuffered)
    on(media, "playing", () => {
      clearStall()
      if (!casting) update({ paused: false, ended: false })
    })
    on(media, "play", () => {
      if (!casting) update({ paused: false, ended: false })
    })
    on(media, "pause", () => {
      if (!casting) update({ paused: true })
    })
    on(media, "canplay", clearStall)
    on(media, "waiting", () => {
      if (casting) return
      update({ buffering: true })
      clearTimeout(stallTimer)
      stallTimer = setTimeout(() => update({ stalled: true }), (options.stallAfter ?? 8) * 1000)
    })
    on(media, "volumechange", () => {
      if (casting) return
      const before = state
      update({ volume: media.volume, muted: media.muted })
      if (before.volume !== media.volume) options.onVolumeChange?.(media.volume)
      if (before.muted !== media.muted) options.onMutedChange?.(media.muted)
      queueMicrotask(enforce)
    })
    on(media, "ratechange", () => {
      if (state.playbackRate === media.playbackRate) return
      update({ playbackRate: media.playbackRate })
      options.onPlaybackRateChange?.(media.playbackRate)
      queueMicrotask(enforce)
    })
    on(media, "ended", () => {
      if (casting) return
      update({ ended: true, paused: true })
      options.onEnded?.()
      if (state.index < state.items.length - 1 && options.autoAdvance !== false) step(1, "ended", true)
    })
    on(media, "error", () => {
      if (!options.attach) fail(ERROR_KINDS[media.error?.code ?? 0] ?? "network")
    })
  }

  /** Apply controlled values, so a host that refuses a change wins. */
  function enforce() {
    const media = element
    if (!media || casting) return
    if (options.volume !== undefined && media.volume !== options.volume) media.volume = options.volume
    if (options.muted !== undefined && media.muted !== options.muted) media.muted = options.muted
    if (options.playbackRate !== undefined && media.playbackRate !== options.playbackRate) media.playbackRate = options.playbackRate
    if (options.loop !== undefined) {
      media.loop = options.loop
      update({ loop: options.loop })
    }
  }

  function startLocal() {
    const started = element?.play()
    // A browser may refuse until a gesture (autoplay): the player simply stays paused.
    started?.catch(() => update({ paused: true }))
  }

  function select(id: string, reason: MediaItemChangeReason = "item-press", resume = !state.paused) {
    const index = state.items.findIndex((item) => mediaItemId(item) === id)
    const item = state.items[index]
    if (!item || index === state.index) return
    options.onSelectedIdChange?.(mediaItemId(item), { reason, item })
    if (options.selectedId !== undefined) {
      playWhenReady = resume
      return
    }
    goTo(index, resume)
  }

  function goTo(index: number, resume: boolean) {
    update({ item: state.items[index] ?? null, index })
    playWhenReady = resume
    load()
  }

  function step(delta: 1 | -1, reason: MediaItemChangeReason, resume = !state.paused) {
    const target = state.items[state.index + delta]
    if (target) select(mediaItemId(target), reason, resume)
  }

  function syncCast() {
    const session = adapter?.getSession() ?? NO_CAST
    const media = element
    const connected = session.status === "connected"
    if (connected && !casting) {
      const startTime = media?.currentTime ?? time.currentTime
      const autoplay = !state.paused
      casting = true
      media?.pause()
      const item = state.item
      if (item) void adapter?.load({ item, startTime, autoplay })
      updateTime({ currentTime: startTime })
    } else if (!connected && casting) {
      casting = false
      const at = lastRemote.currentTime ?? time.currentTime
      const resume = lastRemote.paused === false
      if (media && Number.isFinite(at)) media.currentTime = at
      update({ paused: !resume, volume: media?.volume ?? state.volume, muted: media?.muted ?? state.muted })
      if (resume) startLocal()
      readTime()
    }
    if (connected) {
      lastRemote = session
      update({
        cast: session,
        ready: true,
        paused: session.paused ?? state.paused,
        volume: session.volume ?? state.volume,
        muted: session.muted ?? state.muted,
      })
      updateTime({ currentTime: session.currentTime ?? time.currentTime, duration: session.duration ?? time.duration, seekableStart: 0, seekableEnd: session.duration ?? time.seekableEnd })
    } else update({ cast: session })
  }

  function bindCast(next: CastAdapter | undefined) {
    if (next === adapter) return
    cleanupCast?.()
    adapter = next
    cleanupCast = next?.subscribe(syncCast) ?? null
    syncCast()
  }

  const controller: MediaPlayerController = {
    media: {
      get current() {
        return element
      },
    },
    mediaRef(node) {
      if (!node) return
      element = node
      node.preload = options.preload ?? "metadata"
      node.crossOrigin = options.crossOrigin ?? null
      node.volume = state.volume
      node.muted = state.muted
      node.defaultMuted = state.muted
      node.playbackRate = state.playbackRate
      node.loop = state.loop
      node.autoplay = false
      bind(node)
      bindCast(options.castAdapter)
      load()
      return () => {
        for (const remove of removeMedia.splice(0)) remove()
        clearStall()
        cleanupAttach?.()
        cleanupAttach = null
        handle = null
        for (const node of trackElements) node.remove()
        trackElements = []
        activeTrack?.removeEventListener("cuechange", onCueChange)
        activeTrack = null
        element = null
        bindCast(undefined)
      }
    },
    getState: () => state,
    getTime: () => time,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    subscribeTime(listener) {
      timeListeners.add(listener)
      return () => timeListeners.delete(listener)
    },
    configure(next) {
      const previous = options
      options = next
      const list = listOf(next)
      const key = JSON.stringify(list)
      const same = key === listKey
      listKey = key
      let index = state.index
      if (next.selectedId !== undefined) index = Math.max(0, list.findIndex((item) => mediaItemId(item) === next.selectedId))
      else if (!same) {
        const kept = list.findIndex((item) => state.item && mediaItemId(item) === mediaItemId(state.item))
        index = Math.max(0, kept)
      }
      if (!same || index !== state.index) {
        const item = list[index] ?? null
        const resume = next.selectedId !== undefined ? playWhenReady || !state.paused : !state.paused
        update({ items: list, item, index })
        if (signature(item) !== loaded && element) {
          playWhenReady = resume
          load()
        } else update({ chapters: normaliseChapters(item?.chapters, time.duration) })
      }
      if (element) {
        if (next.preload !== previous.preload) element.preload = next.preload ?? "metadata"
        // `attach` is read when an entry loads, so an inline function does not reload per render.
        if (Boolean(next.attach) !== Boolean(previous.attach)) load()
      }
      bindCast(element ? next.castAdapter : adapter)
      enforce()
    },
    play() {
      if (casting) void adapter?.play()
      else {
        if (state.ended && element) element.currentTime = 0
        startLocal()
      }
    },
    pause() {
      if (casting) void adapter?.pause()
      else element?.pause()
    },
    toggle() {
      if (state.paused) controller.play()
      else controller.pause()
    },
    seek(seconds) {
      const end = state.live ? time.seekableEnd : time.duration
      const target = clamp(seconds, state.live ? time.seekableStart : 0, Number.isFinite(end) && end > 0 ? end : Math.max(seconds, 0))
      if (casting) void adapter?.seek(target)
      else if (element) element.currentTime = target
      updateTime({ currentTime: target })
    },
    seekBy: (seconds) => controller.seek(time.currentTime + seconds),
    setVolume(volume) {
      const value = clamp(volume, 0, 1)
      if (casting) void adapter?.setVolume(value)
      else {
        if (element) element.volume = value
        if (value > 0 && state.muted) controller.setMuted(false)
      }
    },
    setMuted(muted) {
      if (casting) void adapter?.setMuted?.(muted)
      else if (element) element.muted = muted
    },
    toggleMuted: () => controller.setMuted(!state.muted),
    setPlaybackRate(rate) {
      if (element) element.playbackRate = rate
    },
    setLoop(loop) {
      if (options.loop === undefined) {
        if (element) element.loop = loop
        update({ loop })
      }
      options.onLoopChange?.(loop)
    },
    setCaption: showTrack,
    toggleCaptions() {
      if (state.caption) lastCaption = state.caption
      const track = state.captions.find((option) => option.id === lastCaption) ?? state.captions[0]
      showTrack(state.caption ? null : (track?.id ?? null))
    },
    setQuality(id) {
      update({ quality: id })
      handle?.selectQuality?.(id)
    },
    goLive() {
      if (time.seekableEnd > 0) controller.seek(time.seekableEnd)
    },
    select,
    next: () => step(1, "next"),
    previous: () => step(-1, "previous"),
    retry() {
      const media = element
      if (!media) return
      resumeAt = media.currentTime || time.currentTime || null
      playWhenReady = !state.paused
      load()
    },
    toggleCast() {
      if (state.cast.status === "connected" || state.cast.status === "connecting") void adapter?.disconnect()
      else void adapter?.connect()
    },
  }
  return controller
}

/** The chapter at the current position, for hosts building their own timeline. */
export { chapterAt }
